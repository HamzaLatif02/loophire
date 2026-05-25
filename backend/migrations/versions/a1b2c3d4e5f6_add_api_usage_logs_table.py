"""add api_usage_logs table

Revision ID: a1b2c3d4e5f6
Revises: f5a6b7c8d9e0
Create Date: 2026-05-25 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = 'f5a6b7c8d9e0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'api_usage_logs',
        sa.Column('id',                    sa.Integer(),  nullable=False),
        sa.Column('user_id',               sa.Integer(),  nullable=False),
        sa.Column('created_at',            sa.DateTime(), nullable=False),
        sa.Column('agent_name',            sa.String(),   nullable=False),
        sa.Column('model',                 sa.String(),   nullable=False),
        sa.Column('input_tokens',          sa.Integer(),  nullable=True),
        sa.Column('output_tokens',         sa.Integer(),  nullable=True),
        sa.Column('cache_creation_tokens', sa.Integer(),  nullable=True),
        sa.Column('cache_read_tokens',     sa.Integer(),  nullable=True),
        sa.Column('application_id',        sa.Integer(),  nullable=True),
        sa.ForeignKeyConstraint(['application_id'], ['applications.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_api_usage_logs_user_id',    'api_usage_logs', ['user_id'],    unique=False)
    op.create_index('ix_api_usage_logs_created_at', 'api_usage_logs', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_api_usage_logs_created_at', table_name='api_usage_logs')
    op.drop_index('ix_api_usage_logs_user_id',    table_name='api_usage_logs')
    op.drop_table('api_usage_logs')
