"""
AI orchestrator for coordinating AI providers in the reel generation pipeline.
"""
import asyncio
from typing import Optional, Dict, Any
from pathlib import Path
from ..core.config import settings
from .script_provider import BaseScriptProvider
from .audio_base import BaseAudioProvider
from .base import BaseVideoProvider
from .mock_script_provider import MockScriptProvider
from .mock_audio_provider import MockAudioProvider
from .mock_video_provider import MockVideoProvider

class AIOrchestrator:
    """Orchestrates AI providers for script, audio, and video asset generation."""

    def __init__(
        self,
        script_provider: Optional[BaseScriptProvider] = None,
        audio_provider: Optional[BaseAudioProvider] = None,
        video_provider: Optional[BaseVideoProvider] = None
    ):
        """
        Initialize the AI orchestrator with optional providers.
        If a provider is not provided, a mock provider will be used.
        
        Args:
            script_provider: Script provider instance
            audio_provider: Audio provider instance
            video_provider: Video provider instance
        """
        self.script_provider = script_provider or MockScriptProvider()
        self.audio_provider = audio_provider or MockAudioProvider()
        self.video_provider = video_provider or MockVideoProvider()

    async def generate_script(
        self,
        prompt: str,
        context: Optional[str] = None,
        max_length: int = 500
    ) -> Optional[str]:
        """
        Generate a script using the configured script provider.
        
        Args:
            prompt: Text prompt for script generation
            context: Optional context to guide generation
            max_length: Maximum length of generated script in characters
            
        Returns:
            Generated script as a string, or None if generation failed
        """
        try:
            if not self.script_provider.is_available():
                return None
            return await self.script_provider.generate_script(prompt, context, max_length)
        except Exception as e:
            print(f"Error generating script: {e}")
            return None

    async def generate_audio(
        self,
        text: str,
        output_path: Path,
        voice_options: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Generate audio using the configured audio provider.
        
        Args:
            text: Text to convert to speech
            output_path: Path where the generated audio should be saved
            voice_options: Optional voice configuration
            
        Returns:
            True if audio generation was successful, False otherwise
        """
        try:
            if not self.audio_provider.is_available():
                return False
            return await self.audio_provider.generate_audio(text, output_path, voice_options)
        except Exception as e:
            print(f"Error generating audio: {e}")
            return False

    async def generate_video_asset(
        self,
        prompt: str,
        identity_reference_path: Optional[Path] = None,
        output_path: Path,
        duration: int = 12,
        aspect_ratio: str = "9:16"
    ) -> bool:
        """
        Generate a video asset using the configured video provider.
        
        Args:
            prompt: Text prompt for video asset generation
            identity_reference_path: Optional path to reference image for identity consistency
            output_path: Path where the generated video asset should be saved
            duration: Duration of video asset in seconds
            aspect_ratio: Aspect ratio of video asset (e.g., "9:16", "16:9")
            
        Returns:
            True if video asset generation was successful, False otherwise
        """
        try:
            if not self.video_provider.is_available():
                return False
            return await self.video_provider.generate_video_asset(
                prompt, identity_reference_path, output_path, duration, aspect_ratio
            )
        except Exception as e:
            print(f"Error generating video asset: {e}")
            return False
