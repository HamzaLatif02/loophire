"""add interview fields to applications

Revision ID: e1f2a3b4c5d6
Revises: c5d8e9f3a7b1
Create Date: 2026-05-03

"""
from alembic import op
import sqlalchemy as sa

revision = "e1f2a3b4c5d6"
down_revision = "c5d8e9f3a7b1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("applications", sa.Column("interview_date", sa.DateTime(timezone=True), nullable=True))
    op.add_column("applications", sa.Column("interview_notes", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("applications", "interview_notes")
    op.drop_column("applications", "interview_date")
