import type {
  User, InsertUser,
  BirthDetails, InsertBirthDetails,
  ChartData, InsertChartData,
  Rule, InsertRule,
  Book, InsertBook,
  LearningPattern, InsertLearningPattern,
  Interpretation, InsertInterpretation,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getBirthDetails(id: string): Promise<BirthDetails | undefined>;
  listBirthDetails(): Promise<BirthDetails[]>;
  createBirthDetails(bd: InsertBirthDetails): Promise<BirthDetails>;
  updateBirthDetails(id: string, bd: Partial<InsertBirthDetails>): Promise<BirthDetails | undefined>;
  deleteBirthDetails(id: string): Promise<boolean>;

  getChartData(id: string): Promise<ChartData | undefined>;
  getChartDataByBirthDetails(birthDetailsId: string): Promise<ChartData[]>;
  createChartData(cd: InsertChartData): Promise<ChartData>;
  deleteChartData(id: string): Promise<boolean>;

  getRule(id: string): Promise<Rule | undefined>;
  listRules(category?: string): Promise<Rule[]>;
  createRule(rule: InsertRule): Promise<Rule>;
  updateRule(id: string, rule: Partial<InsertRule>): Promise<Rule | undefined>;
  deleteRule(id: string): Promise<boolean>;

  getBook(id: string): Promise<Book | undefined>;
  listBooks(): Promise<Book[]>;
  createBook(book: InsertBook): Promise<Book>;
  updateBook(id: string, book: Partial<InsertBook>): Promise<Book | undefined>;
  deleteBook(id: string): Promise<boolean>;

  getLearningPattern(id: string): Promise<LearningPattern | undefined>;
  listLearningPatterns(): Promise<LearningPattern[]>;
  createLearningPattern(lp: InsertLearningPattern): Promise<LearningPattern>;
  updateLearningPattern(id: string, lp: Partial<InsertLearningPattern>): Promise<LearningPattern | undefined>;
  deleteLearningPattern(id: string): Promise<boolean>;

  getInterpretation(id: string): Promise<Interpretation | undefined>;
  getInterpretationsByChart(chartId: string): Promise<Interpretation[]>;
  createInterpretation(interp: InsertInterpretation): Promise<Interpretation>;
  deleteInterpretation(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private birthDetailsMap: Map<string, BirthDetails> = new Map();
  private chartDataMap: Map<string, ChartData> = new Map();
  private rulesMap: Map<string, Rule> = new Map();
  private booksMap: Map<string, Book> = new Map();
  private learningPatternsMap: Map<string, LearningPattern> = new Map();
  private interpretationsMap: Map<string, Interpretation> = new Map();

  constructor() {
    this._seedDemoData();
  }

  private _seedDemoData() {
    const bookId = randomUUID();
    const book: Book = {
      id: bookId,
      title: "Brihat Parashara Hora Shastra",
      author: "Maharishi Parashara",
      chapters: ["Chapter 1: Creation", "Chapter 2: Planetary Nature", "Chapter 3: Signs", "Chapter 4: Lordships", "Chapter 5: Aspects"],
      createdAt: new Date(),
    };
    this.booksMap.set(bookId, book);

    const book2Id = randomUUID();
    const book2: Book = {
      id: book2Id,
      title: "Jataka Parijata",
      author: "Vaidyanatha Dikshita",
      chapters: ["Adhyaya 1", "Adhyaya 2", "Adhyaya 3"],
      createdAt: new Date(),
    };
    this.booksMap.set(book2Id, book2);

    const seedRules: Omit<Rule, 'id' | 'createdAt'>[] = [
      {
        name: "Gaja Kesari Yoga",
        description: "Jupiter in kendra from Moon forms Gaja Kesari Yoga, bestowing fame, intelligence and prosperity.",
        category: "yoga",
        bookId: bookId,
        chapter: "Chapter 36",
        vargaApplicability: ["D1", "D9"],
        code: "if moon_house and jup_house: abs(jup_house - moon_house) % 12 in [0,3,6,9]",
        conditions: { planet1: "Jupiter", planet2: "Moon", relationship: "kendra" },
        confidence: 0.95,
      },
      {
        name: "Dhana Yoga",
        description: "Lord of 2nd and lord of 11th in mutual conjunction or aspecting each other creates Dhana Yoga for wealth.",
        category: "yoga",
        bookId: bookId,
        chapter: "Chapter 41",
        vargaApplicability: ["D1", "D2"],
        code: "if lord_2 and lord_11: in_conjunction(lord_2, lord_11) or mutual_aspect(lord_2, lord_11)",
        conditions: { lords: ["2nd", "11th"], relationship: "conjunction_or_aspect" },
        confidence: 0.88,
      },
      {
        name: "Vimsottari Moon Nakshatra",
        description: "Dasha sequence determined by Moon's nakshatra at birth using Vimsottari system.",
        category: "dhasa",
        bookId: bookId,
        chapter: "Chapter 46",
        vargaApplicability: ["D1"],
        code: "dasha_lord = nakshatra_lord(moon_nakshatra); sequence = vimsottari_sequence(dasha_lord)",
        conditions: { planet: "Moon", system: "vimsottari" },
        confidence: 0.99,
      },
      {
        name: "Kuja Dosha",
        description: "Mars in 1st, 2nd, 4th, 7th, 8th or 12th house from Lagna creates Kuja Dosha affecting marriage.",
        category: "prediction",
        bookId: book2Id,
        chapter: "Adhyaya 2",
        vargaApplicability: ["D1", "D9"],
        code: "if mars_house in [1,2,4,7,8,12]: kuja_dosha = True",
        conditions: { planet: "Mars", houses: [1, 2, 4, 7, 8, 12] },
        confidence: 0.82,
      },
      {
        name: "Sarvatobhadra Chakra - Tara Bala",
        description: "Tara Bala in Sarvatobhadra Chakra shows auspiciousness of transiting planets.",
        category: "chakra_interpretation",
        bookId: null,
        chapter: null,
        vargaApplicability: ["D1"],
        code: "tara = (transit_nak - birth_nak) % 27; auspicious = tara in [1,3,5,7]",
        conditions: { chakra: "sarvatobhadra", method: "tara_bala" },
        confidence: 0.78,
      },
      {
        name: "Neecha Bhanga Raja Yoga",
        description: "When a debilitated planet's dispositor is in kendra or the debilitation sign lord is in kendra, cancellation of debility creates Neecha Bhanga Raja Yoga.",
        category: "yoga",
        bookId: bookId,
        chapter: "Chapter 39",
        vargaApplicability: ["D1", "D9", "D10"],
        code: "if debilitated_planet: check_dispositor_kendra(planet) or check_sign_lord_kendra(planet)",
        conditions: { condition: "debilitation_cancellation" },
        confidence: 0.85,
      },
    ];

    for (const rule of seedRules) {
      const id = randomUUID();
      this.rulesMap.set(id, { ...rule, id, createdAt: new Date() });
    }

    const seedPatterns: Omit<LearningPattern, 'id' | 'discoveredAt'>[] = [
      {
        patternType: "planetary_conjunction",
        description: "Jupiter-Venus conjunction in angular houses appears in 73% of charts with significant financial success periods.",
        frequency: 47,
        confidence: 0.73,
        chartsAnalyzed: 64,
      },
      {
        patternType: "nakshatra_correlation",
        description: "Charts with Moon in Rohini nakshatra show heightened creativity and artistic expression in 68% of cases.",
        frequency: 34,
        confidence: 0.68,
        chartsAnalyzed: 50,
      },
      {
        patternType: "dasha_pattern",
        description: "Saturn Mahadasha with Jupiter antardasha frequently coincides with career advancement and recognition.",
        frequency: 28,
        confidence: 0.71,
        chartsAnalyzed: 39,
      },
    ];

    for (const pattern of seedPatterns) {
      const id = randomUUID();
      this.learningPatternsMap.set(id, { ...pattern, id, discoveredAt: new Date() });
    }
  }

  async getUser(id: string) { return this.users.get(id); }
  async getUserByUsername(username: string) {
    return Array.from(this.users.values()).find(u => u.username === username);
  }
  async createUser(user: InsertUser): Promise<User> {
    const id = randomUUID();
    const u: User = { ...user, id };
    this.users.set(id, u);
    return u;
  }

  async getBirthDetails(id: string) { return this.birthDetailsMap.get(id); }
  async listBirthDetails() {
    return Array.from(this.birthDetailsMap.values()).sort(
      (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
    );
  }
  async createBirthDetails(bd: InsertBirthDetails): Promise<BirthDetails> {
    const id = randomUUID();
    const item: BirthDetails = { ...bd, id, createdAt: new Date() };
    this.birthDetailsMap.set(id, item);
    return item;
  }
  async updateBirthDetails(id: string, bd: Partial<InsertBirthDetails>) {
    const existing = this.birthDetailsMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...bd };
    this.birthDetailsMap.set(id, updated);
    return updated;
  }
  async deleteBirthDetails(id: string) {
    return this.birthDetailsMap.delete(id);
  }

  async getChartData(id: string) { return this.chartDataMap.get(id); }
  async getChartDataByBirthDetails(birthDetailsId: string) {
    return Array.from(this.chartDataMap.values()).filter(c => c.birthDetailsId === birthDetailsId);
  }
  async createChartData(cd: InsertChartData): Promise<ChartData> {
    const id = randomUUID();
    const item: ChartData = { ...cd, id, createdAt: new Date() };
    this.chartDataMap.set(id, item);
    return item;
  }
  async deleteChartData(id: string) { return this.chartDataMap.delete(id); }

  async getRule(id: string) { return this.rulesMap.get(id); }
  async listRules(category?: string) {
    const all = Array.from(this.rulesMap.values()).sort(
      (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
    );
    if (category && category !== 'all') return all.filter(r => r.category === category);
    return all;
  }
  async createRule(rule: InsertRule): Promise<Rule> {
    const id = randomUUID();
    const item: Rule = { ...rule, id, createdAt: new Date() };
    this.rulesMap.set(id, item);
    return item;
  }
  async updateRule(id: string, rule: Partial<InsertRule>) {
    const existing = this.rulesMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...rule };
    this.rulesMap.set(id, updated);
    return updated;
  }
  async deleteRule(id: string) { return this.rulesMap.delete(id); }

  async getBook(id: string) { return this.booksMap.get(id); }
  async listBooks() {
    return Array.from(this.booksMap.values()).sort(
      (a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
    );
  }
  async createBook(book: InsertBook): Promise<Book> {
    const id = randomUUID();
    const item: Book = { ...book, id, createdAt: new Date() };
    this.booksMap.set(id, item);
    return item;
  }
  async updateBook(id: string, book: Partial<InsertBook>) {
    const existing = this.booksMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...book };
    this.booksMap.set(id, updated);
    return updated;
  }
  async deleteBook(id: string) { return this.booksMap.delete(id); }

  async getLearningPattern(id: string) { return this.learningPatternsMap.get(id); }
  async listLearningPatterns() {
    return Array.from(this.learningPatternsMap.values()).sort(
      (a, b) => (b.confidence) - (a.confidence)
    );
  }
  async createLearningPattern(lp: InsertLearningPattern): Promise<LearningPattern> {
    const id = randomUUID();
    const item: LearningPattern = { ...lp, id, discoveredAt: new Date() };
    this.learningPatternsMap.set(id, item);
    return item;
  }
  async updateLearningPattern(id: string, lp: Partial<InsertLearningPattern>) {
    const existing = this.learningPatternsMap.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...lp };
    this.learningPatternsMap.set(id, updated);
    return updated;
  }
  async deleteLearningPattern(id: string) { return this.learningPatternsMap.delete(id); }

  async getInterpretation(id: string) { return this.interpretationsMap.get(id); }
  async getInterpretationsByChart(chartId: string) {
    return Array.from(this.interpretationsMap.values()).filter(i => i.chartId === chartId);
  }
  async createInterpretation(interp: InsertInterpretation): Promise<Interpretation> {
    const id = randomUUID();
    const item: Interpretation = { ...interp, id, generatedAt: new Date() };
    this.interpretationsMap.set(id, item);
    return item;
  }
  async deleteInterpretation(id: string) { return this.interpretationsMap.delete(id); }
}

export const storage = new MemStorage();
