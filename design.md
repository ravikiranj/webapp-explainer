1. Goal
   1. Build a small static webapp that explains one subject. Call the subject [SUBJECT]. Replace [SUBJECT] with the real subject before you start.
   2. [SUBJECT] can be a software project, a repository, a system design, or a concept, from any domain.
   3. Put a list of topics in the left panel and a visualization in the right panel.
   4. Keep text short. Use pictures and charts more than words.
   5. Use mock data first. Do not call real services.

2. Stack
   1. Use Vite and TypeScript. Do not use a UI framework.
   2. Use Bootstrap 5.3 and Bootstrap Icons. Reuse a Bootstrap component for every part that has one. Write custom CSS only for a part that Bootstrap does not have.
      1. Navigation: nav, nav-pills, list-group. Panels and metrics: card. Callouts: alert. Labels: badge. Buttons: btn. Inputs: form-range, form-select, form-check. Tables: table. Progress: progress. Steps: list-group or nav-tabs. Layout: container, row, col, d-flex.
      2. Set colours with Bootstrap variables and data-bs-theme, not with new colour rules.
   3. Add only the libraries that [SUBJECT] needs: ECharts for standard charts, d3 for custom diagrams, MapLibre GL JS for maps. Many subjects need none of them.
   4. Install each package with this exact command: npm install --save-exact <package>.

3. Structure
   1. Put a left nav and a right content area in index.html. In src/main.ts, build the nav from a list of sections. Show one section at a time.
   2. In src/sections/*.ts, put one file for each topic. Each file must export id, group, title, icon, badge, caption, and render(el). Pick topics that fit [SUBJECT]:
      1. Software or repository: overview, architecture, module map, data flow, dependencies, build and deploy, risks.
      2. Concept: definition, context, how it works, comparisons, examples, open questions.
   3. In src/domain.ts, put the rules and the data.
      1. For software, copy the real rules and data shapes. Extract the real structure at build time with scripts in the scripts folder. Freeze it as static JSON. Do not call a live API or run git at run time.
      2. For a concept, write a short model, name its source, and add mock data that teaches the idea.
   4. In src/viz/*.ts, put one file for each d3 view or map view.
   5. Put code that many apps use in a shared folder.

4. Rules for the content
   1. Write all visible text in ASD-STE100 Simplified Technical English. Use short sentences and active voice. Do not use contractions.
   2. Show one idea in each section. Pick the smallest set of sections that teaches [SUBJECT].
   3. Make mock data repeatable with a seeded random function.
   4. Make the page work with no outside network calls. Host all data, fonts, icons, images, and libraries yourself.
   5. Name the source of each data set. Show licence text when the licence needs it. For a repository, name the commit or the tag.
   6. Mark each idea that is only a proposal with a "proposed" label.

5. Things that cause problems
   1. Set base: './' in vite.config.ts. This lets the app work under any path.
   2. Import the Bootstrap JavaScript one time, in main.ts. Without it, the tabs do not work.
   3. Draw each chart and map only when its tab is visible, because a hidden tab has no size. Remove it when the user leaves the section.
   4. MapLibre 6 has no default export. Use import * as maplibregl from 'maplibre-gl'. Import the worker file with the ?url suffix and call setWorkerUrl(url). There is no base map, so add local GeoJSON layers. For a headless screenshot, set canvasContextAttributes to { preserveDrawingBuffer: true }.
   5. Skip each library that [SUBJECT] does not need.
   6. Python http.server can send the wrong content type for .mjs, .wasm, .woff2, and .geojson files. Check the server log. If a type is wrong, rename the file or add the type by hand.

6. Build and run
   1. Run npm run build. Fix all TypeScript errors.
   2. Use Python 3.7 or newer. Check with python3 --version.
   3. Start the server in the background. Bind it to 127.0.0.1 only. Write a log file and a PID file.
      nohup python3 -m http.server <PORT> --bind 127.0.0.1 --directory dist > server.log 2>&1 &
      echo $! > server.pid
   4. Check that the server binds to localhost only. The output of lsof -nP -iTCP:<PORT> -sTCP:LISTEN must show 127.0.0.1:<PORT>. It must not show *:<PORT> or 0.0.0.0:<PORT>. If it does, restart with --bind 127.0.0.1.
   5. Check that the app answers. The command curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:<PORT>/ must return 200. Add the result and the time to server.log.
   6. After each change, run npm run build again and reload the browser. The server needs no restart.

7. Check your work
   1. The build passes and the page works with the network off.
   2. Search your CSS. Each custom class must have no Bootstrap equivalent (see 2.2).
   3. Look at each section in a real browser or a headless screenshot, in both themes.
   4. The health check in 6.5 returned 200.
   5. Stop the server with kill "$(cat server.pid)". Remove server.pid and server.log.

8. Improve the experience
   1. Follow 2.2 for every new part. Use Bootstrap Icons, not emoji. Bundle one font.
   2. Use a light theme by default, with a dark sidebar. Add a saved theme switch to every app and to the index. Draw charts with theme colours. Use one colour for one meaning, and show a legend. Keep data text high-contrast.
   3. Show the main idea as a live simulation (play, pause, sliders, instant effect) or as a step-through diagram (step list, highlighted part, Prev and Next). Add tooltips and zoom to other charts.
   4. Start each section with a short lead: the situation, why the last step fails, why the fix works, and what each chart shows. In the index, show the design first. Add a link back to the index and a "problem" section to every app.
   5. For a skill, judge an action by its effect: compare the state before and after. Undo one step on a mistake. Add a "show solution" control.
