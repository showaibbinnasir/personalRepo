# Showaib Portfolio — Next.js + Express + MongoDB

A full-stack personal portfolio and lightweight CMS inspired by the bold editorial direction of the supplied Keshida reference, adapted for robotics, AI and software engineering.

## Included

- Next.js public portfolio with responsive editorial layout
- Express.js REST API
- MongoDB / Mongoose portfolio database
- Private admin dashboard at `/dashboard`
- Add/edit/delete/reorder/hide projects, experience, education, skills, leadership, certifications, achievements, languages and social links
- Profile and site appearance editing
- ImgBB image uploads from the dashboard
- AI portfolio assistant backed by current MongoDB content
- HTTP-only cookie authentication, password hashing, rate limiting, Helmet and CORS
- **Blog** at `/blog` with rich-text posts, drafts, scheduling, tags, featured posts, related posts and prev/next navigation
- **SEO**: per-post titles/descriptions, canonical URLs, Open Graph + Twitter cards, `BlogPosting` and breadcrumb structured data, auto-generated share images, sitemap, robots.txt and an RSS feed at `/blog/feed.xml`
- **Sharing** buttons for LinkedIn, X, Facebook, WhatsApp, Telegram, email, copy-link and the phone's native share sheet
- Redesigned CMS ("Studio") with a blog editor, live SEO/social previews, drag-and-drop uploads, show/hide and reordering everywhere, homepage section ordering, unsaved-change protection and ⌘/Ctrl+S saving
- Scroll animations across the public site (reveal on scroll, hero intro, parallax, progress bar), respecting reduced-motion settings
- Seed data for Showaib's known profile, education, leadership, certificates and achievements
- Empty Projects, Skills and Professional Experience collections ready to be populated in the dashboard

## Project structure

```text
apps/
  web/   Next.js public site + admin dashboard
  api/   Express API + MongoDB + ImgBB + AI
```

## 1. Install

```bash
npm install
```

## 2. Configure environment variables

Copy:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local
```

Set at minimum in `apps/api/.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/showaib_portfolio
JWT_SECRET=a-long-random-secret
ADMIN_EMAIL=your-email@example.com
ADMIN_PASSWORD=a-strong-password
FRONTEND_URL=http://localhost:3000
```

For image uploads:

```env
IMGBB_API_KEY=your-imgbb-key
```

For the portfolio AI assistant:

```env
OPENAI_API_KEY=your-api-key
OPENAI_MODEL=the-model-id-available-in-your-account
```

The AI endpoint uses OpenAI's Responses API and sends only the public portfolio content stored in MongoDB as its answer context.

## 3. Start MongoDB

Use your own MongoDB Atlas URI, a locally installed MongoDB, or:

```bash
docker compose up -d mongo
```

## 4. Seed the database and admin login

```bash
npm run seed
```

The seed command creates/updates the dashboard admin and creates the initial portfolio only if it does not already exist.

## 5. Run locally

```bash
npm run dev
```

- Public portfolio: http://localhost:3000
- Dashboard login: http://localhost:3000/dashboard/login
- Express API: http://localhost:5000/api

## Instant updates after CMS saves (optional)

Pages are cached for 60 seconds. To make every CMS save appear immediately, set the same random value as `REVALIDATE_SECRET` in both `apps/api/.env` and the web app's environment. The API then calls `POST /api/revalidate` on the website after each save.

## Deployment

A simple production setup is:

- **Web:** Vercel
- **API:** Render, Railway, Fly.io, or another Node host
- **Database:** MongoDB Atlas
- **Images:** ImgBB

Set `NEXT_PUBLIC_SITE_URL` on the web deployment to your public origin (for example `https://www.showaibbinnasir.site`); it is used for canonical URLs, the sitemap, RSS and share links. Set `NEXT_PUBLIC_API_URL` on the web deployment to your production API URL, for example `https://api.example.com/api`. Set `FRONTEND_URL` on the API to the deployed web origin. If you use both a production domain and Vercel preview URL, `FRONTEND_URL` accepts a comma-separated list.

Because dashboard authentication uses a secure cross-site HTTP-only cookie in production, the API must be served over HTTPS.

## Content already seeded

The starter data includes:

- Mohammad Showaib Bin Nasir
- MSc Robotics and Artificial Intelligence — London Metropolitan University, completed
- BSc (Hons.) Computer Science and Engineering — BGC Trust University Bangladesh
- Vice President — Allied Computer Streams
- Existing certifications and selected university achievements
- LinkedIn and GitHub links

Projects, skills and professional work-experience arrays are deliberately left empty so they can be entered accurately from the dashboard.

## Notes

Do not commit `.env` files. Rotate any key that is accidentally exposed. Before production, change the admin password, use a strong JWT secret and configure MongoDB Atlas network/security settings appropriately.

## Rich project case studies

`Projects → Full description` now uses a Tiptap rich-text editor instead of a plain textarea. It supports semantic H2/H3 headings, controlled font sizes, bold/italic/underline/strike, lists, blockquotes, links, text alignment, undo/redo, and inline images uploaded through the existing authenticated ImgBB upload endpoint.

The field is still stored as the project's existing `description` string in MongoDB, but its value is now HTML. Existing plain-text descriptions remain readable and are converted to a paragraph when opened in the editor. Project cards continue to use `summary`; when a project has a full description they show a **Case study** link to `/projects/[id]`, where the rich article is sanitized before rendering.

After pulling these changes, install the new frontend dependencies from the repository root with `npm install`, then run the normal development/build commands.

## Blog

Write posts in **Dashboard → Blog**. Each post has a title, URL slug (generated from the title, editable), excerpt, rich-text body, cover image with alt text, tags, an optional SEO title and meta description, and a publish date. Choosing a future date schedules the post; it appears automatically at that time. Drafts and scheduled posts are never returned by the public API.

Posts without a cover image get an automatically generated 1200×630 share card at `/blog/<slug>/og`, so links look good on LinkedIn, Facebook, X and WhatsApp.

## Homepage sections

**Dashboard → Site** controls the order of homepage sections and lets you switch any of them off. Items you hide inside a section (a project, a certificate, etc.) are now removed by the API for public visitors and the AI assistant, not just hidden on the page.

## How the dashboard talks to the API

The browser only ever calls the website itself. Requests to `/backend/*` are passed through by Next.js (see `apps/web/next.config.mjs`) to the API at `NEXT_PUBLIC_API_URL`, so the admin login cookie belongs to the website's own domain. That means:

- signing in works whether you open the site at `localhost`, `127.0.0.1` or your network IP;
- in production, browsers that block third-party cookies (Safari, privacy modes) still keep you signed in;
- the rewrite target is fixed when the site is **built**, so rebuild/redeploy the website after changing `NEXT_PUBLIC_API_URL`.

In production, set `TRUST_PROXY` on the API to the number of proxies in front of it (website proxy + your host's load balancer, e.g. `2` on Render) so login and chat rate limits apply per visitor.

### Can't sign in?

The login page now tells you what went wrong:

- **Wrong email or password**: check `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `apps/api/.env`, then run `npm run seed` again (it updates the admin password).
- **Too many sign-in attempts**: wait 15 minutes or restart the API.
- **The API isn't running**: start it with `npm run dev`, and make sure MongoDB is running.
