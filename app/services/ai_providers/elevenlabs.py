"""
ElevenLabs AI audio generation provider.
"""
import os
import httpx
import asyncio
from typing import Optional, Dict, Any
from pathlib import Path
from .audio_base import BaseAudioProvider


class ElevenLabsProvider(BaseAudioProvider):
    """ElevenLabs AI audio generation provider."""

    def __init__(self, api_key: Optional[str] = None):
        super().__init__(api_key)
        self.api_key = api_key or os.getenv("ELEVENLABS_API_KEY")
        self.base_url = "https://api.elevenlabs.io/v1"

    def is_available(self) -> bool:
        """Check if ElevenLabs provider is configured (API key set)."""
        return bool(self.api_key)

    async def generate_audio(
        self,
        text: str,
        output_path: Path,
        voice_options: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Generate audio using the ElevenLabs API.

        Args:
            text: Text to convert to speech
            output_path: Path where the generated audio should be saved
            voice_options: Optional voice configuration (voice_id, stability, similarity_boost, etc.)

        Returns:
            True if audio generation was successful, False otherwise
        """
        if not self.is_available():
            print("ElevenLabs API key not configured")
            return False

        # Set default voice options
        if voice_options is None:
            voice_options = {}

        # Get voice_id from voice_options or use default
        voice_id = voice_options.get("voice_id", "21m00Tcm4TlvDq8ikWAM")  # Default voice: Rachel
        if "voice_id" not in voice_options:
            voice_options["voice_id"] = voice_id

        # Prepare the request
        url = f"{self.base_url}/text-to-speech/{voice_id}"
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": self.api_key
        }
        data = {
            "text": text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {
                "stability": voice_options.get("stability", 0.5),
                "similarity_boost": voice_options.get("similarity_boost", 0.5)
            }
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=data, timeout=30.0)
                response.raise_for_status()

                # Ensure output directory exists
                output_path.parent.mkdir(parents=True, exist_ok=True)

                # Write the audio file (blocking write is acceptable for this operation)
                with open(output_path, 'wb') as f:
                    f.write(response.content)

                return True
        except Exception as e:
            print(f"Error generating audio with ElevenLabs: {e}")
            return False