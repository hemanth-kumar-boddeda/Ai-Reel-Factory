"""Transcription helpers for Creator Studio."""
import os
import json
import subprocess
from pathlib import Path

try:
    import openai
except Exception:
    openai = None

from app.core.config import settings


def extract_audio(video_path: str, audio_path: str) -> bool:
    ffmpeg = os.getenv("FFMPEG_PATH", "ffmpeg") or settings.FFMPEG_PATH
    try:
        subprocess.run(
            [ffmpeg, "-y", "-i", video_path, "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", audio_path],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        return True
    except Exception:
        return False


def transcribe(audio_path: str) -> str:
    api_key = settings.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY", "")
    if api_key and openai is not None:
        try:
            client = openai.OpenAI(api_key=api_key)
            with open(audio_path, "rb") as f:
                resp = client.audio.transcriptions.create(model="whisper-1", file=f)
            return getattr(resp, "text", str(resp))
        except Exception as e:
            return f"[transcription failed: {e}]"
    # Mock fallback
    return "This is a mock transcript. Provide OPENAI_API_KEY for real transcription."
