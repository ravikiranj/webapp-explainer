"""Speaks a list of lines with Kokoro. render.mjs writes the list and reads the WAV files.

Usage: python kokoro_batch.py <jobs.json>
       python kokoro_batch.py --phonemes <jobs.json>   print the phonemes, make no audio
jobs.json: [{"text": "...", "voice": "af_heart", "speed": 1.0, "out": "/work/.../x.wav"}, ...]
A voice id starts with its language: a = American English, b = British English.
"""
import json
import sys
import time

import soundfile
from kokoro_onnx import Kokoro

LANG = {"a": "en-us", "b": "en-gb"}


def phonemes(jobs):
    from kokoro_onnx.tokenizer import Tokenizer

    tokenizer = Tokenizer()
    for job in jobs:
        lang = LANG.get(job["voice"][0], "en-us")
        print(json.dumps({"id": job.get("id", ""), "lang": lang, "text": job["text"], "phonemes": tokenizer.phonemize(job["text"], lang)}, ensure_ascii=False), flush=True)


def main():
    if sys.argv[1] == "--phonemes":
        phonemes(json.load(open(sys.argv[2], encoding="utf-8")))
        return
    jobs = json.load(open(sys.argv[1], encoding="utf-8"))
    kokoro = Kokoro("/models/kokoro-v1.0.onnx", "/models/voices-v1.0.bin")
    known = set(kokoro.get_voices())
    for job in jobs:
        if job["voice"] not in known:
            sys.exit(f"unknown voice {job['voice']}. Known voices: {', '.join(sorted(known))}")
    started = time.time()
    for i, job in enumerate(jobs, 1):
        samples, rate = kokoro.create(job["text"], voice=job["voice"], speed=float(job["speed"]), lang=LANG.get(job["voice"][0], "en-us"))
        soundfile.write(job["out"], samples, rate)
        print(f"tts {i}/{len(jobs)} {job['voice']}: {len(samples) / rate:.1f} s of audio", flush=True)
    print(f"tts done: {len(jobs)} lines in {time.time() - started:.0f} s", flush=True)


if __name__ == "__main__":
    main()
