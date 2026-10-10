Concept to learn: rate limiting, from one node to a distributed,
multi-region deployment, at increasing scale.

Problem:
- The per-key limit starts at 20 TPS. The per-key limit grows to 100,000
  TPS at full scale.
- The total service load starts at 1,000 TPS average, with bursts to
  5,000 TPS. The total service load grows to 1,000,000 TPS.
- The deployment grows in steps: 1 node, then 10 nodes, then 50 nodes
  across 3 regions, then the full target scale.
- The per-key limit must hold true at each step.

Task:
- Build a concept explainer webapp, as specified in the template.
- Add one section for each step, from simplest to most complex.
- Show, with numbers, what breaks at each step.
- Show, with numbers, how the fix solves the problem at each step.
- See design.md for the stages and the techniques to present.
