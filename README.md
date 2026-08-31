# Food Delivery App

Monorepo with a shared API and **three separate frontends**:

| App | Folder | URL | Who |
|-----|--------|-----|-----|
| **Customer site** | `customer/` | http://localhost:5173 | Public menu; sign in only to checkout & track orders |
| **Admin dashboard** | `admin/` | http://localhost:5174 | Restaurant owners |
| **Driver app** | `driver/` | http://localhost:5175 | Delivery drivers |
| **API** | `server/` | http://localhost:5000 | Express + PostgreSQL + Socket.IO |

The old combined `client/` folder is deprecated — use `customer/` and `admin/` instead.

## Prerequisites

- Node.js 18+
- PostgreSQL 14+

## Server setup

```bash
cd server
npm install
```

Copy `server/env.example` to `server/.env` and set Postgres credentials and `JWT_SECRET`.

```bash
node setupDb.js
npm run dev
```

Health check: `GET http://localhost:5000/api/health`

## Customer site (public menu)

```bash
cd customer
npm install
npm run dev
```

- Browse food and drinks **without signing in**
- Add items to cart as a guest
- **Sign in to checkout** with **Google** (verified by Google) or email/password

### Google Sign-In setup (optional)

1. Open [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → create an **OAuth 2.0 Client ID** (Web application).
2. Add **Authorized JavaScript origins**: `http://localhost:5173`
3. Copy the Client ID into both files (same value):
   - `server/.env` → `GOOGLE_CLIENT_ID=...`
   - `customer/.env` → `VITE_GOOGLE_CLIENT_ID=...` (copy from `customer/.env.example`)
4. Restart the **server** and **customer** dev servers.

Customers can then click **Continue with Google** on the login page. Google confirms their identity; the app stores their Google email and name — **not** their Gmail password.

## Admin dashboard

```bash
cd admin
npm install
npm run dev
```

Owners manage menu items, active orders, and driver accounts.

Default owner login (run `node seedAdmin.js` in `server/` if login fails):

- Email: `owner@test.com`
- Password: `admin123`

## Driver app

```bash
cd driver
npm install
npm run dev
```

Open http://localhost:5175 — separate from the customer site and admin panel.

**Driver logins are created by the owner** in the admin panel → **Driver Management**:

1. Enter the driver’s **display name**
2. Set **username (email)** — this is what the driver types on the driver app sign-in page
3. Set a **password** and share it with the driver (shown once after creation)

There is no public driver sign-up. Optional dev account: run `node seedDriver.js` in `server/` for `driver@test.com` / `driver123`.

## Auth + roles

| Role | App | Login required for |
|------|-----|-------------------|
| `customer` | Customer site (5173) | Checkout, order tracking |
| `owner` | Admin (5174) | Entire dashboard |
| `driver` | Driver (5175) | Entire app |

Each app only accepts its own role at login (wrong-role accounts get a helpful message).

## Database schema

See `server/schema.sql`: `users`, `menu_items`, `orders`, `order_items`, `chat_messages`.

## API proxy

Each Vite app proxies `/api`, `/uploads`, and `/socket.io` to the server on port 5000.
