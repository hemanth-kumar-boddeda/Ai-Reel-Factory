"""
Base class for AI audio generation providers.
"""
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from pathlib import Path

class BaseAudioProvider(ABC):
    """Abstract base class for AI audio generation providers."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key

    @abstractmethod
    async def generate_audio(
        self,
        text: str,
        output_path: Path,
        voice_options: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Generate audio from text using the AI provider.
        
        Args:
            text: Text to convert to speech
            output_path: Path where the generated audio should be saved
            voice_options: Optional voice configuration (stability, similarity_boost, etc.)
            
        Returns:
            True if audio generation was successful, False otherwise
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
