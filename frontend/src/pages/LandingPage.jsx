import { Link } from 'react-router-dom'

// ── Icon components ────────────────────────────────────────────────────────────

function Icon({ d, size = 24, strokeWidth = 1.5 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {Array.isArray(d) ? d.map((path, i) => <path key={i} d={path} />) : <path d={d} />}
    </svg>
  )
}

const ICONS = {
  upload:   "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12",
  search:   "M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z",
  doc:      "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  pen:      "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  check:    "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  brain:    ["M9.5 2a2.5 2.5 0 115 0 2.5 2.5 0 01-5 0z", "M14.5 6a6.5 6.5 0 10-5 12.93V22a1 1 0 102 0v-3.07A6.5 6.5 0 0014.5 6z", "M9.5 6v3m5 0V6"],
  stack:    "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  sparkles: ["M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"],
  notes:    "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  cv:       "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  ext:      "M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8H4a1 1 0 00-1 1v10a1 1 0 001 1h3m10-11h1a1 1 0 011 1v10a1 1 0 01-1 1h-1",
  github:   "M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22",
  arrow:    "M13 7l5 5m0 0l-5 5m5-5H6",
  linkedin: "M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 6a2 2 0 100-4 2 2 0 000 4z",
}

// ── Reusable CTA button ────────────────────────────────────────────────────────

function CtaLink({ to, children, variant = 'primary' }) {
  const base = 'inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors'
  const cls = variant === 'primary'
    ? `${base} bg-[var(--color-accent)] hover:bg-[var(--color-accent-2)] text-white`
    : `${base} border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-accent)]`
  return <Link to={to} className={cls}>{children}</Link>
}

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({ id, children, className = '' }) {
  return (
    <section id={id} className={`py-20 px-4 sm:px-6 lg:px-8 ${className}`}>
      <div className="max-w-5xl mx-auto">
        {children}
      </div>
    </section>
  )
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({ label, title, subtitle }) {
  return (
    <div className="text-center mb-14 space-y-3">
      {label && (
        <span className="inline-block text-xs font-bold uppercase tracking-widest text-[var(--color-accent)]">
          {label}
        </span>
      )}
      <h2 className="text-3xl sm:text-4xl font-black text-[var(--color-text)] tracking-tight leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="text-base text-[var(--color-muted)] max-w-xl mx-auto leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <LandingNav />
      <HeroSection />
      <StatsBar />
      <HowItWorksSection />
      <FeaturesSection />
      <TechStackSection />
      <AboutSection />
      <CtaSection />
      <Footer />
    </div>
  )
}

// ── 1. Landing navbar ──────────────────────────────────────────────────────────

function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <a href="#hero" className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-md bg-[var(--color-accent)] flex items-center justify-center text-white font-black text-sm select-none">
            L
          </span>
          <span className="font-semibold text-[var(--color-text)] tracking-tight">
            Loop<span className="text-[var(--color-accent)]">hire</span>
          </span>
        </a>

        <nav className="flex items-center gap-1 sm:gap-2">
          <a href="#how-it-works" className="hidden sm:block px-3 py-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">
            How it works
          </a>
          <a href="#features" className="hidden sm:block px-3 py-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">
            Features
          </a>
          <Link to="/login" className="px-3 py-1.5 rounded-md text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors">
            Log in
          </Link>
          <Link to="/register" className="px-3 py-1.5 rounded-md text-sm font-medium bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-2)] transition-colors">
            Sign up free
          </Link>
        </nav>
      </div>
    </header>
  )
}

// ── 2. Hero ────────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section id="hero" className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 text-center">
      <div className="max-w-3xl mx-auto space-y-6">

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-muted)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
          Powered by Claude AI
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-[var(--color-text)] leading-[1.05]">
          Land more<br />
          <span className="text-[var(--color-accent)]">interviews</span><br />
          in less time
        </h1>

        <p className="text-lg sm:text-xl text-[var(--color-muted)] leading-relaxed max-w-2xl mx-auto">
          Loophire is an AI job application agent. Upload your CV once — it researches the company,
          tailors your CV, and writes a personalised cover letter in under 60 seconds.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <CtaLink to="/register" variant="primary">
            Get started free
            <Icon d={ICONS.arrow} size={16} strokeWidth={2} />
          </CtaLink>
          <CtaLink to="/login" variant="secondary">
            Already have an account
          </CtaLink>
        </div>

        <p className="text-xs text-[var(--color-muted)]">No credit card required · 100% free</p>
      </div>
    </section>
  )
}

// ── 3. Stats bar ───────────────────────────────────────────────────────────────

function StatsBar() {
  const stats = [
    { value: '5',    label: 'AI processing stages' },
    { value: '60s',  label: 'Average generation time' },
    { value: '100%', label: 'Free to use' },
  ]

  return (
    <div className="border-y border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-border)] gap-0">
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center py-6 sm:py-0">
              <p className="text-4xl font-black text-[var(--color-accent)]">{value}</p>
              <p className="text-sm text-[var(--color-muted)] mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── 4. How it works ────────────────────────────────────────────────────────────

const STEPS = [
  {
    icon: ICONS.upload,
    title: 'Upload your CV',
    desc: 'Drop your base PDF CV once. Loophire stores and parses it — you never need to upload it again.',
  },
  {
    icon: ICONS.doc,
    title: 'Paste a job description',
    desc: 'Copy the job listing text and paste it in. Or use the Chrome extension to import directly from LinkedIn in one click.',
  },
  {
    icon: ICONS.search,
    title: 'Company research',
    desc: 'Claude searches and summarises the company — its mission, tech stack, culture, and recent news.',
  },
  {
    icon: ICONS.cv,
    title: 'CV tailored to the role',
    desc: 'Your CV is restructured and reworded to highlight the most relevant experience for this specific job.',
  },
  {
    icon: ICONS.pen,
    title: 'Cover letter written',
    desc: 'A polished, personalised cover letter is generated — grounded in your CV, the job spec, and the company research.',
  },
]

function HowItWorksSection() {
  return (
    <Section id="how-it-works">
      <SectionHeader
        label="How it works"
        title="From CV to application in 5 steps"
        subtitle="Loophire runs a multi-stage AI pipeline so every application is thoroughly researched and genuinely personalised."
      />

      <div className="relative">
        {/* connector line on desktop */}
        <div className="hidden lg:block absolute top-10 left-[calc(10%+2rem)] right-[calc(10%+2rem)] h-px bg-[var(--color-border)]" />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
          {STEPS.map(({ icon, title, desc }, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-3">
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-accent)]">
                  <Icon d={icon} size={28} />
                </div>
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[var(--color-accent)] text-white text-[10px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
              </div>
              <div>
                <p className="font-semibold text-sm text-[var(--color-text)] mb-1">{title}</p>
                <p className="text-xs text-[var(--color-muted)] leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}

// ── 5. Features ────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: ICONS.sparkles,
    title: 'AI-tailored CV',
    desc: "Claude rewrites your CV sections to match the job's requirements, keywords, and seniority level — not just a find-and-replace.",
  },
  {
    icon: ICONS.search,
    title: 'Deep company research',
    desc: 'Goes beyond the "About" page. Loophire surfaces tech stack, culture signals, and recent news to give context for your application.',
  },
  {
    icon: ICONS.pen,
    title: 'Personalised cover letters',
    desc: 'Each cover letter is grounded in the actual company and role — not a generic template with names swapped out.',
  },
  {
    icon: ICONS.notes,
    title: 'Application notes',
    desc: 'Add private notes to any application — interview dates, contacts, follow-up reminders — all in one place.',
  },
  {
    icon: ICONS.cv,
    title: 'CV version manager',
    desc: 'Store multiple CV versions (e.g. "Software Engineer", "Data Analyst") and pick the right one per application.',
  },
  {
    icon: ICONS.ext,
    title: 'Chrome extension',
    desc: 'One-click import from LinkedIn job listings. The extension injects an "Import to Loophire" button right next to Easy Apply.',
  },
]

function FeaturesSection() {
  return (
    <Section id="features" className="bg-[var(--color-surface)]/40">
      <SectionHeader
        label="Features"
        title="Everything you need to apply smarter"
        subtitle="Built to cut the time you spend on each application, not the quality."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {FEATURES.map(({ icon, title, desc }) => (
          <div
            key={title}
            className="p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)]/40 transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-[var(--color-surface-2)] flex items-center justify-center text-[var(--color-accent)] mb-4 group-hover:bg-[var(--color-accent)]/10 transition-colors">
              <Icon d={icon} size={20} />
            </div>
            <p className="font-semibold text-sm text-[var(--color-text)] mb-1.5">{title}</p>
            <p className="text-xs text-[var(--color-muted)] leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ── 6. Tech stack ──────────────────────────────────────────────────────────────

const STACK = [
  { col: 'AI & Backend', items: ['Claude AI (Anthropic)', 'Python 3.12', 'FastAPI', 'PostgreSQL', 'SQLAlchemy + Alembic', 'Slowapi rate limiting'] },
  { col: 'Frontend & Infra', items: ['React 19', 'React Router v7', 'TanStack Query', 'Tailwind CSS v4', 'Vite', 'Vercel (frontend) + Railway (backend)'] },
]

function TechStackSection() {
  return (
    <Section id="tech">
      <SectionHeader
        label="Tech stack"
        title="Built with modern, production-grade tools"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {STACK.map(({ col, items }) => (
          <div key={col} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-accent)] mb-4">{col}</p>
            <ul className="space-y-2.5">
              {items.map(item => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-[var(--color-text)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ── 7. About ───────────────────────────────────────────────────────────────────

function AboutSection() {
  return (
    <Section id="about" className="bg-[var(--color-surface)]/40">
      <div className="max-w-2xl mx-auto text-center space-y-5">
        <span className="inline-block text-xs font-bold uppercase tracking-widest text-[var(--color-accent)]">
          About
        </span>
        <h2 className="text-3xl sm:text-4xl font-black text-[var(--color-text)] tracking-tight">
          Built by Hamza Latif
        </h2>
        <p className="text-base text-[var(--color-muted)] leading-relaxed">
          Loophire is a full-stack AI project built to solve a real problem: job applications are
          repetitive, time-consuming, and generic. I built this to demonstrate what's possible when
          you combine a modern AI API with solid software engineering — a real product, not a demo.
        </p>
        <p className="text-base text-[var(--color-muted)] leading-relaxed">
          The entire stack — backend, frontend, Chrome extension, AI pipeline, auth, rate-limiting,
          database migrations, and deployment — was designed and built solo.
        </p>
        <div className="flex items-center justify-center gap-4 pt-2">
          <a
            href="https://linkedin.com/in/hamza-latif"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-accent)] transition-colors"
          >
            <Icon d={ICONS.linkedin} size={16} />
            LinkedIn
          </a>
          <a
            href="https://github.com/hamzalatif"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-accent)] transition-colors"
          >
            <Icon d={ICONS.github} size={16} />
            GitHub
          </a>
        </div>
      </div>
    </Section>
  )
}

// ── 8. Final CTA ───────────────────────────────────────────────────────────────

function CtaSection() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-[var(--color-muted)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
          Free to use, no credit card required
        </div>
        <h2 className="text-4xl sm:text-5xl font-black text-[var(--color-text)] tracking-tight leading-tight">
          Ready to apply<br /><span className="text-[var(--color-accent)]">smarter?</span>
        </h2>
        <p className="text-base text-[var(--color-muted)]">
          Create an account, upload your CV, and generate your first tailored application in under two minutes.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <CtaLink to="/register" variant="primary">
            Create a free account
            <Icon d={ICONS.arrow} size={16} strokeWidth={2} />
          </CtaLink>
          <CtaLink to="/login" variant="secondary">
            Log in
          </CtaLink>
        </div>
      </div>
    </section>
  )
}

// ── 9. Footer ──────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--color-muted)]">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-md bg-[var(--color-accent)] flex items-center justify-center text-white font-black text-[10px] select-none">
            L
          </span>
          <span className="font-semibold text-[var(--color-text)]">
            Loop<span className="text-[var(--color-accent)]">hire</span>
          </span>
          <span className="ml-2">Built by Hamza Latif · {new Date().getFullYear()}</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login"    className="hover:text-[var(--color-text)] transition-colors">Log in</Link>
          <Link to="/register" className="hover:text-[var(--color-text)] transition-colors">Sign up</Link>
          <a href="#how-it-works" className="hover:text-[var(--color-text)] transition-colors">How it works</a>
        </div>
      </div>
    </footer>
  )
}
