import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

/**
 * Planets in Vedic Astrology (Navagrahas)
 * Sun through Saturn are visible planets, Rahu and Ketu are lunar nodes
 */
export const Planet = {
  Sun: 0,
  Moon: 1,
  Mars: 2,
  Mercury: 3,
  Jupiter: 4,
  Venus: 5,
  Saturn: 6,
  Rahu: 7,
  Ketu: 8,
} as const;
export type Planet = (typeof Planet)[keyof typeof Planet];
export const PlanetSchema = z.nativeEnum(Planet);

/**
 * Rasi (Zodiac Signs) in Vedic Astrology
 * Starting from Aries (Mesha) = 0 through Pisces (Meena) = 11
 */
export const Rasi = {
  Aries: 0,
  Taurus: 1,
  Gemini: 2,
  Cancer: 3,
  Leo: 4,
  Virgo: 5,
  Libra: 6,
  Scorpio: 7,
  Sagittarius: 8,
  Capricorn: 9,
  Aquarius: 10,
  Pisces: 11,
} as const;
export type Rasi = (typeof Rasi)[keyof typeof Rasi];
export const RasiSchema = z.nativeEnum(Rasi);

/**
 * Nakshatra (27 Lunar Mansions) in Vedic Astrology
 * Each nakshatra spans 13°20' of the zodiac
 */
export const Nakshatra = {
  Ashwini: 0,
  Bharani: 1,
  Krittika: 2,
  Rohini: 3,
  Mrigashira: 4,
  Ardra: 5,
  Punarvasu: 6,
  Pushya: 7,
  Ashlesha: 8,
  Magha: 9,
  PurvaPhalguni: 10,
  UttaraPhalguni: 11,
  Hasta: 12,
  Chitra: 13,
  Swati: 14,
  Vishakha: 15,
  Anuradha: 16,
  Jyeshtha: 17,
  Mula: 18,
  PurvaAshadha: 19,
  UttaraAshadha: 20,
  Shravana: 21,
  Dhanishtha: 22,
  Shatabhisha: 23,
  PurvaBhadrapada: 24,
  UttaraBhadrapada: 25,
  Revati: 26,
} as const;
export type Nakshatra = (typeof Nakshatra)[keyof typeof Nakshatra];
export const NakshatraSchema = z.nativeEnum(Nakshatra);

/**
 * Divisional Chart Types (Varga Charts)
 * D1 is the main birth chart, higher divisions reveal specific life areas
 */
export const DivisionalChartType = {
  D1_Rasi: "D1",
  D2_Hora: "D2",
  D3_Drekkana: "D3",
  D4_Chaturthamsa: "D4",
  D7_Saptamsa: "D7",
  D9_Navamsa: "D9",
  D10_Dasamsa: "D10",
  D12_Dwadasamsa: "D12",
  D16_Shodasamsa: "D16",
  D20_Vimsamsa: "D20",
  D24_Chaturvimsamsa: "D24",
  D27_Saptavimsamsa: "D27",
  D30_Trimsamsa: "D30",
  D40_Khavedamsa: "D40",
  D45_Akshavedamsa: "D45",
  D60_Shashtiamsa: "D60",
  D81: "D81",
  D108: "D108",
  D144: "D144",
  D150_NadiAmsha: "D150",
} as const;
export type DivisionalChartType = (typeof DivisionalChartType)[keyof typeof DivisionalChartType];
export const DivisionalChartTypeSchema = z.nativeEnum(DivisionalChartType);

/**
 * Chakra Types used in Vedic Astrology
 * Various chakra systems for different predictive techniques
 */
export const ChakraType = {
  Sarvatobhadra: "sarvatobhadra",
  Kota: "kota",
  Kaala: "kaala",
  Shoola: "shoola",
  Tripataki: "tripataki",
  SuryaKalanala: "surya_kalanala",
  ChandraKalanala: "chandra_kalanala",
  SapthaShalaka: "saptha_shalaka",
  PanchaShalaka: "pancha_shalaka",
  Sudarshana: "sudarshana",
} as const;
export type ChakraType = (typeof ChakraType)[keyof typeof ChakraType];
export const ChakraTypeSchema = z.nativeEnum(ChakraType);

/**
 * Rule Categories for organizing astrological rules
 * Used for filtering and categorizing interpretation rules
 */
export const RuleCategory = {
  Yoga: "yoga",
  Dhasa: "dhasa",
  Prediction: "prediction",
  ChakraInterpretation: "chakra_interpretation",
  General: "general",
} as const;
export type RuleCategory = (typeof RuleCategory)[keyof typeof RuleCategory];
export const RuleCategorySchema = z.nativeEnum(RuleCategory);

/**
 * Available Ayanamsa modes for sidereal calculations
 */
export const AyanamsaMode = {
  Lahiri: "LAHIRI",
  KP: "KP",
  Raman: "RAMAN",
  TrueCitra: "TRUE_CITRA",
  TruePushya: "TRUE_PUSHYA",
  SuryaSiddhanta: "SURYASIDDHANTA",
} as const;
export type AyanamsaMode = (typeof AyanamsaMode)[keyof typeof AyanamsaMode];
export const AyanamsaModeSchema = z.nativeEnum(AyanamsaMode);

// ============================================================================
// ZOD SCHEMAS FOR NESTED STRUCTURES
// ============================================================================

/**
 * Tithi (Lunar Day) information
 */
export const TithiSchema = z.object({
  number: z.number().int().min(1).max(30),
  name: z.string(),
  deity: z.string(),
  paksha: z.enum(["Shukla", "Krishna"]),
});
export type Tithi = z.infer<typeof TithiSchema>;

/**
 * Nakshatra details with pada information
 */
export const NakshatraDetailsSchema = z.object({
  number: z.number().int().min(0).max(26),
  name: z.string(),
  lord: z.number().int().min(0).max(8),
  pada: z.number().int().min(1).max(4),
});
export type NakshatraDetails = z.infer<typeof NakshatraDetailsSchema>;

/**
 * Yoga (Luni-Solar combination) information
 */
export const YogaSchema = z.object({
  number: z.number().int().min(1).max(27),
  name: z.string(),
});
export type Yoga = z.infer<typeof YogaSchema>;

/**
 * Karana (Half Tithi) information
 */
export const KaranaSchema = z.object({
  number: z.number().int().min(1).max(11),
  name: z.string(),
});
export type Karana = z.infer<typeof KaranaSchema>;

/**
 * Planet position data for chart calculations
 */
export const PlanetPositionSchema = z.object({
  planet: z.number().int().min(0).max(8),
  longitude: z.number().min(0).max(360),
  rasi: z.number().int().min(0).max(11),
  degree: z.number().min(0).max(30),
  nakshatra: z.number().int().min(0).max(26),
  pada: z.number().int().min(1).max(4),
  retrograde: z.boolean(),
  house: z.number().int().min(1).max(12),
});
export type PlanetPosition = z.infer<typeof PlanetPositionSchema>;

/**
 * House cusp information
 */
export const HouseCuspSchema = z.object({
  house: z.number().int().min(1).max(12),
  longitude: z.number().min(0).max(360),
  rasi: z.number().int().min(0).max(11),
  degree: z.number().min(0).max(30),
});
export type HouseCusp = z.infer<typeof HouseCuspSchema>;

/**
 * Panchanga (Five Limbs of Time) data
 */
export const PanchangaDataSchema = z.object({
  tithi: TithiSchema,
  nakshatra: NakshatraDetailsSchema,
  yoga: YogaSchema,
  karana: KaranaSchema,
  vaara: z.number().int().min(0).max(6),
  rasi: z.number().int().min(0).max(11),
  sunSign: z.number().int().min(0).max(11),
  sunrise: z.string(),
  sunset: z.string(),
  moonrise: z.string().nullable(),
  moonset: z.string().nullable(),
});
export type PanchangaData = z.infer<typeof PanchangaDataSchema>;

// ============================================================================
// DATABASE TABLES
// ============================================================================

/**
 * Users table for authentication
 */
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

/**
 * Birth Details table for storing chart calculation inputs
 * Contains date, time, location and ayanamsa preferences
 */
export const birthDetails = pgTable("birth_details", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  place: text("place").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  timezone: text("timezone").notNull(),
  ayanamsaMode: text("ayanamsa_mode").notNull().default("LAHIRI"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBirthDetailsSchema = createInsertSchema(birthDetails);
export type InsertBirthDetails = z.infer<typeof insertBirthDetailsSchema>;
export type BirthDetails = typeof birthDetails.$inferSelect;

/**
 * Chart Data table for storing calculated horoscope charts
 * Includes planet positions, houses, and ascendant for any divisional chart
 */
export const chartData = pgTable("chart_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  birthDetailsId: varchar("birth_details_id").notNull().references(() => birthDetails.id),
  chartType: text("chart_type").notNull(),
  ascendant: real("ascendant").notNull(),
  planets: json("planets").$type<PlanetPosition[]>().notNull(),
  houses: json("houses").$type<HouseCusp[]>().notNull(),
  panchanga: json("panchanga").$type<PanchangaData>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChartDataSchema = createInsertSchema(chartData);
export type InsertChartData = z.infer<typeof insertChartDataSchema>;
export type ChartData = typeof chartData.$inferSelect;

/**
 * Chakra Data table for storing various chakra diagrams
 * Flexible JSON structure accommodates different chakra types
 */
export const chakraData = pgTable("chakra_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  birthDetailsId: varchar("birth_details_id").notNull().references(() => birthDetails.id),
  chakraType: text("chakra_type").notNull(),
  data: json("data").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChakraDataSchema = createInsertSchema(chakraData);
export type InsertChakraData = z.infer<typeof insertChakraDataSchema>;
export type ChakraData = typeof chakraData.$inferSelect;

/**
 * Books table for storing reference books and texts
 * Used to track source material for rules
 */
export const books = pgTable("books", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  author: text("author").notNull(),
  chapters: text("chapters").array().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBookSchema = createInsertSchema(books);
export type InsertBook = z.infer<typeof insertBookSchema>;
export type Book = typeof books.$inferSelect;

/**
 * Rules table for storing astrological interpretation rules
 * Contains rule logic, conditions, and source references
 */
export const rules = pgTable("rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  bookId: varchar("book_id").references(() => books.id),
  chapter: text("chapter"),
  vargaApplicability: text("varga_applicability").array().notNull(),
  code: text("code").notNull(),
  conditions: json("conditions").$type<Record<string, unknown>>().notNull(),
  confidence: real("confidence").notNull().default(0.5),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRuleSchema = createInsertSchema(rules);
export type InsertRule = z.infer<typeof insertRuleSchema>;
export type Rule = typeof rules.$inferSelect;

/**
 * Learning Patterns table for storing AI-discovered patterns
 * Tracks patterns found through analysis of multiple charts
 */
export const learningPatterns = pgTable("learning_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patternType: text("pattern_type").notNull(),
  description: text("description").notNull(),
  frequency: integer("frequency").notNull().default(0),
  confidence: real("confidence").notNull().default(0.0),
  chartsAnalyzed: integer("charts_analyzed").notNull().default(0),
  discoveredAt: timestamp("discovered_at").defaultNow(),
});

export const insertLearningPatternSchema = createInsertSchema(learningPatterns);
export type InsertLearningPattern = z.infer<typeof insertLearningPatternSchema>;
export type LearningPattern = typeof learningPatterns.$inferSelect;

/**
 * Interpretations table for storing generated chart interpretations
 * Links charts to applied rules and generated reports
 */
export const interpretations = pgTable("interpretations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chartId: varchar("chart_id").notNull().references(() => chartData.id),
  appliedRuleIds: text("applied_rule_ids").array().notNull(),
  report: text("report").notNull(),
  generatedAt: timestamp("generated_at").defaultNow(),
});

export const insertInterpretationSchema = createInsertSchema(interpretations);
export type InsertInterpretation = z.infer<typeof insertInterpretationSchema>;
export type Interpretation = typeof interpretations.$inferSelect;

// ============================================================================
// HELPER CONSTANTS
// ============================================================================

/**
 * Planet names in English
 */
export const PLANET_NAMES = [
  "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"
] as const;

/**
 * Planet names in Sanskrit
 */
export const PLANET_NAMES_SANSKRIT = [
  "Surya", "Chandra", "Mangala", "Budha", "Guru", "Shukra", "Shani", "Rahu", "Ketu"
] as const;

/**
 * Rasi names in English
 */
export const RASI_NAMES = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
] as const;

/**
 * Rasi names in Sanskrit
 */
export const RASI_NAMES_SANSKRIT = [
  "Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya",
  "Tula", "Vrishchika", "Dhanu", "Makara", "Kumbha", "Meena"
] as const;

/**
 * Nakshatra names
 */
export const NAKSHATRA_NAMES = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
  "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
  "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishtha",
  "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
] as const;

/**
 * Nakshatra lords (planet ruling each nakshatra in Vimsottari order)
 */
export const NAKSHATRA_LORDS = [
  8, 5, 0, 1, 2, 7, 4, 6, 3, 8, 5, 0, 1, 2, 7, 4, 6, 3, 8, 5, 0, 1, 2, 7, 4, 6, 3
] as const;

/**
 * Weekday names
 */
export const WEEKDAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
] as const;

/**
 * Weekday names in Sanskrit
 */
export const WEEKDAY_NAMES_SANSKRIT = [
  "Ravivara", "Somavara", "Mangalavara", "Budhavara", "Guruvara", "Shukravara", "Shanivara"
] as const;

/**
 * Tithi names
 */
export const TITHI_NAMES = [
  "Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami",
  "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami",
  "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Purnima/Amavasya"
] as const;

/**
 * Yoga names (27 yogas)
 */
export const YOGA_NAMES = [
  "Vishkumbha", "Preeti", "Ayushman", "Saubhagya", "Shobhana",
  "Atiganda", "Sukarma", "Dhriti", "Shoola", "Ganda",
  "Vriddhi", "Dhruva", "Vyaghata", "Harshana", "Vajra",
  "Siddhi", "Vyatipata", "Variyan", "Parigha", "Shiva",
  "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti"
] as const;

/**
 * Karana names (11 karanas)
 */
export const KARANA_NAMES = [
  "Bava", "Balava", "Kaulava", "Taitila", "Gara",
  "Vanija", "Vishti", "Shakuni", "Chatushpada", "Naga", "Kimstughna"
] as const;

/**
 * Divisional chart factors (for calculating varga positions)
 */
export const DIVISIONAL_CHART_FACTORS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 20, 24, 27, 30, 40, 45, 60, 81, 108, 144, 150
] as const;

/**
 * House owners by rasi (0=Sun rules Leo=4, etc.)
 */
export const HOUSE_OWNERS = [2, 5, 3, 1, 0, 3, 5, 2, 4, 6, 6, 4] as const;

/**
 * Vimsottari Dasha periods in years for each planet
 */
export const VIMSOTTARI_PERIODS = {
  [Planet.Sun]: 6,
  [Planet.Moon]: 10,
  [Planet.Mars]: 7,
  [Planet.Mercury]: 17,
  [Planet.Jupiter]: 16,
  [Planet.Venus]: 20,
  [Planet.Saturn]: 19,
  [Planet.Rahu]: 18,
  [Planet.Ketu]: 7,
} as const;

/**
 * Exaltation signs for each planet
 */
export const EXALTATION_SIGNS = {
  [Planet.Sun]: Rasi.Aries,
  [Planet.Moon]: Rasi.Taurus,
  [Planet.Mars]: Rasi.Capricorn,
  [Planet.Mercury]: Rasi.Virgo,
  [Planet.Jupiter]: Rasi.Cancer,
  [Planet.Venus]: Rasi.Pisces,
  [Planet.Saturn]: Rasi.Libra,
  [Planet.Rahu]: Rasi.Taurus,
  [Planet.Ketu]: Rasi.Scorpio,
} as const;

/**
 * Debilitation signs for each planet
 */
export const DEBILITATION_SIGNS = {
  [Planet.Sun]: Rasi.Libra,
  [Planet.Moon]: Rasi.Scorpio,
  [Planet.Mars]: Rasi.Cancer,
  [Planet.Mercury]: Rasi.Pisces,
  [Planet.Jupiter]: Rasi.Capricorn,
  [Planet.Venus]: Rasi.Virgo,
  [Planet.Saturn]: Rasi.Aries,
  [Planet.Rahu]: Rasi.Scorpio,
  [Planet.Ketu]: Rasi.Taurus,
} as const;

/**
 * Own signs for each planet (mooltrikona and own signs)
 */
export const OWN_SIGNS = {
  [Planet.Sun]: [Rasi.Leo],
  [Planet.Moon]: [Rasi.Cancer],
  [Planet.Mars]: [Rasi.Aries, Rasi.Scorpio],
  [Planet.Mercury]: [Rasi.Gemini, Rasi.Virgo],
  [Planet.Jupiter]: [Rasi.Sagittarius, Rasi.Pisces],
  [Planet.Venus]: [Rasi.Taurus, Rasi.Libra],
  [Planet.Saturn]: [Rasi.Capricorn, Rasi.Aquarius],
  [Planet.Rahu]: [Rasi.Aquarius],
  [Planet.Ketu]: [Rasi.Scorpio],
} as const;
