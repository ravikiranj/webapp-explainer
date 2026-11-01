---
title: How a rate limiter grows from one node to many regions
renderer: canvas
voices: af_heart, am_michael, bf_emma, bm_george   # the first is the default; "none" for no voice
speed: 1.0
---

## 1. One key, one limit {#overview}

1. A client calls an API with a key. The business allows 20 requests each second for that key.
   - show: client, limiter, API
   - move: a stream of dots from the client to the API
2. A rate limiter counts the requests for each key and rejects the extra ones.
   - highlight: limiter
   - move: some dots turn red and stop at the limiter

## 2. One node {#stage-1-node}

1. One server sees every request for the key, so it can count in its own memory.
   - show: one server with a counter inside
2. A token bucket refills 20 tokens each second. Each request takes one token.
   - show: a bucket with 20 tokens; dots take tokens
3. When the bucket is empty, the next request is rejected. The limit holds.
   - move: a red dot bounces off the empty bucket
   - hold: 1.2

## 3. Ten nodes {#stage-10-nodes}

1. Traffic grows to ten servers behind a load balancer. The limit grows to 200 each second.
   - show: load balancer, ten servers
2. Each server still counts alone, so each one admits 200 each second.
   - write: "200 / s" under each server
3. Together they admit 2,000 each second. That is ten times the limit.
   - write: the total in red, "10x the limit"
   - hold: 1.2
4. The fix is one shared store. Every server reads and writes the same counter.
   - show: a shared store; lines from each server to it

## 4. Fifty nodes, three regions {#stage-50-nodes}

1. Now fifty servers run in three regions, and the limit is 5,000 each second.
   - show: three regions with servers
2. Every check must reach the shared store, often in another region. The store becomes a hot spot.
   - move: long red lines from the far regions to the store
3. The fix is to split the limit into fifty quotas of 100. Each server checks its own quota, with no remote read.
   - write: "100 / s" on each server; the long lines fade

## 5. Full scale, proposed {#stage-full-scale}

1. At full scale, 300 servers share a limit of 100,000 each second, and the load is not even.
   - show: bars of uneven load against the same quota line
2. A fixed quota wastes budget. Busy servers reject, while quiet servers leave tokens unused.
   - highlight: the busy bar over the line in red, the quiet bars with grey space
3. The proposed fix: each server keeps a local token bucket and syncs its used tokens in the background.
   - show: small buckets; dashed sync lines to a coordinator
4. Quiet servers lend spare tokens to busy ones, and the total limit still holds.
   - move: tokens from a quiet bar to the busy bar
   - hold: 1.2

## 6. Trade-offs {#techniques}

1. Each step trades some accuracy or speed for scale.
   - show: a row for each technique
2. Pick the simplest technique that holds the limit at your size.
   - highlight: each row in turn
   - hold: 1.5

## Sources

- 1.1, 3.1, 4.1, 5.1: the limits, node counts and regions in output/src/domain.ts (STAGES).
- 3.2, 3.3: naiveOutcome() in output/src/domain.ts: admitted rate = limit x nodes.
- 4.3: quotaShares() in output/src/domain.ts: 5,000 / 50 = 100.
- 5.3, 5.4: the "Full scale" stage in output/src/sections/stages.ts. The app marks it as proposed.
