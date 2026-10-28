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

    # Job Queue
    REDIS_URL: str = Field(default="redis://localhost:6379/0", env="REDIS_URL")
    RQ_QUEUE_NAME: str = Field(default="reel-render", env="RQ_QUEUE_NAME")
    JOB_QUEUE_BACKEND: str = Field(default="background", env="JOB_QUEUE_BACKEND")  # background or rq
    BASE_URL: str = Field(default="http://localhost:8000", env="BASE_URL")  # Base URL for the server
    INSTAGRAM_CLIENT_ID: str = Field(default="", env="INSTAGRAM_CLIENT_ID")
    INSTAGRAM_CLIENT_SECRET: str = Field(default="", env="INSTAGRAM_CLIENT_SECRET")
    INSTAGRAM_REDIRECT_URI: str = Field(default="http://localhost:8000/instagram/callback", env="INSTAGRAM_REDIRECT_URI")
    INSTAGRAM_DEV_MODE: bool = Field(default=False, env="INSTAGRAM_DEV_MODE")

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"

# Global settings instance
settings = Settings()
