"""create_users_applications_agent_memories

Revision ID: 74cd7c2241a8
Revises:
Create Date: 2026-04-26 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "74cd7c2241a8"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("base_cv_text", sa.Text(), nullable=True),
        sa.Column("preferences", sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_id", "users", ["id"], unique=False)
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    applicationstatus = sa.Enum(
        "draft", "applied", "interviewing", "rejected", "offer",
        name="applicationstatus",
    )
    applicationstatus.create(op.get_bind())

    op.create_table(
        "applications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("job_title", sa.String(), nullable=False),
        sa.Column("company_name", sa.String(), nullable=False),
        sa.Column("job_description", sa.Text(), nullable=True),
        sa.Column("fit_score", sa.Float(), nullable=True),
        sa.Column("tailored_cv", sa.Text(), nullable=True),
        sa.Column("cover_letter", sa.Text(), nullable=True),
        sa.Column("keyword_gaps", sa.JSON(), nullable=True),
        sa.Column("company_research", sa.JSON(), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "draft", "applied", "interviewing", "rejected", "offer",
                name="applicationstatus",
            ),
            nullable=False,
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_applications_id", "applications", ["id"], unique=False)
    op.create_index("ix_applications_user_id", "applications", ["user_id"], unique=False)

    op.create_table(
        "agent_memories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("memory_type", sa.String(), nullable=False),
        sa.Column("content", sa.JSON(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_agent_memories_id", "agent_memories", ["id"], unique=False)
    op.create_index("ix_agent_memories_user_id", "agent_memories", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_agent_memories_user_id", table_name="agent_memories")
    op.drop_index("ix_agent_memories_id", table_name="agent_memories")
    op.drop_table("agent_memories")

    op.drop_index("ix_applications_user_id", table_name="applications")
    op.drop_index("ix_applications_id", table_name="applications")
    op.drop_table("applications")

    sa.Enum(name="applicationstatus").drop(op.get_bind())

    op.drop_index("ix_users_email", table_name="users")
    op.drop_index("ix_users_id", table_name="users")
    op.drop_table("users")
