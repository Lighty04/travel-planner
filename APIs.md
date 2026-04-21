# APIs Configuration Guide

## RapidAPI (Primary — Skyscanner + Booking.com)

**Fichier de config:** `travel-planner/.env.production`
**Emplacement serveur:** `decisionhelper@192.168.0.16:~/travel-planner/.env.production`

```
RAPIDAPI_KEY=your_rapidapi_key_here
```

**Couverture:**
- **Flights:** Skyscanner API (via RapidAPI)
- **Hotels:** Booking.com API (via RapidAPI)

**Limites:**
- Free tier: ~100 req/month
- Si quota dépassé → retourne `[]` (pas de mocks)

## Serveur de production

**URL:** http://192.168.0.16:3000
**État:** ✅ En ligne
**Déploiement:** `decisionhelper@192.168.0.16:~/travel-planner/`

### Démarrer le serveur
```bash
ssh decisionhelper@192.168.0.16
node ~/travel-planner/.next/standalone/server.js &
```

### Vérifier que le serveur tourne
```bash
curl -s -o /dev/null -w '%{http_code}' http://192.168.0.16:3000
# → 200 = OK
```

## Comportement

| API | Si OK | Si erreur | Si clé manquante |
|-----|-------|-----------|------------------|
| Flights (Skyscanner) | Résultats réels | `[]` | `[]` |
| Hotels (Booking.com) | Résultats réels | `[]` | `[]` |

**Pas de mocks.** Le frontend affiche "Service unavailable" si l'API ne répond pas.

## Architecture

```
Frontend (React) → API Next.js → RapidAPI → Skyscanner/Booking.com
                                     ↓
                              Erreur → [] → "Service unavailable"
```