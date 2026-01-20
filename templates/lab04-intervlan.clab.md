# LAB 4 Inter-VLAN Routing (Router-on-a-Stick)

## Concept

- One Linux bridge (`br0`) with VLAN filtering
- Multiple VLANs (VLAN 10 and VLAN 20)
- Hosts in **different VLANs**
- A Linux router providing **Layer 3 routing**
- Communication **succeeds via default gateway**

➡️ This lab demonstrates **Inter-VLAN Routing using Router-on-a-Stick**

---

## Topology (ASCII Diagram)

```

```
                     Linux Bridge (br0)
    ┌────────────────────────────────────────┐
    │                                        │
    │   VLAN 10        VLAN 20               │
    │   (Access)       (Access)              │
    │                                        │
    │  eth1            eth2        eth3      │
    │   |               |           |        │
    │   |               |        (Trunk)     │
    └───┼───────────────┼───────────┼────────┘
        |               |           |
    ┌───┴───┐       ┌───┴───┐   ┌───┴────────┐
    │ host1  │       │ host2  │   │  router   │
    │ VLAN10 │       │ VLAN20 │   │ eth0      │
    │10.10.10.1│     │10.20.20.1│ │           │
    └────────┘       └────────┘   │ eth0.10   │
                                   │10.10.10.254
                                   │ eth0.20   │
                                   │10.20.20.254
                                   └───────────┘
```

```

---

## VLAN & Broadcast Domains

```

VLAN 10 (Broadcast Domain)
┌────────────────────────┐
│ host1  10.10.10.1      │
│ router eth0.10 (.254)  │
└────────────────────────┘

VLAN 20 (Broadcast Domain)
┌────────────────────────┐
│ host2  10.20.20.1      │
│ router eth0.20 (.254)  │
└────────────────────────┘

````

➡️ VLANs still isolate Layer 2 traffic  
➡️ The **router participates in both VLANs**

---

## Containerlab Topology File

### `lab04-intervlan.clab.yml`

```yaml
name: lab04-intervlan

topology:
  nodes:
    br:
      kind: linux
      image: alpine:latest
      exec:
        - apk add --no-cache bridge-utils iproute2
        - ip link add br0 type bridge vlan_filtering 1
        - ip link set br0 up

    router:
      kind: linux
      image: alpine:latest
      exec:
        - apk add --no-cache iproute2
        - ip link add link eth0 name eth0.10 type vlan id 10
        - ip link add link eth0 name eth0.20 type vlan id 20
        - ip addr add 10.10.10.254/24 dev eth0.10
        - ip addr add 10.20.20.254/24 dev eth0.20
        - ip link set eth0 up
        - ip link set eth0.10 up
        - ip link set eth0.20 up
        - sysctl -w net.ipv4.ip_forward=1

    host1:
      kind: linux
      image: alpine:latest
      exec:
        - apk add --no-cache iproute2 iputils
        - ip addr add 10.10.10.1/24 dev eth0
        - ip route add default via 10.10.10.254
        - ip link set eth0 up

    host2:
      kind: linux
      image: alpine:latest
      exec:
        - apk add --no-cache iproute2 iputils
        - ip addr add 10.20.20.1/24 dev eth0
        - ip route add default via 10.20.20.254
        - ip link set eth0 up

  links:
    - endpoints: ["host1:eth0", "br:eth1"]
    - endpoints: ["host2:eth0", "br:eth2"]
    - endpoints: ["router:eth0", "br:eth3"]
````

---

## VLAN Assignments on the Bridge

### Access Ports (Untagged)

```bash
# Host1 → VLAN 10
docker exec clab-lab04-intervlan-br \
  bridge vlan add dev eth1 vid 10 pvid untagged

# Host2 → VLAN 20
docker exec clab-lab04-intervlan-br \
  bridge vlan add dev eth2 vid 20 pvid untagged
```

### Trunk Port (Tagged)

```bash
# Router trunk port
docker exec clab-lab04-intervlan-br bridge vlan add dev eth3 vid 10
docker exec clab-lab04-intervlan-br bridge vlan add dev eth3 vid 20
```

---

## Verify VLAN Configuration

```bash
docker exec clab-lab04-intervlan-br bridge vlan show
```

Expected:

```
eth1  10 PVID Egress Untagged
eth2  20 PVID Egress Untagged
eth3  10
eth3  20
```

---

## Test Inter-VLAN Connectivity

```bash
docker exec -it clab-lab04-intervlan-host1 ping 10.20.20.1
```

✅ **Ping succeeds**

---

## Traffic Flow Explanation

```
host1 (10.10.10.1)
   |
   | VLAN 10 (untagged)
   v
router eth0.10 (10.10.10.254)
   |
   | L3 routing (IP forwarding)
   |
router eth0.20 (10.20.20.254)
   |
   | VLAN 20 (tagged → untagged)
   v
host2 (10.20.20.1)
```

---

## Teaching Points

### 1️⃣ Default Gateway

* Hosts send traffic for other networks to the router
* Without a default route → no inter-VLAN communication

### 2️⃣ Tagged vs Untagged

* **Access ports**: untagged (hosts are VLAN-unaware)
* **Trunk port**: tagged (router handles VLAN tags)

### 3️⃣ Router-on-a-Stick

* Single physical interface
* Multiple VLAN subinterfaces
* Common enterprise design pattern

### 4️⃣ Why L3 Devices Are Required

* Bridges & switches operate at Layer 2
* VLANs isolate broadcast domains
* **Routing requires Layer 3 logic**

---

## Key Takeaways

* VLANs still isolate traffic
* Routers connect VLANs
* Trunk links carry multiple VLANs
* This is the foundation of enterprise networking

🔜 **Next labs**:

* Inter-VLAN routing with firewall rules
* VLAN + NAT
* Multiple bridges vs single bridge design

