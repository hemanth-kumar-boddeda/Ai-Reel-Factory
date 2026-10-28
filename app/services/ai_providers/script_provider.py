"""
Abstract base class for AI script providers.
"""
from abc import ABC, abstractmethod
from typing import Optional, List
from pydantic import BaseModel, Field
from pathlib import Path


class Scene(BaseModel):
    scene_number: int
    duration_seconds: int
    narration: str
    visual_prompt: str
    on_screen_text: str
    transition: str
    requires_identity: bool = False


class StructuredScript(BaseModel):
    hook: str = Field(..., description="The hook to grab attention")
    title: str = Field(..., description="The title of the reel")
    narration: str = Field(..., description="The full narration text")
    scenes: List[Scene] = Field(..., description="List of scenes")
    cta: str = Field(..., description="Call to action")
    estimated_duration_seconds: int = Field(..., description="Estimated duration in seconds")


class BaseScriptProvider(ABC):
    """Abstract base class for AI script providers."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key

    @abstractmethod
    async def is_available(self) -> bool:
        """
        Check if the provider is available and configured correctly.

        Returns:
            True if provider is available, False otherwise
        """
        pass

    @abstractmethod
    async def generate_script(
        self,
        prompt: str,
        context: Optional[str] = None,
        max_length: int = 500
    ) -> Optional[StructuredScript]:
        """
        Generate a structured script using the AI provider.

        Args:
            prompt: Text prompt for script generation
            context: Optional context to guide generation
            max_length: Maximum length of generated script in characters

        Returns:
            Generated structured script or None if generation failed
        """
        pass