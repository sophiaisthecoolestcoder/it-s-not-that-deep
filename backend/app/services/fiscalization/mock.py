"""Deterministic mock fiscalization provider.

Produces plausible-looking signatures so the UI/DB layer can be exercised
without touching fiskaly. Never use in production — the `qr_code_data` it
returns is not a valid TSE signature and would fail any audit.
"""
from __future__ import annotations

import hashlib
import itertools
from datetime import datetime, timezone

from .base import FiscalizationProvider, FiscalizationRequest, FiscalizationResult


_COUNTER = itertools.count(1)


class MockFiscalizationProvider(FiscalizationProvider):
    name = "mock"

    def sign(self, request: FiscalizationRequest) -> FiscalizationResult:
        now = datetime.now(timezone.utc)
        tx_number = next(_COUNTER)
        sig_counter = tx_number
        payload = (
            f"{request.invoice_number}|{request.total_gross_cents}|{request.currency}"
            f"|{now.isoformat()}"
        )
        digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()
        qr_data = (
            f"V0;mock-tss;{request.invoice_number};{tx_number};{sig_counter};"
            f"{now.isoformat()};{now.isoformat()};"
            f"{request.total_gross_cents};ECDSA-MOCK;{digest[:32]}"
        )
        return FiscalizationResult(
            provider=self.name,
            provider_tss_id="mock-tss",
            provider_client_id="mock-client",
            provider_transaction_id=f"mock-tx-{tx_number}",
            transaction_number=tx_number,
            signature_counter=sig_counter,
            qr_code_data=qr_data,
            signature_value=digest,
            signature_algorithm="ECDSA-MOCK",
            time_start=now,
            time_end=now,
            raw_response=qr_data,
        )
