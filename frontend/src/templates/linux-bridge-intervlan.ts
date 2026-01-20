// Avoid circular dependency by not importing from ./index
export const linuxBridgeInterVlan = {
    id: 'linux-bridge-intervlan',
    name: 'Linux Bridge Inter-VLAN',
    description: '6-node topology: Router-on-a-Stick with Linux subinterfaces (VLAN 10/20) and a VLAN-aware bridge.',
    nodes: [
        {
            id: 'r1',
            type: 'default',
            position: { x: 300, y: 50 },
            data: {
                label: 'r1',
                kind: 'linux',
                image: 'alpine:latest',
                exec: [
                    'apk add --no-cache iproute2 iputils',
                    'sysctl -w net.ipv4.ip_forward=1',
                    'ip link add link eth1 name eth1.10 type vlan id 10',
                    'ip link add link eth1 name eth1.20 type vlan id 20',
                    'ip addr add 192.168.10.254/24 dev eth1.10',
                    'ip addr add 192.168.20.254/24 dev eth1.20',
                    'ip link set eth1 up',
                    'ip link set eth1.10 up',
                    'ip link set eth1.20 up'
                ]
            },
        },
        {
            id: 'br',
            type: 'default',
            position: { x: 300, y: 250 },
            data: {
                label: 'br',
                kind: 'linux',
                image: 'alpine:latest',
                exec: [
                    'apk add --no-cache bridge-utils iproute2 vlan',
                    'ip link add br0 type bridge vlan_filtering 1',
                    'ip link set br0 up',
                    'ip link set eth1 master br0',
                    'ip link set eth2 master br0',
                    'ip link set eth3 master br0',
                    'ip link set eth4 master br0',
                    'ip link set eth5 master br0',
                    'ip link set eth1 up',
                    'ip link set eth2 up',
                    'ip link set eth3 up',
                    'ip link set eth4 up',
                    'ip link set eth5 up',
                    'bridge vlan add vid 10 dev eth1 pvid untagged',
                    'bridge vlan add vid 10 dev eth2 pvid untagged',
                    'bridge vlan add vid 20 dev eth3 pvid untagged',
                    'bridge vlan add vid 20 dev eth4 pvid untagged',
                    'bridge vlan add vid 10 dev eth5',
                    'bridge vlan add vid 20 dev eth5'
                ]
            },
        },
        {
            id: 'host1',
            type: 'default',
            position: { x: 50, y: 450 },
            data: {
                label: 'host1',
                kind: 'linux',
                image: 'alpine:latest',
                exec: [
                    'apk add --no-cache iproute2 iputils',
                    'ip addr add 192.168.10.1/24 dev eth1',
                    'ip route add default via 192.168.10.254',
                    'ip link set eth1 up'
                ]
            },
        },
        {
            id: 'host2',
            type: 'default',
            position: { x: 200, y: 450 },
            data: {
                label: 'host2',
                kind: 'linux',
                image: 'alpine:latest',
                exec: [
                    'apk add --no-cache iproute2 iputils',
                    'ip addr add 192.168.10.2/24 dev eth1',
                    'ip route add default via 192.168.10.254',
                    'ip link set eth1 up'
                ]
            },
        },
        {
            id: 'host3',
            type: 'default',
            position: { x: 400, y: 450 },
            data: {
                label: 'host3',
                kind: 'linux',
                image: 'alpine:latest',
                exec: [
                    'apk add --no-cache iproute2 iputils',
                    'ip addr add 192.168.20.1/24 dev eth1',
                    'ip route add default via 192.168.20.254',
                    'ip link set eth1 up'
                ]
            },
        },
        {
            id: 'host4',
            type: 'default',
            position: { x: 550, y: 450 },
            data: {
                label: 'host4',
                kind: 'linux',
                image: 'alpine:latest',
                exec: [
                    'apk add --no-cache iproute2 iputils',
                    'ip addr add 192.168.20.2/24 dev eth1',
                    'ip route add default via 192.168.20.254',
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
            animated: true,
            label: 'eth1 : eth1',
            data: { sourceInt: 'eth1', targetInt: 'eth1' }
        },
        {
            id: 'e-br-host2',
            source: 'br',
            target: 'host2',
            animated: true,
            label: 'eth2 : eth1',
            data: { sourceInt: 'eth2', targetInt: 'eth1' }
        },
        {
            id: 'e-br-host3',
            source: 'br',
            target: 'host3',
            animated: true,
            label: 'eth3 : eth1',
            data: { sourceInt: 'eth3', targetInt: 'eth1' }
        },
        {
            id: 'e-br-host4',
            source: 'br',
            target: 'host4',
            animated: true,
            label: 'eth4 : eth1',
            data: { sourceInt: 'eth4', targetInt: 'eth1' }
        },
        {
            id: 'e-r1-br',
            source: 'r1',
            target: 'br',
            animated: true,
            label: 'eth1 : eth5',
            data: { sourceInt: 'eth1', targetInt: 'eth5' }
        }
    ]
};
