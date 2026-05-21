"""add is_demo to users

Revision ID: d4e5f6a7b8c9
Revises: c5d6e7f8a9b0
Create Date: 2026-05-21

"""
from alembic import op
import sqlalchemy as sa

revision = 'd4e5f6a7b8c9'
down_revision = 'c5d6e7f8a9b0'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users',
        sa.Column('is_demo', sa.Boolean(), nullable=False,
                  server_default='false'))


def downgrade():
    op.drop_column('users', 'is_demo')
