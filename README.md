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

## Deployment

A simple production setup is:

- **Web:** Vercel
- **API:** Render, Railway, Fly.io, or another Node host
- **Database:** MongoDB Atlas
- **Images:** ImgBB

Set `NEXT_PUBLIC_API_URL` on the web deployment to your production API URL, for example `https://api.example.com/api`. Set `FRONTEND_URL` on the API to the deployed web origin. If you use both a production domain and Vercel preview URL, `FRONTEND_URL` accepts a comma-separated list.

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
