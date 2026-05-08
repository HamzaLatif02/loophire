"""add last_generated_at to applications

Revision ID: e4f5a6b7c8d9
Revises: d3e4f5a6b7c8
Create Date: 2026-05-07 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'e4f5a6b7c8d9'
down_revision = 'd3e4f5a6b7c8'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'applications',
        sa.Column('last_generated_at', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade():
    op.drop_column('applications', 'last_generated_at')
