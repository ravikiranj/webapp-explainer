Concept to learn: a unique ID generator, from one node to a distributed,
multi-region deployment, at increasing scale.

Problem:
- Every ID must be unique. No two requests may ever receive the same ID.
- The generator starts at 100 IDs per second, on one node, with IDs
  stored and compared in memory.
- The generator grows to 10,000 IDs per second, across 10 nodes, with no
  single node seeing every ID that other nodes issue.
- The generator grows to 1,000,000 IDs per second, across 100 nodes in 5
  regions, with network delay between regions.
- The IDs must stay roughly sortable by time of creation, at every step.

Task:
- Build a concept explainer webapp, as specified in the template.
- Add one section for each step, from simplest to most complex.
- Show, with numbers, what breaks at each step, for example a collision
  rate, or a loss of time order.
- Show, with numbers, how the fix solves the problem at each step.
