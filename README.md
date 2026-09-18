# AI Reel Factory — Working MVP

This MVP runs a real automated loop:

RSS sources → topic scoring → SQLite state → 9:16 MP4 generation → dashboard.

It is deliberately dependency-light so it can be started locally with Docker.

## Start

```bash
docker compose up --build
```

Open http://localhost:8000

Click **Run pipeline now** for a test run. The first run fetches current RSS entries, selects the highest-scoring candidate, and renders a 1080×1920 Reel.

Open http://localhost:5678 to start n8n. Import `n8n/workflow.json`, then activate the workflow. The workflow triggers the pipeline every 2 hours.

## What is already real

- Live RSS ingestion
- Deduplication
- Topic scoring
- Persistent content state
- Real MP4 rendering with FFmpeg
- Web dashboard
- Scheduled n8n orchestration
- Dockerized runtime

## What is intentionally stubbed for production integration

1. LLM research/script generation
2. AI image/video generation
3. TTS voice generation
4. Advanced AI QA
5. Instagram/Meta publishing
6. Instagram performance ingestion

These are provider-specific and should be wired through environment variables/credentials rather than hard-coded secrets.

## Production architecture

Keep the current `pipeline()` as the orchestrator entry point. Replace `make_video()` with the Remotion render service, add LLM/asset/TTS jobs before render, add a QA gate before publication, and add the official Instagram publishing API after the QA gate.

## Safety/quality

The MVP does not fabricate source claims: source text comes from RSS. For production, every factual claim should be traceable to stored source evidence. Do not copy another creator's exact scripts, voice, or copyrighted assets.
