import type { Node, Edge } from 'reactflow';

// Avoid circular dependency by not importing from ./index
export const linuxBridgeBasic = {
    id: 'linux-bridge-basic',
    name: 'Linux Bridge Basic',
    description: '3-node L2 topology: A Linux bridge connecting two Alpine hosts with static IPs.',
    nodes: [
        {
            id: 'br',
            type: 'default',
            position: { x: 250, y: 100 },
            data: {
                label: 'br',
                kind: 'linux',
                image: 'alpine:latest',
                exec: [
                    'apk add --no-cache bridge-utils iproute2 tcpdump',
                    'ip link add br0 type bridge',
                    'ip link set br0 up',
                    'ip link set eth1 master br0',
                    'ip link set eth2 master br0',
                    'ip link set eth1 up',
                    'ip link set eth2 up'
                ]
            },
        },
        {
            id: 'host1',
            type: 'default',
            position: { x: 100, y: 300 },
            data: {
                label: 'host1',
                kind: 'linux',
                image: 'alpine:latest',
                exec: [
                    'apk add --no-cache iproute2 iputils',
                    'ip addr add 192.168.1.1/24 dev eth1',
                    'ip link set eth1 up'
                ]
            },
        },
        {
            id: 'host2',
            type: 'default',
            position: { x: 400, y: 300 },
            data: {
                label: 'host2',
                kind: 'linux',
                image: 'alpine:latest',
                exec: [
                    'apk add --no-cache iproute2 iputils',
                    'ip addr add 192.168.1.2/24 dev eth1',
                    'ip link set eth1 up'
                ]
            },
        },
    ],
    edges: [
        {
            id: 'e-br-host1',
            source: 'br',
            target: 'host1',
            sourceHandle: null,
            targetHandle: null,
            animated: true,
            label: 'eth1 : eth1',
            data: { sourceInt: 'eth1', targetInt: 'eth1' }
        },
        {
            id: 'e-br-host2',
            source: 'br',
            target: 'host2',
            sourceHandle: null,
            targetHandle: null,
            animated: true,
            label: 'eth2 : eth1',
            data: { sourceInt: 'eth2', targetInt: 'eth1' }
        }
    ]
};
