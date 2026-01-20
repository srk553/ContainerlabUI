
# LAB 3  VLANs on a Linux Bridge

## Concept

- One Linux bridge (`br0`)
- Multiple VLANs on the same bridge
- Hosts are placed in **different broadcast domains**
- **No Layer 3 routing**
- Communication **must fail**

➡️ This lab demonstrates **VLAN-based isolation**

---

## Topology (ASCII Diagram)

```

```
          Linux Bridge (br0)
    ┌─────────────────────────┐
    │                         │
    │   VLAN 10     VLAN 20   │
    │   (Access)   (Access)  │
    │                         │
    │  eth1        eth2       │
    │   |           |         │
    └───┼───────────┼─────────┘
        |           |
    ┌───┴───┐   ┌───┴───┐
    │ host1  │   │ host2  │
    │ VLAN10 │   │ VLAN20 │
    │10.10.10.1│ │10.20.20.1│
    └────────┘   └────────┘
```

```

---

## Broadcast Domains

```

VLAN 10 Broadcast Domain
┌──────────────────────┐
│ host1 (10.10.10.1)   │
└──────────────────────┘

VLAN 20 Broadcast Domain
┌──────────────────────┐
│ host2 (10.20.20.1)   │
└──────────────────────┘

````

➡️ Even though both hosts connect to the **same bridge**,  
they live in **separate Layer 2 worlds**.

---

## Containerlab Topology File

### `lab03-vlan-bridge.clab.yml`

```yaml
name: lab03-vlan-bridge

topology:
  nodes:
    br:
      kind: linux
      image: alpine:latest
      exec:
        - apk add --no-cache bridge-utils iproute2
        - ip link add br0 type bridge vlan_filtering 1
        - ip link set br0 up

    host1:
      kind: linux
      image: alpine:latest
      exec:
        - apk add --no-cache iproute2 iputils
        - ip addr add 10.10.10.1/24 dev eth0
        - ip link set eth0 up

    host2:
      kind: linux
      image: alpine:latest
      exec:
        - apk add --no-cache iproute2 iputils
        - ip addr add 10.20.20.1/24 dev eth0
        - ip link set eth0 up

  links:
    - endpoints: ["host1:eth0", "br:eth1"]
    - endpoints: ["host2:eth0", "br:eth2"]
````

---

## VLAN Configuration (Inside Bridge)

```bash
# VLAN 10 on eth1 (host1)
docker exec clab-lab03-vlan-bridge-br \
  bridge vlan add dev eth1 vid 10 pvid untagged

# VLAN 20 on eth2 (host2)
docker exec clab-lab03-vlan-bridge-br \
  bridge vlan add dev eth2 vid 20 pvid untagged
```

---

## Verification

### Check VLAN membership

```bash
docker exec clab-lab03-vlan-bridge-br bridge vlan show
```

Expected:

```
eth1  10 PVID Egress Untagged
eth2  20 PVID Egress Untagged
```

---

## Test Connectivity

```bash
docker exec -it clab-lab03-vlan-bridge-host1 ping 10.20.20.1
```

❌ **Ping fails**

---

## Why Does It Fail?

```
host1 (VLAN 10) ─X─ host2 (VLAN 20)
```

* VLANs create **separate broadcast domains**
* ARP requests never cross VLAN boundaries
* No router = no inter-VLAN communication

---

## Key Takeaways

* ✅ Same bridge ≠ same network
* ✅ VLANs isolate traffic at **Layer 2**
* ❌ No routing → no communication
* 🔜 Next lab: **Inter-VLAN Routing using a Linux Router**

---


