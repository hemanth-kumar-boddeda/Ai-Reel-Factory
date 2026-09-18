"""
Mock script provider for development and testing.
"""
import asyncio
import random
from typing import Optional
from pathlib import Path
from .script_provider import BaseScriptProvider

class MockScriptProvider(BaseScriptProvider):
    """Mock script provider that returns a predefined script."""

    def __init__(self, api_key: Optional[str] = None):
        super().__init__(api_key)
        # Mock provider is always available
        self._available = True

    async def generate_script(
        self,
        prompt: str,
        context: Optional[str] = None,
        max_length: int = 500
    ) -> str:
        """
        Generate a mock script.
        
        Args:
            prompt: Text prompt for script generation
            context: Optional context to guide generation
            max_length: Maximum length of generated script in characters
            
        Returns:
            Mock script as a string
        """
        # Simulate some delay
        await asyncio.sleep(0.1)
        
        # Return a simple script based on the prompt
        script = f"This is a mock script generated for: {prompt}"
        if context:
            script += f" with context: {context}"
        
        # Truncate to max_length if needed
        if len(script) > max_length:
            script = script[:max_length] + "..."
            
        return script

    def is_available(self) -> bool:
        """Mock provider is always available."""
        return self._available
