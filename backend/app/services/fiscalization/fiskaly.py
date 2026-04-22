"""fiskaly KassenSichV (DE) provider.

Talks to fiskaly's SIGN DE API (v2). The flow for a finalized sale:

  1. POST /api/v2/auth {api_key, api_secret}          -> access_token (~60 min TTL)
  2. PUT  /api/v2/tss/{tss}/tx/{tx}                    -> creates ACTIVE tx
  3. PUT  /api/v2/tss/{tss}/tx/{tx}?last_revision=...  -> adds receipt + FINISH

The signed response contains `qr_code_data`, `signature`, `time_start`,
`time_end`, `number`, etc. — all persisted to our `receipts` table.

Token caching is per-provider-instance in memory; if the process restarts we
simply re-auth on the next sign. A small clock-skew buffer avoids racing the
expiry.

Docs: https://developer.fiskaly.com/api/kassensichv/v2/
"""
from __future__ import annotations

import json
import logging
import threading
import time
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx

from .base import (
    FiscalizationLine,
    FiscalizationProvider,
    FiscalizationRequest,
    FiscalizationResult,
)


logger = logging.getLogger(__name__)


_VAT_RATE_BP_TO_FISKALY: dict[int, str] = {
    1900: "NORMAL",      # 19%
    700: "REDUCED_1",    # 7%
    1050: "SPECIAL_RATE_1",
    550: "SPECIAL_RATE_2",
    0: "NULL",
}


def vat_rate_bp_to_fiskaly(vat_rate_bp: int) -> str:
    """Map our integer basis-point rate to fiskaly's named rate."""
    try:
        return _VAT_RATE_BP_TO_FISKALY[vat_rate_bp]
    except KeyError as exc:
        raise ValueError(
            f"Unsupported VAT rate for fiskaly: {vat_rate_bp} bp. "
            f"Allowed: {sorted(_VAT_RATE_BP_TO_FISKALY)}"
        ) from exc


class FiskalyFiscalizationProvider(FiscalizationProvider):
    name = "fiskaly"

    def __init__(
        self,
        api_key: str,
        api_secret: str,
        tss_id: str,
        client_id: str,
        base_url: str = "https://kassensichv-middleware.fiskaly.com",
        request_timeout: float = 10.0,
    ) -> None:
        self._api_key = api_key
        self._api_secret = api_secret
        self._tss_id = tss_id
        self._client_id = client_id
        self._base_url = base_url.rstrip("/")
        self._timeout = request_timeout
        self._token: str | None = None
        self._token_expires_at: float = 0.0
        self._lock = threading.Lock()

    # ── Auth ────────────────────────────────────────────────────────────────

    def _access_token(self) -> str:
        with self._lock:
            if self._token and time.time() < self._token_expires_at - 30:
                return self._token
            resp = httpx.post(
                f"{self._base_url}/api/v2/auth",
                json={"api_key": self._api_key, "api_secret": self._api_secret},
                timeout=self._timeout,
            )
            if resp.status_code >= 400:
                raise RuntimeError(
                    f"fiskaly auth failed ({resp.status_code}): {resp.text[:500]}"
                )
            body = resp.json()
            self._token = body["access_token"]
            # fiskaly returns `expires_in` seconds-from-now.
            self._token_expires_at = time.time() + int(body.get("expires_in", 3600))
            return self._token

    def _auth_headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self._access_token()}"}

    # ── Sign ────────────────────────────────────────────────────────────────

    def sign(self, request: FiscalizationRequest) -> FiscalizationResult:
        """Open + finish a TSE transaction per fiskaly v2 spec.

        Two-step flow is required by KassenSichV: the TSS signs start-time
        (ACTIVE) separately from end-time (FINISHED), so a "faked" receipt
        added later can be detected by its impossible timestamps.
        """
        tx_id = str(uuid.uuid4())
        url = f"{self._base_url}/api/v2/tss/{self._tss_id}/tx/{tx_id}"

        # Step 1: open the transaction as ACTIVE. `tx_revision` MUST be 1 for
        # the first PUT; fiskaly increments with each subsequent update.
        active_body = {"state": "ACTIVE", "client_id": self._client_id}
        resp1 = httpx.put(
            f"{url}?tx_revision=1",
            headers=self._auth_headers(),
            json=active_body,
            timeout=self._timeout,
        )
        if resp1.status_code >= 400:
            raise RuntimeError(
                f"fiskaly open-tx failed ({resp1.status_code}): {resp1.text[:500]}"
            )

        # Step 2: finish the transaction. Receipt schema is
        # ProcessDataStandardV1Receipt — ONLY receipt_type + amounts_per_vat_rate
        # (required) + amounts_per_payment_type (conventional). No line_items,
        # no notes — those were dropped in v2.
        amounts_per_vat = _aggregate_vat(request.lines)

        finish_body = {
            "state": "FINISHED",
            "client_id": self._client_id,
            "schema": {
                "standard_v1": {
                    "receipt": {
                        "receipt_type": "RECEIPT",
                        "amounts_per_vat_rate": amounts_per_vat,
                        "amounts_per_payment_type": [
                            {
                                "payment_type": request.payment_method,
                                "amount": _cents_to_str(request.total_gross_cents),
                                "currency_code": request.currency,
                            }
                        ],
                    }
                }
            },
        }
        resp2 = httpx.put(
            f"{url}?tx_revision=2",
            headers=self._auth_headers(),
            json=finish_body,
            timeout=self._timeout,
        )
        if resp2.status_code >= 400:
            raise RuntimeError(
                f"fiskaly finish-tx failed ({resp2.status_code}): {resp2.text[:500]}"
            )
        finished = resp2.json()
        return self._result_from_response(finished, tx_id)

    # ── Response mapping ────────────────────────────────────────────────────

    def _result_from_response(self, finished: dict[str, Any], tx_id: str) -> FiscalizationResult:
        signature = finished.get("signature") or {}
        # In v2 the timestamps live at the top level of the response as unix seconds.
        time_start = _parse_fiskaly_time(finished.get("time_start"))
        time_end = _parse_fiskaly_time(finished.get("time_end"))
        return FiscalizationResult(
            provider=self.name,
            provider_tss_id=self._tss_id,
            provider_client_id=self._client_id,
            provider_transaction_id=tx_id,
            transaction_number=finished.get("number"),
            signature_counter=signature.get("counter"),
            qr_code_data=finished.get("qr_code_data"),
            signature_value=signature.get("value"),
            signature_algorithm=signature.get("algorithm"),
            time_start=time_start,
            time_end=time_end,
            raw_response=json.dumps(finished, ensure_ascii=False, separators=(",", ":")),
        )

    @staticmethod
    def _line_to_fiskaly(line: FiscalizationLine) -> dict[str, Any]:
        return {
            "text": line.description,
            "quantity": line.quantity,
            "price_per_unit": _cents_to_str(
                line.gross_cents // max(1, int(float(line.quantity) or 1))
            ),
            "vat_amounts": [
                {
                    "percentage": _bp_to_percentage(_fiskaly_rate_to_bp(line.vat_rate)),
                    "incl_vat": True,
                    "amount": _cents_to_str(line.gross_cents),
                    "vat_rate": line.vat_rate,
                }
            ],
        }


def _cents_to_str(cents: int) -> str:
    sign = "-" if cents < 0 else ""
    whole, frac = divmod(abs(cents), 100)
    return f"{sign}{whole}.{frac:02d}"


def _bp_to_percentage(bp: int) -> str:
    whole, frac = divmod(bp, 100)
    return f"{whole}.{frac:02d}"


def _fiskaly_rate_to_bp(name: str) -> int:
    for bp, fiskaly_name in _VAT_RATE_BP_TO_FISKALY.items():
        if fiskaly_name == name:
            return bp
    return 0


def _aggregate_vat(lines: list[FiscalizationLine]) -> list[dict[str, Any]]:
    buckets: dict[str, dict[str, int]] = {}
    for line in lines:
        bucket = buckets.setdefault(line.vat_rate, {"gross": 0, "vat": 0, "net": 0})
        bucket["gross"] += line.gross_cents
        bucket["vat"] += line.vat_cents
        bucket["net"] += line.net_cents
    return [
        {
            "vat_rate": rate,
            "incl_vat": True,
            "amount": _cents_to_str(b["gross"]),
        }
        for rate, b in buckets.items()
    ]


def _parse_fiskaly_time(value: str | None) -> datetime | None:
    if not value:
        return None
    # fiskaly uses unix-seconds integers in some contexts and ISO strings in others.
    try:
        if isinstance(value, (int, float)):
            return datetime.fromtimestamp(int(value), tz=timezone.utc)
        if value.isdigit():
            return datetime.fromtimestamp(int(value), tz=timezone.utc)
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, TypeError):
        logger.debug("could not parse fiskaly timestamp: %r", value)
        return None
