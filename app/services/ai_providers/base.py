"""
Base class for AI video asset providers (e.g., background video clips).
"""
from abc import ABC, abstractmethod
from typing import Optional
from pathlib import Path

class BaseVideoProvider(ABC):
    """Abstract base class for AI video asset providers."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key

    @abstractmethod
    async def generate_video_asset(
        self,
        prompt: str,
        identity_reference_path: Optional[Path] = None,
        output_path: Path,
        duration: int = 12,
        aspect_ratio: str = "9:16"
    ) -> bool:
        """
        Generate a video asset (e.g., background clip) using the AI provider.
        
        Args:
            prompt: Text prompt for video asset generation
            identity_reference_path: Optional path to reference image for identity consistency
            output_path: Path where the generated video asset should be saved
            duration: Duration of video asset in seconds
            aspect_ratio: Aspect ratio of video asset (e.g., "9:16", "16:9")
            
        Returns:
            True if video asset generation was successful, False otherwise
        """
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """
        Check if the provider is available and configured correctly.
        
        Returns:
            True if provider is available, False otherwise
        """
        pass
