// generate-post.js
// Run by GitHub Actions every day at midnight UTC
// Calls Claude API → saves post as HTML → updates posts.json

const fs = require('fs');
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
  "WebP support in all major browsers: what you need to know",
  "How image size affects website bounce rate",
  "Best practices for compressing images for email newsletters",
  "How to convert GIF to WebP for smaller animated images",
  "Image optimization for e-commerce: complete guide",
  "How to compress screenshots without losing sharpness",
  "Smallest image format for the web in 2025",
  "How to optimize images before uploading to Squarespace",
  "JPG vs PNG: which format should you use",
  "How image compression improves your SEO rankings",
  "What causes blurry images after compression",
  "How to compress images in bulk using only your browser",
  "Image CDN vs browser compression: which is better",
  "How to reduce PDF file size by compressing images inside",
  "Image optimization for social media platforms",
  "WebP converter tools compared: which is fastest",
];

const BLOG_DIR    = path.join(__dirname, 'blog');
const POSTS_JSON  = path.join(BLOG_DIR, 'posts.json');

// Load existing posts
let posts = [];
try { posts = JSON.parse(fs.readFileSync(POSTS_JSON, 'utf8')); } catch {}

// Find an unused topic
const usedTopics = new Set(posts.map(p => p.topic));
const available  = TOPICS.filter(t => !usedTopics.has(t));
const topic      = available.length > 0
  ? available[0]
  : TOPICS[Math.floor(Math.random() * TOPICS.length)];

const today = new Date().toISOString().split('T')[0];

// Skip if a post already exists for today
if (posts.some(p => p.date === today)) {
  console.log('Post already exists for today. Skipping.');
  process.exit(0);
}

async function generatePost() {
  const prompt = `You are an SEO content writer for "${SITE_NAME}", a free online image compressor at ${SITE_URL}.
The tool compresses images (JPG, PNG, GIF → WebP) entirely in the browser — no file uploads.

Write a complete, high-quality SEO blog post on this topic: "${topic}"

Requirements:
- Target exactly ~950 words
- Primary keyword to naturally use 3-4 times: "${KEYWORD}"
- Mention "${SITE_NAME}" tool naturally 2-3 times with a link like: <a href="${SITE_URL}">${SITE_NAME}</a>
- Start with a strong intro paragraph that hooks the reader
- Use H2 subheadings every 200-250 words
- Include practical, specific tips with real numbers
- End with a clear CTA paragraph to use the tool
- Tone: helpful, friendly, expert but not jargon-heavy

Return ONLY a JSON object, no markdown fences, no preamble, no explanation:
{
  "title": "The full SEO-optimized post title",
  "metaDescription": "150-160 character meta description with keyword",
  "excerpt": "2 sentence summary for the blog listing page",
  "tags": ["tag1", "tag2", "tag3"],
  "wordCount": 950,
  "htmlContent": "full post HTML using only: p, h2, h3, ul, ol, li, strong, em, a tags"
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const text = data.content?.find(b => b.type === 'text')?.text || '';
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

function slugify(title) {
  return title.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 65);
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
<meta property="og:title" content="${post.title}">
<meta property="og:description" content="${post.metaDescription}">
<meta property="og:type" content="article">
<meta property="article:published_time" content="${today}">
<!-- Google Analytics 4 -->
<!-- <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-XXXXXXXXXX');</script> -->
<!-- Google AdSense -->
<!-- <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script> -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',-apple-system,sans-serif;background:#f9fafb;color:#111827;font-size:16px;line-height:1.7}
header{background:#fff;border-bottom:1px solid #e5e7eb;padding:14px 24px;display:flex;align-items:center;justify-content:space-between}
.logo{font-size:17px;font-weight:600;color:#111827;display:flex;align-items:center;gap:8px;text-decoration:none}
.logo-icon{width:28px;height:28px;background:#2563eb;border-radius:7px;display:flex;align-items:center;justify-content:center}
.logo-icon svg{width:15px;height:15px;stroke:white;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
main{max-width:680px;margin:0 auto;padding:40px 20px 80px}
.breadcrumb{font-size:12px;color:#9ca3af;margin-bottom:20px}
.breadcrumb a{color:#9ca3af;text-decoration:none}
.breadcrumb a:hover{color:#6b7280}
h1{font-size:clamp(22px,3.5vw,32px);font-weight:600;letter-spacing:-.02em;line-height:1.25;margin-bottom:12px}
.post-meta{font-size:13px;color:#6b7280;margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid #e5e7eb}
.post-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.post-tag{font-size:11px;padding:2px 8px;border-radius:100px;background:#eff6ff;color:#2563eb;font-weight:500}
article h2{font-size:20px;font-weight:600;margin:28px 0 10px;color:#111827}
article h3{font-size:17px;font-weight:500;margin:20px 0 8px;color:#111827}
article p{margin-bottom:14px;color:#374151}
article ul,article ol{margin:0 0 14px 22px}
article li{margin-bottom:6px;color:#374151}
article strong{font-weight:600;color:#111827}
article a{color:#2563eb;text-decoration:none}
article a:hover{text-decoration:underline}
.ad-slot{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center;color:#d1d5db;font-size:12px;margin:28px 0;min-height:100px;display:flex;align-items:center;justify-content:center}
.cta-box{background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px 22px;margin:28px 0}
.cta-box h3{font-size:16px;font-weight:600;margin-bottom:8px;color:#1e40af}
.cta-box p{font-size:14px;color:#374151;margin-bottom:14px}
.cta-btn{display:inline-flex;align-items:center;gap:7px;background:#2563eb;color:white;text-decoration:none;border-radius:8px;padding:10px 20px;font-size:14px;font-weight:500;transition:background .15s}
.cta-btn:hover{background:#1d4ed8}
footer{border-top:1px solid #e5e7eb;background:#fff;padding:18px 24px;text-align:center;font-size:12px;color:#9ca3af}
footer a{color:#9ca3af;text-decoration:none;margin:0 8px}
</style>
</head>
<body>
<header>
  <a href="/" class="logo">
    <div class="logo-icon"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></div>
    ${SITE_NAME}
  </a>
  <a href="/" style="font-size:13px;color:#2563eb;text-decoration:none;font-weight:500">← Free Image Compressor</a>
</header>
<main>
  <div class="breadcrumb"><a href="/">Home</a> / <a href="/blog/">Blog</a> / ${post.title}</div>
  <h1>${post.title}</h1>
  <div class="post-meta">
    Published: ${today} · ${post.wordCount} words
    <div class="post-tags">${(post.tags||[]).map(t=>`<span class="post-tag">${t}</span>`).join('')}</div>
  </div>

  <div class="ad-slot"><!-- AdSense ad unit --></div>

  <article>
    ${post.htmlContent}
  </article>

  <div class="ad-slot"><!-- AdSense ad unit --></div>

  <div class="cta-box">
    <h3>Try ${SITE_NAME} — Free Image Compressor</h3>
    <p>Compress your images right now — no account, no uploads, no limits. Your files never leave your device.</p>
    <a href="/" class="cta-btn">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      Compress images free
    </a>
  </div>
</main>
<footer>
  <a href="/">Home</a><a href="/blog/">Blog</a><a href="/privacy.html">Privacy</a>
  <div style="margin-top:6px">&copy; 2026 ${SITE_NAME}</div>
</footer>
</body>
</html>`;
}

(async () => {
  try {
    console.log(`Generating post for topic: "${topic}"`);
    const post = await generatePost();

    const slug = slugify(post.title);
    const htmlPath = path.join(BLOG_DIR, `${slug}.html`);

    // Write the full HTML post file
    fs.writeFileSync(htmlPath, buildHTML(post, slug), 'utf8');
    console.log(`Written: blog/${slug}.html`);

    // Update posts.json
    posts.push({
      slug,
      title:           post.title,
      date:            today,
      topic,
      excerpt:         post.excerpt,
      metaDescription: post.metaDescription,
      tags:            post.tags || [],
      wordCount:       post.wordCount || 950,
    });
    fs.writeFileSync(POSTS_JSON, JSON.stringify(posts, null, 2), 'utf8');
    console.log(`Updated: blog/posts.json (${posts.length} total posts)`);
    console.log('Done!');
  } catch (err) {
    console.error('Failed to generate post:', err.message);
    process.exit(1);
  }
})();
