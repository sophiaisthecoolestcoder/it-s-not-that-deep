"""Cashier / POS endpoints.

Open-invoice workflow:

    POST /api/cashier/invoices                 -> create OPEN invoice with items
    GET  /api/cashier/invoices                 -> list (filters: status, venue, date range)
    GET  /api/cashier/invoices/{id}            -> full detail incl. items + receipt
    PATCH /api/cashier/invoices/{id}           -> edit items / reference (only while OPEN)
    POST /api/cashier/invoices/{id}/finalize   -> sign via provider, issue number, lock
    DELETE /api/cashier/invoices/{id}          -> admin only; only when OPEN

Products catalogue:

    GET/POST/PATCH/DELETE /api/cashier/products

Reporting:

    GET /api/cashier/summary?from=&to=         -> totals + breakdown
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func
from sqlalchemy.orm import Session, selectinload

from app.auth import require_roles
from app.database import get_db
from app.models.cashier import (
    Invoice,
    InvoiceItem,
    InvoiceStatus,
    InvoiceVenue,
    PaymentMethod,
    Product,
    Receipt,
)
from app.models.employee import EmployeeRole
from app.models.user import User
from app.schemas.cashier import (
    InvoiceCreate,
    InvoiceFinalize,
    InvoiceRead,
    InvoiceSummary,
    InvoiceUpdate,
    ProductCreate,
    ProductRead,
    ProductUpdate,
    SalesTotals,
    VatBreakdownEntry,
)
from app.services.fiscalization import (
    FiscalizationResult,
    get_provider,
)
from app.services.fiscalization.base import FiscalizationLine, FiscalizationRequest
from app.services.fiscalization.fiskaly import vat_rate_bp_to_fiskaly


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cashier", tags=["Cashier"])


_cashier_access = require_roles(
    EmployeeRole.ADMIN,
    EmployeeRole.MANAGER,
    EmployeeRole.RECEPTIONIST,
    EmployeeRole.WAITER,
)
_admin_only = require_roles(EmployeeRole.ADMIN, EmployeeRole.MANAGER)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _compute_line_totals(unit_price_cents: int, quantity: Decimal, vat_rate_bp: int) -> tuple[int, int]:
    """Given a VAT-inclusive unit price + qty, return (gross, vat_portion)."""
    gross_decimal = Decimal(unit_price_cents) * quantity
    gross_cents = int(gross_decimal.to_integral_value(rounding="ROUND_HALF_UP"))
    if vat_rate_bp == 0:
        return gross_cents, 0
    # VAT portion of a gross amount at rate r%: gross * r / (100 + r).
    # With basis-points: vat = gross * bp / (10000 + bp).
    vat_decimal = Decimal(gross_cents) * Decimal(vat_rate_bp) / (Decimal(10000) + Decimal(vat_rate_bp))
    vat_cents = int(vat_decimal.to_integral_value(rounding="ROUND_HALF_UP"))
    return gross_cents, vat_cents


def _recompute_totals(invoice: Invoice) -> None:
    """Recalc invoice-level totals from the current items in memory."""
    subtotal = sum(item.line_total_cents - item.line_vat_cents for item in invoice.items)
    vat_total = sum(item.line_vat_cents for item in invoice.items)
    total = sum(item.line_total_cents for item in invoice.items)
    invoice.subtotal_cents = int(subtotal)
    invoice.vat_total_cents = int(vat_total)
    invoice.total_cents = int(total)


def _apply_items(invoice: Invoice, items_input) -> None:
    """Replace invoice.items with a freshly recomputed set."""
    invoice.items.clear()
    for item in items_input:
        gross, vat = _compute_line_totals(item.unit_price_cents, item.quantity, item.vat_rate_bp)
        invoice.items.append(
            InvoiceItem(
                product_id=item.product_id,
                description=item.description,
                quantity=item.quantity,
                unit_price_cents=item.unit_price_cents,
                vat_rate_bp=item.vat_rate_bp,
                line_total_cents=gross,
                line_vat_cents=vat,
            )
        )
    _recompute_totals(invoice)


def _next_invoice_number(db: Session) -> str:
    """`YYYYMMDD-NNNN` numbering, sequential within the day.

    Relies on the unique constraint on `invoices.number` to catch races — the
    caller retries on IntegrityError (at most once in practice).
    """
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    like = f"{today}-%"
    last = (
        db.query(Invoice.number)
        .filter(Invoice.number.like(like))
        .order_by(Invoice.number.desc())
        .first()
    )
    if last and last[0]:
        try:
            seq = int(last[0].split("-")[-1]) + 1
        except (ValueError, IndexError):
            seq = 1
    else:
        seq = 1
    return f"{today}-{seq:04d}"


def _fetch_invoice(db: Session, invoice_id: int) -> Invoice:
    invoice = (
        db.query(Invoice)
        .options(selectinload(Invoice.items), selectinload(Invoice.receipt))
        .filter(Invoice.id == invoice_id)
        .first()
    )
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


def _build_fisc_request(invoice: Invoice, payment_method: PaymentMethod) -> FiscalizationRequest:
    lines: list[FiscalizationLine] = []
    for item in invoice.items:
        try:
            vat_name = vat_rate_bp_to_fiskaly(item.vat_rate_bp)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        lines.append(
            FiscalizationLine(
                description=item.description,
                quantity=str(item.quantity),
                vat_rate=vat_name,
                gross_cents=item.line_total_cents,
                net_cents=item.line_total_cents - item.line_vat_cents,
                vat_cents=item.line_vat_cents,
            )
        )
    fiskaly_payment = (
        "CASH" if payment_method == PaymentMethod.CASH else "NON_CASH"
    )
    return FiscalizationRequest(
        invoice_id=invoice.id,
        invoice_number=invoice.number or f"OPEN-{invoice.id}",
        currency=invoice.currency,
        lines=lines,
        payment_method=fiskaly_payment,
        total_gross_cents=invoice.total_cents,
        total_vat_cents=invoice.vat_total_cents,
        total_net_cents=invoice.subtotal_cents,
    )


def _receipt_from_result(invoice_id: int, result: FiscalizationResult) -> Receipt:
    return Receipt(
        invoice_id=invoice_id,
        provider=result.provider,
        provider_tss_id=result.provider_tss_id,
        provider_client_id=result.provider_client_id,
        provider_transaction_id=result.provider_transaction_id,
        transaction_number=result.transaction_number,
        signature_counter=result.signature_counter,
        qr_code_data=result.qr_code_data,
        signature_value=result.signature_value,
        signature_algorithm=result.signature_algorithm,
        time_start=result.time_start,
        time_end=result.time_end,
        raw_response=result.raw_response,
    )


# ── Invoices ─────────────────────────────────────────────────────────────────

@router.get("/invoices", response_model=list[InvoiceSummary])
def list_invoices(
    status: Optional[InvoiceStatus] = Query(default=None),
    venue: Optional[InvoiceVenue] = Query(default=None),
    from_date: Optional[datetime] = Query(default=None, alias="from"),
    to_date: Optional[datetime] = Query(default=None, alias="to"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    user: User = Depends(_cashier_access),
):
    query = db.query(Invoice)
    if status is not None:
        query = query.filter(Invoice.status == status)
    if venue is not None:
        query = query.filter(Invoice.venue == venue)
    if from_date is not None:
        query = query.filter(Invoice.created_at >= from_date)
    if to_date is not None:
        query = query.filter(Invoice.created_at <= to_date)
    return (
        query.order_by(Invoice.created_at.desc()).offset(skip).limit(limit).all()
    )


@router.get("/invoices/{invoice_id}", response_model=InvoiceRead)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(_cashier_access),
):
    return _fetch_invoice(db, invoice_id)


@router.post("/invoices", response_model=InvoiceRead, status_code=201)
def create_invoice(
    payload: InvoiceCreate,
    db: Session = Depends(get_db),
    user: User = Depends(_cashier_access),
):
    invoice = Invoice(
        status=InvoiceStatus.OPEN,
        venue=payload.venue,
        reference=payload.reference,
        guest_id=payload.guest_id,
        notes=payload.notes,
        cashier_user_id=user.id,
        currency="EUR",
    )
    db.add(invoice)
    db.flush()
    _apply_items(invoice, payload.items)
    db.commit()
    db.refresh(invoice)
    return invoice


@router.patch("/invoices/{invoice_id}", response_model=InvoiceRead)
def update_invoice(
    invoice_id: int,
    payload: InvoiceUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(_cashier_access),
):
    invoice = _fetch_invoice(db, invoice_id)
    if invoice.status != InvoiceStatus.OPEN:
        raise HTTPException(status_code=400, detail="Only OPEN invoices can be edited")

    data = payload.model_dump(exclude_unset=True)
    items_input = data.pop("items", None)
    for field, value in data.items():
        setattr(invoice, field, value)
    if items_input is not None:
        # Re-parse through the InvoiceUpdate payload to keep quantity rounding.
        _apply_items(invoice, payload.items or [])
    db.commit()
    db.refresh(invoice)
    return invoice


@router.post("/invoices/{invoice_id}/finalize", response_model=InvoiceRead)
def finalize_invoice(
    invoice_id: int,
    payload: InvoiceFinalize,
    db: Session = Depends(get_db),
    user: User = Depends(_cashier_access),
):
    invoice = _fetch_invoice(db, invoice_id)
    if invoice.status != InvoiceStatus.OPEN:
        raise HTTPException(status_code=400, detail="Invoice is not OPEN")
    if not invoice.items:
        raise HTTPException(status_code=400, detail="Cannot finalize an empty invoice")

    # Assign the human-facing invoice number before signing so the receipt
    # carries it. Retry once on the (very unlikely) race.
    for attempt in range(2):
        invoice.number = _next_invoice_number(db)
        try:
            db.flush()
            break
        except Exception:  # noqa: BLE001
            db.rollback()
            if attempt == 1:
                raise
            continue

    invoice.payment_method = payload.payment_method
    invoice.finalized_at = datetime.now(timezone.utc)

    provider = get_provider()
    fisc_request = _build_fisc_request(invoice, payload.payment_method)
    try:
        result = provider.sign(fisc_request)
    except Exception as exc:  # noqa: BLE001
        logger.exception("fiscalization failed invoice=%s provider=%s", invoice.id, provider.name)
        db.rollback()
        raise HTTPException(status_code=502, detail=f"Fiscalization failed: {exc}") from exc

    invoice.receipt = _receipt_from_result(invoice.id, result)
    invoice.status = InvoiceStatus.FINALIZED
    db.commit()
    db.refresh(invoice)
    return invoice


@router.delete("/invoices/{invoice_id}", status_code=204)
def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(_admin_only),
):
    invoice = _fetch_invoice(db, invoice_id)
    if invoice.status != InvoiceStatus.OPEN:
        raise HTTPException(status_code=400, detail="Only OPEN invoices can be deleted")
    db.delete(invoice)
    db.commit()


# ── Products ────────────────────────────────────────────────────────────────

@router.get("/products", response_model=list[ProductRead])
def list_products(
    venue: Optional[InvoiceVenue] = Query(default=None),
    active: Optional[bool] = Query(default=True),
    db: Session = Depends(get_db),
    user: User = Depends(_cashier_access),
):
    query = db.query(Product)
    if venue is not None:
        query = query.filter(Product.venue == venue)
    if active is not None:
        query = query.filter(Product.active == active)
    return query.order_by(Product.name.asc()).all()


@router.post("/products", response_model=ProductRead, status_code=201)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    user: User = Depends(_admin_only),
):
    product = Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.patch("/products/{product_id}", response_model=ProductRead)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(_admin_only),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    db.commit()
    db.refresh(product)
    return product


@router.delete("/products/{product_id}", status_code=204)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(_admin_only),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()


# ── Reporting ───────────────────────────────────────────────────────────────

@router.get("/summary", response_model=SalesTotals)
def sales_summary(
    from_date: datetime = Query(..., alias="from"),
    to_date: datetime = Query(..., alias="to"),
    db: Session = Depends(get_db),
    user: User = Depends(_admin_only),
):
    if to_date <= from_date:
        raise HTTPException(status_code=400, detail="'to' must be after 'from'")

    q = db.query(Invoice).filter(
        Invoice.status == InvoiceStatus.FINALIZED,
        Invoice.finalized_at >= from_date,
        Invoice.finalized_at <= to_date,
    )
    invoices = q.all()

    subtotal = sum(i.subtotal_cents for i in invoices)
    vat_total = sum(i.vat_total_cents for i in invoices)
    total = sum(i.total_cents for i in invoices)

    by_venue: dict[str, int] = {}
    by_pm: dict[str, int] = {}
    for i in invoices:
        by_venue[i.venue.value] = by_venue.get(i.venue.value, 0) + i.total_cents
        if i.payment_method is not None:
            by_pm[i.payment_method.value] = by_pm.get(i.payment_method.value, 0) + i.total_cents

    # VAT breakdown pulled from items across the filtered invoices.
    invoice_ids = [i.id for i in invoices]
    by_rate: list[VatBreakdownEntry] = []
    if invoice_ids:
        rows = (
            db.query(
                InvoiceItem.vat_rate_bp,
                func.sum(InvoiceItem.line_total_cents),
                func.sum(InvoiceItem.line_vat_cents),
            )
            .filter(InvoiceItem.invoice_id.in_(invoice_ids))
            .group_by(InvoiceItem.vat_rate_bp)
            .all()
        )
        for rate, gross, vat in rows:
            gross_i = int(gross or 0)
            vat_i = int(vat or 0)
            by_rate.append(
                VatBreakdownEntry(
                    vat_rate_bp=int(rate),
                    gross_cents=gross_i,
                    vat_cents=vat_i,
                    net_cents=gross_i - vat_i,
                )
            )
        by_rate.sort(key=lambda e: e.vat_rate_bp)

    return SalesTotals(
        from_date=from_date,
        to_date=to_date,
        invoice_count=len(invoices),
        subtotal_cents=int(subtotal),
        vat_total_cents=int(vat_total),
        total_cents=int(total),
        by_venue=by_venue,
        by_payment_method=by_pm,
        by_vat_rate=by_rate,
    )
