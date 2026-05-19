"""add cv_json to cv_versions

Revision ID: c5d6e7f8a9b0
Revises: b4c5d6e7f8a9
Create Date: 2026-05-19

"""
from alembic import op
import sqlalchemy as sa

revision = 'c5d6e7f8a9b0'
down_revision = 'b4c5d6e7f8a9'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('cv_versions',
        sa.Column('cv_json', sa.JSON(), nullable=True))


def downgrade():
    op.drop_column('cv_versions', 'cv_json')
