# MakeImageSmall — Deployment Guide
Complete step-by-step guide to go live in ~45 minutes.

---

## PART 1 — Get your domain (~10 min)

1. Go to **namecheap.com**
2. Search for your domain (e.g. makeimagesmall.com or shrinkimg.com)
3. Buy it — .io is ~$30/yr, .com is ~$10/yr
4. Don't set up hosting — Cloudflare will handle that

---

## PART 2 — Set up GitHub (~10 min)

1. Go to **github.com** → Sign up (free account)
2. Click "New repository"
3. Name it: `makeimagesmall` (or your site name)
4. Set to **Public**
5. Click "Create repository"
6. Upload ALL files from this folder:
   - Drag all files into the GitHub upload area
   - Keep the folder structure exactly as-is:
     - index.html
     - privacy.html
     - robots.txt
     - blog/index.html
     - blog/posts.json
     - scripts/generate-post.js
     - .github/workflows/daily-blog.yml
7. Click "Commit changes"

---

## PART 3 — Add your Anthropic API key to GitHub (~5 min)

The daily blog bot needs this key to write posts.

1. Go to **console.anthropic.com** → API Keys
2. Create a new key, copy it
3. Go to your GitHub repo → Settings → Secrets and variables → Actions
4. Click "New repository secret"
5. Name: `ANTHROPIC_API_KEY`
6. Value: paste your API key
7. Click "Add secret"

---

## PART 4 — Deploy on Cloudflare Pages (~10 min)

1. Go to **pages.cloudflare.com** → Sign up (free)
2. Click "Create a project" → "Connect to Git"
3. Connect your GitHub account → Select your `makeimagesmall` repository
4. Build settings:
   - Framework preset: **None**
   - Build command: *(leave blank)*
   - Build output directory: *(leave blank or type `/`)*
5. Click "Save and Deploy"
6. Wait ~1 minute — your site is now live at a `*.pages.dev` URL

---

## PART 5 — Connect your domain (~5 min)

1. In Cloudflare Pages → your project → Custom domains
2. Click "Set up a custom domain"
3. Enter your domain (e.g. makeimagesmall.com)
4. Cloudflare will show you nameserver addresses (e.g. erin.ns.cloudflare.com)
5. Go to Namecheap → Domain List → your domain → Nameservers
6. Change to "Custom DNS" and enter the Cloudflare nameservers
7. Wait 5–30 minutes for DNS to update
8. Your site is now live at your real domain with free SSL

---

## PART 6 — Update your site name in the code

Before or after going live, find and replace "makeimagesmall.com" with your real domain in:
- index.html (1 place — canonical URL)
- blog/index.html (1 place)
- scripts/generate-post.js (SITE_URL and SITE_NAME at top of file)

Also replace "MakeImageSmall" with your brand name in the same files.

---

## PART 7 — Google Search Console (track rankings) (~5 min)

1. Go to **search.google.com/search-console**
2. Click "Add property" → enter your domain
3. Choose "Domain" verification → copy the TXT record
4. Go to Cloudflare → DNS → Add record:
   - Type: TXT
   - Name: @
   - Content: paste Google's TXT value
5. Back in Search Console → Verify
6. Go to Sitemaps → submit: `https://yourdomain.com/sitemap.xml`

This tells Google your site exists. You'll start seeing rankings data in 2–4 weeks.

---

## PART 8 — Google Analytics 4 (track visitors) (~5 min)

1. Go to **analytics.google.com** → Create account
2. Create a property → enter your site URL
3. Get your Measurement ID (looks like: G-XXXXXXXXXX)
4. In GitHub, edit index.html, blog/index.html, privacy.html
5. Find the commented-out GA4 code: `<!-- Google Analytics 4 -->`
6. Uncomment it and replace `G-XXXXXXXXXX` with your real ID
7. Commit the changes — Cloudflare auto-deploys

---

## PART 9 — Google AdSense (earn money from ads) (~2 min setup, 1-2 weeks approval)

1. Go to **adsense.google.com** → Apply
2. Enter your website URL
3. Google gives you a small code snippet
4. In your files, find `<!-- Google AdSense -->` comments in all HTML files
5. Uncomment and paste your real AdSense code
6. Also replace the `<!-- AdSense ad unit -->` comments with your actual ad unit code
7. Google reviews your site (1–14 days)
8. Once approved, ads appear automatically

**AdSense requirements your site already meets:**
- Privacy policy page ✓
- Original content (auto-blog generates this) ✓  
- No login required ✓
- Working navigation ✓

---

## How the auto-blog works

Every day at midnight UTC, GitHub automatically:
1. Runs `scripts/generate-post.js`
2. Calls Claude API to write a new ~950 word SEO blog post
3. Saves it as a full HTML file in `/blog/`
4. Updates `blog/posts.json` with the new post metadata
5. Commits the files to GitHub
6. Cloudflare Pages detects the new commit and redeploys (takes ~60 seconds)

Your blog grows by 1 post per day, forever, automatically.
You do absolutely nothing.

**Cost of auto-blog:** ~$0.003 per post (Claude API cost).
That's about $1/month for 30 posts.

---

## File structure

```
makeimagesmall/
├── index.html              ← Main tool page
├── privacy.html            ← Privacy policy (required for AdSense)
├── robots.txt              ← Tells Google how to crawl
├── blog/
│   ├── index.html          ← Blog listing page
│   ├── posts.json          ← Auto-updated post metadata
│   └── [slug].html         ← Auto-generated blog posts (added daily)
├── scripts/
│   └── generate-post.js    ← Blog post generator script
└── .github/
    └── workflows/
        └── daily-blog.yml  ← GitHub Actions cron job
```

---

## Costs summary

| Item | Cost |
|------|------|
| Domain (.com) | ~$10/year |
| Domain (.io) | ~$30/year |
| Cloudflare Pages hosting | FREE |
| GitHub | FREE |
| Google Analytics | FREE |
| Google AdSense | FREE (earns money) |
| Claude API (blog posts) | ~$1/month |
| **Total** | **~$10–30/year** |

---

## Timeline

| Week | What happens |
|------|--------------|
| Week 1 | Site live, Google starts crawling |
| Week 2-3 | Search Console shows first impressions |
| Month 1-2 | Long-tail blog posts start ranking |
| Month 3-4 | Tool page starts appearing for compression queries |
| Month 6+ | Consistent traffic, AdSense earning |
