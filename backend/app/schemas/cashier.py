"""Pydantic schemas for the cashier / POS domain.

Monetary values on the wire use cent-integers (`*_cents`) to dodge float
rounding bugs. The frontend divides by 100 on display. VAT rate is a
basis-point integer (`vat_rate_bp`), e.g. 700 = 7.00%, 1900 = 19.00%.
"""
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

from app.models.cashier import (
    InvoiceStatus,
    InvoiceVenue,
    PaymentMethod,
    ProductCategory,
)


# ── Products ─────────────────────────────────────────────────────────────────

class ProductBase(BaseModel):
    sku: Optional[str] = Field(default=None, max_length=50)
    name: str = Field(min_length=1, max_length=200)
    category: ProductCategory = ProductCategory.MISC
    venue: InvoiceVenue = InvoiceVenue.OTHER
    unit_price_cents: int = Field(ge=0)
    vat_rate_bp: int = Field(ge=0, le=10000)
    active: bool = True


class ProductCreate(ProductBase):
    pass


class ProductRead(ProductBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProductUpdate(BaseModel):
    sku: Optional[str] = Field(default=None, max_length=50)
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    category: Optional[ProductCategory] = None
    venue: Optional[InvoiceVenue] = None
    unit_price_cents: Optional[int] = Field(default=None, ge=0)
    vat_rate_bp: Optional[int] = Field(default=None, ge=0, le=10000)
    active: Optional[bool] = None


# ── Invoice items ────────────────────────────────────────────────────────────

class InvoiceItemInput(BaseModel):
    """Line item as accepted by create/update endpoints.

    Totals are computed server-side from `quantity`, `unit_price_cents`,
    `vat_rate_bp` — never trusted from the client.
    """
    product_id: Optional[int] = None
    description: str = Field(min_length=1, max_length=255)
    quantity: Decimal = Field(gt=0, default=Decimal("1"))
    unit_price_cents: int = Field(ge=0)
    vat_rate_bp: int = Field(ge=0, le=10000)

    @field_validator("quantity")
    @classmethod
    def _round_quantity(cls, v: Decimal) -> Decimal:
        # 3 decimal places keeps us aligned with Numeric(10,3) in the DB.
        return v.quantize(Decimal("0.001"))


class InvoiceItemRead(BaseModel):
    id: int
    product_id: Optional[int] = None
    description: str
    quantity: Decimal
    unit_price_cents: int
    vat_rate_bp: int
    line_total_cents: int
    line_vat_cents: int

    model_config = {"from_attributes": True}


# ── Receipts ─────────────────────────────────────────────────────────────────

class ReceiptRead(BaseModel):
    id: int
    provider: str
    provider_tss_id: Optional[str] = None
    provider_client_id: Optional[str] = None
    provider_transaction_id: Optional[str] = None
    transaction_number: Optional[int] = None
    signature_counter: Optional[int] = None
    qr_code_data: Optional[str] = None
    signature_value: Optional[str] = None
    signature_algorithm: Optional[str] = None
    time_start: Optional[datetime] = None
    time_end: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Invoices ─────────────────────────────────────────────────────────────────

class InvoiceCreate(BaseModel):
    venue: InvoiceVenue = InvoiceVenue.OTHER
    reference: Optional[str] = Field(default=None, max_length=200)
    guest_id: Optional[int] = None
    notes: Optional[str] = None
    items: List[InvoiceItemInput] = Field(default_factory=list)


class InvoiceUpdate(BaseModel):
    """Only fields editable while status=OPEN. Finalized invoices are immutable."""
    venue: Optional[InvoiceVenue] = None
    reference: Optional[str] = Field(default=None, max_length=200)
    guest_id: Optional[int] = None
    notes: Optional[str] = None
    items: Optional[List[InvoiceItemInput]] = None


class InvoiceFinalize(BaseModel):
    payment_method: PaymentMethod


class InvoiceRead(BaseModel):
    id: int
    number: Optional[str] = None
    status: InvoiceStatus
    venue: InvoiceVenue
    reference: Optional[str] = None
    payment_method: Optional[PaymentMethod] = None
    cashier_user_id: Optional[int] = None
    guest_id: Optional[int] = None
    notes: Optional[str] = None
    subtotal_cents: int
    vat_total_cents: int
    total_cents: int
    currency: str
    finalized_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    items: List[InvoiceItemRead] = Field(default_factory=list)
    receipt: Optional[ReceiptRead] = None

    model_config = {"from_attributes": True}


class InvoiceSummary(BaseModel):
    """Trimmed row for list views — no items, no receipt details."""
    id: int
    number: Optional[str] = None
    status: InvoiceStatus
    venue: InvoiceVenue
    reference: Optional[str] = None
    payment_method: Optional[PaymentMethod] = None
    total_cents: int
    currency: str
    finalized_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Reporting ────────────────────────────────────────────────────────────────

class VatBreakdownEntry(BaseModel):
    vat_rate_bp: int
    net_cents: int
    vat_cents: int
    gross_cents: int


class SalesTotals(BaseModel):
    from_date: datetime
    to_date: datetime
    invoice_count: int
    subtotal_cents: int
    vat_total_cents: int
    total_cents: int
    by_venue: dict[str, int]
    by_payment_method: dict[str, int]
    by_vat_rate: List[VatBreakdownEntry]
