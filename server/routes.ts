import type { Express } from "express";
import { createServer, type Server } from "http";
import { spawn } from "child_process";
import path from "path";
import { storage } from "./storage";
import {
  insertBirthDetailsSchema,
  insertRuleSchema,
  insertBookSchema,
  insertLearningPatternSchema,
  insertInterpretationSchema,
} from "@shared/schema";
import { z } from "zod";

function callPython(input: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), "server", "calculate.py");
    const proc = spawn("python3", [scriptPath], { timeout: 30000 });
    let stdout = "";
    let stderr = "";
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

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  app.post("/api/calculate", async (req, res) => {
    try {
      const body = req.body;
      const chartData = await callPython(body);
      res.json({ success: true, data: chartData });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/birth-details", async (_req, res) => {
    const list = await storage.listBirthDetails();
    res.json(list);
  });

  app.get("/api/birth-details/:id", async (req, res) => {
    const item = await storage.getBirthDetails(req.params.id);
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  });

  app.post("/api/birth-details", async (req, res) => {
    const body = {
      ...req.body,
      timezone: String(req.body.timezone ?? ""),
      ayanamsaMode: req.body.ayanamsaMode || req.body.ayanamsa_mode || "LAHIRI",
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

  app.post("/api/charts/calculate", async (req, res) => {
    try {
      const { birthDetailsId, chartType = "D1", ...rest } = req.body;
      let birthData = rest;
      if (birthDetailsId) {
        const bd = await storage.getBirthDetails(birthDetailsId);
        if (!bd) return res.status(404).json({ message: "Birth details not found" });
        birthData = { ...bd, chartType };
      } else {
        birthData = { ...birthData, chartType };
      }
      const calcResult = await callPython(birthData);
      if (birthDetailsId) {
        const stored = await storage.createChartData({
          birthDetailsId,
          chartType: chartType,
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
    const charts = await storage.getChartDataByBirthDetails(req.params.birthDetailsId);
    res.json(charts);
  });

  app.get("/api/rules", async (req, res) => {
    const category = req.query.category as string | undefined;
    const rules = await storage.listRules(category);
    res.json(rules);
  });

  app.get("/api/rules/:id", async (req, res) => {
    const rule = await storage.getRule(req.params.id);
    if (!rule) return res.status(404).json({ message: "Not found" });
    res.json(rule);
  });

  app.post("/api/rules", async (req, res) => {
    const parsed = insertRuleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const rule = await storage.createRule(parsed.data);
    res.status(201).json(rule);
  });

  app.post("/api/rules/bulk", async (req, res) => {
    const arr = req.body;
    if (!Array.isArray(arr)) return res.status(400).json({ message: "Expected an array" });
    const results: any[] = [];
    const errors: any[] = [];
    for (const item of arr) {
      const parsed = insertRuleSchema.safeParse(item);
      if (parsed.success) {
        const rule = await storage.createRule(parsed.data);
        results.push(rule);
      } else {
        errors.push({ item: item.name, errors: parsed.error.errors });
      }
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

  app.get("/api/books", async (_req, res) => {
    const books = await storage.listBooks();
    res.json(books);
  });

  app.get("/api/books/:id", async (req, res) => {
    const book = await storage.getBook(req.params.id);
    if (!book) return res.status(404).json({ message: "Not found" });
    res.json(book);
  });

  app.post("/api/books", async (req, res) => {
    const parsed = insertBookSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const book = await storage.createBook(parsed.data);
    res.status(201).json(book);
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

  app.post("/api/books/:id/parse-rules", async (req, res) => {
    const book = await storage.getBook(req.params.id);
    if (!book) return res.status(404).json({ message: "Not found" });
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: "No text provided" });

    const lines = text.split(/\n+/).filter((l: string) => l.trim().length > 20);
    const extractedRules = lines.slice(0, 5).map((line: string, i: number) => ({
      name: `Extracted Rule ${i + 1}`,
      description: line.trim(),
      category: "general",
      bookId: book.id,
      chapter: req.body.chapter || null,
      vargaApplicability: ["D1"],
      code: `# Rule extracted from ${book.title}\n# ${line.trim().substring(0, 80)}`,
      conditions: { source: book.title, extracted: true },
      confidence: 0.6,
    }));

    const created = [];
    for (const r of extractedRules) {
      const rule = await storage.createRule(r as any);
      created.push(rule);
    }
    res.json({ success: true, extracted: created.length, rules: created });
  });

  app.get("/api/learning-patterns", async (_req, res) => {
    const patterns = await storage.listLearningPatterns();
    res.json(patterns);
  });

  app.post("/api/learning-patterns", async (req, res) => {
    const parsed = insertLearningPatternSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const pattern = await storage.createLearningPattern(parsed.data);
    res.status(201).json(pattern);
  });

  app.delete("/api/learning-patterns/:id", async (req, res) => {
    const ok = await storage.deleteLearningPattern(req.params.id);
    if (!ok) return res.status(404).json({ message: "Not found" });
    res.json({ success: true });
  });

  app.post("/api/interpretations", async (req, res) => {
    const parsed = insertInterpretationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const interp = await storage.createInterpretation(parsed.data);
    res.status(201).json(interp);
  });

  app.post("/api/interpretations/generate", async (req, res) => {
    try {
      const { chartId, ruleIds, birthDetailsId } = req.body;
      if (!chartId && !birthDetailsId) {
        return res.status(400).json({ message: "chartId or birthDetailsId required" });
      }

      const rules = await storage.listRules();
      const applicableRules = ruleIds?.length
        ? rules.filter(r => ruleIds.includes(r.id))
        : rules.slice(0, 5);

      let chartInfo = "";
      if (birthDetailsId) {
        const bd = await storage.getBirthDetails(birthDetailsId);
        if (bd) chartInfo = `Chart for ${bd.name} born on ${bd.date} at ${bd.time} in ${bd.place}.`;
      }

      const reportSections = [
        `# Astrological Interpretation Report\n\n${chartInfo}`,
        `## Applied Rules (${applicableRules.length} rules)\n`,
        ...applicableRules.map(r =>
          `### ${r.name} (${r.category})\n${r.description}\n\n*Confidence: ${(r.confidence * 100).toFixed(0)}%*\n`
        ),
        `\n## Summary\n\nBased on the applied astrological rules, this chart reveals significant patterns across ${applicableRules.length} areas of life. The chart analysis uses Vedic astrological principles to provide insights into the native's karmic patterns and life trajectory.`,
      ];

      const report = reportSections.join("\n");
      const targetChartId = chartId || `bd_${birthDetailsId}`;

      const interp = await storage.createInterpretation({
        chartId: targetChartId,
        appliedRuleIds: applicableRules.map(r => r.id),
        report,
      });

      res.json({ success: true, interpretation: interp });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/interpretations/chart/:chartId", async (req, res) => {
    const interps = await storage.getInterpretationsByChart(req.params.chartId);
    res.json(interps);
  });

  app.get("/api/interpretations/:id", async (req, res) => {
    const interp = await storage.getInterpretation(req.params.id);
    if (!interp) return res.status(404).json({ message: "Not found" });
    res.json(interp);
  });

  return httpServer;
}
