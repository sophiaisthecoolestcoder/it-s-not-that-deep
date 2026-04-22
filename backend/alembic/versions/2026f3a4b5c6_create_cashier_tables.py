"""create cashier tables (products, invoices, invoice_items, receipts)

Revision ID: 2026f3a4b5c6
Revises: 2026e2f3a4b5
Create Date: 2026-04-22 11:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "2026f3a4b5c6"
down_revision: Union[str, None] = "2026e2f3a4b5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


INVOICE_STATUS_NAMES = ("OPEN", "FINALIZED", "VOIDED")
INVOICE_VENUE_NAMES = ("RECEPTION", "RESTAURANT", "SPA", "OTHER")
PAYMENT_METHOD_NAMES = ("CASH", "CARD", "BANK_TRANSFER", "ROOM_CHARGE", "OTHER")
PRODUCT_CATEGORY_NAMES = ("ACCOMMODATION", "FOOD", "BEVERAGE", "SPA", "MISC")


def upgrade() -> None:
    bind = op.get_bind()

    postgresql.ENUM(*INVOICE_STATUS_NAMES, name="invoicestatus").create(bind, checkfirst=True)
    postgresql.ENUM(*INVOICE_VENUE_NAMES, name="invoicevenue").create(bind, checkfirst=True)
    postgresql.ENUM(*PAYMENT_METHOD_NAMES, name="paymentmethod").create(bind, checkfirst=True)
    postgresql.ENUM(*PRODUCT_CATEGORY_NAMES, name="productcategory").create(bind, checkfirst=True)

    op.create_table(
        "cashier_products",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("sku", sa.String(length=50), nullable=True, unique=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column(
            "category",
            postgresql.ENUM(*PRODUCT_CATEGORY_NAMES, name="productcategory", create_type=False),
            nullable=False,
            server_default="MISC",
        ),
        sa.Column(
            "venue",
            postgresql.ENUM(*INVOICE_VENUE_NAMES, name="invoicevenue", create_type=False),
            nullable=False,
            server_default="OTHER",
        ),
        sa.Column("unit_price_cents", sa.Integer(), nullable=False),
        sa.Column("vat_rate_bp", sa.Integer(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_cashier_products_id", "cashier_products", ["id"])

    op.create_table(
        "cashier_invoices",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("number", sa.String(length=32), nullable=True, unique=True),
        sa.Column(
            "status",
            postgresql.ENUM(*INVOICE_STATUS_NAMES, name="invoicestatus", create_type=False),
            nullable=False,
            server_default="OPEN",
        ),
        sa.Column(
            "venue",
            postgresql.ENUM(*INVOICE_VENUE_NAMES, name="invoicevenue", create_type=False),
            nullable=False,
            server_default="OTHER",
        ),
        sa.Column("reference", sa.String(length=200), nullable=True),
        sa.Column(
            "payment_method",
            postgresql.ENUM(*PAYMENT_METHOD_NAMES, name="paymentmethod", create_type=False),
            nullable=True,
        ),
        sa.Column("cashier_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("guest_id", sa.Integer(), sa.ForeignKey("guests.id", ondelete="SET NULL"), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("subtotal_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("vat_total_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="EUR"),
        sa.Column("finalized_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_cashier_invoices_id", "cashier_invoices", ["id"])
    op.create_index("ix_cashier_invoices_status_created", "cashier_invoices", ["status", "created_at"])
    op.create_index("ix_cashier_invoices_venue_created", "cashier_invoices", ["venue", "created_at"])

    op.create_table(
        "cashier_invoice_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("invoice_id", sa.Integer(), sa.ForeignKey("cashier_invoices.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("cashier_products.id", ondelete="SET NULL"), nullable=True),
        sa.Column("description", sa.String(length=255), nullable=False),
        sa.Column("quantity", sa.Numeric(10, 3), nullable=False, server_default="1"),
        sa.Column("unit_price_cents", sa.Integer(), nullable=False),
        sa.Column("vat_rate_bp", sa.Integer(), nullable=False),
        sa.Column("line_total_cents", sa.Integer(), nullable=False),
        sa.Column("line_vat_cents", sa.Integer(), nullable=False),
    )
    op.create_index("ix_cashier_items_id", "cashier_invoice_items", ["id"])
    op.create_index("ix_cashier_items_invoice", "cashier_invoice_items", ["invoice_id"])

    op.create_table(
        "cashier_receipts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "invoice_id",
            sa.Integer(),
            sa.ForeignKey("cashier_invoices.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("provider_tss_id", sa.String(length=80), nullable=True),
        sa.Column("provider_client_id", sa.String(length=80), nullable=True),
        sa.Column("provider_transaction_id", sa.String(length=80), nullable=True),
        sa.Column("transaction_number", sa.Integer(), nullable=True),
        sa.Column("signature_counter", sa.Integer(), nullable=True),
        sa.Column("qr_code_data", sa.Text(), nullable=True),
        sa.Column("signature_value", sa.Text(), nullable=True),
        sa.Column("signature_algorithm", sa.String(length=80), nullable=True),
        sa.Column("time_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("time_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("raw_response", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_cashier_receipts_id", "cashier_receipts", ["id"])


def downgrade() -> None:
    bind = op.get_bind()

    op.drop_index("ix_cashier_receipts_id", table_name="cashier_receipts")
    op.drop_table("cashier_receipts")

    op.drop_index("ix_cashier_items_invoice", table_name="cashier_invoice_items")
    op.drop_index("ix_cashier_items_id", table_name="cashier_invoice_items")
    op.drop_table("cashier_invoice_items")

    op.drop_index("ix_cashier_invoices_venue_created", table_name="cashier_invoices")
    op.drop_index("ix_cashier_invoices_status_created", table_name="cashier_invoices")
    op.drop_index("ix_cashier_invoices_id", table_name="cashier_invoices")
    op.drop_table("cashier_invoices")

    op.drop_index("ix_cashier_products_id", table_name="cashier_products")
    op.drop_table("cashier_products")

    postgresql.ENUM(name="productcategory").drop(bind, checkfirst=True)
    postgresql.ENUM(name="paymentmethod").drop(bind, checkfirst=True)
    postgresql.ENUM(name="invoicevenue").drop(bind, checkfirst=True)
    postgresql.ENUM(name="invoicestatus").drop(bind, checkfirst=True)
