# GoalBet — Virtual Football Betting Platform

## Overview

Full-stack virtual football betting platform with React+Vite frontend, Node.js+Express API, and MongoDB database.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React 19 + Vite 7 + Tailwind CSS + shadcn/ui
- **API framework**: Express 5
- **Database**: MongoDB + Mongoose (via `MONGODB_URI` secret)
- **Auth**: JWT (`jsonwebtoken`) + `bcrypt` for password hashing
- **API codegen**: Orval (from OpenAPI spec → React Query hooks)
- **Frontend forms**: react-hook-form + zod + @hookform/resolvers

## Structure

```text
workspace/
├── artifacts/
│   ├── api-server/             # Express API (JWT + MongoDB)
│   │   ├── src/
│   │   │   ├── app.ts          # Express setup, CORS, routes
│   │   │   ├── index.ts        # Entry: reads PORT, starts server
│   │   │   ├── middleware/
│   │   │   │   └── auth.ts     # authenticate, optionalAuth, requireAdmin, generateToken
│   │   │   ├── models/
│   │   │   │   ├── User.ts     # User model (bcrypt pre-save hook)
│   │   │   │   ├── Match.ts    # Match model (status: upcoming/betting_open/live/completed/cancelled)
│   │   │   │   ├── Bet.ts      # Bet model (outcome: home/draw/away, status: pending/won/lost/refunded)
│   │   │   │   ├── Transaction.ts
│   │   │   │   ├── Notification.ts
│   │   │   │   ├── ActivityLog.ts
│   │   │   │   └── PlatformConfig.ts  # singleton config (minBet, bettingWindowMinutes, etc.)
│   │   │   ├── routes/
│   │   │   │   ├── index.ts    # Mounts all routers
│   │   │   │   ├── auth.ts     # POST /auth/register, /auth/login, GET /auth/me
│   │   │   │   ├── user.ts     # GET /user/balance, POST /user/deposit, /user/withdraw, GET /user/transactions, /user/bets, /user/notifications
│   │   │   │   ├── matches.ts  # GET /matches (public), /matches/:id (public)
│   │   │   │   ├── bets.ts     # POST /bets (place bet, requires auth)
│   │   │   │   ├── leaderboard.ts # GET /leaderboard (public)
│   │   │   │   └── admin.ts    # All /admin/* routes (requireAdmin)
│   │   │   └── services/
│   │   │       └── matchEngine.ts  # Match simulation: opens betting → live simulation → settle bets
│   └── football-betting/       # React+Vite frontend (previewPath: /)
│       └── src/
│           ├── App.tsx          # Router (wouter), AuthProvider, QueryClientProvider
│           ├── hooks/
│           │   ├── use-auth.tsx # AuthContext: login/register/logout, JWT in localStorage
│           │   └── use-toast.ts # Toast hook (shadcn pattern)
│           ├── lib/
│           │   ├── fetch-interceptor.ts  # Patches global fetch to inject Bearer token for /api calls
│           │   └── format.ts            # Currency formatter (KSh)
│           ├── pages/
│           │   ├── landing.tsx           # Public hero page
│           │   ├── login.tsx             # Login form
│           │   ├── register.tsx          # Registration form
│           │   ├── dashboard/
│           │   │   ├── matches.tsx       # Live/upcoming matches + betting modal
│           │   │   ├── my-bets.tsx
│           │   │   ├── transactions.tsx
│           │   │   └── leaderboard.tsx
│           │   └── admin/
│           │       ├── overview.tsx
│           │       ├── matches.tsx       # Create/start/stop matches
│           │       ├── users.tsx
│           │       ├── withdrawals.tsx
│           │       ├── bets.tsx
│           │       ├── deposits.tsx
│           │       ├── logs.tsx
│           │       └── config.tsx        # Platform settings (bettingWindowMinutes, matchDurationSeconds, etc.)
│           └── components/
│               ├── layout/
│               │   ├── Navbar.tsx
│               │   └── AdminLayout.tsx
│               └── ui/
│                   ├── use-toast.ts      # Re-exports from @/hooks/use-toast (barrel file)
│                   └── ...               # shadcn/ui components
├── lib/
│   ├── api-spec/               # openapi.yaml + Orval codegen config
│   ├── api-client-react/       # Generated React Query hooks (via Orval)
│   └── api-zod/                # Generated Zod schemas
└── scripts/                    # One-off utility scripts
```

## Environment Variables / Secrets

- `MONGODB_URI` — MongoDB connection string (set as Replit secret)
- `JWT_SECRET` — Optional, defaults to `"goalbet-secret-key-2024"` if not set
- `PORT` — Automatically set by Replit per workflow

## Key Business Rules

- **Currency**: Always KSh (Kenyan Shillings)
- **Min deposit**: KSh 20
- **Min bet / slip stake**: KSh 5
- **Min withdrawal**: KSh 50 with 12% platform fee
- **Betting model**: Accumulator slip system — users click match card outcomes to add to a floating slip, then stake and submit as one slip (all selections must win)
- **Match lifecycle**: `upcoming` → `betting_open` → `live` → `completed`
  - Auto-scheduler keeps 5 minimum upcoming matches, staggered 2/4/6/8/10 min apart
  - No team can be in two active matches simultaneously (same-team conflict check)
  - After betting window closes, 90-minute simulation runs in `matchDurationSeconds` (default: 120 sec)
  - Slips are settled automatically when each match in the slip completes (accumulator logic)
- **Auto-balance**: If platform would pay out more than collected, engine overrides both result AND score (so display is always consistent)
- **Admin forced result**: Admin can set `forcedResult` on any live/upcoming match; the match continues running naturally, but at the end the forced result is applied to bet settlement + score adjusted to match
- **50% consolation refund**: When a bet slip is settled as lost, 50% of the stake is automatically refunded to the user's balance + creates a "refund" transaction + notification
- **Halftime pause**: Simulation pauses at 45' (ticker holds at HT) for ~5–6 seconds before second half
- **Leaderboard**: Only shows users with totalWins > 0
- **M-Pesa Daraja API**: Real STK push on deposit; real B2C payout on admin withdrawal approval. Credentials stored in PlatformConfig (admin settings). When not configured, endpoint returns graceful error
- **Teams pool**: 32 teams from PL, La Liga, Bundesliga, Serie A, Ligue 1, Primeira Liga, Eredivisie, Scottish Premiership — supports 5 live + 5-8 upcoming simultaneously without team conflicts
- **API URL centralized**: `artifacts/football-betting/src/lib/api.ts` exports `API_BASE = "/api"` — all manual fetch calls use this constant
- **Dashboard separation**: Admin users auto-redirected from `/dashboard` → `/admin`; user profile dropdown shows balance + logout only (no cross-dashboard links)

## Admin User

- **Admin credentials**: Email: `nutterxtech@gmail.com`, Password: `BILLnutter001002`
- **Admin secret URL**: `/?isadmin=nutterx=true` → `/admin-secret` → sets `sessionStorage.goalbet_admin_unlocked = "1"` → `/admin`
- Role: `admin` (seeded via `seedAdminAccount()` in `app.ts`)

## API Codegen

Run codegen when changing `openapi.yaml`:
```bash
pnpm --filter @workspace/api-spec run codegen
pnpm --filter @workspace/api-client-react run build
```

## Development

- Frontend: `pnpm --filter @workspace/football-betting run dev`
- API: `pnpm --filter @workspace/api-server run dev`
- Both managed as Replit workflows
