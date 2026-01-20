
# LAB 1  One Bridge + One Host (Very Basics)

## Concept

- A **Linux bridge** works like a **Layer-2 switch**
- With **only one host connected**, there is:
  - Basic connectivity
  - No real switching decision
  - No meaningful MAC learning yet

This lab is meant to **visually and conceptually introduce a bridge** before adding complexity.

---

## Topology

```

+---------+        +----------------+
|         |        |                |
|  host1  |--------|      br0       |
|         |  eth0  |   Linux Bridge |
+---------+        |                |
                   +----------------+


```

- `br0` → Linux bridge
- `host1` → Single Linux host connected to the bridge

---

## lab01-single-host.clab.yml

```yaml
name: lab01-single-host

topology:
  nodes:
    br:
      kind: linux
      image: alpine:latest
      exec:
        - apk add --no-cache bridge-utils iproute2
        - ip link add br0 type bridge
        - ip link set br0 up

    host1:
      kind: linux
      image: alpine:latest
      exec:
        - apk add --no-cache iproute2 iputils

  links:
    - endpoints: ["host1:eth0", "br:eth1"]
````

---

## Deploy the Lab

```bash
containerlab deploy -t lab01-single-host.clab.yml
```

---

## Observe the Bridge

Check which interfaces are attached to the bridge:

```bash
docker exec -it clab-lab01-single-host-br bridge link
```

Expected output (example):

```
2: eth1: <BROADCAST,MULTICAST,UP,LOWER_UP> master br0 state forwarding priority 32 cost 2
```

---

## Explanation

### 1. Bridge Exists

* `br0` is created using:

  ```bash
  ip link add br0 type bridge
  ```
* It behaves like a **software Layer-2 switch**

---

### 2. One Interface Is Attached

* `eth1` from the bridge container is connected to `host1:eth0`
* The interface is now a **bridge port**

---

### 3. No MAC Learning Yet

* MAC learning happens when:

  * Frames arrive **from different ports**
* With **only one host**:

  * No switching decision is required
  * The bridge has nothing to compare against
  * The forwarding database (FDB) is effectively trivial

You can verify this with:

```bash
docker exec -it clab-lab01-single-host-br bridge fdb show
```

Result:

* Either empty
* Or only local/self entries

---

## Key Takeaway

> A bridge with a single connected host proves that the bridge exists and works,
> but **switching behavior only becomes visible once multiple hosts are added**

