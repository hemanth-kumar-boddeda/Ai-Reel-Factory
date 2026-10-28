"""
OpenAI script provider for AI script generation.
"""
import os
import json
from typing import Optional
from openai import AsyncOpenAI
from .script_provider import BaseScriptProvider, StructuredScript


class OpenAIScriptProvider(BaseScriptProvider):
    """OpenAI script provider using the OpenAI API."""

    def __init__(self, api_key: Optional[str] = None):
        super().__init__(api_key)
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.client = AsyncOpenAI(api_key=self.api_key) if self.api_key else None

    async def is_available(self) -> bool:
        """Check if OpenAI provider is configured (API key set)."""
        return bool(self.api_key)

    async def generate_script(
        self,
        prompt: str,
        context: Optional[str] = None,
        max_length: int = 500
    ) -> Optional[StructuredScript]:
        """
        Generate a structured script using the OpenAI API.

        Args:
            prompt: Text prompt for script generation
            context: Optional context to guide generation
            max_length: Maximum length of generated script in characters

        Returns:
            Generated structured script or None if generation failed
        """
        if not self.is_available():
            return None

        # Construct the full prompt
        full_prompt = prompt
        if context:
            full_prompt = f"{prompt}\n\nContext: {context}"

        # Define the JSON schema for structured output
        schema = {
            "type": "object",
            "properties": {
                "hook": {"type": "string"},
                "title": {"type": "string"},
                "narration": {"type": "string"},
                "scenes": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "scene_number": {"type": "integer"},
                            "duration_seconds": {"type": "integer"},
                            "narration": {"type": "string"},
                            "visual_prompt": {"type": "string"},
                            "on_screen_text": {"type": "string"},
                            "transition": {"type": "string"},
                            "requires_identity": {"type": "boolean"}
                        },
                        "required": ["scene_number", "duration_seconds", "narration", "visual_prompt", "on_screen_text", "transition", "requires_identity"]
                    }
                },
                "cta": {"type": "string"},
                "estimated_duration_seconds": {"type": "integer"}
            },
            "required": ["hook", "title", "narration", "scenes", "cta", "estimated_duration_seconds"]
        }

        try:
            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo-1106",  # model that supports JSON mode
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that generates structured scripts for video reels. Output must be valid JSON matching the given schema. For each scene, set 'requires_identity' to true if the scene features the presenter or requires identity consistency, otherwise false."},
                    {"role": "user", "content": full_prompt}
                ],
                response_format={"type": "json_object", "json_schema": {"name": "script_schema", "schema": schema}},
                max_tokens=max_length // 4,  # rough estimate: 4 chars per token
                temperature=0.7
            )
            json_str = response.choices[0].message.content.strip()
            # Parse and validate the JSON
            data = json.loads(json_str)
            structured_script = StructuredScript(**data)
            return structured_script
        except Exception as e:
            print(f"Error generating structured script with OpenAI: {e}")
            return None