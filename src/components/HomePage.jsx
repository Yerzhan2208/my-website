import { Link } from 'react-router-dom'
import {
  Code2, Server, Cpu, GitBranch, GraduationCap,
  Briefcase, ChevronRight, Terminal, Zap, Database,
  Globe, ArrowRight, Mail, Phone, MapPin,
  Trophy, Languages, Brain, ExternalLink,
  Star
} from 'lucide-react'
import appRegistry from '../apps/registry'

const skills = [
  {
    category: 'Programming Languages',
    items: ['Python', 'Java', 'C++', 'C', 'JavaScript', 'SQL'],
    icon: Code2,
  },
  {
    category: 'Data Science & AI',
    items: ['pandas', 'numpy', 'scipy', 'sklearn', 'LangChain', 'OpenAI API', 'N8N'],
    icon: Brain,
  },
  {
    category: 'Architecture & Deployment',
    items: ['Docker', 'Git', 'Network Protocols', 'OOP Design'],
    icon: Server,
  },
  {
    category: 'Other Tools',
    items: ['Selenium', 'BeautifulSoup4', 'HTML/CSS', 'PyQT5', 'pygame'],
    icon: Zap,
  },
]

const experience = [
  {
    period: 'Jun 2026 — Present',
    role: 'Digital Initiatives Intern',
    org: 'Siemens Mobility Ltd.',
    location: 'Hong Kong, Hong Kong SAR',
    highlights: [
      'Evaluated innovative digital solutions by comparing tool capabilities, integration options, and practical use cases for automation within engineering and project workflows.',
      'Built automation solutions using Python, n8n, Power Automate, and OCR technologies to streamline data extraction, document analysis, and workflow visualization processes.',
      'Currently working on QR-based live translation session for pre-working briefings to enhance communication between employees.',
    ],
  },
  {
    period: 'Jun 2025 — Aug 2025',
    role: 'AI Digital Marketing Intern',
    org: 'AlgoGene Financial Technology Company Ltd.',
    location: 'Hong Kong, Hong Kong SAR',
    highlights: [
      'Developed and implemented Python programs to automate the creation and scheduling of social media content, significantly streamlining the content generation workflow.',
      'Researched and generated data-driven posts on key financial topics (e.g., earnings releases, economic events), successfully increasing audience engagement and attracting new followers.',
    ],
  },
]

const projects = [
  {
    name: 'E-commerce: Yandex Data Analyst Project',
    tools: 'Python, pandas, numpy, sklearn, matplotlib, seaborn, scipy',
    highlights: [
      'Performed exploratory data analysis (EDA) and hypothesis testing (8+ hypotheses)',
      'Applied ANOVA/Kruskal-Wallis tests to uncover statistically significant feature relationships',
      'Built a linear regression model (R² = 0.48) to forecast payers and revenue',
    ],
  },
  {
    name: 'AI-Driven Mock Interview Simulator',
    tools: 'Python, Streamlit, OpenAI API (GPT-4o)',
    highlights: [
      'Developed an interactive web application using Streamlit and GPT-4o to simulate professional HR interviews',
      'Designed a robust state machine to manage a multi-phase user journey with data persistence and seamless UI',
    ],
  },
]

const honors = [
  'Full Tuition Scholarship Recipient',
  'CityUHK Tiger (TOP 10%)',
  '4× Dean\'s List',
  'Data Analyst Specialization — Yandex Certificate of Excellence',
  'Fundamentals of Industrial Programming — Yandex Certificate',
  'Fundamentals of Python Programming — Yandex Certificate',
]

const coursework = [
  'Computer Programming (C++, Python)',
  'Web Applications Development',
  'Data Science',
  'Data Structures',
  'Computer Networks',
  'Computer Organization',
  'Database Systems',
  'Operating Systems',
  'Software Design',
]

export default function HomePage() {
  return (
    <div className="min-h-screen home-page-bg relative">
      {/* ── Animated Background Orbs ─────────────────── */}
      <div className="home-bg-orbs" aria-hidden="true">
        <div className="home-orb home-orb-1" />
        <div className="home-orb home-orb-2" />
        <div className="home-orb home-orb-3" />
      </div>

      {/* ── Hero Section ──────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="relative max-w-5xl mx-auto px-8 pt-20 pb-16">
          <div className="animate-fade-in">
            <div className="flex items-center gap-2 mb-6">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20">
                <Terminal size={14} className="text-[var(--color-accent-light)]" />
                <span className="text-xs font-medium text-[var(--color-accent-light)]">
                  Available for opportunities
                </span>
              </div>
            </div>

            <h1 className="text-5xl font-bold text-zinc-50 tracking-tight leading-[1.1] mb-4">
              Yerzhan Panayev
            </h1>
            <p className="text-xl text-zinc-400 max-w-2xl leading-relaxed mb-2">
              BSc Computer Science — City University of Hong Kong
            </p>
            <p className="text-base text-zinc-500 max-w-2xl leading-relaxed mb-6">
              Aspiring software engineer passionate about data science, AI, and building automation solutions.
              Currently interning at Siemens Mobility, building digital workflow tools.
            </p>

            {/* Contact row */}
            <div className="flex flex-wrap items-center gap-4 mb-8 text-sm text-zinc-400">
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={14} className="text-zinc-500" />
                Hong Kong SAR
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Mail size={14} className="text-zinc-500" />
                <a href="mailto:yerzhan.panayev@gmail.com" className="hover:text-[var(--color-accent-light)] transition-colors">
                  yerzhan.panayev@gmail.com
                </a>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Phone size={14} className="text-zinc-500" />
                +852 5466 0190
              </span>
            </div>

            <div className="flex items-center gap-4">
              <a
                href="#experience"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white text-sm font-medium rounded-lg transition-colors"
              >
                View Experience <ArrowRight size={16} />
              </a>
              <a
                href="https://github.com/yerzhanpanayev"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-zinc-700 hover:border-zinc-600 text-zinc-300 text-sm font-medium rounded-lg transition-colors hover:bg-zinc-800/50"
              >
                <ExternalLink size={16} /> GitHub
              </a>
              <a
                href="https://linkedin.com/in/yerzhanpanayev"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-zinc-700 hover:border-zinc-600 text-zinc-300 text-sm font-medium rounded-lg transition-colors hover:bg-zinc-800/50"
              >
                <ExternalLink size={16} /> LinkedIn
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Quick Links: Apps ─────────────────────────── */}
      <section className="max-w-5xl mx-auto px-8 pb-16">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
            <Star size={14} /> Quick Launch — My Apps
          </h2>
          <Link
            to="/apps"
            className="text-xs text-[var(--color-accent-light)] hover:underline inline-flex items-center gap-1"
          >
            View All <ArrowRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-9 gap-3 stagger-children">
          {appRegistry.map(app => {
            const Icon = app.icon
            return (
              <Link
                key={app.id}
                to={app.path}
                className="quick-app-link group"
                title={app.name}
              >
                <div
                  className="quick-app-icon"
                  style={{ '--app-color': app.color }}
                >
                  <Icon size={22} />
                </div>
                <span className="text-[11px] font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors text-center leading-tight mt-1.5">
                  {app.name}
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ── Skills Grid ───────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-8 pb-16">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Technical Skills</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
          {skills.map(skill => {
            const Icon = skill.icon
            return (
              <div key={skill.category} className="card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--color-accent)]/10 flex items-center justify-center">
                    <Icon size={18} className="text-[var(--color-accent-light)]" />
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-200">{skill.category}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {skill.items.map(item => (
                    <span
                      key={item}
                      className="px-2.5 py-1 text-xs font-medium text-zinc-400 bg-zinc-800/80 border border-zinc-700/60 rounded-md"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Experience Timeline ───────────────────────── */}
      <section id="experience" className="max-w-5xl mx-auto px-8 pb-16 scroll-mt-8">
        <div className="flex items-center gap-3 mb-6">
          <Briefcase size={20} className="text-zinc-500" />
          <h2 className="text-xl font-semibold text-zinc-100">Work Experience</h2>
        </div>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-[var(--color-accent)]/40 via-zinc-800 to-zinc-800/40" />

          <div className="space-y-8 stagger-children">
            {experience.map((item, i) => (
              <div key={i} className="relative pl-12">
                {/* Timeline dot */}
                <div className={`absolute left-[12px] top-1.5 w-[15px] h-[15px] rounded-full border-2 ${
                  i === 0
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/20'
                    : 'border-zinc-700 bg-zinc-900'
                }`} />

                <div className="card p-5">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h3 className="text-base font-semibold text-zinc-100">{item.role}</h3>
                      <p className="text-sm text-zinc-400">{item.org}</p>
                      <p className="text-xs text-zinc-600">{item.location}</p>
                    </div>
                    <span className="text-xs font-mono text-zinc-600 bg-zinc-800/80 px-2.5 py-1 rounded-md shrink-0">
                      {item.period}
                    </span>
                  </div>
                  <ul className="space-y-2 mt-3">
                    {item.highlights.map((h, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-zinc-400">
                        <ChevronRight size={14} className="text-zinc-600 mt-0.5 shrink-0" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Projects ──────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-8 pb-16">
        <div className="flex items-center gap-3 mb-6">
          <GitBranch size={20} className="text-zinc-500" />
          <h2 className="text-xl font-semibold text-zinc-100">Projects</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
          {projects.map((proj, i) => (
            <div key={i} className="card p-5">
              <h3 className="text-base font-semibold text-zinc-100 mb-1">{proj.name}</h3>
              <p className="text-xs text-[var(--color-accent-light)] font-mono mb-3">{proj.tools}</p>
              <ul className="space-y-2">
                {proj.highlights.map((h, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-zinc-400">
                    <ChevronRight size={14} className="text-zinc-600 mt-0.5 shrink-0" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Education ─────────────────────────────────── */}
      <section id="education" className="max-w-5xl mx-auto px-8 pb-16 scroll-mt-8">
        <div className="flex items-center gap-3 mb-6">
          <GraduationCap size={20} className="text-zinc-500" />
          <h2 className="text-xl font-semibold text-zinc-100">Education</h2>
        </div>

        <div className="card p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/20 flex items-center justify-center shrink-0">
              <GraduationCap size={24} className="text-purple-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-zinc-100">
                    BSc in Computer Science
                  </h3>
                  <p className="text-sm text-zinc-400 mt-0.5">City University of Hong Kong</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Kowloon Tong, Hong Kong</p>
                </div>
                <span className="text-xs font-mono text-zinc-600 bg-zinc-800/80 px-2.5 py-1 rounded-md">
                  Sep 2024 — Present
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2 text-sm text-zinc-300">
                <span className="font-semibold">GPA:</span>
                <span className="text-[var(--color-accent-light)] font-semibold">3.97 / 4.3</span>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Relevant Coursework</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {coursework.map(course => (
                    <div
                      key={course}
                      className="flex items-center gap-2 text-sm text-zinc-400"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]/50" />
                      {course}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Honors & Languages ─────────────────────────── */}
      <section className="max-w-5xl mx-auto px-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Honors */}
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Trophy size={18} className="text-yellow-400" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">Honors & Certifications</h3>
            </div>
            <ul className="space-y-2">
              {honors.map((h, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                  <ChevronRight size={14} className="text-zinc-600 mt-0.5 shrink-0" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Languages */}
          <div className="card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Languages size={18} className="text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">Languages</h3>
            </div>
            <div className="space-y-3">
              {[
                { lang: 'English', level: 'C1', pct: 85 },
                { lang: 'Russian', level: 'C2', pct: 100 },
                { lang: 'Kazakh', level: 'C2', pct: 100 },
              ].map(l => (
                <div key={l.lang}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-zinc-300 font-medium">{l.lang}</span>
                    <span className="text-xs text-zinc-500 font-mono">{l.level}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-light)] transition-all duration-700"
                      style={{ width: `${l.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
