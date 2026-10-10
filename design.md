1. Goal
   1. Build a small static webapp. The webapp explains one subject. Call the subject [SUBJECT].
   2. [SUBJECT] can be a software project, a code repository, a system design, or a general concept. [SUBJECT] can come from any domain. Examples of domains are science, process, policy, product, and history.
   3. Put a list of topics in the left panel.
   4. Put a visualization in the right panel.
   5. Keep all text short.
   6. Use pictures and charts more than words.
   7. Use mock data first. Do not call real services.
   8. Treat [SUBJECT] as a variable. Replace [SUBJECT] with the real subject before you start work.

2. Stack
   1. Use Vite and TypeScript. Do not use a UI framework.
   2. Use Bootstrap 5.3 for layout, forms, and tabs.
   3. Add only the libraries that [SUBJECT] needs.
      1. Use ECharts for standard charts.
      2. Use d3 for custom charts and diagrams.
      3. Use MapLibre GL JS for maps.
      4. A general concept may need none of these three libraries.
      5. A software repository may need only d3, for example to draw a dependency graph.
      6. A logistics concept may need MapLibre.
   4. Install each package with this exact command: npm install --save-exact <package>.

3. Structure
   1. Put a left nav and a right content area in index.html.
   2. In src/main.ts, build the nav from a list of sections. Show one section at a time.
   3. In src/sections/*.ts, put one file for each topic. Each file must export id, group, title, icon, badge, caption, and render(el).
      1. Pick topics that fit [SUBJECT].
      2. For a software project or a code repository, use topics like these: overview, architecture, module map, data flow, dependencies, build and deploy, and risks.
      3. For a general concept, use topics like these: definition, context, how it works, comparisons, examples, and open questions.
   4. In src/domain.ts, put the rules and the mock data for [SUBJECT].
      1. For a software project, copy the validation rules and the data shapes from the real code or the real API. Use the scripts folder to extract real structure, for example the file tree, the dependency graph, module sizes, and commit statistics, at build time. Freeze the result into static JSON files. Do not call a live API at run time. Do not run git commands at run time.
      2. For a general concept, write a short model of the concept. Name the source of the model. Add mock example data. Make the mock data good enough to teach the idea.
   5. In src/viz/*.ts, put one file for each d3 view or map view.
   6. In the scripts folder, put the build-time scripts for data preparation and data extraction. See section 6, Build and run, for the server command.

4. Rules for the content
   1. Write all visible text in ASD-STE100 Simplified Technical English. Use short sentences. Use active voice. Do not use contractions.
   2. Show one idea in each section.
   3. Make the mock data repeatable. Use a seeded random function.
   4. Make the page work with no outside network calls. Host all data files, all font files, and all library files yourself.
   5. Name the source of each data set.
      1. Show the licence text on the page when the licence needs it.
      2. If [SUBJECT] is a repository, name the repository. Name the commit or the tag that the data came from.
   6. Mark each idea that is only a proposal. For example, add a label that says "proposed".
   7. Pick the smallest set of sections that teaches [SUBJECT]. Do not add empty topics to the nav.

5. Things that cause problems
   1. Set base: './' in vite.config.ts. This setting lets the app work under any path.
   2. Import the bootstrap JavaScript file one time, in main.ts. Without this import, the tabs do not work.
   3. Draw each chart and each map only when its tab is visible. A hidden tab has no size.
   4. Remove each chart and each map when the user leaves a section.
   5. MapLibre version 6 has no default export. Use this import line: import * as maplibregl from 'maplibre-gl'.
   6. MapLibre needs its worker file. Import the worker file with the ?url suffix. Call setWorkerUrl(url) with the result.
   7. MapLibre shows no base map unless you add one. Add local GeoJSON layers instead.
   8. To take a headless screenshot of a map, set canvasContextAttributes to { preserveDrawingBuffer: true }.
   9. Skip each library that [SUBJECT] does not need. Do not add empty code paths for d3, ECharts, or MapLibre.
   10. The Python http.server module may not know all file types. Check the server log for files that come back with the wrong content type, for example .mjs, .wasm, .woff2, or .geojson files. If this problem happens, rename the file, or change the file to a known type, or add the correct type by hand with the HTTP headers that your browser dev tools show.

6. Build and run
   1. Run npm run build. Fix all TypeScript errors.
   2. Check the Python version first with this command: python3 --version. The version must be 3.7 or newer, to support the --bind flag and the --directory flag.
   3. Start the server in the background. Bind the server to 127.0.0.1 only. Write a log file. Write a PID file.
      nohup python3 -m http.server <PORT> --bind 127.0.0.1 --directory dist > server.log 2>&1 &
      echo $! > server.pid
   4. Verify that the process runs and that the process binds to localhost only.
      1. Run this command: ps -p "$(cat server.pid)" -o pid,cmd.
      2. Run this command: lsof -nP -iTCP:<PORT> -sTCP:LISTEN.
      3. Check the output of the lsof command. The output must show 127.0.0.1:<PORT>. The output must not show *:<PORT> or 0.0.0.0:<PORT>.
      4. If the output shows the wrong address, stop the process. Start the process again with the --bind flag set to 127.0.0.1.
   5. Confirm that the app answers.
      1. Run this command: curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:<PORT>/.
      2. Expect the result 200.
      3. Add the result and the current time to server.log, as a record of this check.
   6. Run npm run build again after each change. Reload the browser. The server reads files from disk on each request. The server needs no restart to show new files.
   7. When the work is done, stop the server. Remove the record files.
      1. Run this command: kill "$(cat server.pid)".
      2. Run this command: rm -f server.pid server.log.

7. Check your work
   1. Confirm that the build passes.
   2. Confirm that the page works with the network off.
   3. Look at each section in a real browser, or in a headless screenshot.
   4. Confirm that the server log shows the bind address 127.0.0.1. Confirm that the health check in section 6.5 returned 200.
   5. Do not leave test servers or test files behind.
      1. Stop the process named in server.pid.
      2. Remove the files server.pid and server.log.

8. Improve the experience
   1. Give the app a dark theme and a light theme. Add a theme switch to every app and to the index. Save the choice. Draw each chart with colours from the theme, and redraw each chart when the theme changes.
   2. Make all text easy to read in both themes. Do not use low-contrast grey text for data values. Test each colour against its background.
   3. Make the main view a live simulation when the subject allows it. Add a play control, a pause control, and sliders for the key inputs. Let the user change an input while the simulation runs. Show the effect at once. A static chart teaches less than a model that the user drives.
   4. Make each diagram interactive. Add tooltips, hover highlights, and zoom. Do not leave a diagram static.
   5. Write a short lead for each section. State the situation. State why the last step fails. State why the fix works. State what each chart shows. Do not show numbers without words.
   6. Give the index the same side navigation as the apps. Show the design first. List the example apps below the design. Add a link back to the index from every app. Add one section to each app for the original problem.
   7. When the subject is a skill, judge an action by its effect, not by one fixed answer. Compare the state before and after. When a step is wrong, undo one step only. Do not reset the whole task. Add a control that shows the solution.
   8. Load every asset from the app itself. Bundle images, fonts, and any engine. Do not call a third party at run time.
