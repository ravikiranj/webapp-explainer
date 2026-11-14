Concept to learn: how to build a refreshable report. The subject is the ticket queue of a
support team for the last 12 months. All data is mock data from a seeded generator.

Questions:
- How many tickets come in and get resolved each month and each week?
- Which issues come back most often, and what is their cause and their typical resolution?
- Why do tickets happen: our own change, a dependency, a false alarm, or a short blip?
- How long do tickets take to resolve?

Rules:
- Count a ticket by the highest severity it ever reached. High severity means Sev1 and Sev2.
- A week runs from Wednesday 12:00 to the next Wednesday 12:00, UTC.
- Every slide opens with an item selected and its tickets listed. A click on a chart element selects another item. The list is quiet and never scrolls the page.
- The columns of the ticket list sort, and the reader can show, hide and move columns.
- A cause comes from the cause field of the ticket. A reviewer corrects the tickets with a generic field.

Task:
- Build the report as specified in report-design.md.
- Write the generator as a program that a person can run again. The site only reads its data file.
