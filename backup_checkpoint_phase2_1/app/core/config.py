import os
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    # Application
    APP_NAME: str = "AI Reel Factory"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = Field(default=False, env="DEBUG")

    # Server
    HOST: str = Field(default="0.0.0.0", env="HOST")
    PORT: int = Field(default=8000, env="PORT")

    # Database
    DATABASE_URL: str = Field(default="sqlite:///./data/reels.db", env="DATABASE_URL")

    # FFmpeg
    FFMPEG_PATH: str = Field(default="ffmpeg", env="FFMPEG_PATH")

    # RSS Sources
    RSS_SOURCES: dict = Field(
        default={
            "OpenAI News": "https://openai.com/news/rss.xml",
            "Google AI Blog": "https://blog.google/technology/ai/rss/",
        }
    )

    # Video Settings
    VIDEO_WIDTH: int = 1080
    VIDEO_HEIGHT: int = 1920
    VIDEO_DURATION: int = 12  # seconds
    VIDEO_FPS: int = 30

    # Processing
    MAX_RSS_ITEMS_PER_SOURCE: int = 10
    MOCK_MODE: bool = Field(default=False, env="MOCK_MODE")

    # Security
    SECRET_KEY: str = Field(default="your-secret-key-here", env="SECRET_KEY")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        env_file = ".env"
        case_sensitive = True

# Global settings instance
settings = Settings()