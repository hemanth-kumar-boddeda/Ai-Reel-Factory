"""
Mock video provider for development and testing.
"""
print("LOADED: mock_video_provider.py from", __file__)

import asyncio
import os
from typing import Optional
from pathlib import Path
from .base import BaseVideoProvider

class MockVideoProvider(BaseVideoProvider):
    """Mock video provider that generates a simple color video asset."""

    def __init__(self, api_key: Optional[str] = None):
        print(f"INIT: MockVideoProvider.__init__ called with api_key={api_key}")
        super().__init__(api_key)
        # Mock provider is always available
        self._available = True

    async def generate_video_asset(
        self,
        prompt: str,
        output_path: Path,
        identity_reference_path: Optional[Path] = None,
        duration: int = 12,
        aspect_ratio: str = "9:16"
    ) -> bool:
        """
        Generate a mock video asset (a color video clip).

        Args:
            prompt: Text prompt for video generation (ignored in mock)
            identity_reference_path: Optional path to reference image for identity consistency (ignored in mock)
            output_path: Path where the generated video asset should be saved
            duration: Duration of video asset in seconds
            aspect_ratio: Aspect ratio of video asset (e.g., "9:16", "16:9")

        Returns:
            True if video asset generation was successful, False otherwise
        """
        print(f"DEBUG: generate_video_asset called from file: {__file__}")
        print(f"DEBUG: generate_video_asset called with prompt='{prompt}', output_path={output_path}")
        # Simulate some delay
        await asyncio.sleep(0.1)

        # We'll use ffmpeg to generate a color video asset if available.
        # If ffmpeg is not available, we'll create a dummy file.
        # But note: the existing codebase already uses ffmpeg, so we assume it's available.
        try:
            # Parse aspect ratio
            if aspect_ratio == "9:16":
                width, height = 1080, 1920
            elif aspect_ratio == "16:9":
                width, height = 1920, 1080
            else:
                # Default to 9:16
                width, height = 1080, 1920

            # Use ffmpeg to generate a solid color video
            # We'll use a dark color to match the existing background
            cmd = [
                'C:\\Users\\RATNAM\\Downloads\\ffmpeg-master-latest-win64-gpl-shared\\ffmpeg-master-latest-win64-gpl-shared\\bin\\ffmpeg.exe', '-y',
                '-f', 'lavfi', '-i',
                f'color=c=0x111111:s={width}x{height}:d={duration}:r=30',
                '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
                str(output_path)
            ]

            # Run the command
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            returncode = process.returncode

            if returncode != 0:
                # If ffmpeg fails, fall back to creating a dummy file
                print(f"FFmpeg failed to generate mock video: Process returned non-zero exit code {returncode}")
                if stderr:
                    try:
                        stderr_text = stderr.decode('utf-8', errors='ignore')
                    except:
                        stderr_text = str(stderr)
                    print(f"FFmpeg stderr: {stderr_text}")
                output_path.parent.mkdir(parents=True, exist_ok=True)
                with open(output_path, 'w') as f:
                    f.write(f"MOCK VIDEO ASSET: {prompt}")
                return True  # We still return True to indicate the mock worked
            else:
                return True
        except FileNotFoundError:
            # If ffmpeg is not found, create a dummy file
            print(f"FFmpeg executable not found at expected path")
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, 'w') as f:
                f.write(f"MOCK VIDEO ASSET: {prompt}")
            return True
        except Exception as e:
            # If any other error occurs, create a dummy file
            print(f"Error generating mock video with ffmpeg: {type(e).__name__}: {e}")
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, 'w') as f:
                f.write(f"MOCK VIDEO ASSET: {prompt}")
            return True

    def is_available(self) -> bool:
        """Mock provider is always available."""
        return self._available