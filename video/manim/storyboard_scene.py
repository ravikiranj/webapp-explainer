"""The Manim renderer of the video maker. See ../../video-design.md and ../README.md.

render.mjs runs this inside the Manim Community container. It reads the
storyboard as JSON (STORY_JSON), plays one animation function for each beat,
holds each beat for the length that video-design.md section 7.2 gives, and
writes the timeline (TIMELINE_JSON). render.mjs makes the subtitles, the
chapters and the audio mix from that timeline, as it does for the canvas renderer.

A subject's scenes.py:

    from storyboard_scene import *

    class Video(StoryboardScene):
        def chapters(self):
            return [self.ch1, self.ch2]

        def ch1(self):
            box = self.box("one node", color=BLUE)
            return [
                lambda: self.play(Create(box)),
                lambda: self.play(box.animate.shift(RIGHT * 2)),
            ]
"""
import json
import os

from manim import *  # noqa: F401,F403 - scenes.py imports everything from here

# One meaning for each colour, the same palette as the canvas renderer.
BG = "#15171c"
TEXT = "#e6edf3"
SUB = "#9ba3ad"
FAINT = "#3a404b"
BLUE = "#58a6ff"
GREEN = "#3fb950"
ORANGE = "#f0883e"
PURPLE = "#a371f7"
GREY = "#8b949e"
YELLOW = "#f2cc60"
RED = "#f85149"
TEAL = "#39c5bb"

SANS = "DejaVu Sans"
MONO = "DejaVu Sans Mono"

config.background_color = BG
config.pixel_width = 1920
config.pixel_height = 1080


class StoryboardScene(Scene):
    """Plays storyboard.md. Subclasses return one function for each chapter from chapters()."""

    def chapters(self):
        raise NotImplementedError("return a list with one method for each chapter")

    # ------------------------------------------------------------ helpers for scenes

    def box(self, label, sub=None, color=GREY, width=3.2, height=1.1, size=30, mono=False):
        """A rounded box with a label, and a smaller second line when sub is given."""
        rect = RoundedRectangle(corner_radius=0.18, width=width, height=height, color=color, stroke_width=4)
        rect.set_fill(color, opacity=0.13)
        rect.base_fill = 0.13
        title = Text(label, font=MONO if mono else SANS, font_size=size, color=TEXT, weight=BOLD)
        if sub:
            note = Text(sub, font=SANS, font_size=size * 0.7, color=SUB)
            body = VGroup(title, note).arrange(DOWN, buff=0.1)
        else:
            body = title
        return VGroup(rect, body.move_to(rect))

    def label(self, text, size=26, color=SUB, mono=False):
        return Text(text, font=MONO if mono else SANS, font_size=size, color=color)

    @staticmethod
    def set_level(mobject, level):
        """Sets how bright a part is, from 0 to 1. A shape keeps its light fill; text and lines scale as a whole."""
        for part in mobject.family_members_with_points():
            base = getattr(part, "base_fill", None)
            if base is None:
                part.set_opacity(level)
            else:
                part.set_fill(opacity=base * level).set_stroke(opacity=level)
        return mobject

    def focus(self, *mobjects, level=0.3):
        """An animation that dims parts that the current beat does not need, or brings them back with level=1."""
        return AnimationGroup(*[ApplyFunction(lambda m: self.set_level(m, level), m) for m in mobjects])

    # ------------------------------------------------------------ the storyboard run

    def construct(self):
        story = json.load(open(os.environ.get("STORY_JSON", ".build/story.json"), encoding="utf-8"))
        timing = story["timing"]
        methods = self.chapters()
        if len(methods) != len(story["chapters"]):
            raise ValueError(f"storyboard has {len(story['chapters'])} chapters, scenes.py has {len(methods)}")
        cues, chapters, beats = [], [], []
        for chapter, method in zip(story["chapters"], methods):
            chapters.append({"n": chapter["n"], "title": chapter["title"], "section": chapter["section"], "t": self.renderer.time})
            heading = self.label(f"{chapter['n']} · {chapter['title']}", size=24).to_corner(UL, buff=0.45)
            self.add(heading)
            fns = method()
            if len(fns) != len(chapter["beats"]):
                raise ValueError(f"chapter {chapter['n']}: storyboard has {len(chapter['beats'])} beats, scenes.py has {len(fns)}")
            for beat, fn in zip(chapter["beats"], fns):
                t0 = self.renderer.time
                fn()
                anim = self.renderer.time - t0
                read = max(timing["minRead"], len(beat["text"]) / timing["readCps"])
                voice = beat.get("audio", 0) + timing["audioPad"] if beat.get("audio") else 0
                length = max(read, voice, anim) + beat.get("hold", timing["pause"])
                self.wait(length - anim)
                cues.append({"start": round(t0 + timing["cueLead"], 3), "end": round(t0 + length - timing["cueTail"], 3), "text": beat["text"]})
                beats.append({"start": round(t0, 3), "end": round(t0 + length, 3)})
            if self.mobjects:
                self.play(*[FadeOut(m) for m in self.mobjects], run_time=0.8)
            self.wait(0.2)
        timeline = {"duration": self.renderer.time, "cues": cues, "chapters": chapters, "beats": beats}
        with open(os.environ.get("TIMELINE_JSON", ".build/timeline.json"), "w", encoding="utf-8") as out:
            json.dump(timeline, out, indent=2)
