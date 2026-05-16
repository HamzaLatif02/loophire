"""add cv_version_name to applications

Revision ID: a1b2c3d4e5f6
Revises: f5a6b7c8d9e0
Create Date: 2026-05-14

"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = 'f5a6b7c8d9e0'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('applications', sa.Column('cv_version_name', sa.String(), nullable=True))


def downgrade():
    op.drop_column('applications', 'cv_version_name')
