# Travel Planner - Technical Specifications

**Project:** Travel Planner  
**Status:** Draft v0.1  
**Last updated:** 2026-04-19

---

## 1. Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│   Node.js API    │────▶│   PostgreSQL    │
│   (Frontend)    │     │   (Backend)      │     │   (Database)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  External APIs   │
                       │  - Google OAuth  │
                       │  - Booking APIs  │
                       │  - Train APIs    │
                       │  - Flight APIs   │
                       └──────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  Web Scraping    │
                       │  (fallback)      │
                       └──────────────────┘
```

---

## 2. Tech Stack

| Layer | Technology | Reason |
|-------|------------|--------|
| Frontend | Next.js 15 (App Router) | React, SSR, API routes in one framework |
| Styling | Tailwind CSS + shadcn/ui | Fast UI development, consistent design |
| Backend | Next.js API Routes | Simplifies deployment, shared code |
| Database | PostgreSQL + Prisma | Relational data, type-safe ORM |
| Auth | NextAuth.js | Google OAuth, session management |
| Real-time | Server-Sent Events (SSE) | Trip updates for collaborators |
| Web Scraping | Puppeteer + Cheerio | Fallback when APIs unavailable |
| Hosting | Vercel (frontend) + Railway (DB) | Free tier, easy deployment |

---

## 3. Database Schema (Prisma)

```prisma
// User & Authentication
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?
  createdAt     DateTime  @default(now())
  trips         Trip[]
  collaborations Collaboration[]
  suggestions   Suggestion[]
}

// Trip (main entity)
model Trip {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  
  // Basic info
  destination     String
  startDate       DateTime
  endDate         DateTime
  travelers       Int      @default(1)
  budgetMin       Int?     // Optional budget range
  budgetMax       Int?
  status          TripStatus @default(DRAFT)
  
  // Relations
  transportOptions TransportOption[]
  accommodations   Accommodation[]
  activities       Activity[]
  itineraryDays    ItineraryDay[]
  collaborations   Collaboration[]
  activityLog      ActivityLog[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum TripStatus {
  DRAFT
  PLANNING
  BOOKED
  COMPLETED
}

// Transportation options (flights, trains, buses)
model TransportOption {
  id          String   @id @default(cuid())
  tripId      String
  trip        Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)
  
  type        TransportType // FLIGHT, TRAIN, BUS
  provider    String   // "SNCF", "Ryanair", "FlixBus"
  origin      String
  destination String
  departure   DateTime
  arrival       DateTime
  price       Decimal  @db.Decimal(10, 2)
  currency    String   @default("EUR")
  bookingUrl  String
  
  // Selection status
  selected    Boolean  @default(false)
  status      OptionStatus @default(PENDING)
  
  // Metadata
  scrapedAt   DateTime @default(now())
  expiresAt   DateTime // Data freshness
}

enum TransportType {
  FLIGHT
  TRAIN
  BUS
  RENTAL_CAR
}

// Accommodation options
model Accommodation {
  id          String   @id @default(cuid())
  tripId      String
  trip        Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)
  
  provider    String   // "booking.com", "airbnb"
  name        String
  address     String
  pricePerNight Decimal @db.Decimal(10, 2)
  totalPrice  Decimal  @db.Decimal(10, 2)
  currency    String   @default("EUR")
  rating      Float    // 0-5
  reviewCount Int
  amenities   String[] // ["wifi", "parking", "pool"]
  bookingUrl  String
  imageUrl    String?
  
  // Selection status
  selected    Boolean  @default(false)
  status      OptionStatus @default(PENDING)
  
  scrapedAt   DateTime @default(now())
  expiresAt   DateTime
}

// User's places to visit
model Activity {
  id          String   @id @default(cuid())
  tripId      String
  trip        Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)
  
  name        String
  description String?
  address     String?
  category    String   // "museum", "restaurant", "park"
  duration    Int      // minutes
  ticketRequired Boolean @default(false)
  ticketUrl   String?
  ticketPrice Decimal? @db.Decimal(10, 2)
  
  // Scheduled on itinerary
  itineraryDayId String?
  itineraryDay   ItineraryDay? @relation(fields: [itineraryDayId], references: [id])
}

// Itinerary days
model ItineraryDay {
  id          String   @id @default(cuid())
  tripId      String
  trip        Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)
  
  date        DateTime
  dayNumber   Int
  activities  Activity[]
  notes       String?
}

// Collaboration (trip sharing)
model Collaboration {
  id          String   @id @default(cuid())
  tripId      String
  trip        Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)
  
  userId      String?
  user        User?    @relation(fields: [userId], references: [id])
  email       String   // For invites before user accepts
  role        CollaborationRole @default(VIEWER)
  status      CollaborationStatus @default(PENDING)
  
  createdAt   DateTime @default(now())
}

enum CollaborationRole {
  VIEWER
  EDITOR
}

enum CollaborationStatus {
  PENDING
  ACCEPTED
  DECLINED
}

// Suggestions from collaborators
model Suggestion {
  id          String   @id @default(cuid())
  tripId      String
  trip        Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)
  
  suggestedBy String
  user        User     @relation(fields: [suggestedBy], references: [id])
  
  type        SuggestionType // CHANGE_TRANSPORT, CHANGE_HOTEL, etc.
  content     String       // JSON with proposed changes
  status      SuggestionStatus @default(PENDING)
  
  createdAt   DateTime @default(now())
  respondedAt DateTime?
}

enum SuggestionType {
  CHANGE_TRANSPORT
  CHANGE_ACCOMMODATION
  ADD_ACTIVITY
  REMOVE_ACTIVITY
  MODIFY_ITINERARY
}

enum SuggestionStatus {
  PENDING
  APPROVED
  REJECTED
}

// Activity log
model ActivityLog {
  id          String   @id @default(cuid())
  tripId      String
  trip        Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)
  
  actorId     String?
  action      String   // "created_trip", "selected_hotel", "suggested_change"
  details     String?  // JSON context
  createdAt   DateTime @default(now())
}

// Status for options
enum OptionStatus {
  PENDING    // Suggested, not decided
  SELECTED   // User chose this
  REJECTED   // User declined
  BOOKED     // Actually booked (manual confirmation)
}
```

---

## 4. API Endpoints

### Authentication
| Method | Endpoint | Description |
|----------|----------|-------------|
| GET | `/api/auth/signin` | Google OAuth |
| GET | `/api/auth/signout` | Sign out |
| GET | `/api/auth/session` | Get current session |

### Trips
| Method | Endpoint | Description |
|----------|----------|-------------|
| POST | `/api/trips` | Create new trip |
| GET | `/api/trips` | List user's trips |
| GET | `/api/trips/[id]` | Get trip details |
| PATCH | `/api/trips/[id]` | Update trip |
| DELETE | `/api/trips/[id]` | Delete trip |

### Search
| Method | Endpoint | Description |
|----------|----------|-------------|
| POST | `/api/search/transport` | Search flights/trains/buses |
| POST | `/api/search/accommodation` | Search hotels/Airbnb |
| POST | `/api/search/activities` | Search attractions |

### Selection & Booking
| Method | Endpoint | Description |
|----------|----------|-------------|
| POST | `/api/trips/[id]/select-transport` | Select transport option |
| POST | `/api/trips/[id]/select-accommodation` | Select accommodation |
| POST | `/api/trips/[id]/activities` | Add activity |
| PATCH | `/api/trips/[id]/activities/[id]` | Update activity |
| DELETE | `/api/trips/[id]/activities/[id]` | Remove activity |

### Itinerary
| Method | Endpoint | Description |
|----------|----------|-------------|
| POST | `/api/trips/[id]/itinerary/generate` | Generate optimized itinerary |
| GET | `/api/trips/[id]/itinerary` | Get day-by-day plan |
| PATCH | `/api/trips/[id]/itinerary/[day]` | Update day schedule |

### Collaboration
| Method | Endpoint | Description |
|----------|----------|-------------|
| POST | `/api/trips/[id]/collaborators` | Invite collaborator |
| GET | `/api/trips/[id]/collaborators` | List collaborators |
| PATCH | `/api/trips/[id]/collaborators/[id]` | Update role/status |
| POST | `/api/trips/[id]/suggestions` | Create suggestion |
| PATCH | `/api/trips/[id]/suggestions/[id]` | Approve/reject suggestion |

---

## 5. Data Sources Strategy

### 5.1 Priority: Official APIs (free tiers)

| Provider | API | Coverage | Rate Limits |
|----------|-----|----------|-------------|
| SNCF | SNCF Connect API | French trains | 1000/day free |
| Deutsche Bahn | DB API | German trains | Requires signup |
| Eurostar | Limited API | London-Paris/Brussels | Contact sales |
| Ryanair | Partner API | Budget flights | Partner program |

### 5.2 Fallback: Web Scraping

| Provider | Method | Data Extracted |
|----------|--------|----------------|
| Booking.com | Puppeteer | Prices, ratings, availability |
| Kayak | Puppeteer | Flight prices, durations |
| Skyscanner | API/Scraper | Flight comparisons |
| Airbnb | Limited API | Limited property data |
| Google Places | Places API | Attractions, reviews |

### 5.3 Caching Strategy

- Search results cached for 6 hours
- Price data flagged as "stale" after 24 hours
- User prompted to refresh before booking

---

## 6. Frontend Structure

```
app/
├── (auth)/
│   ├── login/
│   └── callback/
├── (dashboard)/
│   ├── trips/
│   │   ├── page.tsx           # List all trips
│   │   └── new/
│   │       └── page.tsx       # Create trip form
│   └── trips/[id]/
│       ├── page.tsx           # Trip overview
│       ├── transport/
│       │   └── page.tsx       # Transport options
│       ├── accommodation/
│       │   └── page.tsx       # Hotel options
│       ├── activities/
│       │   └── page.tsx       # Places to visit
│       ├── itinerary/
│       │   └── page.tsx       # Day-by-day plan
│       └── collaborators/
│           └── page.tsx       # Share/manage trip
├── api/                       # Next.js API routes
components/
├── ui/                        # shadcn/ui components
├── forms/                     # Form components
├── maps/                      # Map components (Google Maps)
└── search/                    # Search result cards
lib/
├── prisma.ts                  # Database client
├── auth.ts                    # NextAuth config
├── scraping/                  # Scraping utilities
│   ├── booking.ts
│   ├── kayak.ts
│   └── sncf.ts
└── itinerary.ts               # Itinerary optimization
```

---

## 7. Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Project setup (Next.js + Prisma + NextAuth)
- [ ] Database schema + migrations
- [ ] Google OAuth authentication
- [ ] Basic trip CRUD (create, list, view)
- [ ] Deployment to Vercel + Railway

### Phase 2: Search (Week 2)
- [ ] Transport search API + scraper
- [ ] Accommodation search API + scraper
- [ ] Activity search (Google Places)
- [ ] Search results UI
- [ ] Selection mechanism

### Phase 3: Itinerary (Week 3)
- [ ] Activity scheduling
- [ ] Itinerary optimization algorithm
- [ ] Day-by-day view
- [ ] Map integration

### Phase 4: Collaboration (Week 4)
- [ ] Invite system
- [ ] Suggestion workflow
- [ ] Activity log
- [ ] Real-time updates (SSE)

### Phase 5: Polish (Week 5)
- [ ] Mobile responsiveness
- [ ] Error handling
- [ ] Rate limiting
- [ ] Documentation

---

## 8. Security Considerations

- CSRF protection via NextAuth
- Rate limiting on search endpoints (prevent scraping abuse)
- Input validation (Zod schemas)
- SQL injection prevention (Prisma ORM)
- XSS protection (React escaping)
- Secure headers (HSTS, CSP)

---

## 9. Environment Variables

```bash
# Database
DATABASE_URL="postgresql://..."

# Auth (Google OAuth)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

# APIs
GOOGLE_PLACES_API_KEY="..."
SNCF_API_KEY="..."

# Optional: Proxy for scraping
PROXY_URL="..."
```

---

*Next: Implementation begins with Phase 1*
