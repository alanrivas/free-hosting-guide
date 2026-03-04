import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Hosting Gratuito para Devs',
  tagline: 'Guía completa de servicios gratuitos para desarrollo: APIs, frontend, bases de datos y más',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://free-hosting-guide.alanrivas.me',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'alanrivas',
  projectName: 'free-hosting-guide',
  trailingSlash: false,

  onBrokenLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'es',
    locales: ['es'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: '🆓 Hosting Gratuito',
      logo: {
        alt: 'Hosting Gratuito para Devs',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: '📚 Guía',
        },
        {
          href: 'https://github.com',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Categorías',
          items: [
            { label: '🖼️ Frontend', to: '/docs/frontend/vercel' },
            { label: '🚀 Backend / APIs', to: '/docs/backend/render' },
            { label: '🗄️ Bases de Datos', to: '/docs/bases-de-datos/supabase' },
          ],
        },
        {
          title: 'Más categorías',
          items: [
            { label: '⚡ Serverless / Edge', to: '/docs/serverless/cloudflare-workers' },
            { label: '🔧 Full-Stack', to: '/docs/fullstack/pocketbase' },
            { label: '📦 Almacenamiento', to: '/docs/almacenamiento/cloudflare-r2' },
          ],
        },
        {
          title: 'Resumen',
          items: [
            { label: '🗺️ Introducción', to: '/docs/intro' },
            { label: '💡 Stacks Recomendados', to: '/docs/stacks/stacks-recomendados' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Guía Hosting Gratuito. Construido con Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
