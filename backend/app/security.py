"""In-process rate limiting, login lockout, and structured logging helpers.

Pure-stdlib implementation. No Redis dependency — fine for a single-worker
deployment. If the app is ever scaled out, swap the stores for Redis.
"""
from __future__ import annotations

import logging
import threading
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Deque, Dict, Optional

from fastapi import HTTPException, Request, status

logger = logging.getLogger("bleiche")


# ── Sliding-window rate limiter ──────────────────────────────────────────────

@dataclass
class _Bucket:
    hits: Deque[float] = field(default_factory=deque)


class RateLimiter:
    """Sliding-window limiter keyed by an arbitrary string (user_id, ip, …).

    `limit` requests per `window_seconds`. Thread-safe.
    """

    def __init__(self, limit: int, window_seconds: float, name: str = "rl") -> None:
        self.limit = limit
        self.window = window_seconds
        self.name = name
        self._buckets: Dict[str, _Bucket] = {}
        self._lock = threading.Lock()

    def check(self, key: str) -> None:
        now = time.time()
        cutoff = now - self.window
        with self._lock:
            bucket = self._buckets.setdefault(key, _Bucket())
            while bucket.hits and bucket.hits[0] < cutoff:
                bucket.hits.popleft()
            if len(bucket.hits) >= self.limit:
                retry_in = int(bucket.hits[0] + self.window - now) + 1
                logger.warning("rate_limit hit limiter=%s key=%s", self.name, key)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Too many requests. Try again in {retry_in}s.",
                    headers={"Retry-After": str(retry_in)},
                )
            bucket.hits.append(now)


# Limits tuned for a small team (≤50 daily users).
login_ip_limiter = RateLimiter(limit=10, window_seconds=60, name="login_ip")
login_user_limiter = RateLimiter(limit=5, window_seconds=300, name="login_user")
llm_user_limiter = RateLimiter(limit=20, window_seconds=60, name="llm_user")
llm_user_daily = RateLimiter(limit=500, window_seconds=24 * 3600, name="llm_user_daily")
write_limiter = RateLimiter(limit=60, window_seconds=60, name="write")
password_change_limiter = RateLimiter(limit=5, window_seconds=300, name="password_change")
public_ip_limiter = RateLimiter(limit=120, window_seconds=60, name="public_ip")


# ── Login lockout (after N consecutive failures, cool off) ───────────────────

@dataclass
class _FailState:
    fails: int = 0
    locked_until: float = 0.0


class LoginLockout:
    def __init__(self, threshold: int = 5, lockout_seconds: int = 900) -> None:
        self.threshold = threshold
        self.lockout = lockout_seconds
        self._state: Dict[str, _FailState] = {}
        self._lock = threading.Lock()

    def check(self, username: str) -> None:
        with self._lock:
            s = self._state.get(username)
            if s and s.locked_until > time.time():
                retry = int(s.locked_until - time.time()) + 1
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Account temporarily locked after repeated failures. Retry in {retry}s.",
                    headers={"Retry-After": str(retry)},
                )

    def record_failure(self, username: str) -> None:
        with self._lock:
            s = self._state.setdefault(username, _FailState())
            s.fails += 1
            if s.fails >= self.threshold:
                s.locked_until = time.time() + self.lockout
                s.fails = 0
                logger.warning("login_locked user=%s lockout_seconds=%s", username, self.lockout)

    def record_success(self, username: str) -> None:
        with self._lock:
            self._state.pop(username, None)


login_lockout = LoginLockout()


# ── Client-IP extraction (works behind a single trusted proxy) ───────────────

def client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",", 1)[0].strip()
    return request.client.host if request.client else "unknown"


# ── ILIKE escaping for user-controlled search ────────────────────────────────

def ilike_escape(value: str) -> str:
    """Escape `%`, `_`, `\\` for safe use in ILIKE patterns."""
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
