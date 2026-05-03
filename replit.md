# Jyotisha Platform — Vedic Astrology Suite

A comprehensive Vedic Astrology web application built with Node.js/Express backend and React frontend.

## Architecture

- **Backend**: Express.js (TypeScript) on port 5000
- **Frontend**: React + Vite (served via Express in dev)
- **Calculation Engine**: Python 3.11 (`server/calculate.py`) called via child_process
- **Storage**: In-memory storage (MemStorage) with demo seed data
- **Styling**: Tailwind CSS + Shadcn UI components, warm orange primary theme

## Features

### 1. Chart Calculator (`/chart`)
- Birth details form (name, date, time, place, lat/lng, timezone, ayanamsa)
- Divisional charts D1–D60 (16 varga types)
- South Indian style SVG chart (fixed sign positions)
- Planet positions table with nakshatra, pada, house, strength
- Panchanga display (tithi, nakshatra, yoga, karana, vaara, sunrise/sunset)
- Vimsottari Dasha sequence

### 2. Rule Library (`/rules`)
- CRUD operations for astrological interpretation rules
- Categories: yoga, dhasa, prediction, chakra_interpretation, general
- Search and filter by category
- Rule detail panel with code expression, confidence bar
- 6 pre-seeded classical rules (Gaja Kesari Yoga, Dhana Yoga, etc.)

### 3. PDF Toolkit (`/pdf`)
- Reference book management (add/delete books with chapters)
- Text upload via drag-and-drop or paste
- Auto-extract astrological rules from text
- 2 pre-seeded books (Brihat Parashara Hora Shastra, Jataka Parijata)

### 4. Learning Module (`/learning`)
- Pattern discovery statistics dashboard
- Pattern type analysis (planetary conjunction, nakshatra correlation, etc.)
- Confidence scoring and occurrence tracking
- 3 pre-seeded example patterns

### 5. Interpretations (`/interpreter`)
- Select saved birth charts
- Choose which rules to apply (select all or individual)
- Generate interpretation reports via `/api/interpretations/generate`
- Download report as text file

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/calculate` | Direct chart calculation |
| POST | `/api/charts/calculate` | Calculate + optionally save chart |
| GET/POST | `/api/birth-details` | Birth details CRUD |
| GET/PUT/DELETE | `/api/birth-details/:id` | Single birth detail |
| GET | `/api/charts/:birthDetailsId` | Charts for birth detail |
| GET/POST/PUT/DELETE | `/api/rules` | Rules CRUD |
| GET/POST/DELETE | `/api/books` | Books CRUD |
| POST | `/api/books/:id/parse-rules` | Extract rules from text |
| GET/POST | `/api/learning-patterns` | Patterns CRUD |
| POST | `/api/interpretations/generate` | Generate interpretation report |
| GET | `/api/interpretations/chart/:chartId` | Get interpretations for chart |

## Python Calculation Engine

`server/calculate.py` performs Vedic astrological calculations:
- Julian Day calculation from Gregorian date/time
- Tropical Sun and Moon positions using standard astronomical formulas
- Sidereal conversion using Lahiri/KP/Raman ayanamsa
- Planet positions via seeded pseudo-random generation (approximation)
- Divisional chart calculations (D1–D150)
- Panchanga: tithi, nakshatra, yoga, karana, vaara
- Vimsottari Dasha sequence based on Moon nakshatra

## Key Files

```
server/
  index.ts          — Express server entry point
  routes.ts         — All API routes
  storage.ts        — In-memory storage with seed data
  calculate.py      — Python astronomical calculation engine
  pyjhora/          — PyJHora library stubs

client/src/
  App.tsx           — Router + theme provider
  components/
    Layout.tsx          — Header navigation + footer
    SouthIndianChart.tsx — SVG-based South Indian chart
    PanchangaGrid.tsx    — Panchanga display component
  pages/
    ChartCalculator.tsx — Main chart calculation page
    RuleLibrary.tsx     — Rule CRUD management
    PDFToolkit.tsx      — Book/text upload + rule extraction
    LearningModule.tsx  — Pattern discovery dashboard
    Interpreter.tsx     — Report generation

shared/
  schema.ts         — Drizzle schema + Zod types for all entities
```

## Theme

- Primary color: hsl(30 94% 42%) — warm saffron/orange
- Dark mode support via `.dark` CSS class on `<html>`
- Sanskrit labels alongside English for cultural authenticity
- South Indian chart with fixed sign positions (standard Vedic style)

## Running

The `Start application` workflow runs `npm run dev` which starts both Express and Vite on port 5000.
Python 3.11 must be installed (it is in this environment).
