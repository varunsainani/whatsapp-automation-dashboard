# WhatsApp Automation Dashboard

A demo system where a WhatsApp bot handles automated conversations, collects
information from users through a configurable flow, and lets an admin manage
everything from a web panel — no code changes required.

## Features

- 📊 **Analytics dashboard** — total leads, active chats, message volume,
  completion rate, a 7-day message chart and status breakdowns.
- 🤖 **Automated conversation flow** — greeting, step-by-step data collection,
  and a closing summary, all driven by a flow stored in the database.
- 🧩 **Visual flow editor** — build the bot's script from `say` / `ask` steps,
  reorder them, and activate a flow without touching code.
- 💬 **Live conversation log** — every inbound and outbound message streams to
  the admin panel in real time over Socket.IO.
- ✋ **Human handoff & live reply** — pause the bot per conversation, reply to a
  contact manually from the panel, and fire quick replies into the chat.
- 👥 **Leads / CRM** — every contact with their collected data, searchable, with
  one-click CSV export.
- 📝 **Templates & quick replies** — manage reusable canned messages.
- 🟢 **Live connection status** — see whether the WhatsApp client is connected.
- 🔐 **JWT-protected admin API** — login-gated REST endpoints.

## Tech stack

| Layer     | Technology                                            |
| --------- | ----------------------------------------------------- |
| Frontend  | React, Next.js (App Router), TailwindCSS              |
| Backend   | Node.js, Express, Socket.IO                           |
| Database  | PostgreSQL (via Sequelize)                            |
| WhatsApp  | [Baileys](https://github.com/WhiskeySockets/Baileys) (free, no paid API) |

## Project structure

```
backend/    Express API, Sequelize models, flow engine, Baileys WhatsApp client
frontend/   Next.js + Tailwind admin panel
```

## Running locally

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env        # then edit DATABASE_URL, JWT_SECRET, ADMIN_* etc.
npm start
```

On first start the backend connects to Postgres, syncs the models, seeds an
admin account (from `ADMIN_EMAIL` / `ADMIN_PASSWORD`) and a default lead-capture
flow. With `WHATSAPP_ENABLED=true` it prints a QR code — scan it in
**WhatsApp → Linked Devices** to link a number. Set `WHATSAPP_ENABLED=false` to
run the API and admin panel without a live WhatsApp connection.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # point NEXT_PUBLIC_API_URL at the backend
npm run dev                         # serves on http://localhost:3001
```

Open http://localhost:3001, sign in with the seeded admin credentials, and the
dashboard's conversation log will update live as messages arrive.

## API overview

All routes except `POST /api/auth/login` require a `Bearer <token>` header.

| Method                | Path                          | Purpose                       |
| --------------------- | ----------------------------- | ----------------------------- |
| POST                  | `/api/auth/login`             | Obtain a JWT                  |
| GET                   | `/api/stats`                  | Dashboard metrics + 7-day series |
| GET                   | `/api/conversations`          | List (search / status / page) |
| GET / PATCH           | `/api/conversations/:id`      | Detail / status + bot toggle  |
| POST                  | `/api/conversations/:id/reply`| Send a manual agent reply     |
| GET                   | `/api/contacts`               | Leads with collected data     |
| GET                   | `/api/contacts/export`        | Export leads as CSV           |
| GET POST PUT DELETE   | `/api/templates`              | Manage message templates      |
| GET POST PUT DELETE   | `/api/quick-replies`          | Manage quick replies          |
| GET POST PUT DELETE   | `/api/flows`                  | Manage flows                  |
| POST                  | `/api/flows/:id/activate`     | Make a flow the active one    |
| GET                   | `/api/whatsapp/status`        | WhatsApp connection status    |
