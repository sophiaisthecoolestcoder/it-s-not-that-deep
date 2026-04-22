"""Interface that every fiscalization provider must satisfy."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Protocol


@dataclass
class FiscalizationLine:
    """One line item in fiskaly's expected payload shape."""
    description: str
    quantity: str  # decimal as string — fiskaly accepts string decimals
    vat_rate: str  # "NORMAL" | "REDUCED_1" | "REDUCED_2" | "SPECIAL_RATE_1" | "SPECIAL_RATE_2" | "NULL"
    gross_cents: int  # line total including VAT, in cents
    net_cents: int  # line total excluding VAT
    vat_cents: int  # VAT portion


@dataclass
class FiscalizationRequest:
    """All the info a provider needs to sign a completed sale."""
    invoice_id: int
    invoice_number: str
    currency: str
    lines: list[FiscalizationLine]
    payment_method: str  # "CASH" | "NON_CASH"
    total_gross_cents: int
    total_vat_cents: int
    total_net_cents: int


@dataclass
class FiscalizationResult:
    """What we persist into the `receipts` table after a successful sign."""
    provider: str
    provider_tss_id: str | None = None
    provider_client_id: str | None = None
    provider_transaction_id: str | None = None
    transaction_number: int | None = None
    signature_counter: int | None = None
    qr_code_data: str | None = None
    signature_value: str | None = None
    signature_algorithm: str | None = None
    time_start: datetime | None = None
    time_end: datetime | None = None
    raw_response: str = ""
    extra: dict = field(default_factory=dict)


class FiscalizationProvider(Protocol):
    """A provider signs a request and returns a structured result.

    Any transport/auth errors must be raised — callers translate them into HTTP
    5xx. We never want to quietly "succeed" with unsigned data.
    """

    name: str

    def sign(self, request: FiscalizationRequest) -> FiscalizationResult:
        ...
