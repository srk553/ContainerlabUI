// Avoid circular dependency by not importing from ./index
export const linuxBridgeVlan = {
    id: 'linux-bridge-vlan',
    name: 'Linux Bridge VLAN',
    description: '5-node L2 topology: Linux bridge with VLAN filtering (10 & 20) connecting 4 hosts.',
    nodes: [
        {
            id: 'br',
            type: 'default',
            position: { x: 300, y: 50 },
            data: {
                label: 'br',
                kind: 'linux',
                image: 'alpine:latest',
                exec: [
                    'apk add --no-cache bridge-utils iproute2 vlan tcpdump',
                    'ip link add br0 type bridge vlan_filtering 1',
                    'ip link set br0 up',
                    'ip link set eth1 master br0',
                    'ip link set eth2 master br0',
                    'ip link set eth3 master br0',
                    'ip link set eth4 master br0',
                    'ip link set eth1 up',
                    'ip link set eth2 up',
                    'ip link set eth3 up',
                    'ip link set eth4 up',
                    'bridge vlan add vid 10 dev eth1 pvid untagged',
                    'bridge vlan add vid 10 dev eth2 pvid untagged',
                    'bridge vlan add vid 20 dev eth3 pvid untagged',
                    'bridge vlan add vid 20 dev eth4 pvid untagged'
                ]
            },
        },
        {
            id: 'host1',
            type: 'default',
            position: { x: 50, y: 300 },
            data: {
                label: 'host1',
                kind: 'linux',
                image: 'alpine:latest',
                exec: [
                    'apk add --no-cache iproute2 iputils',
                    'ip addr add 192.168.10.1/24 dev eth1',
                    'ip link set eth1 up'
                ]
            },
        },
        {
            id: 'host2',
            type: 'default',
            position: { x: 200, y: 300 },
            data: {
                label: 'host2',
                kind: 'linux',
                image: 'alpine:latest',
                exec: [
                    'apk add --no-cache iproute2 iputils',
                    'ip addr add 192.168.10.2/24 dev eth1',
                    'ip link set eth1 up'
                ]
            },
        },
        {
            id: 'host3',
            type: 'default',
            position: { x: 400, y: 300 },
            data: {
                label: 'host3',
                kind: 'linux',
                image: 'alpine:latest',
                exec: [
                    'apk add --no-cache iproute2 iputils',
                    'ip addr add 192.168.20.1/24 dev eth1',
                    'ip link set eth1 up'
                ]
            },
        },
        {
            id: 'host4',
            type: 'default',
            position: { x: 550, y: 300 },
            data: {
                label: 'host4',
                kind: 'linux',
                image: 'alpine:latest',
                exec: [
                    'apk add --no-cache iproute2 iputils',
                    'ip addr add 192.168.20.2/24 dev eth1',
                    'ip link set eth1 up'
                ]
            },
        }
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
        },
        {
            id: 'e-br-host3',
            source: 'br',
            target: 'host3',
            sourceHandle: null,
            targetHandle: null,
            animated: true,
            label: 'eth3 : eth1',
            data: { sourceInt: 'eth3', targetInt: 'eth1' }
        },
        {
            id: 'e-br-host4',
            source: 'br',
            target: 'host4',
            sourceHandle: null,
            targetHandle: null,
            animated: true,
            label: 'eth4 : eth1',
            data: { sourceInt: 'eth4', targetInt: 'eth1' }
        }
    ]
};
