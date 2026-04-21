# APIs Configuration Guide

## Amadeus (Free Tier - 2000 requests/month)

1. Go to https://developers.amadeus.com
2. Create a free account
3. Create an application (Self-Service API)
4. Get your **API Key** and **API Secret**
5. Add to `.env.production`:

```
AMADEUS_API_KEY=your_api_key_here
AMADEUS_API_SECRET=your_api_secret_here
```

**Coverage:** Flights + Hotels worldwide
**Limitations:** Test environment (no real booking), 2000 req/month

## RapidAPI Skyscanner (Free Tier - 100 requests/month)

1. Go to https://rapidapi.com (create account)
2. Search for "Skyscanner" API
3. Subscribe to free tier
4. Get your **RapidAPI Key**
5. Add to `.env.production`:

```
RAPIDAPI_KEY=your_rapidapi_key_here
```

**Coverage:** Flights (Skyscanner) + Hotels (Booking.com)
**Limitations:** 100 req/month free tier

## SNCF (French trains)

No API key needed for our current implementation.
Uses realistic mock data with actual SNCF pricing.

For real-time SNCF data, would require:
- SNCF Connect API (requires partnership)
- Or scraping (implemented but slow)

## Current Fallback

If no API keys are configured, the app uses **realistic mock data**:
- **Flights:** 7 airlines, 20+ routes, real pricing patterns
- **Trains:** 30+ SNCF routes, 3 price tiers (Prem's/Standard/Première), peak/off-peak
- **Hotels:** 10+ chains per city, dynamic pricing by duration/weekend

## To enable real APIs

1. Get API keys (Amadeus + RapidAPI)
2. Add to `.env.production` on server:
   ```bash
   ssh decisionhelper@192.168.0.16
   cd ~/travel-planner
   echo "AMADEUS_API_KEY=your_key" >> .env.production
   echo "AMADEUS_API_SECRET=your_secret" >> .env.production
   echo "RAPIDAPI_KEY=your_rapidapi_key" >> .env.production
   ```
3. Restart server:
   ```bash
   pkill -f next-server; sleep 2; node server.js &
   ```

The app will automatically try Amadeus → RapidAPI → Mocks (fallback).
