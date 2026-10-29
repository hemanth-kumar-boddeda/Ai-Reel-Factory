"""
Mock audio provider for development and testing.
"""
import asyncio
import os
import struct
from typing import Optional, Dict, Any
from pathlib import Path
from .audio_base import BaseAudioProvider

class MockAudioProvider(BaseAudioProvider):
    """Mock audio provider that generates a silent audio file."""

    def __init__(self, api_key: Optional[str] = None):
        super().__init__(api_key)
        # Mock provider is always available
        self._available = True

    async def generate_audio(
        self,
        text: str,
        output_path: Path,
        voice_options: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Generate a mock audio file (silent).

        Args:
            text: Text to convert to speech (ignored in mock)
            output_path: Path where the generated audio should be saved
            voice_options: Optional voice configuration (ignored in mock)

        Returns:
            True if audio generation was successful, False otherwise
        """
        # Simulate some delay
        await asyncio.sleep(0.1)

        # Create a silent audio file (1 second of silence at 44100 Hz, 16-bit mono)
        sample_rate = 44100
        duration_seconds = 15.0  # Default duration
        num_channels = 1
        bits_per_sample = 16
        num_samples = int(sample_rate * duration_seconds)

        # Calculate byte rate and block align
        byte_rate = sample_rate * num_channels * bits_per_sample // 8
        block_align = num_channels * bits_per_sample // 8

        # WAV file header (RIFF format)
        # ChunkID: "RIFF"
        # ChunkSize: 36 + SubChunk2Size
        # Format: "WAVE"
        # SubChunk1ID: "fmt "
        # SubChunk1Size: 16
        # AudioFormat: 1 (PCM)
        # NumChannels: 1
        # SampleRate: 44100
        # ByteRate: SampleRate * NumChannels * BitsPerSample/8
        # BlockAlign: NumChannels * BitsPerSample/8
        # BitsPerSample: 16
        # SubChunk2ID: "data"
        # SubChunk2Size: NumSamples * NumChannels * BitsPerSample/8

        subchunk2_size = num_samples * num_channels * bits_per_sample // 8
        chunk_size = 36 + subchunk2_size

        # Ensure output directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, 'wb') as f:
            # RIFF header
            f.write(b'RIFF')
            f.write(struct.pack('<I', chunk_size))
            f.write(b'WAVE')
            # fmt subchunk
            f.write(b'fmt ')
            f.write(struct.pack('<I', 16))  # SubChunk1Size
            f.write(struct.pack('<H', 1))   # AudioFormat (PCM)
            f.write(struct.pack('<H', num_channels))  # NumChannels
            f.write(struct.pack('<I', sample_rate))   # SampleRate
            f.write(struct.pack('<I', byte_rate))     # ByteRate
            f.write(struct.pack('<H', block_align))   # BlockAlign
            f.write(struct.pack('<H', bits_per_sample))  # BitsPerSample
            # data subchunk
            f.write(b'data')
            f.write(struct.pack('<I', subchunk2_size))  # SubChunk2Size
            # Write silence (zero bytes)
            f.write(b'\x00' * subchunk2_size)

        return True

    def is_available(self) -> bool:
        """Mock provider is always available."""
        return self._available