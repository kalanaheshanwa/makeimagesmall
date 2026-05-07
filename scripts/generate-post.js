// generate-post.js — Daily SEO blog post generator
const fs   = require('fs');
const path = require('path');

const SITE_NAME = 'MakeImageSmall';
const SITE_URL  = 'https://makeimagesmall.com';
const KEYWORD   = 'compress image online free';

const TOPICS = [
  "How to reduce image size for website without losing quality",
  "WebP vs JPG: which format is better for your website",
  "How to speed up your website with image compression",
  "PNG to WebP conversion: complete beginner guide",
  "Why large images are hurting your Google rankings",
  "Best image format for Squarespace websites",
  "How to compress product images for e-commerce stores",
  "Image compression for WordPress: complete guide",
  "What is WebP format and why Google recommends it",
  "How to reduce image file size without Photoshop",
  "Batch image compression: save hours of manual work",
  "Core Web Vitals and image optimization: what you need to know",
  "How to convert PNG to WebP for free online",
  "Image optimization checklist for web designers",
  "Why your website loads slow and how to fix it",
  "AVIF vs WebP vs JPEG: the 2025 comparison",
  "How to optimize images for Google PageSpeed score",
  "Free image compression tools compared 2025",
  "Lossless vs lossy image compression explained",
  "How to compress images for Instagram without quality loss",
  "Image file size best practices for web developers",
  "How to make your website load faster with WebP images",
  "Reducing image size for mobile websites",
  "How to bulk compress images online for free",
  "How image size affects website bounce rate",
  "How to compress HEIC iPhone photos online free",
  "Convert HEIC to WebP: complete guide",
  "How to compress images without installing any software",
  "Image SEO: how to optimize images for search engines",
  "WebP images and their impact on Core Web Vitals",
];

const BLOG_DIR   = path.join(__dirname, '..', 'blog');
const POSTS_JSON = path.join(BLOG_DIR, 'posts.json');

let posts = [];
try { posts = JSON.parse(fs.readFileSync(POSTS_JSON, 'utf8')); } catch(e) {}

const used    = new Set(posts.map(p => p.topic));
const avail   = TOPICS.filter(t => !used.has(t));
// Use custom topic from env (dashboard) or fall back to auto
const topic   = process.env.CUSTOM_TOPIC || (avail.length > 0 ? avail[0] : TOPICS[Math.floor(Math.random() * TOPICS.length)]);
const customKeyword = process.env.CUSTOM_KEYWORD || KEYWORD;
const customDesc = process.env.CUSTOM_DESCRIPTION || '';
const today   = new Date().toISOString().split('T')[0];

// Skip only if auto-run AND already posted today
// If a custom topic is provided (from dashboard), always proceed
if (!process.env.CUSTOM_TOPIC && posts.some(p => p.date === today)) {
  console.log('Already posted today (auto-run). Done.');
  process.exit(0);
}

async function callClaude(prompt, maxTokens) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error('API error ' + res.status + ': ' + await res.text());
  const data = await res.json();
  return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
}

async function run() {
  console.log('Topic:', topic);

  // STEP 1: Get metadata as simple JSON (no HTML, so JSON is safe)
  const metaPrompt = `For a blog post titled around this topic: "${topic}"

Return ONLY a JSON object, no markdown, no explanation:
{"title":"full seo title here","meta":"155 char meta description mentioning ${KEYWORD}","excerpt":"2 sentence summary","tags":["tag1","tag2","tag3"]}`;

  const metaRaw = await callClaude(metaPrompt, 500);
  console.log('Meta raw:', metaRaw.slice(0, 200));
  
  const metaClean = metaRaw.replace(/```json|```/g, '').trim();
  const meta = JSON.parse(metaClean);
  console.log('Title:', meta.title);

  // STEP 2: Get HTML content separately (no JSON wrapping, so no breaking)
  const contentPrompt = `Write a complete SEO blog post for "${SITE_NAME}" (${SITE_URL}) about: "${meta.title}"

Requirements:
- 900 words
- Include keyword "${KEYWORD}" naturally 3-4 times  
- Mention ${SITE_NAME} with link <a href="${SITE_URL}">${SITE_NAME}</a> twice
- Use h2, h3, p, ul, li, strong, em, a tags only
- No div, no class, no style attributes
- End with a paragraph encouraging readers to try the tool
- Return ONLY the HTML content, no title tag, no head, no body wrapper`;

  const htmlContent = await callClaude(contentPrompt, 4000);
  console.log('Content length:', htmlContent.length);

  if (!meta.title || !htmlContent) throw new Error('Missing content');

  const slug = meta.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 65);
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${meta.title} | ${SITE_NAME}</title>
<meta name="description" content="${meta.meta}">
<link rel="canonical" href="${SITE_URL}/blog/${slug}.html">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:title" content="${meta.title}">
<meta property="og:type" content="article">
<script>(function(){var s=localStorage.getItem('mis-theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.setAttribute('data-theme',s?s:(d?'dark':'light'));})();</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-P5ERVP0NVS"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-P5ERVP0NVS');</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--brand:#2563eb;--brand-h:#1d4ed8;--brand-light:#eff6ff;--brand-mid:#dbeafe;--green:#16a34a;--green-light:#f0fdf4;--green-mid:#dcfce7;--bg:#f8fafc;--white:#fff;--surface:#f1f5f9;--text:#0f172a;--sub:#64748b;--muted:#94a3b8;--border:#e2e8f0;--r:14px;--rs:9px}
[data-theme="dark"]{--brand:#4f8ef7;--brand-h:#6ba3f8;--brand-light:rgba(79,142,247,.1);--brand-mid:rgba(79,142,247,.18);--green:#34d468;--green-light:rgba(52,212,104,.08);--green-mid:rgba(52,212,104,.18);--bg:#0a0a0a;--white:#161616;--surface:#111111;--text:#ededed;--sub:#a0a0a0;--muted:#555555;--border:#272727}
body{font-family:'Inter',-apple-system,sans-serif;background:var(--bg);color:var(--text);font-size:16px;line-height:1.7;transition:background .3s,color .3s}
header{background:var(--white);border-bottom:1px solid var(--border);padding:12px 32px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;backdrop-filter:blur(12px);transition:background .3s,border-color .3s}
.logo{display:flex;align-items:center;text-decoration:none;line-height:1}
.logo-svg{height:44px;width:auto;flex-shrink:0}
.logo-light{display:block}
.logo-dark{display:none}
[data-theme="dark"] .logo-light{display:none}
[data-theme="dark"] .logo-dark{display:block}
.header-right{display:flex;align-items:center;gap:12px}
.nav-link{font-size:13px;color:var(--sub);text-decoration:none;font-weight:500;padding:5px 10px;border-radius:6px;transition:color .15s}
.nav-link:hover{color:var(--text)}
.toggle-wrap{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--sub)}
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
.cta-box{background:var(--brand-light);border:1px solid var(--brand-mid);border-radius:var(--r);padding:20px 22px;margin:28px 0;transition:background .3s,border-color .3s}
.cta-box h3{font-size:16px;font-weight:600;margin-bottom:8px;color:var(--brand)}
.cta-box p{font-size:14px;color:var(--sub);margin-bottom:14px}
.cta-btn{display:inline-flex;align-items:center;gap:7px;background:var(--brand);color:white;text-decoration:none;border-radius:8px;padding:10px 20px;font-size:14px;font-weight:500;transition:background .15s}
.cta-btn:hover{background:var(--brand-h)}
footer{border-top:1px solid var(--border);background:var(--white);padding:18px 24px;text-align:center;font-size:12px;color:var(--sub);transition:background .3s,border-color .3s}
footer a{color:var(--sub);text-decoration:none;margin:0 8px}
footer a:hover{color:var(--text)}
</style>
</head>
<body>
<header>
  <a href="/" class="logo">
    <svg class="logo-svg logo-light" viewBox="0 0 937.22 404.89" xmlns="http://www.w3.org/2000/svg"><defs><style>.bl1{fill:#6cd074;}.bl2{fill:#608df0;}.bl3{fill:#4caed1;}</style></defs><rect class="bl1" x="8.16" y="3.77" width="59.02" height="59.02"/><rect class="bl1" x="117.89" y="115.99" width="171.25" height="171.25"/><polygon class="bl2" points="336.52 3.77 117.89 3.77 117.89 62.79 336.52 62.79 336.52 281.42 395.55 281.42 395.55 62.79 395.55 3.77 336.52 3.77"/><polygon class="bl2" points="67.18 342.11 67.18 123.47 8.16 123.47 8.16 342.11 8.16 401.13 67.18 401.13 285.81 401.13 285.81 342.11 67.18 342.11"/><path d="M526,93.33H506.67L490,53.62l-3.64,40.6H457.13l9-89.1h28l22.25,50.66L538.58,5.12h28l9,89.1H546.27l-3.64-40.6Z"/><path d="M609.8,94.22H579.43l37.93-89.1h26l38.91,89.1H651.08l-6.3-14.89h-29.1Zm20.71-60.84L620.29,58.45h19.6Z"/><path d="M719,52.09V94.22H689.56V5.12H719V43.3L742.32,5.12H771.7V8.81L746.38,47.25l8.81,18.2c2.1,4.2,3.78,6.75,5.32,7.77a9.6,9.6,0,0,0,5.88,1.65,13.8,13.8,0,0,0,7-2.29l8.54,18.2c-4.9,1.91-8.54,3.19-11.06,4a42.65,42.65,0,0,1-9.79.89c-15,0-25.47-6.36-31.35-19.09Z"/><path d="M859.16,94.22H787.93V5.12h71.23V28H817.32V39.61h36.52V60H817.32V71.31h41.84Z"/><path d="M490.44,157.87V247H461.05v-89.1Z"/><path d="M572.44,246.08H553.13l-16.65-39.71L532.84,247H503.59l9-89.1h28l22.25,50.66L585,157.87h28l9,89.1H592.73l-3.64-40.6Z"/><path d="M656.26,247H625.89l37.92-89.1h26l38.9,89.1h-31.2l-6.3-14.89H662.13ZM677,186.13l-10.22,25.08h19.59Z"/><path d="M804.31,184.85c-4.76-3.69-10.92-5.47-18.62-5.47-7.41,0-13.57,2.17-18.19,6.62a22.78,22.78,0,0,0,0,32.84c4.62,4.46,10.78,6.62,18.19,6.62a43,43,0,0,0,11.76-1.4v-9.8H777.16V195h48.28v39c-11.9,9.55-25.19,14.38-39.75,14.38-16.09,0-29.24-4.45-39.32-13.49s-15.25-19.73-15.25-32.46,5-23.55,15.25-32.59,23.23-13.36,39.32-13.36a58.74,58.74,0,0,1,35,11.07Z"/><path d="M910,247H838.73v-89.1H910v22.91H868.11v11.59h36.53v20.36H868.11v11.33H910Z"/><path class="bl3" d="M478.68,368.29c2,8.27,7.7,12.47,17.36,12.47,7.69,0,11.47-2.16,11.47-6.36,0-3.06-2.8-5.35-8.26-7l-11.05-3.81c-8.54-2.55-14.83-5.35-19-8.53-6.44-4.71-9.66-10.57-9.8-17.57,0-8.53,3.5-15.27,10.64-20.49s15.95-7.77,26.73-7.77c18,0,30.08,7.77,35.82,23.17l-23.51,6.11c-2.24-5.73-5.18-8.91-11.75-8.91-5.18,0-9.24,2-9.24,5.6,0,2.8,2.66,5.09,8,6.75L507,345.37c21.13,6.62,28.69,14.9,29.11,28.13,0,9-3.78,15.79-11.48,20.5s-17.21,7.13-28.54,7.13c-23,0-38.07-10.06-41-27.88Z"/><path class="bl3" d="M613.16,398.84H593.85L577.2,359.12l-3.64,40.61H544.31l9-89.11h28l22.25,50.66,22.25-50.66h28l9,89.11H633.45l-3.64-40.61Z"/><path class="bl3" d="M697,399.73H666.61l37.92-89.11h26l38.9,89.11h-31.2l-6.3-14.9h-29.1Zm20.71-60.85L707.47,364h19.59Z"/><path class="bl3" d="M806.26,310.62v66.19H850.2v22.92H776.88V310.62Z"/><path class="bl3" d="M890.64,310.62v66.19h43.94v22.92H861.26V310.62Z"/></svg>
    <svg class="logo-svg logo-dark" viewBox="0 0 937.22 404.89" xmlns="http://www.w3.org/2000/svg"><defs><style>.wh1{fill:#6cd074;}.wh2{fill:#608df0;}.wh3{fill:#fff;}.wh4{fill:#4caed1;}</style></defs><rect class="wh1" x="8.16" y="3.77" width="59.02" height="59.02"/><rect class="wh1" x="117.89" y="115.99" width="171.25" height="171.25"/><polygon class="wh2" points="336.52 3.77 117.89 3.77 117.89 62.79 336.52 62.79 336.52 281.42 395.55 281.42 395.55 62.79 395.55 3.77 336.52 3.77"/><polygon class="wh2" points="67.18 342.11 67.18 123.47 8.16 123.47 8.16 342.11 8.16 401.13 67.18 401.13 285.81 401.13 285.81 342.11 67.18 342.11"/><path class="wh3" d="M526,93.33H506.67L490,53.62l-3.64,40.6H457.13l9-89.1h28l22.25,50.66L538.58,5.12h28l9,89.1H546.27l-3.64-40.6Z"/><path class="wh3" d="M609.8,94.22H579.43l37.93-89.1h26l38.91,89.1H651.08l-6.3-14.89h-29.1Zm20.71-60.84L620.29,58.45h19.6Z"/><path class="wh3" d="M719,52.09V94.22H689.56V5.12H719V43.3L742.32,5.12H771.7V8.81L746.38,47.25l8.81,18.2c2.1,4.2,3.78,6.75,5.32,7.77a9.6,9.6,0,0,0,5.88,1.65,13.8,13.8,0,0,0,7-2.29l8.54,18.2c-4.9,1.91-8.54,3.19-11.06,4a42.65,42.65,0,0,1-9.79.89c-15,0-25.47-6.36-31.35-19.09Z"/><path class="wh3" d="M859.16,94.22H787.93V5.12h71.23V28H817.32V39.61h36.52V60H817.32V71.31h41.84Z"/><path class="wh3" d="M490.44,157.87V247H461.05v-89.1Z"/><path class="wh3" d="M572.44,246.08H553.13l-16.65-39.71L532.84,247H503.59l9-89.1h28l22.25,50.66L585,157.87h28l9,89.1H592.73l-3.64-40.6Z"/><path class="wh3" d="M656.26,247H625.89l37.92-89.1h26l38.9,89.1h-31.2l-6.3-14.89H662.13ZM677,186.13l-10.22,25.08h19.59Z"/><path class="wh3" d="M804.31,184.85c-4.76-3.69-10.92-5.47-18.62-5.47-7.41,0-13.57,2.17-18.19,6.62a22.78,22.78,0,0,0,0,32.84c4.62,4.46,10.78,6.62,18.19,6.62a43,43,0,0,0,11.76-1.4v-9.8H777.16V195h48.28v39c-11.9,9.55-25.19,14.38-39.75,14.38-16.09,0-29.24-4.45-39.32-13.49s-15.25-19.73-15.25-32.46,5-23.55,15.25-32.59,23.23-13.36,39.32-13.36a58.74,58.74,0,0,1,35,11.07Z"/><path class="wh3" d="M910,247H838.73v-89.1H910v22.91H868.11v11.59h36.53v20.36H868.11v11.33H910Z"/><path class="wh4" d="M478.68,368.29c2,8.27,7.7,12.47,17.36,12.47,7.69,0,11.47-2.16,11.47-6.36,0-3.06-2.8-5.35-8.26-7l-11.05-3.81c-8.54-2.55-14.83-5.35-19-8.53-6.44-4.71-9.66-10.57-9.8-17.57,0-8.53,3.5-15.27,10.64-20.49s15.95-7.77,26.73-7.77c18,0,30.08,7.77,35.82,23.17l-23.51,6.11c-2.24-5.73-5.18-8.91-11.75-8.91-5.18,0-9.24,2-9.24,5.6,0,2.8,2.66,5.09,8,6.75L507,345.37c21.13,6.62,28.69,14.9,29.11,28.13,0,9-3.78,15.79-11.48,20.5s-17.21,7.13-28.54,7.13c-23,0-38.07-10.06-41-27.88Z"/><path class="wh4" d="M613.16,398.84H593.85L577.2,359.12l-3.64,40.61H544.31l9-89.11h28l22.25,50.66,22.25-50.66h28l9,89.11H633.45l-3.64-40.61Z"/><path class="wh4" d="M697,399.73H666.61l37.92-89.11h26l38.9,89.11h-31.2l-6.3-14.9h-29.1Zm20.71-60.85L707.47,364h19.59Z"/><path class="wh4" d="M806.26,310.62v66.19H850.2v22.92H776.88V310.62Z"/><path class="wh4" d="M890.64,310.62v66.19h43.94v22.92H861.26V310.62Z"/></svg>
  </a>
  <div class="header-right">
    <a href="/" class="nav-link">Tool</a>
    <a href="/blog/" class="nav-link">Blog</a>
    <a href="/about.html" class="nav-link">About</a>
    <div class="toggle-wrap">
      <span class="toggle-icon" id="themeIcon">🌙</span>
      <button class="dark-toggle" id="darkToggle" aria-label="Toggle dark mode" onclick="toggleDark()"></button>
    </div>
  </div>
</header>
<main>
  <div class="breadcrumb"><a href="/">Home</a> / <a href="/blog/">Blog</a> / ${meta.title}</div>
  <h1>${meta.title}</h1>
  <div class="post-meta">
    Published: ${today} &middot; ${SITE_NAME}
    <div class="post-tags">${(meta.tags || []).map(t => `<span class="post-tag">${t}</span>`).join('')}</div>
  </div>
  <div class="ad-slot"><!-- AdSense --></div>
  <article>${htmlContent}</article>
  <div class="ad-slot"><!-- AdSense --></div>
  <div class="cta-box">
    <h3>Try ${SITE_NAME} Free</h3>
    <p>Compress your images now — no uploads, no account, no limits. Your files stay on your device.</p>
    <a href="/" class="cta-btn">Compress images free</a>
  </div>
</main>
<footer>
  <div style="margin-bottom:8px"><a href="/">Home</a><a href="/blog/">Blog</a><a href="/about.html">About</a><a href="/contact.html">Contact</a><a href="/privacy.html">Privacy</a></div>
  &copy; 2026 ${SITE_NAME}
</footer>
<script>
function toggleDark(){const h=document.documentElement;const d=h.getAttribute('data-theme')==='dark';h.setAttribute('data-theme',d?'light':'dark');document.getElementById('themeIcon').textContent=d?'🌙':'☀️';localStorage.setItem('mis-theme',d?'light':'dark');}
(function(){const d=document.documentElement.getAttribute('data-theme')==='dark';const i=document.getElementById('themeIcon');if(i)i.textContent=d?'☀️':'🌙';})();
</script>
</body>
</html>`;

  const filePath = path.join(BLOG_DIR, slug + '.html');
  fs.writeFileSync(filePath, html, 'utf8');
  console.log('Written:', slug + '.html');

  posts.push({
    slug,
    title: meta.title,
    date: today,
    topic,
    excerpt: meta.excerpt,
    metaDescription: meta.meta,
    tags: meta.tags || [],
    wordCount: 900,
  });
  fs.writeFileSync(POSTS_JSON, JSON.stringify(posts, null, 2), 'utf8');
  console.log('posts.json updated —', posts.length, 'total posts');
  console.log('Done!');
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
