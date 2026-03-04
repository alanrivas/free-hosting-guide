import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

const categories = [
  {
    emoji: '🖼️',
    title: 'Frontend / Sitios Estáticos',
    services: ['Vercel', 'Netlify', 'GitHub Pages', 'Cloudflare Pages'],
    link: '/docs/frontend/vercel',
    color: '#3b82f6',
  },
  {
    emoji: '🚀',
    title: 'Backend / APIs',
    services: ['Render', 'Railway', 'Fly.io', 'Koyeb'],
    link: '/docs/backend/render',
    color: '#8b5cf6',
  },
  {
    emoji: '🗄️',
    title: 'Bases de Datos',
    services: ['Supabase', 'Neon', 'Turso', 'MongoDB Atlas', 'Firebase', 'Upstash'],
    link: '/docs/bases-de-datos/supabase',
    color: '#10b981',
  },
  {
    emoji: '⚡',
    title: 'Serverless / Edge',
    services: ['Cloudflare Workers', 'Deno Deploy'],
    link: '/docs/serverless/cloudflare-workers',
    color: '#f59e0b',
  },
  {
    emoji: '🔧',
    title: 'Full-Stack Todo-en-uno',
    services: ['PocketBase', 'Appwrite'],
    link: '/docs/fullstack/pocketbase',
    color: '#ef4444',
  },
  {
    emoji: '📦',
    title: 'Almacenamiento',
    services: ['Cloudflare R2', 'Supabase Storage', 'Backblaze B2'],
    link: '/docs/almacenamiento/cloudflare-r2',
    color: '#06b6d4',
  },
  {
    emoji: '🤖',
    title: 'APIs de IA Gratuitas',
    services: ['Groq (LLaMA)', 'Google Gemini'],
    link: '/docs/ia-gratis/intro-ia',
    color: '#ec4899',
  },
  {
    emoji: '⚙️',
    title: 'CI/CD & Herramientas',
    services: ['GitHub Actions', 'Túneles Locales (ngrok, CF)'],
    link: '/docs/ci-cd/intro-ci-cd',
    color: '#64748b',
  },
];

const stats = [
  { value: '30+', label: 'Servicios documentados' },
  { value: '8', label: 'Categorías' },
  { value: '5', label: 'Proyectos guiados' },
  { value: '$0', label: 'Costo para empezar' },
];

const projects = [
  { emoji: '💬', title: 'Chat en Tiempo Real', stack: 'Next.js + Supabase', link: '/docs/proyectos/proyecto-1-chat-realtime' },
  { emoji: '🔐', title: 'API REST con JWT', stack: 'Hono + Neon + Render', link: '/docs/proyectos/proyecto-2-api-auth' },
  { emoji: '🤖', title: 'App con IA (RAG)', stack: 'Next.js + Groq + pgvector', link: '/docs/proyectos/proyecto-3-ia-integrada' },
  { emoji: '⚙️', title: 'Pipeline CI/CD', stack: 'GitHub Actions + Vercel', link: '/docs/proyectos/proyecto-4-cicd-pipeline' },
  { emoji: '💳', title: 'SaaS con Pagos', stack: 'Next.js + Supabase + Stripe', link: '/docs/proyectos/proyecto-5-saas-basico' },
];

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={styles.heroBanner}>
      <div className="container">
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>100% Gratuito</div>
          <Heading as="h1" className={styles.heroTitle}>
            {siteConfig.title}
          </Heading>
          <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
          <div className={styles.heroButtons}>
            <Link className={clsx('button button--lg', styles.btnPrimary)} to="/docs/intro">
              📚 Ver la Guía Completa
            </Link>
            <Link className={clsx('button button--lg', styles.btnSecondary)} to="/docs/proyectos/intro">
              🏗️ Proyectos de Práctica
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function StatsBar() {
  return (
    <div className={styles.statsBar}>
      <div className="container">
        <div className={styles.statsGrid}>
          {stats.map((stat, i) => (
            <div key={i} className={styles.statItem}>
              <span className={styles.statValue}>{stat.value}</span>
              <span className={styles.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CategoryCards() {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <Heading as="h2">🗂️ Categorías cubiertas</Heading>
          <p>Todo lo que necesitás para desarrollar sin gastar un peso</p>
        </div>
        <div className={styles.categoryGrid}>
          {categories.map((cat, i) => (
            <Link key={i} to={cat.link} className={styles.categoryCard}>
              <div className={styles.categoryEmoji} style={{'--card-color': cat.color} as React.CSSProperties}>
                {cat.emoji}
              </div>
              <h3 className={styles.categoryTitle}>{cat.title}</h3>
              <div className={styles.servicesList}>
                {cat.services.map((s, j) => (
                  <span key={j} className={styles.serviceTag}>{s}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProjectsSection() {
  return (
    <section className={clsx(styles.section, styles.sectionAlt)}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <Heading as="h2">🏗️ Proyectos Guiados de Práctica</Heading>
          <p>Proyectos completos de principio a fin, usando solo servicios gratuitos</p>
        </div>
        <div className={styles.projectsGrid}>
          {projects.map((p, i) => (
            <Link key={i} to={p.link} className={styles.projectCard}>
              <div className={styles.projectNumber}>0{i + 1}</div>
              <div className={styles.projectEmoji}>{p.emoji}</div>
              <h3 className={styles.projectTitle}>{p.title}</h3>
              <p className={styles.projectStack}>{p.stack}</p>
              <span className={styles.projectLink}>Ver proyecto →</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuickStart() {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.quickStart}>
          <div className={styles.quickStartText}>
            <Heading as="h2">🚀 Stack recomendado para empezar</Heading>
            <p>Si no sabés por dónde comenzar, este stack cubre todo lo que necesitás y es 100% gratis.</p>
            <Link className={clsx('button button--lg', styles.btnPrimary)} to="/docs/stacks/stacks-recomendados">
              Ver todos los stacks →
            </Link>
          </div>
          <div className={styles.quickStartCode}>
            <pre className={styles.codeBlock}>
{`Frontend  → Vercel (Next.js)
Backend   → Cloudflare Workers
Database  → Neon PostgreSQL
Cache     → Upstash Redis
Files     → Cloudflare R2
Auth      → Supabase Auth
CI/CD     → GitHub Actions
IA        → Groq (LLaMA gratis)`}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="Guía de Hosting Gratuito para Devs"
      description="Guía completa de servicios gratuitos para desarrollo: APIs, frontend, bases de datos, IA y más. Con proyectos guiados paso a paso.">
      <HomepageHeader />
      <StatsBar />
      <main>
        <CategoryCards />
        <ProjectsSection />
        <QuickStart />
      </main>
    </Layout>
  );
}
