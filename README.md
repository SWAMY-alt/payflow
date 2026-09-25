# PayFlow — Smart Billing & Collections for Independent Service Providers

> Production-grade billing, partial-payment tracking, automatic late fees, recurring invoicing, and escalating follow-ups for freelancers, electricians, tutors, consultants, and small shop owners.

[![Tech Stack](https://img.shields.io/badge/Stack-React%20%7C%20Node.js%20%7C%20Postgres%20%7C%20Tailwind-teal.svg)](https://github.com/SWAMY-alt/payflow)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

---

## ⚡ Overview

PayFlow is designed around the reality that **money is involved** — nothing here silently loses precision or state.
Enter an order once, and PayFlow handles everything downstream:
- **Zero float rounding errors**: All monetary calculations use smallest currency units (paise) with exact integer math.
- **Audit ledger**: The payments table is insert-only; corrections are made via auditable reversal entries.
- **Late-Fee Engine**: Calculates late fees strictly on the **remaining balance**, not the original total.
- **Automated Escalation**: Polite due-date reminder → firmer 3-day reminder → at 7+ days overdue, halts automated client messages and flags the invoice "Needs Attention" for personal intervention.
- **Recurring Engine**: Automatically regenerates invoices on schedule from saved templates with sequential invoice numbering.
- **1-Click WhatsApp & Email**: Deterministic communication templates with instant `wa.me` links and Nodemailer dispatch.
- **Headless PDF Generation**: High-performance vector PDF rendering with UPI payment details, QR guidance, and itemized ledger.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Canvas Confetti
- **Backend**: Express.js, TypeScript, Drizzle ORM, Zod validation
- **Database**: Embedded PostgreSQL via `@electric-sql/pglite` (zero external configuration required out of the box), with full support for external PostgreSQL via `DATABASE_URL`
- **PDF Generation**: `pdf-lib` (pure TypeScript vector PDF rendering)
- **Scheduling**: `node-cron` daily scheduled automation passes + manual trigger endpoints

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** v18+ (tested on v22.12.0)
- **npm** v10+

### 2. Clone & Install Dependencies
```bash
git clone https://github.com/SWAMY-alt/payflow.git
cd payflow

# Install server dependencies
npm install

# Install client dependencies
npm --prefix client install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
# Root & Server
cp server/.env.example server/.env
cp .env.example .env

# Client
cp client/.env.example client/.env
```

### 4. Run Development Servers
```bash
# Run both backend (port 5000) and frontend (port 3001) concurrently:
npm run dev

# Or run separately:
npm run dev:server   # Starts Express API on http://localhost:5000
npm run dev:client   # Starts Vite React UI on http://localhost:3001
```

Visit **[http://localhost:3001](http://localhost:3001)** in your browser.
Click **"1-Click Instant Demo Login"** on the sign-in page to immediately load pre-populated data (clients, partial payments, overdue invoices with late fees, and recurring templates).

---

## 🔄 Daily Automation Passes (00:05 AM)

PayFlow executes three deterministic passes:
1. **Late-Fee Pass (`runLateFeeCheck`)**: Applies configured late-fee % strictly to the *remaining balance* (`total_amount - amount_paid`) when grace days expire.
2. **Follow-Up Pass (`runFollowUpDispatch`)**: Sends due-date and 3-day overdue reminders. At 7+ days overdue, suppresses client messages and marks the invoice as `"Needs Attention"`.
3. **Recurring Pass (`runRecurringGeneration`)**: Auto-generates new invoices from active templates whose `next_run_date` has arrived, advances next schedule, and evaluates termination conditions (`never`, `afterCount`, `onDate`).

*You can also trigger any of these passes on demand from the **Automation Runner** modal in the UI.*

---

## 🧪 Testing & Verification

Run the automated end-to-end integration test suite:
```bash
npm run test:e2e # or: npx tsx test-e2e.ts
```

This verifies all 18 core acceptance criteria including overpayment rejection, remaining-balance late-fee math, 7-day escalation suppression, recurring generation, and exact dashboard sums.

---

## 📜 License

ISC © PayFlow Contributors.
