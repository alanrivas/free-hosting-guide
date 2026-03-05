---
name: deploy-gh-pages
description: Setup completo de deploy de un sitio Docusaurus en GitHub Pages con dominio personalizado via Cloudflare. Configura docusaurus.config.ts, crea CNAME, crea el workflow de GitHub Actions, y verifica DNS y HTTPS.
argument-hint: "[org=TU-ORG repo=TU-REPO domain=TU-DOMINIO]"
---

Deploy this Docusaurus project to GitHub Pages with a custom domain.

First, extract these three values (from the user's message, from CLAUDE.md context, or from git remote + docusaurus.config.ts):
- `org` — GitHub username or organization
- `repo` — repository name (exact, case-sensitive)
- `domain` — full custom subdomain (e.g., `my-project.alanrivas.me`)

If any value is missing, ask the user for it before doing anything else.

Once you have all three values, use the `static-site-deployer` agent to execute the full deployment pipeline:

1. Update `docusaurus.config.ts` — set `url`, `organizationName`, `projectName`, `trailingSlash: false`
2. Create `static/CNAME` — just the bare domain, no protocol
3. Create `.github/workflows/deploy.yml` — use the standard workflow from the agent
4. Commit all three files with message: `feat: configure GitHub Pages deployment with custom domain`
5. Push to main
6. Configure GitHub Pages via gh CLI — set `cname`, `build_type=workflow`, `https_enforced=true`
7. Verify: DNS resolution, workflow run status, HTTP 200 on HTTPS

At the end, report a final status table with ✅/⚠️/❌ for each check and the live URL.
