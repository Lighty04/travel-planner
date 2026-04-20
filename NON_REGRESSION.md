# Non-Regression Tests - Travel Planner

**Last updated:** 2026-04-20

## Phase 0: Static Assets (Critical for UI)

### Static Files Serving
- [ ] CSS files return 200 (not 404)
- [ ] JS chunks return 200 (not 404)
- [ ] Fonts return 200 (not 404)

```bash
# Test critical static assets
curl -s -o /dev/null -w "%{http_code}" http://192.168.0.16:3000/_next/static/css/cb739d5c8d46f004.css
curl -s -o /dev/null -w "%{http_code}" http://192.168.0.16:3000/_next/static/chunks/webpack-96cc0c07babe42a7.js
curl -s -o /dev/null -w "%{http_code}" http://192.168.0.16:3000/_next/static/media/e4af272ccee01ff0-s.p.woff2

# All should return: 200
```

**Regression Prevention:**
When deploying standalone build, ensure `.next/static/` exists at project root (not inside `standalone/` directory). The server looks for files at `../.next/static/` relative to `standalone/server.js`.

---

## Phase 1: Foundation

### Auth & Session
- [ ] Root `/` redirects to `/login`
- [ ] `/login` shows "Sign in with Google" and "Dev Login" buttons
- [ ] Click "Dev Login" sets session cookie and redirects to `/trips`
- [ ] `/trips` shows "My Trips" page (not redirect to login)
- [ ] Session persists across page refreshes
- [ ] **Dev login creates valid NextAuth JWT session (via CredentialsProvider)**
- [ ] **Trip creation works after dev login (not 401 Unauthorized)**

### Trip CRUD
- [ ] Click "+ New Trip" goes to `/trips/new`
- [ ] Create trip form accepts: destination, dates, travelers
- [ ] Submitting form creates trip in database
- [ ] Created trip appears in `/trips` list
- [ ] Click trip → goes to `/trips/[id]` showing trip details
- [ ] **Dev login user can create trip without 401 error**

### Trip Creation API Test
```bash
# 1. Get session via dev login
curl -s -X POST http://192.168.0.16:3000/api/auth/callback/dev \
  -c /tmp/cookies.txt \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "callbackUrl=/trips"

# 2. Create trip
curl -s -X POST http://192.168.0.16:3000/api/trips \
  -b /tmp/cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"destination":"Paris","startDate":"2026-06-01","endDate":"2026-06-05","travelers":2}'

# Expected: JSON with trip.id, not "401 Unauthorized"
```

### Database
- [ ] PostgreSQL connection working
- [ ] Trip data persists after server restart

## Phase 2: Scraping (To Test)

### Transport Search
- [ ] Search flights returns results from Kayak
- [ ] Search trains returns results from SNCF
- [ ] Results include: price, duration, booking URL

### Accommodation Search  
- [ ] Search hotels returns results from Booking.com
- [ ] Only shows accommodations with rating > 4.0
- [ ] Results include: price, rating, booking URL

## Running Tests

```bash
# Server-side smoke test
curl -s http://192.168.0.16:3000/login | grep "Dev Login"

# Dev login flow
curl -s -X POST http://192.168.0.16:3000/api/auth/dev-login -c /tmp/cookies.txt
curl -s -b /tmp/cookies.txt http://192.168.0.16:3000/trips | grep "My Trips"
```

## When to Run
- After every deployment
- After any auth/session changes
- After database schema changes
