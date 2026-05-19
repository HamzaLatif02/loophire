"""add template_id to cv_versions

Revision ID: b4c5d6e7f8a9
Revises: a2b3c4d5e6f7
Create Date: 2026-05-19

"""
from alembic import op
import sqlalchemy as sa

revision = 'b4c5d6e7f8a9'
down_revision = 'a2b3c4d5e6f7'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('cv_versions',
        sa.Column('template_id', sa.String(), nullable=True))


def downgrade():
    op.drop_column('cv_versions', 'template_id')
