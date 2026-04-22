"""Cashier / POS data model.

Unified sales ledger for reception / restaurant / spa. Each sale is an
`Invoice` holding one or more `InvoiceItem` rows (each with its own VAT rate).
Once finalized, an invoice is fiscalized via a provider (fiskaly in prod, mock
in dev) and the signed artifact lands in `receipts`.

The `invoices.status` lifecycle:
  OPEN   — the cashier is still adding / editing lines (no fiscal record yet)
  FINALIZED — submitted + signed by the provider; immutable from this point
  VOIDED — a finalized invoice reversed by an admin (future; not wired in v1)

Design doc: docs/cashier.md
"""
import enum

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    Index,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class InvoiceStatus(str, enum.Enum):
    OPEN = "open"
    FINALIZED = "finalized"
    VOIDED = "voided"


class InvoiceVenue(str, enum.Enum):
    RECEPTION = "reception"
    RESTAURANT = "restaurant"
    SPA = "spa"
    OTHER = "other"


class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    CARD = "card"
    BANK_TRANSFER = "bank_transfer"
    ROOM_CHARGE = "room_charge"
    OTHER = "other"


class ProductCategory(str, enum.Enum):
    ACCOMMODATION = "accommodation"
    FOOD = "food"
    BEVERAGE = "beverage"
    SPA = "spa"
    MISC = "misc"


class Product(Base):
    """Catalog of sellable items, used to auto-populate invoice lines."""
    __tablename__ = "cashier_products"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(50), unique=True, nullable=True)
    name = Column(String(200), nullable=False)
    category = Column(Enum(ProductCategory), nullable=False, server_default=ProductCategory.MISC.name)
    venue = Column(Enum(InvoiceVenue), nullable=False, server_default=InvoiceVenue.OTHER.name)
    # Unit price in cents (integer — currency safety). Display layer divides by 100.
    unit_price_cents = Column(Integer, nullable=False)
    # VAT rate as basis-point integer: 700 = 7.00%, 1900 = 19.00%. Matches fiskaly.
    vat_rate_bp = Column(Integer, nullable=False)
    active = Column(Boolean, nullable=False, server_default="true")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class Invoice(Base):
    __tablename__ = "cashier_invoices"

    id = Column(Integer, primary_key=True, index=True)
    # Human-facing invoice number assigned on finalize (format: YYYYMMDD-NNNN).
    # Null while status=OPEN.
    number = Column(String(32), unique=True, nullable=True)
    status = Column(Enum(InvoiceStatus), nullable=False, server_default=InvoiceStatus.OPEN.name)
    venue = Column(Enum(InvoiceVenue), nullable=False, server_default=InvoiceVenue.OTHER.name)
    # Caller-facing label like "Table 12" or "Room 207" — optional, free text.
    reference = Column(String(200), nullable=True)
    payment_method = Column(Enum(PaymentMethod), nullable=True)
    cashier_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    guest_id = Column(Integer, ForeignKey("guests.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text, nullable=True)

    # Totals kept denormalized so list views don't have to re-aggregate.
    # All in cents, matching items.
    subtotal_cents = Column(Integer, nullable=False, server_default="0")
    vat_total_cents = Column(Integer, nullable=False, server_default="0")
    total_cents = Column(Integer, nullable=False, server_default="0")

    currency = Column(String(3), nullable=False, server_default="EUR")
    finalized_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    items = relationship(
        "InvoiceItem",
        back_populates="invoice",
        cascade="all, delete-orphan",
        order_by="InvoiceItem.id",
    )
    receipt = relationship(
        "Receipt",
        back_populates="invoice",
        uselist=False,
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("ix_cashier_invoices_status_created", "status", "created_at"),
        Index("ix_cashier_invoices_venue_created", "venue", "created_at"),
    )


class InvoiceItem(Base):
    __tablename__ = "cashier_invoice_items"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("cashier_invoices.id", ondelete="CASCADE"), nullable=False)
    # Optional link back to the catalog; null for ad-hoc lines.
    product_id = Column(Integer, ForeignKey("cashier_products.id", ondelete="SET NULL"), nullable=True)
    description = Column(String(255), nullable=False)
    quantity = Column(Numeric(10, 3), nullable=False, server_default="1")
    # Unit price in cents. VAT-inclusive; the line's VAT portion is computed from vat_rate_bp.
    unit_price_cents = Column(Integer, nullable=False)
    vat_rate_bp = Column(Integer, nullable=False)
    # Denormalized line totals so fiskaly payload and reporting are cheap.
    line_total_cents = Column(Integer, nullable=False)
    line_vat_cents = Column(Integer, nullable=False)

    invoice = relationship("Invoice", back_populates="items")

    __table_args__ = (
        Index("ix_cashier_items_invoice", "invoice_id"),
    )


class Receipt(Base):
    """The fiscalized artifact returned by the provider (fiskaly / mock)."""
    __tablename__ = "cashier_receipts"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(
        Integer,
        ForeignKey("cashier_invoices.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    # Provider-side identifiers so we can trace back in fiskaly's dashboard.
    provider = Column(String(32), nullable=False)
    provider_tss_id = Column(String(80), nullable=True)
    provider_client_id = Column(String(80), nullable=True)
    provider_transaction_id = Column(String(80), nullable=True)
    transaction_number = Column(Integer, nullable=True)
    signature_counter = Column(Integer, nullable=True)
    # The QR-code payload string printed on the receipt, per KassenSichV.
    qr_code_data = Column(Text, nullable=True)
    signature_value = Column(Text, nullable=True)
    signature_algorithm = Column(String(80), nullable=True)
    time_start = Column(DateTime(timezone=True), nullable=True)
    time_end = Column(DateTime(timezone=True), nullable=True)
    # Full raw provider response, kept verbatim for audit.
    raw_response = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    invoice = relationship("Invoice", back_populates="receipt")
