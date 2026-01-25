import yaml from 'js-yaml';
import type { Node, Edge } from 'reactflow';
import type { ClabNodeData } from './store';

// Maps UI internal kinds to official Containerlab kinds
export function getClabKindMapping(kind: string) {
    const mapping: Record<string, string> = {
        'linux': 'linux',
        'frr': 'linux',
        'nokia': 'nokia_srlinux',
        'arista': 'ceos',
        'juniper': 'juniper_vsrx',
        'vyos': 'vyosnetworks_vyos',
        'mikrotik': 'mikrotik_ros'
    };
    return mapping[kind] || 'linux';
}

export function generateClabConfig(nodes: Node<ClabNodeData>[], edges: Edge[], labName: string = 'clab-visual-lab') {
    const clabConfig: any = {
        name: labName,
        topology: {
            nodes: {},
            links: [],
        },
    };

    // Process Nodes
    nodes.forEach((node) => {
        const clabKind = getClabKindMapping(node.data.kind);
        const nodeConfig: any = {
            kind: clabKind,
        };

        // Add image
        if (node.data.image) {
            nodeConfig.image = node.data.image;
        }

        // Add exec commands
        if (node.data.exec && node.data.exec.length > 0) {
            nodeConfig.exec = node.data.exec;
        }

        // Add cmd field (alternative to exec)
        if (node.data.cmd) {
            nodeConfig.cmd = node.data.cmd;
        }

        clabConfig.topology.nodes[node.id] = nodeConfig;
    });


    // Process Links
    edges.forEach((edge) => {
        const sourceId = edge.source;
        const targetId = edge.target;

        // Use the interface names assigned in the UI
        const sourceInt = edge.data?.sourceInt || 'eth1';
        const targetInt = edge.data?.targetInt || 'eth1';

        clabConfig.topology.links.push({
            endpoints: [`${sourceId}:${sourceInt}`, `${targetId}:${targetInt}`],
        });
    });

    return clabConfig;
}

export function generateClabYaml(nodes: Node<ClabNodeData>[], edges: Edge[], labName: string = 'clab-visual-lab') {
    const config = generateClabConfig(nodes, edges, labName);
    return yaml.dump(config);
}

export function parseClabYamlToFlow(yamlContent: string): { nodes: Node<ClabNodeData>[], edges: Edge[] } {
    try {
        const doc: any = yaml.load(yamlContent);
        const nodes: Node<ClabNodeData>[] = [];
        const edges: Edge[] = [];

        if (!doc || !doc.topology || !doc.topology.nodes) {
            console.error("Invalid Containerlab YAML: missing topology.nodes", doc);
            return { nodes: [], edges: [] };
        }

        const nodeEntries = Object.entries(doc.topology.nodes);
        const colCount = 3; // Number of nodes per row

        nodeEntries.forEach(([nodeName, nodeData]: [string, any], index) => {
            // Simple grid layout
            const row = Math.floor(index / colCount);
            const col = index % colCount;
            const x = 100 + col * 300;
            const y = 100 + row * 200;

            // Map standard CLAB kinds to our internal kinds if possible, or default to linux
            // We use the reverse logic of getClabKindMapping roughly
            let kind = 'linux';

            if (nodeData.kind === 'nokia_srlinux') kind = 'nokia';
            else if (nodeData.kind === 'ceos') kind = 'arista';
            else if (nodeData.kind === 'juniper_vsrx') kind = 'juniper';
            // ... add others as needed, default to 'linux'

            nodes.push({
                id: nodeName,
                type: 'default',
                position: { x, y },
                data: {
                    label: nodeName,
                    kind: kind, // You might want to map this back from image or kind more robustly
                    image: nodeData.image || 'alpine:latest',
                    exec: nodeData.exec || [],
                    cmd: nodeData.cmd || undefined
                }
            });
        });

        if (doc.topology.links) {
            doc.topology.links.forEach((link: any, i: number) => {
                if (link.endpoints && link.endpoints.length === 2) {
                    const [sourceStr, targetStr] = link.endpoints;
                    const [sourceId, sourceInt] = sourceStr.split(':');
                    const [targetId, targetInt] = targetStr.split(':');

                    edges.push({
                        id: `e-${sourceId}-${targetId}-${i}`,
                        source: sourceId,
                        target: targetId,
                        animated: true,
                        label: `${sourceInt} : ${targetInt}`,
                        data: {
                            sourceInt,
                            targetInt
                        }
                    });
                }
            });
        }

        return { nodes, edges };

    } catch (e) {
        console.error("Failed to parse YAML", e);
        return { nodes: [], edges: [] };
    }
}
