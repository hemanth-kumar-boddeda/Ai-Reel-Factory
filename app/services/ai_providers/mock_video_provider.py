"""
Mock video provider for development and testing.
"""
print("LOADED: mock_video_provider.py from", __file__)

import asyncio
import os
from typing import Optional, Dict, Any
from pathlib import Path
from .base import BaseVideoProvider


class MockVideoProvider(BaseVideoProvider):
    """Mock video provider that generates an animated motion video asset."""

    def __init__(self, api_key: Optional[str] = None):
        print(f"INIT: MockVideoProvider.__init__ called with api_key={api_key}")
        super().__init__(api_key)
        self._available = True

    async def generate_video_asset(
        self,
        prompt: str,
        output_path: Path,
        identity_reference_path: Optional[Path] = None,
        duration: int = 12,
        aspect_ratio: str = "9:16"
    ) -> bool:
        print(f"DEBUG: generate_video_asset called with prompt='{prompt}', output_path={output_path}, duration={duration}")
        await asyncio.sleep(0.1)

        if aspect_ratio == "9:16":
            width, height = 1080, 1920
        elif aspect_ratio == "16:9":
            width, height = 1920, 1080
        else:
            width, height = 1080, 1920

        ffmpeg = "C:\\Users\\RATNAM\\Downloads\\ffmpeg-master-latest-win64-gpl-shared\\ffmpeg-master-latest-win64-gpl-shared\\bin\\ffmpeg.exe"
        vf = (
            f"zoompan=z='min(zoom+0.001,1.4)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)',"
            f"fade=t=in:st=0:d=0.8,"
            f"fade=t=out:st={max(duration-1,1)}:d=0.8"
        )
        cmd = [
            ffmpeg, "-y",
            "-f", "lavfi", "-i",
            f"color=c=0x1a1a2e:s={width}x{height}:d={duration}:r=30",
            "-vf", vf,
            "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            str(output_path),
        ]

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await process.communicate()
            returncode = process.returncode

            if returncode != 0:
                print(f"FFmpeg failed: {stderr.decode('utf-8', errors='ignore')[:300]}")
                output_path.parent.mkdir(parents=True, exist_ok=True)
                with open(output_path, "w") as f:
                    f.write(f"MOCK VIDEO ASSET: {prompt}")
                return True
            else:
                return True
        except FileNotFoundError:
            print("FFmpeg not found, creating dummy file")
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, "w") as f:
                f.write(f"MOCK VIDEO ASSET: {prompt}")
            return True
        except Exception as e:
            print(f"Error: {type(e).__name__}: {e}")
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, "w") as f:
                f.write(f"MOCK VIDEO ASSET: {prompt}")
            return True

    def is_available(self) -> bool:
        return self._available
