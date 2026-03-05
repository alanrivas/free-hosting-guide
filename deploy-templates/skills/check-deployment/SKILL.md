---
name: check-deployment
description: Verifica el estado completo de un deploy de GitHub Pages. Comprueba la configuración de GitHub Pages API, el último workflow run, resolución DNS y respuesta HTTPS en vivo.
---

Check the full deployment status of the current GitHub Pages project.

First, determine the GitHub org/repo from `git remote get-url origin` and the custom domain from `static/CNAME` or `CLAUDE.md`.

Then run these four checks and report results with ✅/⚠️/❌:

1. **GitHub Pages config**
   ```bash
   gh api repos/{org}/{repo}/pages --jq '{cname, https_enforced, status, html_url}'
   ```
   ✅ expects: `cname` matches CNAME file, `https_enforced: true`

2. **Latest workflow run**
   ```bash
   gh api repos/{org}/{repo}/actions/runs --jq '.workflow_runs[0] | {status, conclusion, created_at, html_url}'
   ```
   ✅ expects: `status: completed`, `conclusion: success`

3. **DNS resolution**
   ```bash
   nslookup {domain}
   ```
   ✅ expects: aliases to `{org}.github.io`

4. **Live HTTPS check**
   ```bash
   curl -sI https://{domain} | head -5
   ```
   ✅ expects: `HTTP/1.1 200 OK` or `HTTP/2 200`

If any check fails, diagnose the likely cause and suggest the fix.
At the end, show the live URL if the site is up.
