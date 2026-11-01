Subject: rate limiting, from one node to a distributed, multi-region deployment.

Audience: engineers who know HTTP services but have not built a rate limiter.

Questions the video must answer:
- What does a per-key limit mean?
- Why does an in-memory counter work on one node and fail on ten?
- What does each fix cost as the deployment grows?

Sources to study:
- problem.md and the app in output/ (src/domain.ts holds the numbers).

Choices:
- About 3 minutes, one chapter for each section of the app.
- Subtitles and four Kokoro voices (two female, two male; American and British English). Renderer: canvas, because the ideas are boxes and flows.
