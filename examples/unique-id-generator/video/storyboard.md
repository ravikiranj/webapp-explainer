---
title: How a unique ID generator scales
renderer: manim
voices: af_heart, am_michael, bf_emma, bm_george   # the first is the default; "none" for no voice
speed: 1.0
---

## 1. One node {#stage-1}

1. One node counts up: 1, 2, 3. Every ID is new, and the order matches the time.
   - show: a counter that ticks up
2. At 100 IDs each second, one counter in memory is enough.

## 2. Ten nodes {#stage-10}

1. Ten nodes each start the same counter at 1, so they issue the same IDs.
   - show: ten counters with the same value
2. Nine of every ten IDs collide: 9,000 of the 10,000 IDs each second.
   - write: the count in red
3. A random UUID has 122 random bits. The expected collisions each second are n squared over 2 times 2 to the 122.
   - write: the formula
4. At one million IDs each second, that is about 10 to the minus 25. But random IDs have no time order.
   - write: the number; then the shuffled order
   - hold: 1.2

## 3. Hundred nodes, five regions {#stage-100}

1. A Snowflake ID packs 64 bits: 1 sign bit, 41 bits of time, 10 bits of node, and 12 bits of sequence.
   - show: the bar of 64 bits in four fields
2. Time comes first, so IDs sort by time across nodes, within the clock skew.
   - highlight: the time field
3. The node field gives each node its own space: 2 to the 10 is 1,024 nodes.
   - highlight: the node field
4. The sequence allows 2 to the 12, which is 4,096 IDs each millisecond on each node.
   - highlight: the sequence field
5. Together that is about 4.2 billion IDs each second, far above one million.
   - write: the product
   - hold: 1.2

## 4. Pick by need {#techniques}

1. A counter for one node. A random UUID for no coordination. A Snowflake ID for unique IDs that sort by time.
   - show: three rows
   - hold: 1.5

## Sources

- 1.2, 2.1, 3.1 heading: STAGES in output/src/domain.ts (100, 10,000 and 1,000,000 IDs each second).
- 2.2: naiveCounterOutcome(): 10,000 x 9 / 10 = 9,000.
- 2.3, 2.4: uuidCollisionsPerSecond(): n^2 / (2 x 2^122); at n = 10^6 it is 9.4 x 10^-26.
- 3.1 to 3.5: SNOWFLAKE_LAYOUT, maxNodes(), sequencePerMs() and snowflakeCeilingPerSecond(): 4,096 x 1,000 x 1,024 = 4,194,304,000.
- 3.x: the app marks the Snowflake stage as proposed.
