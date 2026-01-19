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
        clabConfig.topology.nodes[node.id] = {
            // Map internal UI kind to official Clab kind
            kind: getClabKindMapping(node.data.kind),
            image: node.data.image,
        };
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
