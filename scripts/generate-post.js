// generate-post.js
// Run by GitHub Actions every day at midnight UTC

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
  "Why your website loads slow — images explained",
  "AVIF vs WebP vs JPEG: the ultimate 2025 comparison",
  "How to optimize images for Google PageSpeed score",
  "Free image compression tools compared",
  "What is lossless vs lossy image compression",
  "How to compress images for Instagram without losing quality",
  "Image file size best practices for web developers",
  "How to make your website load faster with WebP",
  "Reducing image size for mobile websites",
  "How to bulk compress images online for free",
  "WebP support in all major browsers",
  "How image size affects website bounce rate",
  "Best practices for compressing images for email newsletters",
  "How to convert GIF to WebP for smaller animated images",
  "Image optimization for e-commerce: complete guide",
  "How to compress screenshots without losing sharpness",
  "Smallest image format for the web in 2025",
  "How to optimize images before uploading to Squarespace",
  "JPG vs PNG: which format should you use",
  "How image compression improves your SEO rankings",
  "How to compress images in bulk using only your browser",
  "How to reduce PDF file size by compressing images inside",
  "Image optimization for social media platforms",
  "How to compress HEIC iPhone photos online free",
  "Convert HEIC to WebP: complete guide",
  "How to compress images without installing software",
];

const BLOG_DIR   = path.join(__dirname, '..', 'blog');
const POSTS_JSON = path.join(BLOG_DIR, 'posts.json');

let posts = [];
try { posts = JSON.parse(fs.readFileSync(POSTS_JSON, 'utf8')); } catch {}

const usedTopics = new Set(posts.map(p => p.topic));
const available  = TOPICS.filter(t => !usedTopics.has(t));
const topic      = available.length > 0 ? available[0] : TOPICS[Math.floor(Math.random() * TOPICS.length)];
const today      = new Date().toISOString().split('T')[0];

if (posts.some(p => p.date === today)) {
  console.log('Post already exists for today. Skipping.');
  process.exit(0);
}

async function generatePost() {
  // Use XML-style tags so content can't break the response structure
  const prompt = `You are an SEO content writer for "${SITE_NAME}" (${SITE_URL}), a free browser-based image compressor.

Write a complete SEO blog post on: "${topic}"

Requirements:
- ~900 words
- Naturally include keyword: "${KEYWORD}" 3-4 times
- Mention ${SITE_NAME} with a link: <a href="${SITE_URL}">${SITE_NAME}</a> 2-3 times
- Strong intro, H2 subheadings every 200 words, practical tips, CTA at end
- Friendly expert tone

Return your response using EXACTLY these XML tags (nothing outside them):

<TITLE>The SEO blog post title here</TITLE>
<META>150-160 character meta description with keyword</META>
<EXCERPT>2 sentence summary for blog listing</EXCERPT>
<TAGS>tag1,tag2,tag3</TAGS>
<CONTENT>
full post HTML using only p, h2, h3, ul, ol, li, strong, em, a tags
</CONTENT>`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const text = data.content?.find(b => b.type === 'text')?.text || '';

  // Log raw response for debugging
  console.log('Raw response (first 500 chars):', text.slice(0, 500));

  // Parse using XML tags
  const extract = (tag) => {
    const re = new RegExp('<' + tag + '>([\s\S]*?)<\/' + tag + '>', 'i');
    const match = text.match(re);
    return match ? match[1].trim() : '';
  };

  const title   = extract('TITLE');
  const meta    = extract('META');
  const excerpt = extract('EXCERPT');
  const tags    = extract('TAGS').split(',').map(t => t.trim()).filter(Boolean);
  const content = extract('CONTENT');

  console.log('title:', title ? title.slice(0,60) : 'MISSING');
  console.log('content length:', content.length);
  if (!title || !content) throw new Error(`Missing fields. Response preview: ${text.slice(0, 400)}`);

  return { title, metaDescription: meta, excerpt, tags, htmlContent: content };
}

function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 65);
}

// Read logo SVGs from repo root — they may or may not be there
function getLogo() {
  const black = `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" rx="6" fill="#2563eb"/><rect x="6" y="8" width="14" height="14" rx="1.5" fill="none" stroke="white" stroke-width="2"/><rect x="12" y="14" width="14" height="14" rx="1.5" fill="#2563eb" stroke="white" stroke-width="2"/></svg>`;
  return black;
}

function buildHTML(post, slug) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${post.title} | ${SITE_NAME}</title>
<meta name="description" content="${post.metaDescription}">
<link rel="canonical" href="${SITE_URL}/blog/${slug}.html">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:title" content="${post.title}">
<meta property="og:description" content="${post.metaDescription}">
<meta property="og:type" content="article">
<meta property="article:published_time" content="${today}">
<script>(function(){var s=localStorage.getItem('mis-theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.setAttribute('data-theme',s?s:(d?'dark':'light'));})();</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-P5ERVP0NVS"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-P5ERVP0NVS');</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--brand:#2563eb;--brand-h:#1d4ed8;--brand-light:#eff6ff;--brand-mid:#dbeafe;--green:#16a34a;--green-light:#f0fdf4;--green-mid:#dcfce7;--bg:#f8fafc;--white:#fff;--surface:#f1f5f9;--text:#0f172a;--sub:#64748b;--muted:#94a3b8;--border:#e2e8f0;--border-strong:#cbd5e1;--shadow:0 1px 3px rgba(0,0,0,.07);--r:14px;--rs:9px}
[data-theme="dark"]{--brand:#4f8ef7;--brand-h:#6ba3f8;--brand-light:rgba(79,142,247,.1);--brand-mid:rgba(79,142,247,.18);--green:#34d468;--green-light:rgba(52,212,104,.08);--green-mid:rgba(52,212,104,.18);--bg:#0a0a0a;--white:#161616;--surface:#111111;--text:#ededed;--sub:#a0a0a0;--muted:#555555;--border:#272727;--border-strong:#333333}
body{font-family:'Inter',-apple-system,sans-serif;background:var(--bg);color:var(--text);font-size:16px;line-height:1.7;transition:background .3s,color .3s}
header{background:var(--white);border-bottom:1px solid var(--border);padding:12px 32px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;backdrop-filter:blur(12px);transition:background .3s,border-color .3s}
.logo{display:flex;align-items:center;gap:10px;text-decoration:none;font-size:16px;font-weight:600;color:var(--text)}
.logo svg{width:32px;height:32px;flex-shrink:0}
.header-right{display:flex;align-items:center;gap:12px}
.nav-link{font-size:13px;color:var(--sub);text-decoration:none;font-weight:500;padding:5px 10px;border-radius:6px;transition:color .15s}
.nav-link:hover{color:var(--text)}
.toggle-wrap{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--sub)}
.toggle-icon{font-size:14px;cursor:default}
.dark-toggle{width:38px;height:22px;border-radius:11px;background:var(--border-strong);border:none;cursor:pointer;position:relative;transition:background .3s;flex-shrink:0}
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
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" rx="6" fill="#2563eb"/><rect x="5" y="5" width="14" height="14" rx="2" fill="none" stroke="white" stroke-width="2"/><rect x="13" y="13" width="14" height="14" rx="2" fill="#2563eb" stroke="white" stroke-width="2"/></svg>
    ${SITE_NAME}
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
  <div class="breadcrumb"><a href="/">Home</a> / <a href="/blog/">Blog</a> / ${post.title}</div>
  <h1>${post.title}</h1>
  <div class="post-meta">
    Published: ${today} &middot; ${SITE_NAME}
    <div class="post-tags">${post.tags.map(t => `<span class="post-tag">${t}</span>`).join('')}</div>
  </div>
  <div class="ad-slot"><!-- AdSense --></div>
  <article>${post.htmlContent}</article>
  <div class="ad-slot"><!-- AdSense --></div>
  <div class="cta-box">
    <h3>Try ${SITE_NAME} Free</h3>
    <p>Compress your images now — no uploads, no account, no limits. Your files never leave your device.</p>
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
}

(async () => {
  try {
    console.log(`Generating post for topic: "${topic}"`);
    const post = await generatePost();
    const slug = slugify(post.title);
    const htmlPath = path.join(BLOG_DIR, `${slug}.html`);
    fs.writeFileSync(htmlPath, buildHTML(post, slug), 'utf8');
    console.log(`Written: blog/${slug}.html`);
    posts.push({ slug, title: post.title, date: today, topic, excerpt: post.excerpt, metaDescription: post.metaDescription, tags: post.tags, wordCount: 900 });
    fs.writeFileSync(POSTS_JSON, JSON.stringify(posts, null, 2), 'utf8');
    console.log(`Updated posts.json (${posts.length} total posts)`);
    console.log('Done!');
  } catch (err) {
    console.error('Failed:', err.message);
    process.exit(1);
  }
})();
