"""
Abstract base class for AI script providers.
"""
from abc import ABC, abstractmethod
from typing import Optional
from pathlib import Path

class BaseScriptProvider(ABC):
    """Abstract base class for AI script providers."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key

    @abstractmethod
    async def generate_script(
        self,
        prompt: str,
        context: Optional[str] = None,
        max_length: int = 500
    ) -> str:
        """
        Generate a script using the AI provider.
        
        Args:
            prompt: Text prompt for script generation
            context: Optional context to guide generation
            max_length: Maximum length of generated script in characters
            
        Returns:
            Generated script as a string
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
