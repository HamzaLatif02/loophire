"""add interview_prep to applications

Revision ID: a4b5c6d7e8f9
Revises: f3b4c5d6e7f8
Create Date: 2026-05-03

"""
from alembic import op
import sqlalchemy as sa

revision = "a4b5c6d7e8f9"
down_revision = "f3b4c5d6e7f8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("applications", sa.Column("interview_prep", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("applications", "interview_prep")
