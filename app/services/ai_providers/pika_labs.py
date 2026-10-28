"""
Pika Labs AI video asset provider.
"""
import os
import httpx
import asyncio
from typing import Optional
from pathlib import Path
from .base import BaseVideoProvider


class PikaLabsProvider(BaseVideoProvider):
    """Pika Labs AI video asset provider."""

    def __init__(self, api_key: Optional[str] = None):
        super().__init__(api_key)
        self.api_key = api_key or os.getenv("PIKA_LABS_API_KEY")
        self.base_url = "https://api.pikalabs.ai/v1"  # Placeholder URL

    def is_available(self) -> bool:
        """Check if Pika Labs provider is configured (API key set)."""
        return bool(self.api_key)

    async def generate_video_asset(
        self,
        prompt: str,
        output_path: Path,
        identity_reference_path: Optional[Path] = None,
        duration: int = 12,
        aspect_ratio: str = "9:16"
    ) -> bool:
        """
        Generate a video asset using the PikaLabs API.

        Args:
            prompt: Text prompt for video asset generation
            identity_reference_path: Optional path to reference image for identity consistency
            output_path: Path where the generated video asset should be saved
            duration: Duration of video asset in seconds
            aspect_ratio: Aspect ratio of video asset (e.g., "9:16", "16:9")

        Returns:
            True if video asset generation was successful, False otherwise
        """
        if not self.is_available():
            print("Pika Labs API key not configured")
            return False

        # Prepare the request
        url = f"{self.base_url}/video/generate"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        data = {
            "prompt": prompt,
            "duration": duration,
            "aspect_ratio": aspect_ratio
        }
        if identity_reference_path and identity_reference_path.exists():
            # Note: How to pass the image to the API depends on the API.
            # We assume the API accepts a base64 encoded image or a URL.
            # For simplicity, we will read the image and pass it as base64.
            # This is a placeholder implementation.
            import base64
            with open(identity_reference_path, "rb") as f:
                image_data = base64.b64encode(f.read()).decode("utf-8")
            data["identity_reference"] = image_data

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=data, timeout=60.0)
                response.raise_for_status()

                # Assuming the API returns the video file directly
                # Ensure output directory exists
                output_path.parent.mkdir(parents=True, exist_ok=True)

                # Write the video file
                with open(output_path, 'wb') as f:
                    f.write(response.content)

                return True
        except Exception as e:
            print(f"Error generating video asset with PikaLabs: {e}")
            return False