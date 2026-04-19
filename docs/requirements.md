# Travel Planner - Customer Requirements

**Project:** Travel Planner  
**Status:** Draft v0.1  
**Last updated:** 2026-04-19

---

## 1. Overview

A web-based travel manager that automates the full preparation cycle of trip planning — from initial inputs to finalized bookings with editable results.

---

## 2. User Inputs

| Input | Description | Required |
|-------|-------------|----------|
| Destination | City, region, or country | Yes |
| Travel Dates | Start and end dates | Yes |
| Places to Visit | List of attractions/activities | No (can be added later) |
| Travelers | Number of people | Yes |
| Budget Range | Optional constraint | No |
| Preferences | Accommodation type, transport mode | No |

---

## 3. Core Features

### 3.1 Transportation Suggestions
- Search and suggest options from real providers:
  - Flights: Kayak, Skyscanner, airline websites
  - Trains: SNCF Connect, Trainline, Eurostar
  - Buses: FlixBus, BlaBlaCar Bus
- Include pricing, duration, and booking links
- Support round-trip and multi-city

### 3.2 Accommodation Suggestions
- Search and suggest from:
  - Booking.com
  - Airbnb
  - Hotels.com
- **Quality gate:** Only suggest accommodations with >4.0 rating and majority positive reviews
- Filter by: price range, amenities, location proximity to attractions

### 3.3 Rental Car / Local Transport
- Proactively ask user if rental car needed based on:
  - Destination type (rural vs urban)
  - Distance between planned attractions
  - Public transport availability
- If yes: suggest options from Sixt, Hertz, Enterprise, local providers

### 3.4 Smart Itinerary Planning
- Given a list of places to visit:
  - Optimize daily routes (minimize travel time)
  - Group nearby attractions
  - Respect opening hours
  - Balance activity intensity
- Generate day-by-day schedule

### 3.5 Ticket Purchasing
- For attractions requiring tickets:
  - Provide booking links
  - Suggest skip-the-line options where available
  - Include pricing
- Track which tickets are purchased vs pending

### 3.6 Collaboration
- Trip owner invites companions via email
- Companions can view all trip details
- Companions can suggest modifications (marked as "pending")
- Owner approves/rejects suggestions
- Real-time sync when owner accepts changes
- Activity log: who did what, when

---

## 4. Data Persistence

### 4.1 Database Requirements
- Store all search results and suggestions
- Track user decisions (accepted/rejected/modified)
- Support multiple trips per user
- Maintain history of changes

### 4.2 Web GUI for Exploration
- Browse all saved results
- Filter and sort suggestions
- Modify selections (change hotel, adjust dates, swap transport)
- View complete trip summary
- Export itinerary (PDF, calendar)

---

## 5. User Flow

```
1. User creates new trip → enters destination + dates
2. System searches and proposes:
   - Transportation options
   - Accommodation options
3. System asks: "Need rental car?" (conditional on destination)
4. User adds places to visit
5. System generates optimized itinerary
6. System proposes tickets for attractions
7. User reviews, modifies, confirms
8. All data saved to database
9. User can return anytime to modify
```

---

## 6. Non-Functional Requirements

| Requirement | Description |
|-------------|-------------|
| Real-time data | Prices and availability from live sources |
| Accuracy | Direct links to actual booking platforms |
| Responsiveness | Web interface works on desktop and mobile |
| Data freshness | Cached data expires after 24h |
| User accounts | Authentication to save trips |

---

## 7. Decisions (Resolved)

| Question | Decision |
|----------|----------|
| Authentication | Google OAuth only |
| Payment | Redirect to provider booking pages (no in-app payment) |
| Multi-city trips | Out of scope for v1 (single destination) |
| Offline mode | Out of scope for v1 |
| Collaboration | Yes — share trip with companions |
| Notifications | Out of scope for v1 (email alerts "later") |

### 7.1 Collaboration Details
- Trip owner can invite companions via email
- Companions can view and suggest modifications
- Owner approves/rejects changes
- Activity log tracks who suggested what

---

## 8. Success Criteria

- User can plan a complete trip in <15 minutes
- All suggestions link to real, bookable options
- User can modify any aspect after initial proposal
- No trip data lost between sessions

---

*Next step: Technical specifications based on approved requirements*
