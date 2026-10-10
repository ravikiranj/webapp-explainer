Concept to learn: a city's traffic signal timing, from one intersection to
a coordinated, city-wide system, at increasing scale.

Problem:
- One intersection must let cars wait no more than 90 seconds at a red
  light, on average.
- The city starts with 1 intersection, with 500 cars per hour passing
  through it, timed by a fixed, repeating signal cycle.
- The city grows to 20 intersections, in one line, for example along one
  main road, with 10,000 cars per hour total, and each intersection still
  timed on its own, with no knowledge of its neighbors.
- The city grows to 500 intersections, across the whole city, with
  200,000 cars per hour total, and traffic patterns that shift through the
  day, for example a morning rush toward downtown, and an evening rush
  away from it.
- The 90-second average wait rule must hold at every step, for most cars,
  not only on one road, at one time of day.

Task:
- Build a concept explainer webapp, as specified in the template.
- Add one section for each step, from simplest to most complex.
- Show, with numbers, what breaks at each step, for example a wait time
  that grows past 90 seconds, or a jam that forms between intersections.
- Show, with numbers, how the fix solves the problem at each step.
