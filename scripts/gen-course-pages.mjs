// Generates static SEO pages for every course in the database:
//   courses/<slug>.html   — one page per course (GolfCourse JSON-LD)
//   courses/index.html    — browsable A–Z / by-county directory
//   sitemap.xml, robots.txt
//
// No-build-on-Vercel compliant: run locally (`npm run pages`), commit the
// output. Re-run whenever course data changes.
import { writeFileSync, mkdirSync, rmSync } from 'fs';

const SURL = 'https://xnfudoypksanbbfliuab.supabase.co';
const SKEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuZnVkb3lwa3NhbmJiZmxpdWFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMTIwMzEsImV4cCI6MjA4OTY4ODAzMX0.f8MMdbaqWrSJBWBvb7f2jFW4Ycc1fbpBXGNbSdA8_1I';
const SITE = 'https://logmygolf.com';

const root = new URL('../', import.meta.url).pathname;
const esc = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

async function fetchAll() {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${SURL}/rest/v1/courses?select=name,location,county,country,par,yardage,rating,slope,holes,type,slug&order=name&limit=1000&offset=${from}`,
      { headers: { apikey: SKEY, Authorization: `Bearer ${SKEY}` } });
    if (!r.ok) throw new Error(`fetch failed: ${r.status}`);
    const rows = await r.json();
    out.push(...rows);
    if (rows.length < 1000) break;
  }
  return out.filter((c) => c.slug);
}

const STYLE = `
:root{--bg:#0a0a0b;--card:#161719;--panel:#1c1d20;--border:#2a2b2f;--text:#ededed;--mid:#b4b4b8;--muted:#76767c;--green:#2f9e5b;--green-l:#3fb06b;}
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:-apple-system,'Segoe UI',Roboto,Inter,sans-serif;background:var(--bg);color:var(--text);line-height:1.6;-webkit-font-smoothing:antialiased;}
.wrap{max-width:820px;margin:0 auto;padding:34px 20px 70px;}
a{color:var(--green-l);text-decoration:none;} a:hover{text-decoration:underline;}
.crumbs{font-size:.82rem;color:var(--muted);margin-bottom:22px;}
h1{font-size:1.75rem;font-weight:800;line-height:1.25;margin-bottom:4px;}
.loc{color:var(--mid);font-size:.95rem;margin-bottom:26px;}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;margin-bottom:28px;}
.stat{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:14px 10px;text-align:center;}
.stat b{display:block;font-size:1.35rem;font-weight:800;color:#f2f4f3;}
.stat span{font-size:.68rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);}
.cta{background:linear-gradient(135deg,#173322,#0f2419);border:1px solid #24513a;border-radius:12px;padding:22px;margin:30px 0;}
.cta h2{font-size:1.05rem;margin-bottom:6px;}
.cta p{color:var(--mid);font-size:.9rem;margin-bottom:14px;}
.btn{display:inline-block;background:var(--green);color:#06140c;font-weight:700;padding:11px 22px;border-radius:8px;font-size:.9rem;}
.nearby{margin-top:34px;} .nearby h2{font-size:1rem;margin-bottom:10px;color:var(--mid);}
.nearby a{display:block;padding:9px 0;border-bottom:1px solid var(--border);font-size:.92rem;}
.foot{margin-top:44px;font-size:.78rem;color:var(--muted);border-top:1px solid var(--border);padding-top:16px;}
.cols{columns:2;column-gap:28px;} @media(max-width:600px){.cols{columns:1;}}
.county{break-inside:avoid;margin-bottom:20px;} .county h2{font-size:.95rem;color:var(--green-l);margin-bottom:6px;}
.county a{display:block;font-size:.88rem;padding:3px 0;color:var(--mid);}
`;

function coursePage(c, nearby) {
  const title = `${c.name} — Par, Slope Rating & Course Info`;
  const desc = `${c.name}${c.location ? ', ' + c.location : ''}${c.county ? ', ' + c.county : ''}: par ${c.par ?? '—'}, course rating ${c.rating ?? '—'}, slope ${c.slope ?? '—'}, ${c.holes ?? 18} holes. Track your rounds and handicap free on Log My Golf.`;
  const ld = {
    '@context': 'https://schema.org', '@type': 'GolfCourse',
    name: c.name,
    address: { '@type': 'PostalAddress', addressLocality: c.location || undefined, addressRegion: c.county || undefined, addressCountry: c.country || 'GB' },
    url: `${SITE}/courses/${c.slug}.html`,
  };
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} | Log My Golf</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}/courses/${c.slug}.html">
<meta name="theme-color" content="#0d0e10">
<link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32.png">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}/courses/${c.slug}.html">
<meta property="og:image" content="${SITE}/icons/og-image.png">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<style>${STYLE}</style>
</head>
<body><div class="wrap">
<div class="crumbs"><a href="/">Log My Golf</a> › <a href="/courses/">UK Golf Courses</a>${c.county ? ' › ' + esc(c.county) : ''}</div>
<h1>${esc(c.name)}</h1>
<div class="loc">${esc([c.location, c.county, c.country].filter(Boolean).join(', '))}</div>
<div class="stats">
  <div class="stat"><b>${c.par ?? '—'}</b><span>Par</span></div>
  <div class="stat"><b>${c.holes ?? 18}</b><span>Holes</span></div>
  <div class="stat"><b>${c.rating ?? '—'}</b><span>Course Rating</span></div>
  <div class="stat"><b>${c.slope ?? '—'}</b><span>Slope</span></div>
  ${c.yardage ? `<div class="stat"><b>${Number(c.yardage).toLocaleString()}</b><span>Yards</span></div>` : ''}
  ${c.type ? `<div class="stat"><b style="font-size:1rem;line-height:2;text-transform:capitalize;">${esc(c.type)}</b><span>Course Type</span></div>` : ''}
</div>
<div class="cta">
  <h2>Play at ${esc(c.name)}?</h2>
  <p>Log your rounds here, get an automatic WHS handicap, and compete with friends — free.</p>
  <a class="btn" href="/">Start tracking free →</a>
</div>
${nearby.length ? `<div class="nearby"><h2>More courses in ${esc(c.county || c.country || 'the area')}</h2>${nearby.map((n) => `<a href="/courses/${n.slug}.html">${esc(n.name)}${n.location ? ' · ' + esc(n.location) : ''}</a>`).join('')}</div>` : ''}
<div class="foot">Course data is community-maintained. Spot an error? <a href="/">Sign in</a> and update it, or email <a href="mailto:support@logmygolf.com">support@logmygolf.com</a>.<br><br><a href="/">Log My Golf</a> · <a href="/courses/">All courses</a> · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></div>
</div></body></html>`;
}

function indexPage(courses) {
  const byCounty = {};
  for (const c of courses) (byCounty[c.county || c.country || 'Other'] ||= []).push(c);
  const counties = Object.keys(byCounty).sort();
  const desc = `Browse ${courses.length} UK golf courses with par, course rating and slope. Track your rounds and WHS handicap free on Log My Golf.`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>UK Golf Courses — Par, Ratings & Slope for ${courses.length} Courses | Log My Golf</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}/courses/">
<meta name="theme-color" content="#0d0e10">
<link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-32.png">
<meta property="og:title" content="UK Golf Courses — ${courses.length} courses with ratings & slope">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${SITE}/icons/og-image.png">
<style>${STYLE}</style>
</head>
<body><div class="wrap">
<div class="crumbs"><a href="/">Log My Golf</a> › UK Golf Courses</div>
<h1>UK Golf Courses</h1>
<div class="loc">${courses.length} courses with par, course rating and slope — grouped by county.</div>
<div class="cta"><h2>Track your golf, free</h2><p>Log rounds at any of these courses, get an automatic WHS handicap, and compete with friends.</p><a class="btn" href="/">Start tracking free →</a></div>
<div class="cols">
${counties.map((k) => `<div class="county"><h2>${esc(k)}</h2>${byCounty[k].map((c) => `<a href="/courses/${c.slug}.html">${esc(c.name)}</a>`).join('')}</div>`).join('\n')}
</div>
<div class="foot"><a href="/">Log My Golf</a> · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></div>
</div></body></html>`;
}

const courses = await fetchAll();
console.log('courses fetched:', courses.length);

rmSync(root + 'courses', { recursive: true, force: true });
mkdirSync(root + 'courses', { recursive: true });

for (const c of courses) {
  const nearby = courses.filter((n) => n.slug !== c.slug && n.county && n.county === c.county).slice(0, 6);
  writeFileSync(`${root}courses/${c.slug}.html`, coursePage(c, nearby));
}
writeFileSync(root + 'courses/index.html', indexPage(courses));

const today = new Date().toISOString().slice(0, 10);
const urls = [
  `${SITE}/`, `${SITE}/courses/`, `${SITE}/privacy.html`, `${SITE}/terms.html`,
  ...courses.map((c) => `${SITE}/courses/${c.slug}.html`),
];
writeFileSync(root + 'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n') + '\n</urlset>\n');

writeFileSync(root + 'robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);

console.log(`wrote ${courses.length} course pages + index, sitemap.xml (${urls.length} urls), robots.txt`);
