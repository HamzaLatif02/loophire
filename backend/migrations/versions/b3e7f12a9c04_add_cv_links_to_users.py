"""add_cv_links_to_users

Revision ID: b3e7f12a9c04
Revises: 74cd7c2241a8
Create Date: 2026-04-30 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "b3e7f12a9c04"
down_revision = "74cd7c2241a8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("cv_links", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "cv_links")
