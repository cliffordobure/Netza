# Tajira Kenya

Jumia-style shop for networking, CCTV, access control and related technology in Kenya. Built from the Tajira product & technical specification.

- **Mobile:** Flutter customer app
- **API:** Express.js + MongoDB (Mongoose)
- **Dashboard:** React (Vite) admin portal

## Demo accounts

| Role | Login | Password |
|---|---|---|
| Admin | `admin@tajira.co.ke` | `Admin@123` |
| Customer | `0712345678` | `Customer@123` |

## Run locally

Terminal 1 — API (port 4000):

```bash
cd backend
npm install
npm run dev
```

Uses `MONGODB_URI` (default `mongodb://127.0.0.1:27017/tajira`). If local MongoDB is not running, the API starts an in-memory MongoDB for development. Seed data is loaded automatically when the database is empty.

To re-seed:

```bash
cd backend
npm run db:seed
```

Terminal 2 — Admin dashboard (port 5173):

```bash
cd dashboard
npm install
npm run dev
```

Terminal 3 — Flutter app:

```bash
cd mobile
flutter pub get
flutter run
```

Android emulator talks to the API at `http://10.0.2.2:4000`. Windows / web / iOS simulator use `http://127.0.0.1:4000`.

## MVP included

Customer register/login, catalog, search, categories, product details, cart, M-Pesa checkout (sandbox simulate), order tracking, points wallet + ledger, daily login points, purchase points, Flash Drops, admin KPIs, product/order/customer/Flash Drop/points-rule management.

Checkout uses **Pesapal** (M-Pesa, Airtel Money, and cards). Payment is verified on the server via Pesapal IPN / status — never trusted from the app alone.

Live merchant setup:

1. Create / log in to a Pesapal merchant account and copy the **live** Consumer Key and Consumer Secret.
2. On the deployed API set:
   - `PESAPAL_ENV=live`
   - `PESAPAL_CONSUMER_KEY` / `PESAPAL_CONSUMER_SECRET`
   - `PUBLIC_BASE_URL=https://your-api-host` (must be publicly reachable HTTPS)
3. Run `cd backend && npm run pesapal:setup` and add the printed `PESAPAL_IPN_ID` to the API env, then restart.
