"""
Utility for generating timed captions from scripts.
"""
import re
from typing import List, Dict
from pathlib import Path

class CaptionGenerator:
    """Generate timed captions (SRT format) from scripts."""
    
    def __init__(self, words_per_minute: int = 150):
        """
        Initialize the caption generator.
        
        Args:
            words_per_minute: Average speaking rate for timing calculation
        """
        self.words_per_minute = words_per_minute
        self.seconds_per_word = 60.0 / words_per_minute
    
    def generate_srt_captions(self, script: str, output_path: Path) -> bool:
        """
        Generate SRT captions from a script.
        
        Args:
            script: The script text to generate captions from
            output_path: Path where the SRT file should be saved
            
        Returns:
            True if captions were generated successfully, False otherwise
        """
        try:
            # Clean up the script
            script = script.strip()
            if not script:
                return False
            
            # Split into sentences (simple approach)
            sentences = re.split(r'[.!?]+', script)
            sentences = [s.strip() for s in sentences if s.strip()]
            
            if not sentences:
                return False
            
            # Generate SRT content
            srt_content = []
            current_time = 0.0  # in seconds
            
            for i, sentence in enumerate(sentences, 1):
                # Calculate duration for this sentence
                word_count = len(sentence.split())
                duration_seconds = word_count * self.seconds_per_word
                
                # Convert time to SRT format (HH:MM:SS,mmm)
                start_time = self._seconds_to_srt_time(current_time)
                end_time = self._seconds_to_srt_time(current_time + duration_seconds)
                
                # Add caption entry
                srt_content.append(f"{i}")
                srt_content.append(f"{start_time} --> {end_time}")
                srt_content.append(sentence)
                srt_content.append("")  # Blank line between entries
                
                # Update current time
                current_time += duration_seconds
            
            # Write SRT file
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write("\n".join(srt_content))
            
            print(f"Captions generated successfully and saved to {output_path}")
            return True
            
        except Exception as e:
            print(f"Error generating captions: {e}")
            return False
    
    def _seconds_to_srt_time(self, seconds: float) -> str:
        """
        Convert seconds to SRT time format (HH:MM:SS,mmm).
        
        Args:
            seconds: Time in seconds
            
        Returns:
            Time string in SRT format
        """
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millisecs = int((seconds % 1) * 1000)
        
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millisecs:03d}"
