# The local TTS engine of the video maker: Kokoro-82M through kokoro-onnx, on a CPU.
# The model files are not in the image. render.mjs downloads them one time to
# video/tts/models/, checks their SHA-256, and mounts the folder read-only.
# The container runs with no network.
FROM python:3.12-slim
RUN pip install --no-cache-dir kokoro-onnx==0.6.1 soundfile==0.13.1
COPY kokoro_batch.py /app/kokoro_batch.py
ENTRYPOINT ["python", "/app/kokoro_batch.py"]
