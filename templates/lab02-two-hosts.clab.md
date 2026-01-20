# LAB 2  One Bridge + Two Hosts (MAC Learning)

## Concept

- A **Linux bridge** behaves like a Layer 2 switch  
- It **learns MAC addresses dynamically** by observing source MACs of incoming frames  
- No IP configuration is required on the bridge itself  

---

## Topology

```

+--------+        +------+
| host1  |        |      |
|10.0.0.1|--------| br0  |
|  eth0  |        |      |
+--------+        |      |
|      |
+--------+        |      |
| host2  |--------|      |
|10.0.0.2|  eth0  |      |
+--------+        +------+

````

- `br0` is a Linux bridge
- `host1` and `host2` are simple Linux hosts
- All communication happens at **Layer 2**

---

## Containerlab File

**`lab02-two-hosts.clab.yml`**

```yaml
name: lab02-two-hosts

topology:
  nodes:
    br:
      kind: linux
      image: alpine:latest
      exec:
        - apk add --no-cache bridge-utils iproute2 tcpdump
        - ip link add br0 type bridge
        - ip link set br0 up

    host1:
      kind: linux
      image: alpine:latest
      exec:
        - apk add --no-cache iproute2 iputils
        - ip addr add 10.0.0.1/24 dev eth0
        - ip link set eth0 up

    host2:
      kind: linux
      image: alpine:latest
      exec:
        - apk add --no-cache iproute2 iputils
        - ip addr add 10.0.0.2/24 dev eth0
        - ip link set eth0 up

  links:
    - endpoints: ["host1:eth0", "br:eth1"]
    - endpoints: ["host2:eth0", "br:eth2"]
````

---

## Bring Up the Lab

```bash
containerlab deploy -t lab02-two-hosts.clab.yml
```

---

## Initial Bridge State (Before Traffic)

Check the MAC table **before any packets flow**:

```bash
docker exec -it clab-lab02-two-hosts-br bridge fdb show
```

Expected result:

* Either **empty**
* Or only **local bridge MAC entries**
* No host MACs yet

---

## Trigger MAC Learning

Generate traffic between the hosts:

```bash
docker exec -it clab-lab02-two-hosts-host1 ping 10.0.0.2
```

What happens internally:

1. `host1` sends an ARP request (broadcast)
2. Bridge **floods** the frame to all ports
3. Bridge **learns host1’s MAC → eth1**
4. `host2` replies
5. Bridge **learns host2’s MAC → eth2**

---

## Check MAC Table (After Traffic)

```bash
docker exec -it clab-lab02-two-hosts-br bridge fdb show
```

Example output:

```
aa:bb:cc:dd:ee:01 dev eth1 master br0
aa:bb:cc:dd:ee:02 dev eth2 master br0
```

---

## How MAC Learning Works

```
Frame arrives on eth1
Source MAC = MAC1
↓
Bridge records:
MAC1 → eth1
```

### Forwarding Decision Logic

| Destination MAC | Action                   |
| --------------- | ------------------------ |
| Known           | Forward to specific port |
| Unknown         | Flood to all ports       |
| Broadcast       | Flood to all ports       |

---

## Key Teaching Points

### MAC → Port Mapping

* Bridge builds a **Forwarding Database (FDB)**
* Entries are learned **automatically**
* No manual configuration required

### Flooding vs Learning

* **Flooding** happens when destination MAC is unknown
* **Learning** happens from source MAC of incoming frames
* Flooding decreases over time as the MAC table fills

### Why Switches Don’t Need IP

* Switching is **Layer 2**
* Decisions are made using **MAC addresses**
* IP is only required for:

  * Management
  * Layer 3 routing
  * Monitoring

---

## Optional Experiments

* Clear MAC table:

  ```bash
  docker exec -it clab-lab02-two-hosts-br bridge fdb flush
  ```
* Watch learning live:

  ```bash
  docker exec -it clab-lab02-two-hosts-br tcpdump -i eth1
  ```
* Stop traffic and wait → observe **MAC aging**

---

## Outcome

You now understand:

* How a bridge learns MAC addresses
* Why initial traffic is flooded
* How Layer 2 switching works without IP
