// generate-post.js — Smart SEO blog post generator
// Uses Google Search Console data to find best keyword opportunities
const fs   = require('fs');
const path = require('path');
const https = require('https');

const SITE_NAME = 'MakeImageSmall';
const SITE_URL  = 'https://makeimagesmall.com';
const SC_SITE   = 'https://www.makeimagesmall.com/';

const FALLBACK_TOPICS = [
  "How to compress images for Shopify stores",
  "Best image size for WordPress blog posts",
  "How to optimize images for Google PageSpeed Insights",
  "PNG vs WebP for transparent images",
  "How to compress images for WhatsApp without quality loss",
  "Image optimization for Squarespace websites",
  "How to reduce HEIC iPhone photo file size",
  "Fastest way to compress multiple images at once",
  "How to compress images for email newsletters",
  "WebP images and their impact on SEO",
  "How to batch compress images for free online",
  "Image compression for e-commerce product photos",
  "How to compress screenshots for presentations",
  "Reduce image size for social media posts",
  "How to convert JPG to WebP in bulk",
  "Image file size limits for major platforms",
  "How to make your website images load faster",
  "Free alternatives to Photoshop for image compression",
  "How to reduce image size for web without losing sharpness",
  "What is the best image quality setting for WebP",
];

const BLOG_DIR   = path.join(__dirname, '..', 'blog');
const POSTS_JSON = path.join(BLOG_DIR, 'posts.json');

let posts = [];
try { posts = JSON.parse(fs.readFileSync(POSTS_JSON, 'utf8')); } catch(e) {}

const today = new Date().toISOString().split('T')[0];

if (!process.env.CUSTOM_TOPIC && posts.some(p => p.date === today)) {
  console.log('Already posted today (auto-run). Done.');
  process.exit(0);
}

// ── GOOGLE AUTH ──
async function getAccessToken() {
  const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).toString('base64url');
  const { createSign } = require('crypto');
  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(serviceAccount.private_key, 'base64url');
  const jwt = `${header}.${payload}.${signature}`;
  return new Promise((resolve, reject) => {
    const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
    const req = https.request({
      hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': body.length },
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        const json = JSON.parse(data);
        if (json.access_token) resolve(json.access_token);
        else reject(new Error('Auth failed: ' + data));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function getKeywordOpportunities(token) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 28);
  const body = JSON.stringify({
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    dimensions: ['query'], rowLimit: 100,
  });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'searchconsole.googleapis.com',
      path: `/webmasters/v3/sites/${encodeURIComponent(SC_SITE)}/searchAnalytics/query`,
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.rows) resolve(json.rows);
          else { console.log('SC response:', data.slice(0, 300)); resolve([]); }
        } catch(e) { resolve([]); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function pickBestKeyword(rows, existingPosts) {
  const usedKeywords = new Set(existingPosts.map(p => (p.targetKeyword || '').toLowerCase()));
  const opportunities = rows.filter(row => {
    const query = row.keys[0].toLowerCase();
    const alreadyCovered = [...usedKeywords].some(k => k.includes(query) || query.includes(k));
    return row.impressions >= 5 && row.ctr < 0.10 && !alreadyCovered && query.length > 10;
  });
  opportunities.sort((a, b) => b.impressions - a.impressions);
  if (opportunities.length > 0) {
    const best = opportunities[0];
    console.log(`Best keyword: "${best.keys[0]}" — ${best.impressions} impressions, ${(best.ctr*100).toFixed(1)}% CTR`);
    return best.keys[0];
  }
  return null;
}

async function callClaude(prompt, maxTokens) {
  const body = JSON.stringify({
    model: 'claude-sonnet-4-6', max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.anthropic.com', path: '/v1/messages', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve((json.content||[]).filter(b=>b.type==='text').map(b=>b.text).join(''));
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Inject mini CTA after first </h2> at build time
function injectMidCta(htmlContent) {
  const miniCta = `<div style="background:var(--brand-light);border:1px solid var(--brand-mid);border-radius:10px;padding:14px 18px;margin:20px 0;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;transition:background .3s,border-color .3s"><span style="font-size:13px;font-weight:500;color:var(--brand)">🖼️ Try MakeImageSmall free — compress images instantly, no uploads, no limits</span><a href="${SITE_URL}" style="background:var(--brand);color:white;text-decoration:none;padding:8px 16px;border-radius:7px;font-size:13px;font-weight:600;white-space:nowrap;flex-shrink:0">Try it free →</a></div>`;
  const idx = htmlContent.indexOf('</h2>');
  if (idx !== -1) {
    return htmlContent.slice(0, idx + 5) + miniCta + htmlContent.slice(idx + 5);
  }
  return htmlContent;
}

async function run() {
  let keyword = process.env.CUSTOM_KEYWORD || 'compress image online free';
  let topic   = process.env.CUSTOM_TOPIC  || null;
  let source  = 'custom';

  if (!topic) {
    try {
      console.log('Fetching Search Console data...');
      const token = await getAccessToken();
      const rows  = await getKeywordOpportunities(token);
      console.log(`Got ${rows.length} keywords from Search Console`);
      if (rows.length > 0) {
        const bestKeyword = pickBestKeyword(rows, posts);
        if (bestKeyword) {
          keyword = bestKeyword;
          topic   = `Complete guide: ${bestKeyword}`;
          source  = 'search-console';
        }
      }
    } catch(e) {
      console.log('Search Console unavailable, using fallback:', e.message);
    }
    if (!topic) {
      const used  = new Set(posts.map(p => p.topic));
      const avail = FALLBACK_TOPICS.filter(t => !used.has(t));
      topic  = avail.length > 0 ? avail[0] : FALLBACK_TOPICS[Math.floor(Math.random() * FALLBACK_TOPICS.length)];
      source = 'fallback';
      console.log(`Using fallback topic: "${topic}"`);
    }
  }

  console.log(`Source: ${source} | Topic: "${topic}" | Keyword: "${keyword}"`);

  const metaRaw = await callClaude(
    `For a blog post about: "${topic}"\nReturn ONLY JSON (no markdown): {"title":"seo title","meta":"155 char meta mentioning: ${keyword}","excerpt":"2 sentence summary","tags":["tag1","tag2","tag3"]}`,
    500
  );
  const meta = JSON.parse(metaRaw.replace(/```json|```/g,'').trim());
  console.log('Title:', meta.title);

  const htmlRaw = await callClaude(
    `Write a 900 word SEO blog post for MakeImageSmall (${SITE_URL}) about: "${meta.title}"\nInclude keyword "${keyword}" 3-4 times. Mention MakeImageSmall with link <a href="${SITE_URL}">MakeImageSmall</a> twice. End with strong CTA to try the free tool. Use h2 h3 p ul li strong em a tags only. Return ONLY HTML content, no title/head/body wrapper.`,
    4000
  );

  // Inject mini CTA after first heading
  const htmlContent = injectMidCta(htmlRaw);
  console.log('Content length:', htmlContent.length);

  const slug = meta.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,65);
  fs.writeFileSync(path.join(BLOG_DIR, `${slug}.html`), buildHtml(meta, slug, htmlContent), 'utf8');
  console.log('Written:', `blog/${slug}.html`);

  posts.push({ slug, title: meta.title, date: today, topic, targetKeyword: keyword, source, excerpt: meta.excerpt, metaDescription: meta.meta, tags: meta.tags||[], wordCount: 900 });
  fs.writeFileSync(POSTS_JSON, JSON.stringify(posts, null, 2), 'utf8');
  console.log(`posts.json updated — ${posts.length} total posts`);
  console.log('Done!');
}

function buildHtml(meta, slug, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${meta.title} | ${SITE_NAME}</title>
<meta name="description" content="${meta.meta}">
<link rel="canonical" href="${SITE_URL}/blog/${slug}.html">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:title" content="${meta.title}"><meta property="og:type" content="article">
<script>(function(){var s=localStorage.getItem('mis-theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.setAttribute('data-theme',s?s:(d?'dark':'light'));})();<\/script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-P5ERVP0NVS"><\/script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-P5ERVP0NVS');<\/script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--brand:#2563eb;--brand-h:#1d4ed8;--brand-light:#eff6ff;--brand-mid:#dbeafe;--green:#16a34a;--green-light:#f0fdf4;--green-mid:#dcfce7;--bg:#f8fafc;--white:#fff;--surface:#f1f5f9;--text:#0f172a;--sub:#64748b;--muted:#94a3b8;--border:#e2e8f0;--r:14px;--rs:9px}
[data-theme="dark"]{--brand:#4f8ef7;--brand-h:#6ba3f8;--brand-light:rgba(79,142,247,.1);--brand-mid:rgba(79,142,247,.18);--green:#34d468;--green-light:rgba(52,212,104,.08);--green-mid:rgba(52,212,104,.18);--bg:#0a0a0a;--white:#161616;--surface:#111111;--text:#ededed;--sub:#a0a0a0;--muted:#555555;--border:#272727}
body{font-family:'Inter',-apple-system,sans-serif;background:var(--bg);color:var(--text);font-size:16px;line-height:1.7;transition:background .3s,color .3s}
header{background:var(--white);border-bottom:1px solid var(--border);padding:12px 32px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;backdrop-filter:blur(12px);transition:background .3s,border-color .3s}
.logo{display:flex;align-items:center;gap:10px;text-decoration:none;font-size:15px;font-weight:600;color:var(--text)}
.logo-icon{width:28px;height:28px;background:var(--brand);border-radius:7px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.logo-icon svg{width:14px;height:14px;stroke:white;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.header-right{display:flex;align-items:center;gap:12px}
.nav-link{font-size:13px;color:var(--sub);text-decoration:none;font-weight:500;padding:5px 10px;border-radius:6px;transition:color .15s}
.nav-link:hover{color:var(--text)}
.toggle-wrap{display:flex;align-items:center;gap:7px}
.toggle-icon{font-size:14px;cursor:default}
.dark-toggle{width:38px;height:22px;border-radius:11px;background:#cbd5e1;border:none;cursor:pointer;position:relative;transition:background .3s;flex-shrink:0}
.dark-toggle::after{content:'';width:16px;height:16px;background:white;border-radius:50%;position:absolute;top:3px;left:3px;transition:left .25s;box-shadow:0 1px 3px rgba(0,0,0,.2)}
[data-theme="dark"] .dark-toggle{background:var(--brand)}
[data-theme="dark"] .dark-toggle::after{left:19px}
main{max-width:720px;margin:0 auto;padding:40px 24px 80px}
.breadcrumb{font-size:12px;color:var(--muted);margin-bottom:20px}
.breadcrumb a{color:var(--muted);text-decoration:none}
h1{font-size:clamp(22px,3.5vw,34px);font-weight:600;letter-spacing:-.025em;line-height:1.25;margin-bottom:12px}
.post-meta{font-size:13px;color:var(--sub);margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid var(--border)}
.post-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.post-tag{font-size:11px;padding:2px 8px;border-radius:100px;background:var(--brand-light);color:var(--brand);font-weight:500}
article h2{font-size:20px;font-weight:600;margin:28px 0 10px;color:var(--text)}
article h3{font-size:17px;font-weight:500;margin:20px 0 8px;color:var(--text)}
article p{margin-bottom:14px;color:var(--sub)}
article ul,article ol{margin:0 0 14px 22px}
article li{margin-bottom:6px;color:var(--sub)}
article strong{font-weight:600;color:var(--text)}
article a{color:var(--brand);text-decoration:none}
article a:hover{text-decoration:underline}
.ad-slot{background:var(--white);border:1px solid var(--border);border-radius:8px;padding:12px;text-align:center;color:var(--muted);font-size:12px;margin:28px 0;min-height:90px;display:flex;align-items:center;justify-content:center;transition:background .3s,border-color .3s}
.cta-box{background:var(--brand-light);border:1px solid var(--brand-mid);border-radius:var(--r);padding:24px;margin:28px 0;text-align:center;transition:background .3s,border-color .3s}
.cta-box h3{font-size:18px;font-weight:600;margin-bottom:8px;color:var(--brand)}
.cta-box p{font-size:14px;color:var(--sub);margin-bottom:16px;max-width:480px;margin-left:auto;margin-right:auto}
.cta-btn{display:inline-flex;align-items:center;gap:8px;background:var(--brand);color:white;text-decoration:none;border-radius:8px;padding:12px 28px;font-size:15px;font-weight:600;transition:background .15s}
.cta-btn:hover{background:var(--brand-h)}
footer{border-top:1px solid var(--border);background:var(--white);padding:18px 24px;text-align:center;font-size:12px;color:var(--sub);transition:background .3s,border-color .3s}
footer a{color:var(--sub);text-decoration:none;margin:0 8px}
footer a:hover{color:var(--text)}
</style>
</head>
<body>
<header>
  <a href="/" class="logo">
    <div class="logo-icon"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>
    ${SITE_NAME}
  </a>
  <div class="header-right">
    <a href="/" class="nav-link">Tool</a>
    <a href="/blog/" class="nav-link">Blog</a>
    <a href="/about.html" class="nav-link">About</a>
    <div class="toggle-wrap">
      <span class="toggle-icon" id="themeIcon">🌙</span>
      <button class="dark-toggle" onclick="toggleDark()"></button>
    </div>
  </div>
</header>
<main>
  <div class="breadcrumb"><a href="/">Home</a> / <a href="/blog/">Blog</a> / ${meta.title}</div>
  <h1>${meta.title}</h1>
  <div class="post-meta">Published: ${today} &middot; ${SITE_NAME}
    <div class="post-tags">${(meta.tags||[]).map(t=>`<span class="post-tag">${t}</span>`).join('')}</div>
  </div>
  <div class="ad-slot"><!-- AdSense --></div>
  <article>${content}</article>
  <div class="ad-slot"><!-- AdSense --></div>
  <div class="cta-box">
    <h3>Try ${SITE_NAME} Free — Right Now</h3>
    <p>Compress your images instantly in your browser. No uploads, no account, no limits. See the quality difference yourself with the before/after preview.</p>
    <a href="${SITE_URL}" class="cta-btn">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      Compress images free
    </a>
  </div>
</main>
<footer>
  <div style="margin-bottom:8px"><a href="/">Home</a><a href="/blog/">Blog</a><a href="/about.html">About</a><a href="/contact.html">Contact</a><a href="/privacy.html">Privacy</a></div>
  &copy; 2026 ${SITE_NAME} — Free Image Compressor
</footer>
<script>
function toggleDark(){const h=document.documentElement;const d=h.getAttribute('data-theme')==='dark';h.setAttribute('data-theme',d?'light':'dark');document.getElementById('themeIcon').textContent=d?'🌙':'☀️';localStorage.setItem('mis-theme',d?'light':'dark');}
(function(){const d=document.documentElement.getAttribute('data-theme')==='dark';const i=document.getElementById('themeIcon');if(i)i.textContent=d?'☀️':'🌙';})();
<\/script>
</body>
</html>`;
}

run().catch(err => { console.error('Error:', err.message); process.exit(1); });
