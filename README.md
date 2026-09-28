# To-Do List App

A task manager built with Next.js 15 (App Router) and MongoDB, styled after the
Figma community design **"To-Do list App (Community)"** (file key
`PC8WDE4oo1zDwXEpwTT9ka`).

Each user gets a private task list backed by their own MongoDB documents.

## Stack

- Next.js 15.5 (App Router, Turbopack) + React 19
- Tailwind CSS v4 (CSS-first `@theme` tokens, no `tailwind.config.js`)
- MongoDB Atlas via the official `mongodb` driver
- NextAuth v5 (credentials provider, JWT sessions)

## Getting started

```bash
cd frontend
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | Atlas connection string |
| `MONGODB_DB` | Database name (default `todo_app`) |
| `MONGODB_TLS` | Set to `false` only for a local mongod |
| `AUTH_SECRET` | Session cookie signing secret |

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Then run:

```bash
npm run dev
```

Open <http://localhost:3000>, create an account, and add tasks.

### Getting `MONGODB_URI`

In the Atlas dashboard: **Cluster → Connect → Drivers → Node.js**. Copy the
connection string and replace `<password>` with your database password,
URL-encoded (so `@` becomes `%40`).

## Data model

`users`

| Field | Type | Notes |
| --- | --- | --- |
| `name` | string | shown in the header greeting |
| `email` | string | unique index, lowercased |
| `passwordHash` | string | bcrypt, cost 12 |
| `createdAt` / `updatedAt` | date | |

`tasks`

| Field | Type | Notes |
| --- | --- | --- |
| `title` | string | required, max 100 |
| `description` | string | max 500 |
| `priority` | string | `low` \| `medium` \| `high` |
| `category` | string | `Design` \| `Meeting` \| `Learning` |
| `dueDate` | string \| null | `YYYY-MM-DD`, never in the past |
| `completed` | boolean | |
| `userId` | string | every query is scoped to the session user |
| `createdAt` / `updatedAt` | date | |

Indexes are created automatically on first connection: unique `users.email`,
plus `tasks` compound indexes on `{ userId, createdAt }` and
`{ userId, dueDate }`.

## API

All routes require a valid session and return `401` otherwise. Every task
query is filtered by the session user's id, so one user can never read or
modify another user's tasks.

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/api/register` | Create an account (name, email, password) |
| `GET` | `/api/tasks` | List the current user's tasks |
| `POST` | `/api/tasks` | Create a task |
| `PATCH` | `/api/tasks/:id` | Partially update a task |
| `DELETE` | `/api/tasks/:id` | Delete a task |
| `*` | `/api/auth/*` | NextAuth sign in / session / sign out |

## Design notes

Colors, type scale, corner radii and gradient angles are taken from the Figma
file and exposed as Tailwind theme tokens in `src/app/globals.css`:

- canvas gradient `linear-gradient(58deg, #ea52f8, #7a5cfb 54%, #3c8aff)`
- progress banner `linear-gradient(45deg, #3f4e99, #874dbc 60%, #d14cdf)`
- category accents — Design `#60dec0`, Meeting `#8c8cd8`, Learning `#fc8648`
- action colour `#8a32cb` for the floating add button

The file specifies Segoe UI; the app loads Inter as the metric-compatible
substitute so it renders the same on macOS and Linux.

## Scripts

```bash
npm run dev     # dev server
npm run build   # production build
npm start       # serve the production build
npm run lint    # eslint
```
