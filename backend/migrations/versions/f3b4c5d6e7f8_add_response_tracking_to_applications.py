"""add response tracking to applications

Revision ID: f3b4c5d6e7f8
Revises: e1f2a3b4c5d6
Create Date: 2026-05-03

"""
from alembic import op
import sqlalchemy as sa

revision = "f3b4c5d6e7f8"
down_revision = "e1f2a3b4c5d6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("applications", sa.Column("got_response", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("applications", sa.Column("response_date", sa.DateTime(timezone=True), nullable=True))
    op.add_column("applications", sa.Column("response_type", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("applications", "response_type")
    op.drop_column("applications", "response_date")
    op.drop_column("applications", "got_response")
