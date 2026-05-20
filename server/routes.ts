import type { Express } from "express";
import { createServer, type Server } from "http";
import { spawn, execSync } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";
import multer from "multer";
import { storage } from "./storage";
import {
  insertBirthDetailsSchema,
  insertRuleSchema,
  insertBookSchema,
  insertLearningPatternSchema,
  insertInterpretationSchema,
} from "@shared/schema";
import { z } from "zod";

const upload = multer({ dest: os.tmpdir() });

const PDFTOTEXT = (() => {
  try {
    return execSync("which pdftotext 2>/dev/null || find /nix/store -name pdftotext 2>/dev/null | head -1", { timeout: 5000 }).toString().trim();
  } catch { return "pdftotext"; }
})();

function callPython(input: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), "server", "calculate.py");
    const proc = spawn("python3", [scriptPath], { timeout: 45000 });
    let stdout = "", stderr = "";
    proc.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
    proc.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
    proc.on("close", (code) => {
      try {
        const result = JSON.parse(stdout);
        if (result.success) resolve(result.data);
        else reject(new Error(result.error || "Python calculation failed"));
      } catch {
        reject(new Error(`Python error (exit ${code}): ${stderr || stdout}`));
      }
    });
    proc.on("error", reject);
    proc.stdin.write(JSON.stringify(input));
    proc.stdin.end();
  });
}

// ── Rule extraction helper ────────────────────────────────────────────────
const ASTRO_KEYWORDS = [
  'sun','moon','mars','mercury','jupiter','venus','saturn','rahu','ketu',
  'ascendant','lagna','house','sign','rasi','nakshatra','yoga','dasha',
  'exalted','debilitated','retrograde','conjunction','aspect','lord',
  'trine','kendra','dusthana','bhava','planet','transit','birth',
  'aries','taurus','gemini','cancer','leo','virgo','libra','scorpio',
  'sagittarius','capricorn','aquarius','pisces',
];

function extractRulesFromText(text: string, bookTitle: string, chapter?: string): any[] {
  const lines = text.split(/\n+/);
  const rules: any[] = [];
  let ruleNum = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length < 25 || line.length > 800) continue;

    const lower = line.toLowerCase();
    const astroScore = ASTRO_KEYWORDS.filter(kw => lower.includes(kw)).length;
    if (astroScore < 1) continue;

    // Skip headers / page numbers
    if (/^\d+$/.test(line) || /^chapter/i.test(line) || /^page/i.test(line)) continue;
    if (line.split(' ').length < 5) continue;

    // Detect category
    let category = "general";
    if (/yoga|mahapurusha|raj|dhana|hamsa|bhadra|malavya|sasa|ruchaka/i.test(line)) category = "yoga";
    else if (/dasha|antardasha|period|mahadasha/i.test(line)) category = "dhasa";
    else if (/predict|result|effect|gives|causes|brings|native will/i.test(line)) category = "prediction";
    else if (/chakra|sarvatobhadra|ashtakavarga/i.test(line)) category = "chakra_interpretation";

    ruleNum++;
    const name = line.length > 70 ? line.substring(0, 67).trim() + "…" : line;

    // Peek ahead for continuation
    let description = line;
    if (i + 1 < lines.length && lines[i+1].trim().length > 20 && lines[i+1].trim().length < 400) {
      const next = lines[i+1].trim().toLowerCase();
      const nextScore = ASTRO_KEYWORDS.filter(kw => next.includes(kw)).length;
      if (nextScore > 0 || description.endsWith(',') || description.endsWith(';')) {
        description += " " + lines[i+1].trim();
        i++;
      }
    }

    rules.push({
      name: `Rule ${ruleNum}: ${name}`,
      description: description.trim(),
      category,
      chapter: chapter || null,
      vargaApplicability: ["D1"],
      code: `# Extracted from ${bookTitle}`,
      conditions: { source: bookTitle, extractedAt: new Date().toISOString() },
      confidence: 0.55 + (Math.min(astroScore, 5) / 5) * 0.35,
    });
  }

  return rules;
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // ── Calculate ────────────────────────────────────────────────────────────
  app.post("/api/calculate", async (req, res) => {
    try {
      const chartData = await callPython(req.body);
      res.json({ success: true, data: chartData });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── Birth Details ────────────────────────────────────────────────────────
  app.get("/api/birth-details", async (_req, res) => {
    res.json(await storage.listBirthDetails());
  });

  app.get("/api/birth-details/:id", async (req, res) => {
    const item = await storage.getBirthDetails(req.params.id);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  });

  app.post("/api/birth-details", async (req, res) => {
    const body = {
      ...req.body,
      timezone: String(req.body.timezone ?? "5.5"),
      ayanamsaMode: req.body.ayanamsaMode || "LAHIRI",
    };
    const parsed = insertBirthDetailsSchema.safeParse(body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const item = await storage.createBirthDetails(parsed.data);
    res.status(201).json(item);
  });

  app.put("/api/birth-details/:id", async (req, res) => {
    const item = await storage.updateBirthDetails(req.params.id, req.body);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  });

  app.delete("/api/birth-details/:id", async (req, res) => {
    const ok = await storage.deleteBirthDetails(req.params.id);
    if (!ok) return res.status(404).json({ message: "Not found" });
    res.json({ success: true });
  });

  // ── Charts ───────────────────────────────────────────────────────────────
  app.post("/api/charts/calculate", async (req, res) => {
    try {
      const { birthDetailsId, chartType = "D1", ...rest } = req.body;
      let birthData = birthDetailsId
        ? { ...(await storage.getBirthDetails(birthDetailsId)), chartType }
        : { ...rest, chartType };
      if (birthDetailsId && !birthData.date) {
        return res.status(404).json({ message: "Birth details not found" });
      }
      const calcResult = await callPython(birthData);
      if (birthDetailsId) {
        const stored = await storage.createChartData({
          birthDetailsId,
          chartType,
          ascendant: calcResult.ascendant.longitude,
          planets: calcResult.planets,
          houses: calcResult.houses,
          panchanga: calcResult.panchanga,
        });
        res.json({ success: true, data: calcResult, chartId: stored.id });
      } else {
        res.json({ success: true, data: calcResult });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/charts/:birthDetailsId", async (req, res) => {
    res.json(await storage.getChartDataByBirthDetails(req.params.birthDetailsId));
  });

  // ── Interpretation Engine ────────────────────────────────────────────────
  // Full chart interpretation: calculates, detects yogas, matches BPHS rules
  app.get("/api/interpret/:birthDetailsId", async (req, res) => {
    try {
      const bd = await storage.getBirthDetails(req.params.birthDetailsId);
      if (!bd) return res.status(404).json({ message: "Birth details not found" });

      const calcResult = await callPython({ ...bd, chartType: "D1" });
      const yogas: any[] = calcResult.yogas || [];
      const planets: any[] = calcResult.planets || [];
      const asc: any = calcResult.ascendant || {};

      // Build keyword set from chart features
      const keywords = new Set<string>();
      planets.forEach((p: any) => {
        keywords.add(p.name.toLowerCase());
        keywords.add(p.rasiName.toLowerCase());
        keywords.add(p.nakshatraName.toLowerCase());
        if (p.strength !== "normal") keywords.add(p.strength.toLowerCase());
        if (p.retrograde) keywords.add("retrograde");
      });
      keywords.add(asc.rasiName?.toLowerCase() || "");
      yogas.forEach((y: any) => {
        y.name.toLowerCase().split(/[\s\-–]+/).forEach((w: string) => {
          if (w.length > 3) keywords.add(w);
        });
        y.planets?.forEach((pn: string) => keywords.add(pn.toLowerCase()));
      });

      // Match rules by keyword scoring
      const allRules = await storage.listRules();
      const scored = allRules.map(rule => {
        const text = (rule.name + " " + rule.description).toLowerCase();
        let score = 0;
        Array.from(keywords).forEach(kw => {
          if (kw.length > 3 && text.includes(kw)) score++;
        });
        return { rule, score };
      }).filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 40);

      res.json({
        success: true,
        birthDetails: bd,
        chart: {
          ascendant: calcResult.ascendant,
          panchanga: calcResult.panchanga,
          birthNakshatra: calcResult.birthNakshatra,
          birthNakshatraLord: calcResult.birthNakshatraLord,
        },
        planets,
        yogas,
        shadbala: calcResult.shadbala || [],
        vimsottariDasha: calcResult.vimsottariDasha || [],
        matchedRules: scored.map(({ rule, score }) => ({ ...rule, matchScore: score })),
        totalRulesSearched: allRules.length,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── Rules ────────────────────────────────────────────────────────────────
  app.get("/api/rules", async (req, res) => {
    res.json(await storage.listRules(req.query.category as string | undefined));
  });

  app.get("/api/rules/search", async (req, res) => {
    const q = (req.query.q as string || "").toLowerCase();
    if (!q) return res.json([]);
    const all = await storage.listRules();
    const hits = all.filter(r =>
      (r.name + " " + r.description).toLowerCase().includes(q)
    ).slice(0, 50);
    res.json(hits);
  });

  app.get("/api/rules/:id", async (req, res) => {
    const rule = await storage.getRule(req.params.id);
    if (!rule) return res.status(404).json({ message: "Not found" });
    res.json(rule);
  });

  app.post("/api/rules", async (req, res) => {
    const parsed = insertRuleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    res.status(201).json(await storage.createRule(parsed.data));
  });

  app.post("/api/rules/bulk", async (req, res) => {
    if (!Array.isArray(req.body)) return res.status(400).json({ message: "Expected array" });
    const results: any[] = [], errors: any[] = [];
    for (const item of req.body) {
      const parsed = insertRuleSchema.safeParse(item);
      if (parsed.success) results.push(await storage.createRule(parsed.data));
      else errors.push({ item: item.name, errors: parsed.error.errors });
    }
    res.status(201).json({ inserted: results.length, failed: errors.length, errors: errors.slice(0, 5) });
  });

  app.put("/api/rules/:id", async (req, res) => {
    const rule = await storage.updateRule(req.params.id, req.body);
    if (!rule) return res.status(404).json({ message: "Not found" });
    res.json(rule);
  });

  app.delete("/api/rules/:id", async (req, res) => {
    const ok = await storage.deleteRule(req.params.id);
    if (!ok) return res.status(404).json({ message: "Not found" });
    res.json({ success: true });
  });

  // ── Books ────────────────────────────────────────────────────────────────
  app.get("/api/books", async (_req, res) => res.json(await storage.listBooks()));
  app.get("/api/books/:id", async (req, res) => {
    const book = await storage.getBook(req.params.id);
    if (!book) return res.status(404).json({ message: "Not found" });
    res.json(book);
  });
  app.post("/api/books", async (req, res) => {
    const parsed = insertBookSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    res.status(201).json(await storage.createBook(parsed.data));
  });
  app.put("/api/books/:id", async (req, res) => {
    const book = await storage.updateBook(req.params.id, req.body);
    if (!book) return res.status(404).json({ message: "Not found" });
    res.json(book);
  });
  app.delete("/api/books/:id", async (req, res) => {
    const ok = await storage.deleteBook(req.params.id);
    if (!ok) return res.status(404).json({ message: "Not found" });
    res.json({ success: true });
  });

  // PDF upload — converts PDF to text using pdftotext
  app.post("/api/pdf/upload", upload.single("file"), async (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const filePath = req.file.path;
    const mime = req.file.mimetype || "";
    try {
      let text = "";
      if (mime === "application/pdf" || req.file.originalname?.endsWith(".pdf")) {
        text = execSync(`${PDFTOTEXT} "${filePath}" - 2>/dev/null`, { timeout: 30000 }).toString();
      } else {
        // Plain text
        text = fs.readFileSync(filePath, "utf8");
      }
      text = text.replace(/\f/g, "\n").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      res.json({ success: true, text, chars: text.length, lines: text.split("\n").length });
    } catch (e: any) {
      res.status(500).json({ success: false, error: "Could not parse file: " + e.message });
    } finally {
      try { fs.unlinkSync(filePath); } catch {}
    }
  });

  // Parse text into rules (improved — extracts up to 100 rules)
  app.post("/api/books/:id/parse-rules", async (req, res) => {
    const book = await storage.getBook(req.params.id);
    if (!book) return res.status(404).json({ message: "Not found" });
    const { text, chapter, maxRules = 100 } = req.body;
    if (!text) return res.status(400).json({ message: "No text provided" });

    const extracted = extractRulesFromText(text, book.title, chapter);
    const limited = extracted.slice(0, Number(maxRules));

    const created = [];
    for (const r of limited) {
      const parsed = insertRuleSchema.safeParse({ ...r, bookId: book.id });
      if (parsed.success) created.push(await storage.createRule(parsed.data));
    }
    res.json({ success: true, extracted: created.length, total: extracted.length, rules: created });
  });

  // ── Learning Patterns ────────────────────────────────────────────────────
  app.get("/api/learning-patterns", async (_req, res) => {
    res.json(await storage.listLearningPatterns());
  });

  app.post("/api/learning-patterns", async (req, res) => {
    const parsed = insertLearningPatternSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    res.status(201).json(await storage.createLearningPattern(parsed.data));
  });

  app.delete("/api/learning-patterns/:id", async (req, res) => {
    const ok = await storage.deleteLearningPattern(req.params.id);
    if (!ok) return res.status(404).json({ message: "Not found" });
    res.json({ success: true });
  });

  // Pattern analysis — scan all saved charts and detect yogas across them
  app.post("/api/learning-patterns/analyze", async (req, res) => {
    try {
      const allBD = await storage.listBirthDetails();
      if (allBD.length === 0) return res.json({ success: true, patterns: [], analyzed: 0 });

      const yogaCounts: Record<string, { count: number; charts: string[]; type: string; description: string }> = {};

      for (const bd of allBD.slice(0, 20)) { // limit to 20 charts
        try {
          const chart = await callPython({ ...bd, chartType: "D1" });
          const yogas: any[] = chart.yogas || [];
          for (const yoga of yogas) {
            const key = yoga.name;
            if (!yogaCounts[key]) {
              yogaCounts[key] = { count: 0, charts: [], type: yoga.type, description: yoga.description };
            }
            yogaCounts[key].count++;
            yogaCounts[key].charts.push(bd.name);
          }
        } catch { /* skip failed calculations */ }
      }

      // Convert to patterns
      const patternType: Record<string, string> = {
        mahapurusha: "yoga_occurrence",
        raja: "yoga_occurrence",
        special: "yoga_occurrence",
        wealth: "yoga_occurrence",
        exchange: "planetary_conjunction",
        solar: "planetary_conjunction",
        challenging: "nakshatra_correlation",
      };

      const sorted = Object.entries(yogaCounts)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 20);

      const created = [];
      for (const [name, data] of sorted) {
        const parsed = insertLearningPatternSchema.safeParse({
          patternType: patternType[data.type] || "yoga_occurrence",
          description: `${name}: found in ${data.count}/${allBD.length} charts. ${data.description}`,
          frequency: data.count,
          confidence: Math.min(0.95, 0.5 + (data.count / allBD.length) * 0.45),
          associatedRuleIds: [],
          exampleChartIds: data.charts.slice(0, 3).join(","),
        });
        if (parsed.success) {
          const pat = await storage.createLearningPattern(parsed.data);
          created.push(pat);
        }
      }

      res.json({ success: true, patterns: created, analyzed: allBD.length });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── Interpretations ──────────────────────────────────────────────────────
  app.post("/api/interpretations", async (req, res) => {
    const parsed = insertInterpretationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    res.status(201).json(await storage.createInterpretation(parsed.data));
  });

  app.post("/api/interpretations/generate", async (req, res) => {
    try {
      const { chartId, ruleIds, birthDetailsId } = req.body;
      if (!chartId && !birthDetailsId)
        return res.status(400).json({ message: "chartId or birthDetailsId required" });

      const rules = await storage.listRules();
      const applicable = ruleIds?.length ? rules.filter(r => ruleIds.includes(r.id)) : rules.slice(0, 10);

      let chartInfo = "";
      let yogasSection = "";

      if (birthDetailsId) {
        const bd = await storage.getBirthDetails(birthDetailsId);
        if (bd) {
          chartInfo = `Chart for **${bd.name}** born ${bd.date} at ${bd.time} in ${bd.place}.`;
          try {
            const calc = await callPython({ ...bd, chartType: "D1" });
            const yogas: any[] = calc.yogas || [];
            const asc = calc.ascendant;
            chartInfo += `\n\nAscendant: **${asc.rasiName}** ${asc.degree?.toFixed(1)}°`;
            if (yogas.length) {
              yogasSection = `\n\n## Detected Yogas (${yogas.length})\n\n` +
                yogas.map(y => `### ${y.name}\n*Type: ${y.type}* · Confidence: ${(y.confidence*100).toFixed(0)}%\n\n${y.description}`).join("\n\n");
            }
          } catch {}
        }
      }

      const report = [
        `# Astrological Interpretation\n\n${chartInfo}`,
        yogasSection,
        `\n\n## Applied Rules (${applicable.length})\n`,
        ...applicable.map(r => `### ${r.name}\n*${r.category}* · ${r.description}\n`),
        `\n\n## Summary\n\nBased on ${applicable.length} classical rules, this chart analysis reveals significant astrological configurations. The planetary positions and yogas indicate unique karmic patterns and life trajectory.`,
      ].join("\n");

      const interp = await storage.createInterpretation({
        chartId: chartId || `bd_${birthDetailsId}`,
        appliedRuleIds: applicable.map(r => r.id),
        report,
      });

      res.json({ success: true, interpretation: interp });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── PVR Life Discussion endpoint ────────────────────────────────────────
  app.get("/api/discuss/:birthDetailsId", async (req, res) => {
    try {
      const bd = await storage.getBirthDetails(req.params.birthDetailsId);
      if (!bd) return res.status(404).json({ success: false, error: "Birth details not found" });

      // First calculate chart
      const chartData = await callPython({ ...bd, chartType: "D1" });

      // Then run PVR analysis on that chart data
      const pvrData = await new Promise<any>((resolve, reject) => {
        const scriptPath = path.join(process.cwd(), "server", "pvr_rules.py");
        const proc = spawn("python3", [scriptPath], { timeout: 60000 });
        let stdout = "", stderr = "";
        proc.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
        proc.stderr.on("data", (d: Buffer) => (stderr += d.toString()));
        proc.on("close", (code) => {
          try {
            const result = JSON.parse(stdout);
            if (result.success) resolve(result.data);
            else reject(new Error(result.error || "PVR analysis failed"));
          } catch {
            reject(new Error(`PVR error (exit ${code}): ${stderr || stdout}`));
          }
        });
        proc.on("error", reject);
        proc.stdin.write(JSON.stringify({ chart_data: chartData }));
        proc.stdin.end();
      });

      res.json({
        success: true,
        birthDetails: bd,
        chartData,
        domains: pvrData,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/interpretations/chart/:chartId", async (req, res) => {
    res.json(await storage.getInterpretationsByChart(req.params.chartId));
  });

  app.get("/api/interpretations/:id", async (req, res) => {
    const interp = await storage.getInterpretation(req.params.id);
    if (!interp) return res.status(404).json({ message: "Not found" });
    res.json(interp);
  });

  return httpServer;
}
