"""add tailored_cv_json to applications

Revision ID: c5d8e9f3a7b1
Revises: b3e7f12a9c04
Create Date: 2026-04-30

"""
from alembic import op
import sqlalchemy as sa

revision = "c5d8e9f3a7b1"
down_revision = "b3e7f12a9c04"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("applications", sa.Column("tailored_cv_json", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("applications", "tailored_cv_json")
