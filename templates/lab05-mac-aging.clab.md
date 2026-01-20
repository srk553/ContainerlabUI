# MAC Aging & Flushing — Containerlab Tutorial

---

## 1️⃣ What is MAC Aging? (Concept)

* Switches **learn MAC → port mappings dynamically**
* These entries **expire** if traffic is not seen
* Prevents:

  * Stale entries
  * Loops
  * Wrong forwarding after topology change

### Typical Defaults

| Device       | MAC Aging       |
| ------------ | --------------- |
| Linux bridge | **300 seconds** |
| Cisco        | 300 sec         |
| Juniper      | 300 sec         |

---

## 2️⃣ Base Topology (Reuse Two-Host Bridge)

```
host1 ─┐
       ├── br0
host2 ─┘
```

---

### `lab-mac-aging.clab.yml`

```yaml
name: lab-mac-aging

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
```

---

## 3️⃣ Trigger MAC Learning

```bash
docker exec -it clab-lab-mac-aging-host1 ping 10.0.0.2
```

---

### View MAC Table

```bash
docker exec -it clab-lab-mac-aging-br bridge fdb show
```

Example output:

```
02:42:ac:11:00:02 dev eth2 master br0
02:42:ac:11:00:01 dev eth1 master br0
```

➡️ Explain:

* MAC learned dynamically
* Stored in **Forwarding Database (FDB)**

---

## 4️⃣ Check MAC Aging Timer

```bash
docker exec -it clab-lab-mac-aging-br bridge -d fdb show
```

You’ll see:

```
02:42:ac:11:00:01 dev eth1 master br0 used 3/300
```

### Meaning:

* `used 3/300` → seen 3 seconds ago, expires at 300 sec

---

## 5️⃣ Demonstrate MAC Aging (Natural Expiry)

### Step 1 — Stop Traffic

```bash
# Stop pings
```

### Step 2 — Wait

```bash
sleep 310
```

### Step 3 — Check Again

```bash
docker exec -it clab-lab-mac-aging-br bridge fdb show
```

➡️ MAC entry **disappears**

---

## 6️⃣ Change MAC Aging Time (Important Demo)

### Reduce aging to 60 seconds

```bash
docker exec clab-lab-mac-aging-br ip link set br0 type bridge ageing_time 6000
```

> Value is in **milliseconds**

---

### Verify

```bash
docker exec clab-lab-mac-aging-br bridge -d fdb show
```

Now you’ll see:

```
used 2/60
```

➡️ Perfect moment to compare with **enterprise switches**

---

## 7️⃣ MAC Flushing (Manual Flush)

### Flush entire MAC table

```bash
docker exec clab-lab-mac-aging-br bridge fdb flush br br0
```

### Verify

```bash
docker exec -it clab-lab-mac-aging-br bridge fdb show
```

➡️ Empty table

---

## 8️⃣ Flush MACs for a Specific Port

```bash
docker exec clab-lab-mac-aging-br bridge fdb flush dev eth1
```

➡️ Explain:

* Used during:

  * Port issues
  * STP events
  * Network changes

---

## 9️⃣ Observe Flooding After Flush

### Run tcpdump on bridge

```bash
docker exec -it clab-lab-mac-aging-br tcpdump -i br0
```

### Trigger traffic again

```bash
docker exec -it clab-lab-mac-aging-host1 ping 10.0.0.2
```

➡️ Show:

* Unknown unicast flooding
* Re-learning process


