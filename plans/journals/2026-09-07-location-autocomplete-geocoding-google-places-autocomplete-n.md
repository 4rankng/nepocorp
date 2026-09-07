---
title: "Location autocomplete: Geocoding → Google Places Autocomplete (New)"
date: 2026-09-07
summary: "Business-name searches (SINOVNL, Trà Xanh Ngọc) failed — autocomplete used Geocoding API; swapped to Places (New) with vi-language, session token, degraded-cache TTL, comma-tail geocode fallback; verified live on dev"
---

# Location autocomplete: Geocoding → Google Places Autocomplete (New)

## What happened
- Ngọc Ánh report: typing business names (SINOVNL Hải Phòng, Trà Xanh Ngọc Thanh Phú Thọ) in location fields returned nothing → had to copy-paste from Google Maps; even pasted strings often failed.
- Root cause: `map4d.searchPlaces` resolved via `googleGeocodeOnce` (Geocoding API) — no prefix/business-name matching, single result, name discarded.
- Fix (uncommitted): Places Autocomplete (New) primary — POST `places:autocomplete`, `includedRegionCodes:["vn"]`, Hải Phòng 50 km bias, `languageCode:'vi'`, sessiontoken plumbed frontend→route→Google body — with Geocoding fallback for pasted full addresses. Redis key bumped to v3 holding `{suggestions, degraded}`: Places-OUTAGE fallback caches 5 min, not 90 days. `geocodePlace` now routes through `geocodeFromLookup` comma-tail fallback so business-name legs still resolve for map markers/routes. Component: debounce 500→250 ms, min 3→2 chars, stale-fetch guard. Suggestion `lat/lng` now optional (predictions carry none; verified no consumer reads them).

## Decision
- Places-first + Geocoding-fallback, one Redis cache, NO Place Details step: the frontend keeps only the description string (placeId discarded at LocationAutocomplete.tsx), so predictions' missing coordinates cost nothing; markers resolve server-side by place name.
- Code-review round applied H1 (languageCode — English output confirmed in cached data), H2 (geocode round-trip), M1 (stale-response race), M3 (degraded TTL), L1–L3 (comments/hygiene). M2: `FuelAllocationEditor.*` in the tree is ANOTHER session's work — must commit separately.

## Verification
- `map4d.test.ts` 18/18; backend tsc clean; vite build green.
- Live via dev :3090 (watch-reloaded): "SINOVNL" → exact Hải Phòng yard as top hit; "Trà Xanh Ngọc" → exact Phú Thọ company present; post-languageCode re-test returns Vietnamese ("Đông Hải, Hải Phòng, Việt Nam").

## Gotchas / Next steps
- Places (New) `locationBias` radius hard-capped at 50,000 m — larger circles 400 INVALID_ARGUMENT (caught live).
- demo.tingting.vip has EMPTY `GOOGLE_MAPS_API_KEY` in /opt/demo/deploy/.env — demo autocomplete shows ports-catalog only until the key is copied (setup-demo-server.sh:64 was supposed to).
- Deploy is manual (`make deploy`); billing moves Geocoding→Places SKU; unclosed autocomplete sessions bill per request. Google accepting the 13-char random sessionToken verified live (200).
- Appended BUG-REG-011 to docs/qa/regression-test-plan.md; HANDOFF.md entry added.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
