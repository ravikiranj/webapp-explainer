# Video explainer design

This document extends [design.md](./design.md) from a webapp to a video. Give it to an agent with a brief.
The agent studies a subject and writes a markdown storyboard. Then it renders a narrated, subtitled video with
chapters from the storyboard, and adds a page that plays it.

Read design.md first. Its rules for content, data, sources and local servers also apply here. This
document adds only the parts that a video needs.

A reference implementation is in [video/](./video/README.md), with two worked examples (see section 13).

1. Goal
   1. Make one short video that explains one subject. Call the subject [SUBJECT]. Replace [SUBJECT] with the real subject before you start.
   2. [SUBJECT] can be a software project, a repository, a system design, or a concept, from any domain.
   3. Make the video 3 to 6 minutes long, with 4 to 8 chapters. A viewer must be able to jump to each chapter.
   4. Teach with moving diagrams. Use text on the screen only for labels, one short code fragment, or one formula at a time.
   5. Make every frame from code. Do not record a screen, and do not use stock footage or images that you did not make.
   6. Do all the work on the local computer. After the one-time download of tools and models, the build must work with the network off.

2. Inputs and outputs
   1. The input is a brief, `video.md`, in the folder of the subject, next to `problem.md`. It has the same form as `problem.md` in design.md:
      1. The subject and the audience.
      2. The questions that the video must answer.
      3. The sources to study: a repository path, documents, or links.
      4. Optional choices: the length, the voice, the language, and narration or subtitles only.
   2. The agent writes a storyboard, `video/storyboard.md` (see section 4), and a scene file, `video/scenes.js` or `video/scenes.py` (see section 5). The storyboard is the single source of the video. Every later step reads it, and nothing changes the video except a change to it.
   3. The outputs go in `output/public/video/`:
      1. `video.mp4`: H.264 video with no sound, 1920x1080, 30 frames each second.
      2. `video-subtitled.mp4`: the same video with the subtitles drawn in, to share where a subtitle file gets lost.
      3. `subtitles.vtt` and `chapters.vtt`: WebVTT files that come from the same timeline as the video.
      4. `video.json`: the duration, and each chapter with its start, end, title and section id.
      5. `audio-<voice>.m4a`: one narration track for each voice, when there is narration. Keep the audio file of each line in a cache folder, so that a rebuild can reuse it.
   4. A webapp from design.md gets a "Video" section (see section 9). A subject with no webapp gets a small page with only the player.

3. Steps
   1. Study the subject. Read the sources. For software, read the code, not only its documents. Write down each fact that the video will state, with the file or the source that proves it.
   2. Write the storyboard (section 4). Show it to the user before you build if the user asked for a review. Otherwise go on.
   3. Make the voice (section 6), if the brief asks for narration.
   4. Build the timeline (section 7). It reads the storyboard and the length of each audio file.
   5. Write the scenes (section 5).
   6. Render previews of single frames. Look at them and fix the layout (section 10).
   7. Render the full video, mix the audio, and write the subtitle and chapter files (section 8).
   8. Add the player page (section 9), build, and check it in a browser (section 10).

4. The storyboard format
   1. Write the storyboard in markdown. Use one level-2 heading for each chapter and one numbered item for each beat. A beat is one line of narration and the animation that goes with it.
   2. Use this form:

      ```markdown
      ---
      title: How a rate limiter works
      renderer: canvas             # canvas or manim (see 5.1)
      voices: voice-1, voice-2     # voice ids from the TTS engine; the first is the default; or "none"
      speed: 1.0                   # 0.8 to 1.2
      ---

      ## 1. One request {#overview}

      1. A client sends a request to the API.
         - show: client, api
         - move: a dot from client to api
      2. The API must decide: serve it, or say "too many".
         - show: the label "allow or deny?" above api
         - hold: 1.0

      ## 2. A fixed window {#fixed-window}

      1. Count the requests in each minute. Stop at the limit.
         - show: a bar for each minute, a line at the limit
      ```

   3. Rules for a beat:
      1. The text is what the narrator says and what the subtitle shows. Write it in ASD-STE100 Simplified Technical English. Use short sentences and active voice, about 8 to 20 words.
      2. The bullets under the text are directions for the scene. Use plain words: show, hide, move, highlight, dim, write, morph, zoom, hold. They are notes for the agent that writes the scene, not a strict language.
      3. `hold: <seconds>` adds a pause after the beat.
      4. Put one idea in each beat. If a beat needs two animations that do not depend on each other, make two beats.
   4. The `{#id}` after a chapter title is the id of the webapp section that explains the same idea. Leave it out when there is no section.
   5. Put the facts and their sources at the end of the storyboard, in a "Sources" heading. Each fact has the beat number and the file, page, or link that proves it.

5. The scenes and the look
   1. Use one engine that draws a frame for a given time t, with no state from earlier frames. Then you can render any frame in any order, and a preview of frame t looks the same as frame t of the full video.
      1. A small engine on a 2D canvas is enough: boxes, labels, arrows, moving dots, a camera with pan and zoom. Each value is a start value plus a list of tweens on an absolute timeline.
      2. For a subject that is math (formulas, graphs, geometry, bit layouts), use Manim Community (`manim`), the engine that grew out of the 3Blue1Brown videos. Run it in its official container image. It renders with Cairo on a CPU and needs no display. Do not use ManimGL (`manimgl`, the 3b1b/manim repository) on a build server: it needs OpenGL.
      3. For boxes, flows and system diagrams, the canvas engine is enough, and it can reuse the layout and colours of the webapp.
      4. Another library also works. Check first that it can render with no person present (headless) on your computer.
   2. Follow these rules for the staging:
      1. Show one idea at a time. Dim to about 30% the parts that the current beat does not need. Do not remove them, so that the viewer keeps their place.
      2. Change, do not cut. Inside a chapter, each beat changes the picture of the beat before it. A box becomes the thing it deploys as. A dot that leaves one box arrives at the next one.
      3. Show the thing before you name it. Draw the part first, then write its label.
      4. Nothing appears before the narration names it.
      5. Leave a pause of about half a second between two ideas.
   3. Follow these rules for the look:
      1. Use a dark background (for example #15171c), with wide empty margins.
      2. Use a small palette, with one meaning for each colour. Use the colours of the webapp when there is one. Keep one colour, for example yellow, for "look here".
      3. Use thin lines, rounded corners, no shadows and no gradients. A soft glow on the highlighted part is enough.
      4. Use one sans-serif font for labels and one monospace font for code. Bundle the fonts. Do not rely on the fonts of the computer.
      5. Use smooth ease-in-out on each move, 0.6 to 1.2 seconds. Do not use bounce or spring easing.
      6. Keep text at 20 pixels or larger at 1080p, and keep the bottom 150 pixels free for the subtitles.
      7. Show the chapter number and title at the top left.
   4. Use the real names. For software, the names of packages, classes, commands and settings in the video must be the names in the code.
   5. Do not copy the characters, music, or graphics of any channel or show.

6. The voice
   1. A narrated video needs a text-to-speech (TTS) engine. A video with subtitles only skips this section. Its beats take their length from the reading time (section 7.2).
   2. Pick a TTS engine with these criteria, in this order:
      1. The licence lets you use the voice for your purpose. Read the licence of the code and of the model weights. They can be different. Some popular models allow non-commercial use only.
      2. It runs on your computer with no GPU, fast enough. A 5-minute script must render in less than about 15 minutes.
      3. The voice quality, for the language and the accent that the brief asks for.
      4. You can control how it says hard words (section 6.4).
   3. These engines run on a CPU. Check the current licence and voice list of each one before you use it.

      | Engine | Size | Speed on a CPU | Voices and accents | Licence (code / weights) | Notes |
      | --- | --- | --- | --- | --- | --- |
      | Kokoro-82M (kokoro-onnx) | small | fast | American and British English, male and female, and some other languages | Apache-2.0 / Apache-2.0 | Good default. The female voices have higher quality grades than the male voices. No Indian English voice. |
      | Piper | very small | very fast | Many languages; quality changes from voice to voice | GPL-3.0 (current repository) / each voice has its own licence | Good when speed matters most. Read the licence of each voice. |
      | Indic Parler-TTS | large (about 0.9 billion parameters) | slow on a CPU | Indian English and many Indian languages, many named male and female speakers | Apache-2.0 / Apache-2.0 (training data includes CC BY 4.0) | Describe the voice in a text prompt. Download needs acceptance of the model terms. |
      | eSpeak NG | very small | instant | Many languages | GPL-3.0 | Robotic. Use it only for a draft or as a fallback. |
      | A cloud TTS service | none | fast | Many voices and accents | the terms of the service | Not local. Sends the script to the provider. |

   4. Make hard words clear. An agent cannot hear the voice, so it must check the phonemes, not guess:
      1. Print the phonemes that the engine makes for each line, for each accent (the reference command is `render.mjs say`). Read every acronym, symbol and number.
      2. Write an acronym as it is first. Many engines read an all-capital word as letters (`API`, `ID`, `UUID`). Add a fix only when the phonemes are wrong.
      3. Do not spell an acronym with single letters and spaces. `A P I` reads the first `A` as the word "a", and `I Ds` reads as "eye dee ess".
      4. Fix a word in a pronunciation file next to the storyboard, for example `lexicon.json`, with ordinary words that have one reading: `{ "IDs": "eye deez", "SQL": "sequel" }`. A plural acronym often loses its "s".
      5. Apply the file to the narration text only, as whole words, case sensitive. The subtitle shows "IDs". The voice says "eye deez".
      6. Write symbols, units and code names as words in the narration, or check them: `/s`, `x` for "times", `ms`, function names.
      7. Some engines do badly on very short lines. Join a line of fewer than about 6 words with the next line for the audio only.
   5. To let the viewer pick a voice, list several voices. Make every voice for every beat, and give each beat the length of its longest voice. Then all the voices fit one video, and each voice is one audio track.
   6. Make one audio file for each beat, named by its chapter and beat number. Store a hash of the spoken text, the voice and the speed with each file. Make a file again only when its hash changes.
   7. Measure the length of each file with ffprobe. Do not guess it.
   8. Normalize the loudness of the full track to about -16 LUFS.

7. The timeline
   1. Build the timeline from the storyboard, in order. Each beat starts when the beat before it ends.
   2. The length of a beat is the largest of:
      1. The audio length plus 0.3 seconds, when there is narration.
      2. The reading time of the subtitle: the number of characters divided by 13, and at least 2.2 seconds.
      3. The time that the animation of the beat needs.

      Then add the pause: 0.9 seconds, or the `hold` value.
   3. A subtitle cue starts 0.1 seconds after its beat starts. It ends 0.15 seconds before the next beat starts. Cues must never overlap.
   4. A chapter starts at its first beat. It ends where the next chapter starts, or at the end of the video.
   5. Generate the video, the subtitles, the chapters and the audio positions from this one timeline. Do not edit a VTT file by hand.

8. Render and mix
   1. Draw the frames in a headless browser (for example Chromium through Playwright) or with the engine's own renderer. Take frames in batches and send them to ffmpeg through a pipe. Do not write thousands of image files to the disk.
   2. Get ffmpeg as a pinned package (for example `ffmpeg-static`) or a static build. Then the build does not depend on the system.
   3. Encode with H.264, `-pix_fmt yuv420p`, `-movflags +faststart`, `-crf 20`, and `-tune animation`. `+faststart` lets a browser play the video before it has loaded the whole file.
   4. Mix the audio. Place each audio file at the start time of its beat (the ffmpeg `adelay` and `amix` filters), then encode AAC at 128 to 160 kbit/s. Write one track for each voice, `audio-<voice>.m4a`. Keep `video.mp4` without sound, and put the default voice in `video-subtitled.mp4`.
   5. Draw the subtitles into the second copy in the same renderer as the scenes, at the bottom centre, in white on a half-black rounded box, at most two lines.
   6. Write `subtitles.vtt`, `chapters.vtt` and `video.json` from the timeline.
   7. Add an npm script for each mode:
      1. `video:info`: print the chapters and the cues with their times.
      2. `video:preview -- <t1,t2,...>`: write PNG frames at those times.
      3. `video:build`: render the full video and all the files.

9. The player page
   1. Use the HTML video element with these children: `<source>` for `video.mp4`, `<track kind="subtitles" default>` for `subtitles.vtt`, and `<track kind="chapters">` for `chapters.vtt`.
   2. Put a chapter list next to the player. Use a Bootstrap list-group. Each item shows the number, the title and the start time. A click moves the video to the start and plays it. The item of the current chapter is active while the video plays.
   3. Each chapter item with a section id links to that section of the webapp. Each section of the webapp that has a chapter shows a "Watch this part" link that opens the video at the start of the chapter. Read the start times from `video.json`, so that the links follow a new render.
   4. Accept a start time in the URL, for example `#video&t=95`.
   5. Add a link to download `video-subtitled.mp4`.
   6. Make sure that the active list item keeps all its text readable.
   7. Make seeking work on every static server. Do not set the video URL directly. Send one request for the first byte first:

      ```js
      // A server with Range support answers 206 with 1 byte.
      // A server without it ignores the header and sends the whole file with 200.
      const res = await fetch(url, { headers: { Range: 'bytes=0-0' } });
      if (res.status === 206) {
        video.src = url;                                   // stream; the browser seeks with Range requests
      } else if (res.ok) {
        video.src = URL.createObjectURL(await res.blob()); // the full file is in memory; seeking works
      } else {
        video.src = url;                                   // let the video element show the error
      }
      ```

      1. Servers with Range support include sirv, `vite preview`, nginx, GitHub Pages and most object stores. The test costs one byte, and the video starts before it has loaded.
      2. Python `http.server` has no Range support. The test response is the full file, so the page uses it as a blob. Seeking works, but playback starts only after the full download. Show the progress of the download while it runs.
      3. A blob stays in memory while the page is open. This is fine for a short video of a few tens of megabytes. For a long video, use a server with Range support.
   8. When there is more than one voice, show a voice list with a "No voice" item, and keep the choice in the browser. Play the voice in an audio element that follows the video: play, pause, seek and rate. Move it back to the video time when the two differ by more than about 0.15 seconds. Load the audio file the same way as the video (9.7).

   9. Start with the subtitles off. Let the viewer turn them on and off and style them: size, style (dark box, outline, plain), colour, and position (bottom or top). Keep the choice in the browser. The `::cue` style of the browser's own subtitles is not the same in each browser, so do not add a `<track>` element: the browser then shows its own subtitle menu, and its cues conflict with yours. Fetch `subtitles.vtt`, parse it, and draw the cue for `video.currentTime` in a layer over the video, on each frame while it plays. Size the text from the width of the video (`cqw` units). Put bottom subtitles near the true bottom (about 4%), and lift them above the browser's control bar only while that bar shows: when the video is paused, and for about 2.5 seconds after the pointer moves. The browser's own fullscreen shows only the video element and hides that layer, so put the video and the layer in one box and make that box fullscreen.

10. Check your work
    1. Facts: each statement in the video has a source in the storyboard. For software, each name exists in the code.
    2. Frames: render a frame at the end of each beat, and look at each one. Check that:
       1. One idea is in focus.
       2. No text overlaps a shape or other text.
       3. All text is readable at 1080p, and the subtitle area is free.
       4. Each colour keeps its meaning.
    3. Timing: no cue overlaps the next one. Each cue is longer than its reading time. Each audio file ends before its beat ends.
    4. Pronunciation: the phonemes of each acronym, symbol and number are right for each accent (6.4).
    5. Files: ffprobe shows the expected duration, size, frame rate and streams. The VTT files load in a browser (`video.textTracks[i].cues.length` is the number of cues).
    6. Playback in a real browser:
       1. The video plays.
       2. A click on a chapter moves to its start.
       3. The subtitles show and turn off.
       4. The links to and from the sections work.
    7. Seeking: jump to the last chapter and check that the video plays from there. Do this on the server that you use (see 9.7).
       1. On a server with Range support, the network panel shows a 206 answer for the first-byte test, and `video.currentSrc` is the file URL.
       2. On a server with no Range support, such as Python `http.server`, the test answers 200, and `video.currentSrc` starts with `blob:`.
       3. To see which kind of server you have, run `curl -s -H "Range: bytes=0-0" -o /dev/null -w "%{http_code}" <url>`. 206 means Range support. 200 means none.
    8. Listen to the full narration one time, if you can hear it. An agent that cannot hear it must say so to the user. It can check the phonemes (10.4), the lengths, the silences and the loudness, but not how natural the voice sounds.

11. Things that cause problems
    1. Many neural TTS packages need a recent C library (glibc 2.28 or newer) or a recent Python. On an old Linux, run the engine in a container, and mount only the work folder.
    2. A model download can need an account, or acceptance of terms on the model page. Download it one time, check its hash, and keep it outside the repository. Add the model folder to `.gitignore`.
    3. Do not put model weights or generated audio in git. Put the audio in the build output, or keep it in a cache folder that git ignores.
    4. A canvas uses the fonts that are loaded. Wait for `document.fonts.ready` before the first frame. A frame drawn before that has the wrong font.
    5. Text measured per character for a "write on" effect is slow. Measure each string one time and keep the result.
    6. A browser does not play a video file that has no `+faststart` until the whole file loads.
    7. Rendering at 30 frames each second for 5 minutes is 9,000 frames. Render in batches. Show the progress in a log file, and start the render in the background.
    8. A frame in the full render that is different from its preview shows that the engine has hidden state. Fix the engine, not the scene.

12. Improve the experience
    1. Let the user pick the voice from a short list of 3 or 4 voices. Render the same chapter with each voice so that the user can compare them.
    2. Make the video work without sound. A viewer with the sound off must still understand it from the subtitles and the labels.
    3. Offer subtitles only, narration only, or both, from the same storyboard.
    4. Keep the storyboard short enough to change. A change to one beat must take minutes to render again, not hours: re-make only the changed audio, and re-render only from the first changed beat if the engine allows it.

13. The reference implementation
    1. [video/](./video/README.md) is a working version of this design. It reads `storyboard.md`, uses the timing rules of section 7 (`TIMING` in `video/storyboard.mjs`), and writes the outputs of section 2.3.
    2. It has two renderers for one storyboard: `canvas` (`video/canvas-engine.js`, drawn in headless Chromium) and `manim` (`video/manim/storyboard_scene.py`, run in the Manim Community container with no network).
    3. A scene file gives one animation function for each beat. The build stops if the number of functions and beats is not the same.
    4. Narration is optional. List `voices` in the storyboard. The default engine is Kokoro-82M through kokoro-onnx, in a container with no network (`video/tts/`). `tts: command` with `TTS_COMMAND` uses any other local engine (section 6).
    5. `shared/video-player.ts` is the player of section 9, with the Range check of 9.7. `shared/shell.ts` shows "Watch this part" under each section that has a chapter.
    6. Worked examples:
       1. `examples/rate-limiter/video/`: canvas, six chapters, about two minutes, four voices.
       2. `examples/unique-id-generator/video/`: Manim, four chapters with formulas and a bit layout, four voices.
    7. `build.sh` renders the video of each example that has a storyboard. `SKIP_VIDEO=1` skips the render.
    8. The videos are not in git. `video/release.mjs pack` makes one archive for each app for a GitHub release, and `video/release.json` records the tag, the archive hashes, and a hash of each video's source files. The deploy workflow runs `release.mjs check` (it fails if a source changed after the release) and `release.mjs fetch` (it downloads and checks the archives), then builds with `SKIP_VIDEO=1`. GitHub Pages serves the files from the site, so the player can fetch them; a link to the release file itself would be a cross-origin request with no CORS header.

