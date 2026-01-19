import type { Node, Edge } from 'reactflow';
import { linuxBridgeBasic } from './linux-bridge-basic';
import { linuxBridgeVlan } from './linux-bridge-vlan';
// Import the original simple template logic (we'll inline it here for simplicity or migrate it properly)

export interface TopologyTemplate {
    id: string;
    name: string;
    description: string;
    nodes: Node[];
    edges: Edge[];
}

const switch2Hosts: TopologyTemplate = {
    id: 'switch-2-hosts',
    name: 'Switch w/ 2 Hosts',
    description: 'Basic L2 topology: 1 Linux Bridge connected to 2 Alpine hosts.',
    nodes: [
        {
            id: 'switch-1',
            type: 'default',
            position: { x: 250, y: 100 },
            data: { label: 'bridge-1', kind: 'linux', image: 'ghcr.io/srl-labs/alpine' },
        },
        {
            id: 'host-1',
            type: 'default',
            position: { x: 100, y: 300 },
            data: { label: 'host-1', kind: 'linux', image: 'ghcr.io/srl-labs/alpine' },
        },
        {
            id: 'host-2',
            type: 'default',
            position: { x: 400, y: 300 },
            data: { label: 'host-2', kind: 'linux', image: 'ghcr.io/srl-labs/alpine' },
        },
    ],
    edges: [
        {
            id: 'e-switch-1-host-1',
            source: 'switch-1',
            target: 'host-1',
            sourceHandle: null,
            targetHandle: null,
            animated: true,
            label: 'eth1 : eth1',
            data: { sourceInt: 'eth1', targetInt: 'eth1' }
        },
        {
            id: 'e-switch-1-host-2',
            source: 'switch-1',
            target: 'host-2',
            sourceHandle: null,
            targetHandle: null,
            animated: true,
            label: 'eth2 : eth1',
            data: { sourceInt: 'eth2', targetInt: 'eth1' }
        }
    ]
};

export const templates: TopologyTemplate[] = [
    linuxBridgeBasic,
    linuxBridgeVlan,
    switch2Hosts
];
