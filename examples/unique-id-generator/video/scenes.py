"""Scenes for storyboard.md, drawn with Manim Community (see video/manim/storyboard_scene.py).

chapters() returns one method for each chapter. Each method returns one function
for each beat, in storyboard order. A beat function plays its animations; the
base class then holds the beat for its full length.
"""
from storyboard_scene import *  # noqa: F401,F403


class Video(StoryboardScene):
    def chapters(self):
        return [self.one_node, self.ten_nodes, self.snowflake, self.summary]

    # 1. One node
    def one_node(self):
        node = self.box("node", color=GREEN, width=3.0).shift(LEFT * 4)
        ids = VGroup(*[self.box(str(i), color=BLUE, width=1.1, height=0.9, mono=True) for i in range(1, 6)])
        ids.arrange(RIGHT, buff=0.3).shift(RIGHT * 1.6)
        clock = Arrow(ids[0].get_bottom() + DOWN * 0.5, ids[-1].get_bottom() + DOWN * 0.5, color=SUB, buff=0)
        clock_label = self.label("time", size=24).next_to(clock, DOWN, buff=0.15)
        rate = self.label("100 IDs each second · one counter in memory", size=30, color=GREEN).shift(DOWN * 2.6)

        def b1():
            self.play(Create(node))
            self.play(LaggedStart(*[FadeIn(i, shift=RIGHT * 0.3) for i in ids], lag_ratio=0.35), run_time=2.2)
            self.play(GrowArrow(clock), FadeIn(clock_label))

        return [b1, lambda: self.play(Write(rate))]

    # 2. Ten nodes
    def ten_nodes(self):
        nodes = VGroup(*[self.box(f"n{i}", sub="next: 1", color=GREEN, width=1.15, height=1.0, size=22, mono=True) for i in range(1, 11)])
        nodes.arrange(RIGHT, buff=0.12).shift(UP * 1.9)
        same = self.label("all ten issue 1, 2, 3, …", size=28).next_to(nodes, DOWN, buff=0.4)
        clash = self.label("9,000 of 10,000 IDs each second collide", size=34, color=RED).next_to(same, DOWN, buff=0.4)
        formula = MathTex(r"E[\text{collisions/s}] \approx \frac{n^2}{2 \cdot 2^{122}}", font_size=60, color=TEXT).shift(DOWN * 0.9)
        value = MathTex(r"n = 10^6 \;\Rightarrow\; \approx 9.4 \times 10^{-26}", font_size=48, color=GREEN).next_to(formula, DOWN, buff=0.5)
        order = self.label("but no time order: 7f3a…, 02c9…, e15b…", size=28, color=ORANGE).next_to(value, DOWN, buff=0.4)

        def b2():
            self.play(*[n[0].animate.set_stroke(RED).set_fill(RED, opacity=0.13) for n in nodes], Write(clash))

        def b3():
            self.play(FadeOut(same), FadeOut(clash), self.focus(nodes))
            self.play(Write(formula), run_time=2)

        def b4():
            self.play(Write(value), run_time=1.6)
            self.play(FadeIn(order, shift=UP * 0.2))

        return [
            lambda: (self.play(LaggedStart(*[Create(n) for n in nodes], lag_ratio=0.12), run_time=2), self.play(Write(same))),
            b2,
            b3,
            b4,
        ]

    # 3. Hundred nodes, five regions
    def snowflake(self):
        fields = [("sign", 1, GREY), ("time", 41, BLUE), ("node", 10, GREEN), ("sequence", 12, ORANGE)]
        unit = 12.5 / 64
        parts = VGroup()
        for name, bits, color in fields:
            rect = Rectangle(width=bits * unit, height=1.0, color=color, stroke_width=4).set_fill(color, opacity=0.18)
            rect.base_fill = 0.18
            mark = self.label(f"{bits}" if bits > 1 else "", size=28, color=TEXT).move_to(rect)
            parts.add(VGroup(rect, mark))
        parts.arrange(RIGHT, buff=0).shift(UP * 1.4)
        names = VGroup(*[self.label(n, size=24, color=c).next_to(p, UP, buff=0.2) for (n, _, c), p in zip(fields, parts)])
        names[0].shift(LEFT * 0.3)
        total = self.label("64 bits", size=26).next_to(parts, DOWN, buff=0.25)
        proposed = self.label("proposed", size=24, color=ORANGE).to_corner(UR, buff=0.45)
        sort_note = self.label("time first, so IDs sort by time (within clock skew)", size=30, color=BLUE).shift(DOWN * 0.6)
        node_note = MathTex(r"2^{10} = 1{,}024 \text{ nodes}", font_size=52, color=GREEN).shift(DOWN * 0.6)
        seq_note = MathTex(r"2^{12} = 4{,}096 \text{ IDs per ms per node}", font_size=52, color=ORANGE).shift(DOWN * 0.6)
        product = MathTex(r"4{,}096 \times 1{,}000 \times 1{,}024 \approx 4.2 \times 10^{9} \text{ IDs/s}", font_size=52, color=TEXT).shift(DOWN * 1.9)

        def focus(i):
            return [self.focus(p, level=1 if k == i else 0.3) for k, p in enumerate(parts)]

        def b1():
            self.play(FadeIn(proposed))
            self.play(LaggedStart(*[GrowFromEdge(p, LEFT) for p in parts], lag_ratio=0.4), run_time=2.4)
            self.play(FadeIn(names), FadeIn(total))

        return [
            b1,
            lambda: self.play(*focus(1), Write(sort_note)),
            lambda: self.play(*focus(2), FadeOut(sort_note), Write(node_note)),
            lambda: self.play(*focus(3), FadeOut(node_note), Write(seq_note)),
            lambda: (self.play(self.focus(*parts, level=1)), self.play(Write(product), run_time=2)),
        ]

    # 4. Pick by need
    def summary(self):
        rows = [
            ("Counter", "one node only · in time order", GREEN),
            ("Random UUID", "no coordination · no time order", BLUE),
            ("Snowflake ID", "unique and sorts by time · needs node ids", ORANGE),
        ]
        group = VGroup()
        for name, note, color in rows:
            chip = self.box(name, color=color, width=4.2, height=0.95, size=28)
            text = self.label(note, size=28, color=TEXT)
            group.add(VGroup(chip, text).arrange(RIGHT, buff=0.6, aligned_edge=ORIGIN))
        group.arrange(DOWN, buff=0.45, aligned_edge=LEFT).shift(UP * 0.4)

        return [lambda: self.play(LaggedStart(*[FadeIn(r, shift=RIGHT * 0.4) for r in group], lag_ratio=0.5), run_time=2.4)]
