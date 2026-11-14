# Report design

This document extends [design.md](./design.md) from an explainer to a report: a dashboard or a slide deck that answers a fixed list of questions about a set of data, and that a program can refresh. Give it to an agent with a brief. The agent studies the data, writes a generator program, and builds a static site that shows the result.

A reference implementation is in [examples/support-report/](./examples/support-report/): a seeded mock source, a generator with `fetch` and `build` commands and unit tests, a Vite and TypeScript site with four slides, and a headless browser check. Read design.md first. Its rules for the stack, the content, the sources and the local servers also apply here. This document adds only the parts that a report needs.

1. Goal
    1. Make one report about one subject. Call the subject [SUBJECT]. Replace [SUBJECT] with the real subject before you start.
    2. [SUBJECT] can be a queue of tickets, a service, a cost bill, a survey, a project, or any other set of records that changes over time.
    3. Make the report answer a fixed list of questions. Give each question one slide with one main chart or table.
    4. Make a program, not a person, produce the data. Running the program again must refresh the report. Never edit a generated data file by hand.
    5. Make every number traceable: a click on a chart element lists the records behind it.
    6. Make the report work with the network off. Host all libraries, fonts and icons yourself.

2. Inputs and outputs
    1. The input is a brief, `report.md`. It has:
        1. The subject, the audience, and the period.
        2. The questions. For each question: the chart type if the user has a wish, the filters, and what a click shows.
        3. The data source, and how to read it (a read-only API, a tool, or files).
        4. The definitions of the words that scope a number, for example what "high priority" means. Write each definition once.
        5. The privacy limits: which fields can leave the source and which cannot.
    2. The outputs are:
        1. A generator program with a command for each step (section 4).
        2. A static site in `output/`. It reads one data file, `output/report-data.json`, and works from any path.
        3. Raw data downloads: the JSON file and one or two CSV files. Put them in a Data pane of the settings, once. Do not repeat them on each slide. They hold no private text.
        4. A README with the commands, the options, the upload steps and the known limits.
        5. Tests (section 10).

3. Steps
    1. Study the data first. Make a small throwaway probe: count the records, list the fields, check the limits of the source (page size, rate limit, date range, history), and find what is missing. Write each finding down as a fact.
    2. Write a short plan. Mark each statement Fact, Decided, Proposed or Open, and list the open questions with a proposal for each. Show it to the user.
    3. Build the fetch step: a read-only client with a cache (section 5).
    4. Build the build step: normalize the records and write the data file.
    5. Add the judgement step only if a question needs it (section 6).
    6. Build the slides one at a time. After each slide, load it in a real browser and look at it.
    7. Write the tests, run them, and fix what they find.
    8. Preview locally. Fix what the user asks. Then the user uploads the site by hand.
    9. When the report works, write a script or a skill that runs all the steps. A script needs no new facts, so write it last.

4. The layout of the project
    1. Use this layout. Use the language that fits the data source. A standard-library script is enough for most reports.

        ```
        report/
          main.py            commands: fetch, details, classify, build
          providers/         one client for each data source (read-only)
          report/            normalize, group, link, write the data file
          config/            names, aliases, thresholds, mappings
          data/              reviewed results and the rubric for them (in git)
          output/            the static site (upload this folder)
            index.html  app.js  report.css
            report-data.json  tickets.csv   (generated; not in git if private)
            vendor/          libraries, fonts, icons, with their licences
          tests/             unit tests and a browser check
          README.md
        ```

    2. Give each command one job and make each command safe to run again. A command reads the files of the step before it, so a failed step can resume.
    3. Keep the cache, the logs and the generated data out of git. Keep the config and the reviewed results in git.

5. Rules for the data
    1. Make the client read-only. Keep a list of allowed actions and refuse every other one.
    2. Start one server process for each run. Stop it on exit, on an error, and on a signal. Stop a leftover process of a crashed run at the start.
    3. Limit the calls each second. Cache each answer on disk, keyed by the call, with a time limit. Retry an error that the network edge returns for a short time, with a longer wait each time. Never retry a real error.
    4. Fetch only the fields that a slide uses. Keep private text, such as comments, in the cache. Never put it in the shipped data file or in a download.
    5. Store times as seconds in UTC. Name the time zone that decides the borders of a month or a week. If the team works in weeks that start on a fixed day and hour, compute the week from that rule.
    6. Define each count in words: what is counted, by which date, and in which time zone. For example, "incoming" counts records by create time, and "resolved" counts them by last resolve time.
    7. Count a record by the highest level it ever reached when a later change could hide it. Show both the highest and the current level.
    8. Check the totals against a second query of the source before you trust them.
    9. Expect missing data. Show how many records a number covers, for example "178 of 226 measured", and say why the others are not.
    10. Keep the data file small enough to load at once, a few megabytes at most. Do the counting in the browser, so that every filter answers at once.

6. Judgement steps
    1. Some questions need a person to read text: why a record happened, what caused it, what was done. A program can do the first guess. A reader must check it.
    2. Make fixed rules give a first guess from the fields. Then read the text of each record that matters and correct the guess. Keep the corrections in files in git, with a reason of one line.
    3. Write a rubric: the allowed values of each field, with a definition of each value, and the rule that the text wins over a field that a person filled in.
    4. Key each result by the record id and a hash of the text that was read. A new or changed record is classified again. An unchanged one is not.
    5. Allow the value "unclear". Never invent a value that the text does not support.
    6. Mark each result as reviewed or as an estimate, and show the difference on the slide. A keyword rule is an estimate.
    7. Show how often the field and the text disagree. It tells the reader how far to trust the field.
    8. Ask the user to label a sample of about 30 records. Compare the labels with the result and report the match rate.
    9. If helper agents cannot run, do the review in the main agent, in batches, and write down the method.

7. The slides
    1. Put a list of the slides in the left panel and one slide in the right panel. Keep the keys for Previous and Next. Show one slide at a time.
        1. Make the left panel resizable. Give it a drag handle on its right edge, a minimum width and a maximum width, and a saved width. Make the handle a `role="separator"` that works with the arrow keys. Put this code in the shared shell, so that every app gets it.
        2. Keep the left panel small. Put only the slide list in it. Put every control for the look and the data in the shared settings (section 8).
    2. Give every slide the same parts, in this order:
        1. A title and a scope badge. The badge names the records that the slide counts, for example "High priority", and the filter that is on.
        2. The filters and the controls.
        3. Three to five number cards with the key numbers.
        4. One panel with one chart or one table.
        5. A muted list of records, closed at the start.
        6. A one-line footer with the source and the period.
    3. Pick the chart for the question:
        1. A trend over time: lines. Draw the total as a thick line and each group as a thin line. Give the user a toggle for the measure.
        2. A ranking: horizontal bars, sorted.
        3. A share of a whole: one bar for each part, with the count and the percent. Do not use pie charts. The eye cannot compare slices.
        4. A spread: a histogram with named buckets, and cards for the mean, the median, the lowest and the highest value.
        5. A list of items with several facts: a table with small inline bars, a stacked bar for a mix, and one short text column for a cause or a result.
    4. Use filters of three kinds:
        1. Chips for categories, each with its count. At least one chip stays on.
        2. Range buttons, for example the last month, 3 months, 6 months and 12 months, counted back from the date of the data.
        3. Segmented toggles for the view (lines or bars), the measure, and the period (month or week).
    5. Make every slide open with an item already selected and its records already listed. A reader must never see an empty list. A click on a chart element or a row changes the selection. It does not start it. The list must be quiet:
        1. Pick the default item by a rule that you can state in one line: the latest period, the biggest bar, the top row. Mark the selected item with a tinted background: a band behind the bar or the period on a chart, and a tinted row in a table. A border or a dashed line alone is too weak, because the reader gets no clear sign. Keep the selection when a filter changes. If the item no longer exists, fall back to the default.
        2. Use a `<details>` element with a muted summary line. It is open at the start. The summary names the selection and the count, for example "Tickets: Dependency (574)".
        3. Open it in place. Never scroll the page. Do not call `scrollIntoView`, and do not move the focus in a way that scrolls.
        4. Give the list a maximum height with its own scroll, so that the chart stays in view.
        5. Make the columns of the list sortable. A click on a header sorts by that column, and a second click reverses the order. Mark the sorted header with an arrow and `aria-sort`. Make the headers reachable by keyboard.
        6. Let the reader choose the columns. Let the reader drag a column header to move the column, and give the keyboard the same with Alt and the left or right arrow. Do not use move buttons. Give the list a "Columns" chooser with a check box for each column, and a reset. At least one column stays on. Show only a few columns at the start, and offer the others, for example region, source, resolve time, cause field and resolution text. Never offer a column that holds private text.
        7. Keep the columns and the sort order in the link state, so that a copied link opens the same list.
    6. Make a hover show the period, the count and the rate. For a week, show the range of dates, the incoming count for each day, and the share resolved.
    7. Offer a week view next to the month view when the team works in weeks. Label a week by the date that starts it. Mark the current period as partial.
    8. Put the method on a Method button, in a dialog. Keep the slide itself free of long text. A slide has at most one short lead line, and one line on the chart when a reader could misread it.

8. Look and usability
    1. Write all visible text in ASD-STE100, as design.md says. Keep each label short.
    2. Use the shared settings of design.md (section 8.2): a large "Settings" button at the top right opens a dialog with a pane list on the left and one pane on the right. The reader can drag the dialog by its header and resize it by its corner. The shared Appearance pane holds the theme and a text size in pixels (a slider with minus and plus buttons, from 12 to 22, default 15). Keep the size in the link state as a number. Make every size scale with the root size, and make the chart text follow it. Add the panes of the report: Colours, Ticket list and Data. Do not hide the settings in a collapsed menu, and do not repeat a setting on each slide.
    3. Give the page ten colour palettes, and make at least one of them safe for colour-blind readers and one of them high contrast. Put the palettes in the Colours pane. Show one palette on each line: its name, its swatches, and a small sample chart that uses its colours (bars, a line and a mix bar), so that the reader sees the look before the choice. Mark the active one. A palette sets every colour that carries a meaning: the groups, the cause classes, the scope badges, the buttons and the active item. Keep one colour for one meaning inside a palette. Save the choice.
    4. Give the page a light theme and a dark theme. Make the charts follow the theme.
    5. Use the full width of the window. Do not set a maximum width on the content. Size a chart by the height of the window, with a minimum and a maximum.
    6. Keep the state in the link, in the fragment. The order is: the link, then the last saved value, then the default. Ignore an invalid value. Write the current value back to the link when it changes, so a copied link opens the same view. Do not show a toast for a change that the page already shows.
    7. Give each key a name that cannot be confused with another key.
    8. Make every control reachable by keyboard. Turn on the accessibility option of the chart library. Keep a table of the numbers for each chart that has no table.
    9. Put the download links in the Data pane of the settings: the JSON file and the CSV files. The CSV files must have the same fields, without private text.

9. Traps with chart libraries
    1. A canvas chart draws text with a font string. An invalid family, for example `inherit`, makes the canvas ignore the whole font and use a tiny default. Pass the computed font stack of the page, and set the sizes on the options. Check the real font in the browser, not only the options.
    2. Set the size and the colour of every axis label, legend, tooltip and bar label. Do not rely on a default.
    3. Draw a chart only when its slide is visible, and dispose it when the reader leaves. Resize it with a `ResizeObserver`.
    4. Give a chart with long category labels enough margin on the left, and turn on label containment. A long label that is cut off looks like a data error.
    5. Bootstrap outline buttons use fixed colours. Override their variables to follow the palette.
    6. A function that you replace with a global search and replace can end up calling itself. A page error then blanks every chart. Make the browser check fail on any page error.
    7. Sort a tooltip by value when it lists many series.
    8. Do not compare totals of views with different filters unless the badge names the filter.

10. Tests
    1. Write unit tests for the parts that hold logic: parsing, grouping keys, time and week arithmetic, linking rules, and the read-only rule of the client.
    2. Write a browser check that runs in a headless browser against the local server. It must fail on any of these:
        1. A slide does not draw a chart or a table.
        2. A slide opens with an empty list, or a click on a chart element or a row does not change the list, or it scrolls the page.
        3. A column header does not sort the list, or a drag of a column header does not move the column, or the column chooser does not show and hide columns.
        4. The left panel does not resize with the mouse and with the keyboard.
        5. The settings dialog does not open from the top right button, does not drag by its header, or does not resize by its corner.
        6. A filter does not change the count or the link.
        7. A palette or a text size does not change the page.
        8. A wide window does not use the width.
        9. A request leaves the local server, or the console shows an error.
    3. Take a screenshot of each slide and look at it, in both themes and in at least two palettes. Read a screenshot only after the program that makes it has finished.

11. Run, preview and publish
    1. Put the commands for each step, and for a full refresh, in the README.
    2. Serve the site from a static server that binds to `127.0.0.1` only. To share it, put an access-controlled reverse proxy in front, and check that an anonymous request is refused.
    3. Never let the agent publish. Give the user the list of files to upload. Keep `vendor/` as a folder.
    4. Do the first upload before you automate. It proves that relative paths, libraries and fonts work under the real path with the network off.
    5. Keep generated data out of git when it holds titles, names or ids. Keep the config, the rubric and the reviewed results in git.
    6. Leave a way to move the site to another host. The `output/` folder is the whole contract, and nothing in the page may depend on the host.

12. Check your work
    1. Each question of the brief has a slide, and each slide has a scope badge and opens with a selected item and a filled list.
    2. The totals match a second query of the source, and each number says what it covers.
    3. Each estimate is marked as an estimate.
    4. The unit tests and the browser check pass.
    5. The page works with the network off, in both themes, and at the smallest and the largest text size (12 and 22 px).
    6. No private text is in the data file, the downloads or git.
    7. No name of a private tool, account or address is in the files of the public repository.
