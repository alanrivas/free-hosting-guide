import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: '🖼️ Frontend / Sitios Estáticos',
      items: [
        'frontend/vercel',
        'frontend/netlify',
        'frontend/github-pages',
        'frontend/cloudflare-pages',
      ],
    },
    {
      type: 'category',
      label: '🚀 Backend / APIs',
      items: [
        'backend/render',
        'backend/railway',
        'backend/fly-io',
        'backend/koyeb',
      ],
    },
    {
      type: 'category',
      label: '🗄️ Bases de Datos',
      items: [
        'bases-de-datos/supabase',
        'bases-de-datos/neon',
        'bases-de-datos/turso',
        'bases-de-datos/mongodb-atlas',
        'bases-de-datos/firebase',
        'bases-de-datos/upstash',
        'bases-de-datos/cockroachdb',
      ],
    },
    {
      type: 'category',
      label: '⚡ Serverless / Edge',
      items: [
        'serverless/cloudflare-workers',
        'serverless/deno-deploy',
      ],
    },
    {
      type: 'category',
      label: '🔧 Full-Stack / Todo-en-uno',
      items: [
        'fullstack/pocketbase',
        'fullstack/appwrite',
      ],
    },
    {
      type: 'category',
      label: '📦 Almacenamiento de Archivos',
      items: [
        'almacenamiento/cloudflare-r2',
        'almacenamiento/supabase-storage',
        'almacenamiento/backblaze-b2',
      ],
    },
    {
      type: 'category',
      label: '⚙️ CI/CD con GitHub Actions',
      items: [
        'ci-cd/intro-ci-cd',
        'ci-cd/github-actions',
        'ci-cd/flujos-completos',
      ],
    },
    {
      type: 'category',
      label: '🌐 Túneles Locales',
      items: [
        'tuneles-locales/intro-tuneles',
        'tuneles-locales/cloudflare-tunnel',
        'tuneles-locales/ngrok',
      ],
    },
    {
      type: 'category',
      label: '🤖 APIs de IA Gratuitas',
      items: [
        'ia-gratis/intro-ia',
        'ia-gratis/groq',
        'ia-gratis/google-gemini',
      ],
    },
    {
      type: 'category',
      label: '💡 Stacks Recomendados',
      items: [
        'stacks/stacks-recomendados',
      ],
    },
    {
      type: 'category',
      label: '🏗️ Proyectos de Práctica',
      items: [
        'proyectos/intro',
        'proyectos/proyecto-1-chat-realtime',
        'proyectos/proyecto-2-api-auth',
        'proyectos/proyecto-3-ia-integrada',
        'proyectos/proyecto-4-cicd-pipeline',
        'proyectos/proyecto-5-saas-basico',
        'proyectos/proyecto-6-docusaurus-ghpages',
      ],
    },
  ],
};

export default sidebars;
