"""
Mock script provider for development and testing.
"""
import asyncio
import random
from typing import Optional, List
from pathlib import Path
from .script_provider import BaseScriptProvider, StructuredScript, Scene


class MockScriptProvider(BaseScriptProvider):
    """Mock script provider that returns a predefined structured script."""

    def __init__(self, api_key: Optional[str] = None):
        super().__init__(api_key)
        # Mock provider is always available
        self._available = True

    async def is_available(self) -> bool:
        """Mock provider is always available."""
        return True

    async def generate_script(
        self,
        prompt: str,
        context: Optional[str] = None,
        max_length: int = 500
    ) -> Optional[StructuredScript]:
        """
        Generate a mock structured script.

        Args:
            prompt: Text prompt for script generation
            context: Optional context to guide generation
            max_length: Maximum length of generated script in characters

        Returns:
            Mock structured script as a StructuredScript object
        """
        try:
            # Simulate some delay
            await asyncio.sleep(0.1)

            # Return a simple structured script based on the prompt
            hook = f"Hook for: {prompt}"
            title = f"Title: {prompt}"
            narration = f"This is a mock narration generated for: {prompt}"
            if context:
                narration += f" with context: {context}"

            # Create a mock scene
            scene = Scene(
                scene_number=1,
                duration_seconds=15,
                narration="Mock scene narration",
                visual_prompt="Mock visual prompt",
                on_screen_text="Mock on screen text",
                transition="fade",
                requires_identity=False
            )
            scenes = [scene]

            cta = "Subscribe for more!"
            estimated_duration_seconds = 15

            # Truncate strings if needed (though mock data is short)
            if len(hook) > max_length:
                hook = hook[:max_length] + "..."
            if len(title) > max_length:
                title = title[:max_length] + "..."
            if len(narration) > max_length:
                narration = narration[:max_length] + "..."
            if len(cta) > max_length:
                cta = cta[:max_length] + "..."

            structured_script = StructuredScript(
                hook=hook,
                title=title,
                narration=narration,
                scenes=scenes,
                cta=cta,
                estimated_duration_seconds=estimated_duration_seconds
            )
            return structured_script
        except Exception as e:
            # Log the error and return a default structured script instead of None
            print(f"Error in MockScriptProvider.generate_script: {e}")
            # Return a basic structured script to prevent pipeline failure
            hook = f"Hook for: {prompt}"
            title = f"Title: {prompt}"
            narration = f"This is a mock narration generated for: {prompt}"
            if context:
                narration += f" with context: {context}"

            scene = Scene(
                scene_number=1,
                duration_seconds=15,
                narration="Mock scene narration",
                visual_prompt="Mock visual prompt",
                on_screen_text="Mock on screen text",
                transition="fade",
                requires_identity=False
            )
            scenes = [scene]

            cta = "Subscribe for more!"
            estimated_duration_seconds = 15

            return StructuredScript(
                hook=hook,
                title=title,
                narration=narration,
                scenes=scenes,
                cta=cta,
                estimated_duration_seconds=estimated_duration_seconds
            )