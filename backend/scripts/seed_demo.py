import logging
import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import AgentMemory, Application, CVVersion, User
from models.application import ApplicationStatus
from utils.auth import hash_password

logger = logging.getLogger(__name__)

DEMO_EMAIL    = "demo@loophire.xyz"
DEMO_PASSWORD = os.getenv("DEMO_PASSWORD", "loophire-demo-2025")

DEMO_CV_TEXT = """Hamza Latif
lhamza1020@gmail.com | LinkedIn | Github | Website

Profile
First Class Computer Science graduate with an MSc Distinction in Data Science. Technical
proficiency in Python, Java, SQL, with experience building data-driven applications and
backend systems.

Technical Skills
Languages: Python, Java, SQL, JavaScript, R
Tools: Git, Linux, Docker, GitHub Actions, Redis
Technologies: APIs, FastAPI, React, PostgreSQL
AI/ML: scikit-learn, TensorFlow, LLM APIs

Education
King's College London, MSc Data Science 2024-2025
Grade: Distinction

City, University of London, BSc Computer Science 2021-2024
Grade: First Class

Experience
Data Analyst, Premier Services Associate Ltd Jun 2025
- Integrated 4+ third-party APIs handling 1,000+ requests
- Designed modular data pipelines processing 10k+ data points
- Reduced manual analysis effort by 50% through automation

Projects
Roleprint — NLP job market analytics platform
Finpipe — Financial analysis web application
Loophire — AI-powered job application agent
"""

DEMO_CV_JSON = {
    "profile": (
        "First Class Computer Science graduate with an MSc Distinction in Data Science. "
        "Technical proficiency in Python, Java, SQL, and Git, with experience building "
        "data-driven applications and backend systems."
    ),
    "technical_skills": [
        {"category": "Languages", "items": "Python, Java, SQL, JavaScript, R"},
        {"category": "Tools", "items": "Git, Linux, Docker, GitHub Actions, Redis"},
        {"category": "Technologies", "items": "APIs, FastAPI, React, PostgreSQL, SQLAlchemy"},
        {"category": "AI/ML", "items": "scikit-learn, TensorFlow, PyTorch, LLM APIs"},
    ],
    "education": [
        {
            "institution": "King's College London",
            "degree": "MSc Data Science",
            "dates": "2024 – 2025",
            "highlights": [
                "Grade: Distinction",
                "Key Modules: Data Mining, Statistics, Neural Networks",
            ],
        },
        {
            "institution": "City, University of London",
            "degree": "BSc Computer Science",
            "dates": "2021 – 2024",
            "highlights": [
                "Grade: First Class",
                "Key Modules: Cloud Computing, AI, Data Structures",
            ],
        },
    ],
    "experience": [
        {
            "title": "Data Analyst",
            "company": "Premier Services Associate Ltd",
            "dates": "Jun 2025",
            "highlights": [
                "Integrated 4+ third-party APIs (OpenAI, Claude, Gemini), handling 1,000+ requests during testing.",
                "Designed modular data pipelines processing 10k+ data points, reducing iteration time by 40%.",
                "Developed automated reporting components, reducing manual analysis effort by 50%.",
            ],
        }
    ],
    "projects": [
        {
            "name": "Roleprint",
            "github_url": "https://github.com/HamzaLatif02/roleprint",
            "highlights": [
                "Built a live NLP job market analytics platform (roleprint.xyz) processing 10,000+ job postings across 10 tech roles."
            ],
        },
        {
            "name": "Finpipe",
            "github_url": "https://github.com/HamzaLatif02/finpipe",
            "highlights": [
                "Developed a live financial analysis web app (finpipe.xyz) reducing asset analysis to under 30 seconds."
            ],
        },
    ],
}

_NOW = datetime.now(timezone.utc)

DEMO_APPLICATIONS = [
    {
        "job_title": "Software Engineer",
        "company_name": "Anthropic",
        "job_description": (
            "We are looking for a Software Engineer to join our team. You will build "
            "reliable systems, develop scalable backend solutions, and deliver clean "
            "maintainable code. Requirements: Python, distributed systems, API design, "
            "strong CS fundamentals."
        ),
        "fit_score": 87,
        "status": ApplicationStatus.interviewing,
        "got_response": True,
        "response_type": "technical interview",
        "cv_version_name": "Software Engineer",
        "rewrite_cv": True,
        "cover_letter_generated": True,
        "keyword_gaps": ["distributed systems", "Rust", "C++"],
        "tailored_cv": "Tailored CV for Anthropic Software Engineer role.",
        "cover_letter": (
            "Dear Hiring Team,\n\n"
            "I am writing to express my strong interest in the Software Engineer position "
            "at Anthropic. As a First Class Computer Science graduate with an MSc Distinction "
            "in Data Science from King's College London, I bring a deep foundation in building "
            "reliable, scalable systems — directly aligned with Anthropic's mission.\n\n"
            "In my recent work at Premier Services Associate Ltd, I integrated 4+ LLM APIs "
            "and designed modular data pipelines processing 10k+ data points, reducing "
            "iteration time by 40%. My projects — including Roleprint, a live NLP platform "
            "processing 10,000+ job postings, and Loophire, an autonomous AI job application "
            "agent — demonstrate my ability to ship production systems end-to-end.\n\n"
            "I would welcome the opportunity to contribute to Anthropic's work on safe and "
            "beneficial AI.\n\nYours sincerely,\nHamza Latif"
        ),
        "tone_analysis": {
            "tone": "technical",
            "tone_signals": ["strong CS fundamentals", "reliable systems", "scalable"],
            "writing_style": "Precise and technical. Emphasise engineering depth.",
            "vocabulary_to_use": ["scalable", "reliable", "distributed", "robust"],
            "vocabulary_to_avoid": ["passionate", "excited", "journey"],
        },
        "company_research": {
            "culture_summary": "Mission-driven AI safety company. Rigorous, research-focused culture.",
            "tech_stack": ["Python", "Rust", "C++", "Distributed systems"],
            "recent_news": ["Released Claude 3 family", "Raised Series E funding"],
            "red_flags": [],
            "tone_recommendation": "technical",
        },
        "interview_prep": {
            "technical": [
                {
                    "question": "Design a rate limiting system for an LLM API.",
                    "framework": "Consider token bucket, sliding window, per-user and global limits.",
                },
                {
                    "question": "How would you handle distributed state in a multi-region deployment?",
                    "framework": "CAP theorem, eventual consistency, CRDTs.",
                },
            ],
            "behavioural": [
                {
                    "question": "Tell me about a time you improved system reliability.",
                    "framework": "Use STAR method. Focus on measurable outcomes.",
                }
            ],
            "cv_based": [
                {
                    "question": "Walk me through the architecture of Loophire.",
                    "framework": "FastAPI + background tasks + WebSockets + 6 agents.",
                }
            ],
        },
        "interview_date": _NOW + timedelta(days=3),
        "interview_notes": "Technical round with the platform team. Prepare system design.",
        "notes": "Recruiter: Sarah Chen\nsarah.chen@anthropic.com\nSalary range: £90k-£120k\nHybrid — London office",
        "created_at": _NOW - timedelta(days=5),
        "last_generated_at": _NOW - timedelta(days=5),
    },
    {
        "job_title": "Data Scientist",
        "company_name": "DeepMind",
        "job_description": (
            "Data Scientist role at DeepMind London. Work on cutting-edge ML research and "
            "production systems. Requirements: Python, TensorFlow/PyTorch, statistics, "
            "strong research background, publications preferred."
        ),
        "fit_score": 74,
        "status": ApplicationStatus.applied,
        "got_response": False,
        "cv_version_name": "Data Scientist",
        "rewrite_cv": True,
        "cover_letter_generated": True,
        "keyword_gaps": ["publications", "research background", "JAX"],
        "tailored_cv": "Tailored CV for DeepMind Data Scientist role.",
        "cover_letter": (
            "Dear DeepMind Team,\n\nI am applying for the Data Scientist position "
            "and believe my background in data science and ML aligns well with your mission."
        ),
        "tone_analysis": {
            "tone": "academic",
            "writing_style": "Research-oriented, formal.",
            "vocabulary_to_use": ["rigorous", "novel", "empirical"],
            "vocabulary_to_avoid": ["passionate", "startup"],
        },
        "company_research": {
            "culture_summary": "World-leading AI research lab. Academic culture, publication-driven.",
            "tech_stack": ["Python", "JAX", "TensorFlow", "PyTorch"],
            "recent_news": ["AlphaFold 3 released", "Gemini Ultra launch"],
            "red_flags": ["Very competitive, publications preferred"],
            "tone_recommendation": "academic",
        },
        "notes": "Strong brand. Stretch role given no publications.",
        "created_at": _NOW - timedelta(days=12),
        "last_generated_at": _NOW - timedelta(days=12),
    },
    {
        "job_title": "Data Analyst",
        "company_name": "Spotify",
        "job_description": (
            "Data Analyst at Spotify London. Analyse user behaviour, build dashboards, "
            "and support product decisions with data. Requirements: SQL, Python, Tableau, "
            "A/B testing, strong communication skills."
        ),
        "fit_score": 91,
        "status": ApplicationStatus.offer,
        "got_response": True,
        "response_type": "offer",
        "cv_version_name": "Data Analyst",
        "rewrite_cv": True,
        "cover_letter_generated": True,
        "keyword_gaps": ["Looker", "dbt"],
        "tailored_cv": "Tailored CV for Spotify Data Analyst role.",
        "cover_letter": (
            "Dear Spotify Team,\n\nI am thrilled to apply for the Data Analyst role "
            "and am excited about contributing to data-driven product decisions."
        ),
        "tone_analysis": {
            "tone": "startup-casual",
            "writing_style": "Enthusiastic but professional.",
            "vocabulary_to_use": ["impact", "data-driven", "collaborate"],
            "vocabulary_to_avoid": ["formal", "pursuant"],
        },
        "company_research": {
            "culture_summary": "Music streaming leader. Creative, data-obsessed culture.",
            "tech_stack": ["Python", "SQL", "Looker", "dbt", "Tableau"],
            "recent_news": ["Expanding podcast offerings", "AI DJ feature launched"],
            "red_flags": [],
            "tone_recommendation": "startup-casual",
        },
        "notes": "Offer received: £62,000\nStart date: 1 September\nDeciding between this and Anthropic offer.",
        "created_at": _NOW - timedelta(days=20),
        "last_generated_at": _NOW - timedelta(days=20),
    },
    {
        "job_title": "Backend Engineer",
        "company_name": "Monzo",
        "job_description": (
            "Backend Engineer at Monzo. Build the APIs and services that power millions of "
            "customer accounts. Requirements: Go, distributed systems, microservices, "
            "PostgreSQL, strong reliability engineering."
        ),
        "fit_score": 61,
        "status": ApplicationStatus.rejected,
        "got_response": True,
        "response_type": "rejection",
        "cv_version_name": "Software Engineer",
        "rewrite_cv": True,
        "cover_letter_generated": False,
        "keyword_gaps": ["Go", "microservices", "reliability engineering", "Kubernetes"],
        "tailored_cv": "Tailored CV for Monzo Backend Engineer role.",
        "cover_letter": None,
        "tone_analysis": {
            "tone": "technical",
            "writing_style": "Direct and technical.",
            "vocabulary_to_use": ["scalable", "reliable"],
            "vocabulary_to_avoid": ["excited", "passionate"],
        },
        "company_research": {
            "culture_summary": "UK challenger bank. Engineering-led, Go-heavy stack.",
            "tech_stack": ["Go", "Kubernetes", "PostgreSQL", "Kafka"],
            "recent_news": ["Profitable for first time", "US expansion"],
            "red_flags": ["Go required, not in current skillset"],
            "tone_recommendation": "technical",
        },
        "notes": "Rejected at CV stage. Gap: Go experience. Worth revisiting in 6 months.",
        "created_at": _NOW - timedelta(days=30),
        "last_generated_at": _NOW - timedelta(days=30),
    },
    {
        "job_title": "ML Engineer",
        "company_name": "Wayve",
        "job_description": (
            "ML Engineer at Wayve — building autonomous vehicle AI. Work on training "
            "pipelines, model evaluation, and production ML systems. Requirements: Python, "
            "PyTorch, CUDA, large-scale training."
        ),
        "fit_score": 68,
        "status": ApplicationStatus.draft,
        "got_response": False,
        "cv_version_name": "Data Scientist",
        "rewrite_cv": False,
        "cover_letter_generated": False,
        "keyword_gaps": ["CUDA", "autonomous vehicles", "large-scale training"],
        "tailored_cv": None,
        "cover_letter": None,
        "tone_analysis": None,
        "company_research": {
            "culture_summary": "Deep tech AV startup. Research-engineering hybrid culture.",
            "tech_stack": ["Python", "PyTorch", "CUDA", "Kubernetes"],
            "recent_news": ["Series C funding", "Expanding London team"],
            "red_flags": ["Early stage, high risk"],
            "tone_recommendation": "technical",
        },
        "notes": "Fit check only — no CV rewrite yet. Decide if worth applying.",
        "created_at": _NOW - timedelta(days=2),
        "last_generated_at": _NOW - timedelta(days=2),
    },
]


def seed_demo() -> None:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == DEMO_EMAIL).first()

        if not user:
            user = User(
                email=DEMO_EMAIL,
                password_hash=hash_password(DEMO_PASSWORD),
                is_active=True,
                is_demo=True,
            )
            db.add(user)
            db.flush()
            logger.info("Created demo user: %s", DEMO_EMAIL)
        else:
            db.query(Application).filter(Application.user_id == user.id).delete()
            db.query(CVVersion).filter(CVVersion.user_id == user.id).delete()
            user.is_demo = True
            logger.info("Reset demo user: %s", DEMO_EMAIL)

        cv_versions = {}
        for name, tmpl in [
            ("Software Engineer", "classic"),
            ("Data Scientist", "two_column"),
            ("Data Analyst", "minimal"),
        ]:
            cv = CVVersion(
                user_id=user.id,
                name=name,
                cv_text=DEMO_CV_TEXT,
                cv_json=DEMO_CV_JSON,
                template_id=tmpl,
                is_default=(name == "Software Engineer"),
            )
            db.add(cv)
            db.flush()
            cv_versions[name] = cv
            logger.info("Created CV: %s", name)

        for app_data in DEMO_APPLICATIONS:
            data = dict(app_data)
            cv_name = data.pop("cv_version_name", "Software Engineer")
            app = Application(
                user_id=user.id,
                cv_version_name=cv_name,
                **data,
            )
            db.add(app)
            logger.info("Created application: %s at %s", data["job_title"], data["company_name"])

        db.commit()
        logger.info("Demo seed complete — email: %s", DEMO_EMAIL)

    except Exception:
        db.rollback()
        logger.exception("Demo seed failed")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    seed_demo()
