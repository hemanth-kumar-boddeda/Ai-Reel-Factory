from redis import Redis
from rq import Queue
from app.core.config import settings

# We'll create the Redis connection lazily to avoid connecting on import if not used.
_redis_connection = None
_rq_queue = None

def get_redis_connection():
    global _redis_connection
    if _redis_connection is None:
        _redis_connection = Redis.from_url(settings.REDIS_URL)
    return _redis_connection

def get_queue():
    global _rq_queue
    if _rq_queue is None:
        _rq_queue = Queue(settings.RQ_QUEUE_NAME, connection=get_redis_connection())
    return _rq_queue
