// Builds docs/privacy-policy.html from src/legal/privacyPolicy.ts so the web
// version always matches the in-app screen. Host the file anywhere public
// (e.g. GitHub Pages from the /docs folder) and paste its URL into Play Console.
// Run with: node scripts/build-privacy-html.mts
import { mkdirSync, writeFileSync } from 'node:fs';
import { POLICY, SECTIONS, unfilledFields } from '../src/legal/privacyPolicy.ts';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const LINK = /(https?:\/\/[^\s)]+|[\w.+-]+@[\w-]+\.[\w.-]+)/g;
const rich = (text: string) =>
  text
    .split(LINK)
    .map((part, i) => {
      if (i % 2 === 0) return esc(part);
      const trail = /[.,]$/.test(part) ? part.slice(-1) : '';
      const clean = trail ? part.slice(0, -1) : part;
      const href = clean.includes('@') ? `mailto:${clean}` : clean;
      return `<a href="${esc(href)}">${esc(clean)}</a>${trail}`;
    })
    .join('');

const body = SECTIONS.map(s => {
  const parts = [`<h2>${esc(s.heading)}</h2>`];
  s.paragraphs?.forEach(p => parts.push(`<p>${rich(p)}</p>`));
  if (s.bullets?.length) parts.push(`<ul>${s.bullets.map(b => `<li>${rich(b)}</li>`).join('')}</ul>`);
  s.after?.forEach(p => parts.push(`<p>${rich(p)}</p>`));
  return `<section>${parts.join('\n')}</section>`;
}).join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Privacy Policy · ${esc(POLICY.appName)}</title>
<meta name="description" content="Privacy Policy for the ${esc(POLICY.appName)} puzzle game.">
<style>
  :root { color-scheme: dark; --bg:#05061A; --panel:#10153A; --border:rgba(130,150,255,.18); --text:#EEF1FF; --body:#C9CFEE; --dim:#8590C2; --accent:#5FF4FF; }
  * { box-sizing: border-box; }
  body { margin:0; background: radial-gradient(1200px 600px at 50% -10%, #1B2470 0%, var(--bg) 60%) fixed, var(--bg); color: var(--body);
         font: 16px/1.65 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 760px; margin: 0 auto; padding: 48px 16px 64px; }
  .brand { color: var(--accent); font-weight: 800; letter-spacing: .35em; font-size: 13px; }
  h1 { color: var(--text); font-size: clamp(28px, 6vw, 40px); margin: 8px 0 4px; }
  .meta { color: var(--dim); margin: 0 0 28px; }
  section { background: var(--panel); border: 1px solid var(--border); border-radius: 18px; padding: 20px 22px; margin: 16px 0; }
  h2 { color: var(--accent); font-size: 13px; letter-spacing: .14em; text-transform: uppercase; margin: 0 0 8px; }
  p { margin: 8px 0; }
  ul { margin: 8px 0; padding-left: 20px; }
  li { margin: 4px 0; }
  a { color: var(--accent); word-break: break-word; }
  footer { color: var(--dim); font-size: 13px; text-align: center; margin-top: 32px; }
</style>
</head>
<body>
<main>
  <div class="brand">${esc(POLICY.appName.toUpperCase())}</div>
  <h1>Privacy Policy</h1>
  <p class="meta">Effective ${esc(POLICY.effectiveDate)}</p>
${body}
  <footer>© ${new Date().getFullYear()} ${esc(POLICY.appName)}</footer>
</main>
</body>
</html>
`;

mkdirSync(new URL('../docs/', import.meta.url), { recursive: true });
writeFileSync(new URL('../docs/privacy-policy.html', import.meta.url), html);
console.log('Wrote docs/privacy-policy.html');

const missing = unfilledFields();
if (missing.length) {
  console.warn(`\n⚠  Fill in before publishing (src/legal/privacyPolicy.ts): ${missing.join(', ')}`);
}
