# Jyotisha Platform — Vedic Astrology Suite

A comprehensive Vedic Astrology web application built with Node.js/Express backend and React frontend.

## Architecture

- **Backend**: Express.js (TypeScript) on port 5000
- **Frontend**: React + Vite (served via Express in dev)
- **Calculation Engine**: Python 3.11 (`server/calculate.py`) using pyswisseph
- **Storage**: In-memory storage (MemStorage) with 900+ BPHS seed rules
- **Styling**: Tailwind CSS + Shadcn UI components, warm orange primary theme

## Calculation Engine (server/calculate.py)

Full Swiss Ephemeris-based Vedic astrology engine supporting:

### Varga (Divisional) Charts
All 16 varga charts with correct BPHS formulas:
- **D1** Rasi · **D2** Hora · **D3** Drekkana · **D4** Chaturthamsa
- **D7** Saptamsa · **D9** Navamsa (fixed: `start=(sign×9)%12`) · **D10** Dasamsa
- **D12** Dwadasamsa · **D16** Shodasamsa · **D20** Vimsamsa · **D24** Chaturvimsamsa
- **D27** Saptavimsamsa · **D30** Trimsamsa (unequal) · **D40** Khavedamsa
- **D45** Akshavedamsa · **D60** Shashtiamsa

### Dasha Systems
- **Vimsottari**: 3 levels (Maha → Antardasha → Pratyantar) with exact dates
- **Ashtottari**: 108-year cycle, 2 levels with exact dates

### Yoga Detection (15+ yogas)
Pancha Mahapurusha (Ruchaka/Bhadra/Hamsa/Malavya/Sasa), Gaja Kesari,
Budha-Aditya, Parivartana, Neecha Bhanga Raja, Raja, Dhana,
Vipreet Raja, Chandra-Mangal, Kemadruma

### Shadbala (6-fold Planetary Strength)
Uchcha Bala, Sthana Bala, Dig Bala, Naisargika Bala, Chesta Bala, Drig Bala
+ Ishta/Kashta Phala · Grade: Excellent/Good/Average/Weak

### Basic Ashtakavarga
Sarvashtakavarga bindu count per sign

### Verified Reference Chart
3 October 1997, 11:40 AM IST, Jaipur (26.9124°N, 75.7873°E):
- D1 Asc: Scorpio 25° ✓
- D9 Asc: Aquarius ✓ (fixed quality-based bug → `(sign×9)%12` formula)
- Planets: Sun Virgo 16°, Moon Libra 3°, Mars Scorpio 9°(R), Mercury Virgo 8°,
  Jupiter Cap 18°(R), Venus Scorpio 0°, Saturn Pisces 23°(R), Rahu Leo 24°
- Yogas: Ruchaka, Gaja Kesari, Budha-Aditya, Parivartana (Ju–Sa), Raja (Ve–Ma)

## Features

### 1. Chart Calculator (`/`)
- Birth details form (name, date, time, place, lat/lng, timezone, ayanamsa)
- All 16 varga charts switchable via D1–D60 buttons
- South Indian SVG chart
- **Tabs**: South Indian · Planet Table · Yogas · Strengths · Panchanga
- **Yogas tab**: Detected yogas with type badges, confidence bars, planet tags
- **Strengths tab**: Shadbala table (all 6 components) + top-3 strength cards
- **Dasha panel**: Expandable 3-level Vimsottari + Ashtottari toggle
- Save button (→ library) · Interpret button (→ Interpretations page)

### 2. Rule Library (`/rules`)
- CRUD for astrological interpretation rules
- 900+ BPHS rules from `server/bphs_rules_seed.json`
- Categories: yoga, dhasa, prediction, chakra_interpretation, general
- Search + filter

### 3. PDF Toolkit (`/pdf`)
- Add/manage reference books
- **Upload PDF or .txt** — PDF converted via `pdftotext`, text extracted
- Rule extraction (up to 200 rules) with keyword scoring and category detection
- Drag-and-drop or file picker

### 4. Learning Module (`/learn`)
- Pattern analysis across ALL saved charts (up to 20)
- Detects yoga occurrences, frequency counts, confidence scores
- Stores patterns with `exampleChartIds` for traceability
- Frequency bar charts

### 5. Interpretations (`/interpret`)
- Select saved chart → auto-calculate + detect yogas + match rules
- `/api/interpret/:birthDetailsId`: calculates chart, builds keyword set from yogas/planets/signs, scores all rules, returns top 40 matches
- Rule selection checkboxes → Generate Report
- Report download

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/calculate` | Raw chart calculation |
| GET/POST | `/api/birth-details` | Birth details CRUD |
| POST | `/api/charts/calculate` | Calculate + optionally store chart |
| GET | `/api/interpret/:bdId` | Full chart + yoga + rule match |
| GET/POST | `/api/rules` | Rule library CRUD |
| GET | `/api/rules/search?q=` | Keyword rule search |
| GET/POST | `/api/books` | Reference books CRUD |
| POST | `/api/pdf/upload` | PDF→text upload (pdftotext) |
| POST | `/api/books/:id/parse-rules` | Extract rules from text |
| GET/POST | `/api/learning-patterns` | Pattern CRUD |
| POST | `/api/learning-patterns/analyze` | Analyze all charts for patterns |
| POST | `/api/interpretations/generate` | Generate interpretation report |

## Key Files

```
server/
  calculate.py          — Full calculation engine (pyswisseph)
  routes.ts             — All API routes
  storage.ts            — In-memory storage with type-safe defaults
  bphs_rules_seed.json  — 900+ BPHS rules seed data

client/src/pages/
  ChartCalculator.tsx   — Main chart page with all tabs
  Interpreter.tsx       — Auto chart→rule matching
  LearningModule.tsx    — Pattern detection
  PDFToolkit.tsx        — PDF/text import

shared/schema.ts        — Drizzle schema + Zod types
```

## Dependencies

- `pyswisseph` — Swiss Ephemeris Python bindings
- `multer` — File upload middleware for PDF
- `pdftotext` — System binary at `/nix/store/.../bin/pdftotext`
