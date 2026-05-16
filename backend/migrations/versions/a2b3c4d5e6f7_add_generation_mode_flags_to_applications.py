"""add generation mode flags to applications

Revision ID: a2b3c4d5e6f7
Revises: a1b2c3d4e5f6
Create Date: 2026-05-16

"""
from alembic import op
import sqlalchemy as sa

revision = 'a2b3c4d5e6f7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('applications',
        sa.Column('rewrite_cv', sa.Boolean(), nullable=False,
                  server_default='true'))
    op.add_column('applications',
        sa.Column('cover_letter_generated', sa.Boolean(), nullable=False,
                  server_default='true'))


def downgrade():
    op.drop_column('applications', 'cover_letter_generated')
    op.drop_column('applications', 'rewrite_cv')
