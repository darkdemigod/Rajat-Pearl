import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import SouthIndianChart from "@/components/SouthIndianChart";
import PanchangaGrid from "@/components/PanchangaGrid";
import { apiRequest } from "@/lib/queryClient";
import { Star, Save, RefreshCw, ChevronDown, ChevronRight, BookOpen, Zap } from "lucide-react";

const DIVISIONAL_CHARTS = [
  { value: "D1", label: "D1 – Rasi" }, { value: "D2", label: "D2 – Hora" },
  { value: "D3", label: "D3 – Drekkana" }, { value: "D4", label: "D4 – Chaturthamsa" },
  { value: "D7", label: "D7 – Saptamsa" }, { value: "D9", label: "D9 – Navamsa" },
  { value: "D10", label: "D10 – Dasamsa" }, { value: "D12", label: "D12 – Dwadasamsa" },
  { value: "D16", label: "D16 – Shodasamsa" }, { value: "D20", label: "D20 – Vimsamsa" },
  { value: "D24", label: "D24 – Chaturvimsamsa" }, { value: "D27", label: "D27 – Saptavimsamsa" },
  { value: "D30", label: "D30 – Trimsamsa" }, { value: "D40", label: "D40 – Khavedamsa" },
  { value: "D45", label: "D45 – Akshavedamsa" }, { value: "D60", label: "D60 – Shashtiamsa" },
];

const AYANAMSA_OPTIONS = [
  { value: "LAHIRI", label: "Lahiri (Chitrapaksha)" },
  { value: "KP", label: "KP (Krishnamurti)" },
  { value: "RAMAN", label: "Raman" },
  { value: "TRUE_CITRA", label: "True Chitra" },
  { value: "TRUE_PUSHYA", label: "True Pushya" },
  { value: "SURYASIDDHANTA", label: "Surya Siddhanta" },
];

const YOGA_TYPE_STYLE: Record<string, string> = {
  mahapurusha: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  raja:        "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  special:     "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  wealth:      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  exchange:    "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  solar:       "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  challenging: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const STRENGTH_STYLE: Record<string, string> = {
  exalted:     "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  debilitated: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  own:         "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  normal:      "",
};

const GRADE_COLOR: Record<string, string> = {
  Excellent: "text-emerald-600 dark:text-emerald-400",
  Good:      "text-blue-600 dark:text-blue-400",
  Average:   "text-amber-600 dark:text-amber-400",
  Weak:      "text-red-600 dark:text-red-400",
};

const formSchema = z.object({
  name:        z.string().min(1, "Name is required"),
  date:        z.string().min(1, "Date is required"),
  time:        z.string().min(1, "Time is required"),
  place:       z.string().min(1, "Place is required"),
  latitude:    z.coerce.number().min(-90).max(90),
  longitude:   z.coerce.number().min(-180).max(180),
  timezone:    z.coerce.number().min(-12).max(14),
  ayanamsaMode: z.string().default("LAHIRI"),
});
type FormValues = z.infer<typeof formSchema>;

// ── Dasha Drill-Down Component ───────────────────────────────────────────────
function DashaRow({ dasha, level = 0 }: { dasha: any; level?: number }) {
  const [open, setOpen] = useState(false);
  const antars: any[] = dasha.antardashas || dasha.pratyantardashas || [];
  const hasChildren = antars.length > 0;
  const indent = level * 12;

  return (
    <div className={level > 0 ? "border-l border-border/50 ml-2" : ""}>
      <div
        className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded text-sm cursor-pointer transition-colors
          ${level === 0 ? "hover:bg-accent/40" : level === 1 ? "hover:bg-accent/20" : "hover:bg-accent/10"}
          ${level === 0 && dasha.order === 0 ? "bg-primary/10 border border-primary/30" : ""}
        `}
        style={{ paddingLeft: `${8 + indent}px` }}
        onClick={() => hasChildren && setOpen(o => !o)}
        data-testid={`dasha-row-${dasha.planet}-L${level}`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {hasChildren ? (
            open ? <ChevronDown className="w-3 h-3 shrink-0 text-muted-foreground" />
                 : <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground" />
          ) : <span className="w-3 h-3 shrink-0" />}
          <span className={`font-medium truncate ${level === 0 ? (dasha.order === 0 ? "text-primary" : "text-foreground") : "text-foreground/80"}`}>
            {level === 0 && dasha.order === 0 && <span className="text-xs mr-1 text-primary">▶</span>}
            {dasha.planet}
            {dasha.years && <span className="text-muted-foreground font-normal ml-1 text-xs">({dasha.years}y)</span>}
          </span>
        </div>
        <div className="text-xs text-muted-foreground font-mono shrink-0">
          {dasha.startDate?.substring(0,7)} → {dasha.endDate?.substring(0,7)}
        </div>
      </div>
      {open && antars.map((child: any, i: number) => (
        <DashaRow key={i} dasha={child} level={level + 1} />
      ))}
    </div>
  );
}

export default function ChartCalculator() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const [chartResult, setChartResult] = useState<any>(null);
  const [selectedChart, setSelectedChart] = useState("D1");
  const [activeTab, setActiveTab] = useState("chart");
  const [dashaSystem, setDashaSystem] = useState<"vimsottari" | "ashtottari">("vimsottari");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "Rajat",
      date: "1997-10-03",
      time: "11:40",
      place: "Jaipur, India",
      latitude: 26.9124,
      longitude: 75.7873,
      timezone: 5.5,
      ayanamsaMode: "LAHIRI",
    },
  });

  const calculateMutation = useMutation({
    mutationFn: async (values: FormValues & { chartType: string }) => {
      const res = await apiRequest("POST", "/api/charts/calculate", values);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setChartResult(data.data);
      } else {
        toast({ title: "Calculation Error", description: data.error, variant: "destructive" });
      }
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await apiRequest("POST", "/api/birth-details", {
        name:         values.name,
        date:         values.date,
        time:         values.time,
        place:        values.place,
        latitude:     values.latitude,
        longitude:    values.longitude,
        timezone:     String(values.timezone),
        ayanamsaMode: values.ayanamsaMode,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Save failed");
      }
      return res.json();
    },
    onSuccess: (saved) => {
      toast({ title: "Saved", description: `${saved.name}'s chart saved to library.` });
      qc.invalidateQueries({ queryKey: ["/api/birth-details"] });
    },
    onError: (e: any) => toast({ title: "Save Error", description: e.message, variant: "destructive" }),
  });

  const onCalculate = (values: FormValues) =>
    calculateMutation.mutate({ ...values, chartType: selectedChart });

  const onSave = () => {
    const v = form.getValues();
    if (!v.name || !v.date || !v.time) {
      toast({ title: "Required fields missing", description: "Fill in Name, Date and Time before saving.", variant: "destructive" });
      return;
    }
    saveMutation.mutate(v);
  };

  const switchChart = (ct: string) => {
    setSelectedChart(ct);
    if (chartResult) calculateMutation.mutate({ ...form.getValues(), chartType: ct });
  };

  const planets = chartResult?.planets || [];
  const ascRasi = chartResult?.ascendant?.rasi ?? 0;
  const yogas: any[] = chartResult?.yogas || [];
  const shadbala: any[] = chartResult?.shadbala || [];
  const vimsottari: any[] = chartResult?.vimsottariDasha || [];
  const ashtottari: any[] = chartResult?.ashtottariDasha || [];
  const dashaData = dashaSystem === "ashtottari" ? ashtottari : vimsottari;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Star className="w-6 h-6 text-primary" />
            Chart Calculator
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            kundali · कुंडली — All divisional charts, dashas, yogas & strengths
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        {/* ── Left Panel ── */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Birth Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onCalculate)} className="space-y-3">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl><Input data-testid="input-name" placeholder="Person's name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="date" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl><Input data-testid="input-date" type="date" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="time" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time</FormLabel>
                        <FormControl><Input data-testid="input-time" type="time" step="60" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="place" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Place</FormLabel>
                      <FormControl><Input data-testid="input-place" placeholder="City, Country" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="latitude" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Latitude</FormLabel>
                        <FormControl><Input data-testid="input-latitude" type="number" step="0.0001" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="longitude" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Longitude</FormLabel>
                        <FormControl><Input data-testid="input-longitude" type="number" step="0.0001" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="timezone" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timezone (UTC±)</FormLabel>
                      <FormControl><Input data-testid="input-timezone" type="number" step="0.5" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="ayanamsaMode" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ayanamsa</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-ayanamsa"><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {AYANAMSA_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="flex gap-2 pt-1">
                    <Button type="submit" className="flex-1" disabled={calculateMutation.isPending} data-testid="button-calculate">
                      {calculateMutation.isPending
                        ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Calculating…</>
                        : <><Star className="w-4 h-4 mr-2" />Calculate</>}
                    </Button>
                    <Button type="button" variant="outline" onClick={onSave} disabled={saveMutation.isPending} title="Save chart" data-testid="button-save">
                      {saveMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </Button>
                    {chartResult && (
                      <Button type="button" variant="outline" onClick={() => setLocation("/interpret")} title="Open in Interpreter" data-testid="button-interpret">
                        <BookOpen className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* ── Dasha Panel ── */}
          {chartResult && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Dasha Periods</CardTitle>
                  <div className="flex gap-1">
                    {(["vimsottari", "ashtottari"] as const).map(ds => (
                      <button key={ds} onClick={() => setDashaSystem(ds)}
                        className={`text-xs px-2 py-0.5 rounded border transition-colors ${dashaSystem === ds ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                        data-testid={`dasha-system-${ds}`}>
                        {ds === "vimsottari" ? "Vimsottari" : "Ashtottari"}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Click a row to expand sub-dashas</p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-0.5 max-h-80 overflow-y-auto pr-1">
                  {dashaData.map((d: any, i: number) => (
                    <DashaRow key={i} dasha={d} level={0} />
                  ))}
                  {dashaData.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      {dashaSystem === "ashtottari" ? "Ashtottari dasha computed" : "Calculating…"}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right Panel ── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground shrink-0">Varga:</span>
            <div className="flex flex-wrap gap-1">
              {DIVISIONAL_CHARTS.map(c => (
                <button key={c.value} onClick={() => switchChart(c.value)}
                  data-testid={`chart-tab-${c.value}`}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors border ${
                    selectedChart === c.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                  }`}>
                  {c.value}
                </button>
              ))}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 flex-wrap h-auto">
              <TabsTrigger value="chart" data-testid="tab-chart">South Indian</TabsTrigger>
              <TabsTrigger value="table" data-testid="tab-table">Planet Table</TabsTrigger>
              <TabsTrigger value="yogas" data-testid="tab-yogas">
                Yogas {yogas.length > 0 && <Badge className="ml-1.5 text-xs px-1.5 py-0">{yogas.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="strengths" data-testid="tab-strengths">Strengths</TabsTrigger>
              <TabsTrigger value="panchanga" data-testid="tab-panchanga">Panchanga</TabsTrigger>
            </TabsList>

            {/* ── Chart Tab ── */}
            <TabsContent value="chart">
              <Card>
                <CardContent className="pt-6">
                  {calculateMutation.isPending ? (
                    <div className="flex justify-center"><Skeleton className="w-96 h-96 rounded" /></div>
                  ) : chartResult ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="text-center">
                        <h3 className="font-semibold">{form.getValues().name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {form.getValues().date} · {form.getValues().time} · {form.getValues().place}
                        </p>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {DIVISIONAL_CHARTS.find(c => c.value === selectedChart)?.label || selectedChart}
                        </Badge>
                      </div>
                      <SouthIndianChart planets={planets} ascendantRasi={ascRasi} size={400} />
                      <div className="text-xs text-muted-foreground text-center">
                        Ascendant: <strong>{chartResult.ascendant?.rasiName}</strong> {chartResult.ascendant?.degree?.toFixed(2)}°
                        · Ayanamsa: {chartResult.ayanamsa?.toFixed(4)}°
                        {chartResult.birthNakshatra && ` · Birth Nak: ${chartResult.birthNakshatra}`}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <Star className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">No chart calculated</p>
                        <p className="text-sm text-muted-foreground mt-1">Fill in birth details and click Calculate</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Planet Table Tab ── */}
            <TabsContent value="table">
              <Card>
                <CardContent className="pt-4">
                  {calculateMutation.isPending ? (
                    <div className="space-y-2">{[...Array(9)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
                  ) : planets.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm" data-testid="planet-table">
                        <thead>
                          <tr className="border-b border-border">
                            {["Planet","Sign","Degree","Nakshatra","Pada","House","Status"].map(h => (
                              <th key={h} className="text-left py-2 px-2 font-medium text-muted-foreground text-xs">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {planets.map((p: any) => (
                            <tr key={p.name} className="border-b border-border/50 hover:bg-accent/30" data-testid={`planet-row-${p.name}`}>
                              <td className="py-2 px-2 font-medium text-sm">
                                {p.name}
                                {p.retrograde && <span className="text-xs text-muted-foreground ml-1">(R)</span>}
                              </td>
                              <td className="py-2 px-2 text-sm">{p.rasiName}</td>
                              <td className="py-2 px-2 font-mono text-xs">{p.degree?.toFixed(2)}°</td>
                              <td className="py-2 px-2 text-xs">{p.nakshatraName}</td>
                              <td className="py-2 px-2 text-xs">{p.pada}</td>
                              <td className="py-2 px-2 text-xs">{p.house}</td>
                              <td className="py-2 px-2">
                                {p.strength !== "normal" && (
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${STRENGTH_STYLE[p.strength]}`}>
                                    {p.strength}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Calculate chart to view planet positions</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Yogas Tab ── */}
            <TabsContent value="yogas">
              <Card>
                <CardContent className="pt-4">
                  {calculateMutation.isPending ? (
                    <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
                  ) : yogas.length > 0 ? (
                    <div className="space-y-3" data-testid="yogas-list">
                      {yogas.map((y: any, i: number) => (
                        <div key={i} className="rounded-lg border border-border p-4 space-y-2" data-testid={`yoga-card-${i}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-foreground">{y.name}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${YOGA_TYPE_STYLE[y.type] || YOGA_TYPE_STYLE.special}`}>
                                {y.type.replace(/_/g, " ")}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{ width: `${(y.confidence * 100).toFixed(0)}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground">{(y.confidence * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{y.description}</p>
                          {y.planets?.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap pt-0.5">
                              {y.planets.map((pn: string) => (
                                <Badge key={pn} variant="secondary" className="text-xs">{pn}</Badge>
                              ))}
                              {y.houses?.filter(Boolean).map((h: number) => (
                                <Badge key={h} variant="outline" className="text-xs">H{h}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : chartResult ? (
                    <div className="text-center py-12">
                      <Zap className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                      <p className="font-medium text-foreground">No classical yogas detected</p>
                      <p className="text-sm text-muted-foreground mt-1">This chart has no standard yoga configurations</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Calculate a chart to detect yogas</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Strengths Tab ── */}
            <TabsContent value="strengths">
              <Card>
                <CardContent className="pt-4">
                  {calculateMutation.isPending ? (
                    <div className="space-y-2">{[...Array(7)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
                  ) : shadbala.length > 0 ? (
                    <div className="space-y-4">
                      <p className="text-xs text-muted-foreground">Shadbala — six-fold planetary strength (higher = stronger)</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs" data-testid="shadbala-table">
                          <thead>
                            <tr className="border-b border-border">
                              {["Planet","Uchcha","Sthana","Dig","Naisarg.","Chesta","Drig","Total","Grade"].map(h => (
                                <th key={h} className="text-left py-2 px-2 font-medium text-muted-foreground">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {shadbala.map((s: any, i: number) => (
                              <tr key={i} className="border-b border-border/50 hover:bg-accent/30" data-testid={`shadbala-row-${s.planet}`}>
                                <td className="py-2 px-2 font-medium">{s.planet}</td>
                                <td className="py-2 px-2 font-mono">{s.ucchaBala}</td>
                                <td className="py-2 px-2 font-mono">{s.sthanaBala}</td>
                                <td className="py-2 px-2 font-mono">{s.digBala}</td>
                                <td className="py-2 px-2 font-mono">{s.naisargikaBala}</td>
                                <td className="py-2 px-2 font-mono">{s.cheshtaBala}</td>
                                <td className="py-2 px-2 font-mono">{s.drigBala}</td>
                                <td className="py-2 px-2 font-mono font-semibold">{s.total}</td>
                                <td className={`py-2 px-2 font-medium ${GRADE_COLOR[s.grade] || ""}`}>{s.grade}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                        {shadbala.slice(0,3).map((s: any) => (
                          <div key={s.planet} className="bg-accent/30 rounded-lg p-3 text-center">
                            <div className="text-sm font-semibold text-foreground">{s.planet}</div>
                            <div className={`text-xl font-bold mt-0.5 ${GRADE_COLOR[s.grade]}`}>{s.total}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{s.grade}</div>
                            <div className="text-xs text-muted-foreground">Ishta: {s.ishtaPhala}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : chartResult ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Shadbala calculated for D1 chart only</p>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Calculate a D1 chart to view strengths</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Panchanga Tab ── */}
            <TabsContent value="panchanga">
              <PanchangaGrid panchanga={chartResult?.panchanga} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
