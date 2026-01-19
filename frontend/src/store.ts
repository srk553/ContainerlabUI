import { create } from 'zustand';
import {
    addEdge,
    applyNodeChanges,
    applyEdgeChanges,
} from 'reactflow';
import type {
    Connection,
    Edge,
    EdgeChange,
    Node,
    NodeChange,
    OnNodesChange,
    OnEdgesChange,
    OnConnect
} from 'reactflow';

export type ClabNodeData = {
    label: string;
    kind: string;
    image: string;
    mgmt_ipv4?: string;
};

export type ClabStore = {
    nodes: Node<ClabNodeData>[];
    edges: Edge[];
    apiUrl: string;
    apiToken: string;
    apiUser: string;
    labName: string;
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;
    addNode: (node: Node<ClabNodeData>) => void;
    updateNodeData: (nodeId: string, data: Partial<ClabNodeData>) => void;
    setApiUrl: (url: string) => void;
    setApiToken: (token: string) => void;
    setApiUser: (user: string) => void;
    setLabName: (name: string) => void;
};

const getInterfaceName = (kind: string, index: number) => {
    // Handle both internal UI kinds and official Containerlab kinds
    switch (kind) {
        case 'nokia':
        case 'nokia_srlinux':
            return `ethernet-1/${index}`;
        case 'juniper':
        case 'juniper_vsrx':
            return `ge-0/0/${index - 1}`;
        case 'mikrotik':
        case 'mikrotik_ros':
            return `ether${index}`;
        default:
            return `eth${index}`;
    }
};

export const useStore = create<ClabStore>((set, get) => ({
    nodes: [],
    edges: [],
    apiUrl: 'http://localhost:8080/api/v1',
    apiToken: 'myjwtsecret',
    apiUser: 'lab',
    labName: 'clab-visual-lab',
    onNodesChange: (changes: NodeChange[]) => {
        set({
            nodes: applyNodeChanges(changes, get().nodes),
        });
    },
    onEdgesChange: (changes: EdgeChange[]) => {
        set({
            edges: applyEdgeChanges(changes, get().edges),
        });
    },
    onConnect: (connection: Connection) => {
        const { nodes, edges } = get();
        const sourceId = connection.source!;
        const targetId = connection.target!;

        const sourceNode = nodes.find(n => n.id === sourceId);
        const targetNode = nodes.find(n => n.id === targetId);

        if (!sourceNode || !targetNode) return;

        // Calculate next interface indices
        const sourceEdges = edges.filter(e => e.source === sourceId || e.target === sourceId);
        const targetEdges = edges.filter(e => e.source === targetId || e.target === targetId);

        const sourceInt = getInterfaceName(sourceNode.data.kind, sourceEdges.length + 1);
        const targetInt = getInterfaceName(targetNode.data.kind, targetEdges.length + 1);

        const newEdge: Edge = {
            id: `e-${sourceId}-${targetId}-${Date.now()}`,
            source: sourceId,
            target: targetId,
            sourceHandle: connection.sourceHandle,
            targetHandle: connection.targetHandle,
            label: `${sourceInt} : ${targetInt}`,
            data: {
                sourceInt,
                targetInt
            },
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#3b82f6', strokeWidth: 2 }
        };

        set({
            edges: addEdge(newEdge, edges),
        });
    },
    addNode: (node: Node<ClabNodeData>) => {
        set({
            nodes: [...get().nodes, node],
        });
    },
    updateNodeData: (nodeId: string, data: Partial<ClabNodeData>) => {
        set({
            nodes: get().nodes.map((node) => {
                if (node.id === nodeId) {
                    return { ...node, data: { ...node.data, ...data } };
                }
                return node;
            }),
        });
    },
    setApiUrl: (url: string) => {
        set({ apiUrl: url });
    },
    setApiToken: (token: string) => {
        set({ apiToken: token });
    },
    setApiUser: (user: string) => {
        set({ apiUser: user });
    },
    setLabName: (name: string) => {
        set({ labName: name });
    },
}));
