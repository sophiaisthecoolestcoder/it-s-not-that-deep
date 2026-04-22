"""Fiscalization providers.

Factory returns a concrete provider (fiskaly real, fiskaly mock) based on env.
The rest of the app talks only to the `FiscalizationProvider` protocol so we
can swap implementations without touching callers.
"""
import logging
import os

from .base import FiscalizationProvider, FiscalizationResult
from .mock import MockFiscalizationProvider
from .fiskaly import FiskalyFiscalizationProvider


logger = logging.getLogger(__name__)


def get_provider() -> FiscalizationProvider:
    """Pick the provider at runtime based on env.

    Returns the mock provider when `FISCAL_PROVIDER=mock`, when any of the
    fiskaly vars are missing, or on explicit `FISCAL_PROVIDER=fiskaly` with
    valid creds. Any other value falls back to mock with a warning — better to
    keep the UI working than to 500 every sale while someone debugs env.
    """
    explicit = (os.getenv("FISCAL_PROVIDER") or "").strip().lower()
    api_key = os.getenv("FISKALY_API_KEY")
    api_secret = os.getenv("FISKALY_API_SECRET")
    tss_id = os.getenv("FISKALY_TSS_ID")
    client_id = os.getenv("FISKALY_CLIENT_ID")
    base_url = os.getenv("FISKALY_API_BASE_URL", "https://kassensichv-middleware.fiskaly.com")

    has_all = all([api_key, api_secret, tss_id, client_id])

    if explicit == "mock":
        return MockFiscalizationProvider()
    if explicit == "fiskaly" and has_all:
        return FiskalyFiscalizationProvider(
            api_key=api_key,
            api_secret=api_secret,
            tss_id=tss_id,
            client_id=client_id,
            base_url=base_url,
        )
    if has_all:
        return FiskalyFiscalizationProvider(
            api_key=api_key,
            api_secret=api_secret,
            tss_id=tss_id,
            client_id=client_id,
            base_url=base_url,
        )
    logger.warning("fiskaly env not fully configured; using mock fiscalization provider")
    return MockFiscalizationProvider()


__all__ = [
    "FiscalizationProvider",
    "FiscalizationResult",
    "get_provider",
]
