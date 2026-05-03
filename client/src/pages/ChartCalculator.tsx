import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import SouthIndianChart from "@/components/SouthIndianChart";
import PanchangaGrid from "@/components/PanchangaGrid";
import { apiRequest } from "@/lib/queryClient";
import { RASI_NAMES, PLANET_NAMES, AyanamsaMode } from "@shared/schema";
import { Star, Save, RefreshCw, ChevronDown, AlertCircle } from "lucide-react";

const DIVISIONAL_CHARTS = [
  { value: "D1", label: "D1 – Rasi (Birth Chart)" },
  { value: "D2", label: "D2 – Hora (Wealth)" },
  { value: "D3", label: "D3 – Drekkana (Siblings)" },
  { value: "D4", label: "D4 – Chaturthamsa (Fortune)" },
  { value: "D7", label: "D7 – Saptamsa (Children)" },
  { value: "D9", label: "D9 – Navamsa (Spouse/Dharma)" },
  { value: "D10", label: "D10 – Dasamsa (Career)" },
  { value: "D12", label: "D12 – Dwadasamsa (Parents)" },
  { value: "D16", label: "D16 – Shodasamsa (Conveyances)" },
  { value: "D20", label: "D20 – Vimsamsa (Spiritual)" },
  { value: "D24", label: "D24 – Chaturvimsamsa (Education)" },
  { value: "D27", label: "D27 – Saptavimsamsa (Strength)" },
  { value: "D30", label: "D30 – Trimsamsa (Evils)" },
  { value: "D40", label: "D40 – Khavedamsa (Auspicious)" },
  { value: "D45", label: "D45 – Akshavedamsa (General)" },
  { value: "D60", label: "D60 – Shashtiamsa (Karma)" },
];

const AYANAMSA_OPTIONS = [
  { value: "LAHIRI", label: "Lahiri (Chitrapaksha)" },
  { value: "KP", label: "KP (Krishnamurti)" },
  { value: "RAMAN", label: "Raman" },
  { value: "TRUE_CITRA", label: "True Chitra" },
  { value: "TRUE_PUSHYA", label: "True Pushya" },
  { value: "SURYASIDDHANTA", label: "Surya Siddhanta" },
];

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  place: z.string().min(1, "Place is required"),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  timezone: z.coerce.number().min(-12).max(14),
  ayanamsaMode: z.string().default("LAHIRI"),
});

type FormValues = z.infer<typeof formSchema>;

const STRENGTH_BADGE: Record<string, { label: string; class: string }> = {
  exalted: { label: "Exalted", class: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  debilitated: { label: "Debilitated", class: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  own: { label: "Own Sign", class: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  normal: { label: "", class: "" },
};

export default function ChartCalculator() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [chartResult, setChartResult] = useState<any>(null);
  const [selectedChart, setSelectedChart] = useState("D1");
  const [activeTab, setActiveTab] = useState("chart");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "Example Chart",
      date: "1990-01-15",
      time: "10:30:00",
      place: "Chennai, India",
      latitude: 13.0827,
      longitude: 80.2707,
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
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await apiRequest("POST", "/api/birth-details", {
        ...values,
        timezone: String(values.timezone),
        ayanamsaMode: values.ayanamsaMode,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Saved", description: "Birth details saved successfully." });
      qc.invalidateQueries({ queryKey: ["/api/birth-details"] });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const onCalculate = (values: FormValues) => {
    calculateMutation.mutate({ ...values, chartType: selectedChart });
  };

  const onSave = () => {
    const values = form.getValues();
    saveMutation.mutate(values);
  };

  const switchChart = (chartType: string) => {
    setSelectedChart(chartType);
    const values = form.getValues();
    if (chartResult) {
      calculateMutation.mutate({ ...values, chartType });
    }
  };

  const planets = chartResult?.planets || [];
  const ascRasi = chartResult?.ascendant?.rasi ?? 0;
  const panchanga = chartResult?.panchanga;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Star className="w-6 h-6 text-primary" />
            Chart Calculator
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            kundali · कुंडली — Calculate divisional charts & panchanga
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Birth Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onCalculate)} className="space-y-3">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input data-testid="input-name" placeholder="Person's name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input data-testid="input-date" type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time</FormLabel>
                          <FormControl>
                            <Input data-testid="input-time" type="time" step="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="place"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Place of Birth</FormLabel>
                        <FormControl>
                          <Input data-testid="input-place" placeholder="City, Country" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="latitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Latitude</FormLabel>
                          <FormControl>
                            <Input data-testid="input-latitude" type="number" step="0.0001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="longitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Longitude</FormLabel>
                          <FormControl>
                            <Input data-testid="input-longitude" type="number" step="0.0001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timezone Offset (UTC±)</FormLabel>
                        <FormControl>
                          <Input data-testid="input-timezone" type="number" step="0.5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ayanamsaMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ayanamsa</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-ayanamsa">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {AYANAMSA_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2 pt-1">
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={calculateMutation.isPending}
                      data-testid="button-calculate"
                    >
                      {calculateMutation.isPending ? (
                        <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Calculating…</>
                      ) : (
                        <><Star className="w-4 h-4 mr-2" />Calculate</>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onSave}
                      disabled={saveMutation.isPending}
                      data-testid="button-save"
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {chartResult && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Vimsottari Dasha</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-0.5">
                  {(chartResult.vimsottariDasha || []).map((d: any, i: number) => (
                    <div
                      key={i}
                      data-testid={`dasha-row-${d.planet}`}
                      className={`rounded px-2 py-1.5 text-sm ${i === 0 ? "bg-primary/10 border border-primary/30" : "border border-transparent"}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={i === 0 ? "font-semibold text-primary" : "text-foreground"}>
                          {i === 0 && <span className="text-xs mr-1">▶</span>}
                          {d.planet} Dasha
                        </span>
                        <span className="text-muted-foreground text-xs font-mono">{d.years}y</span>
                      </div>
                      {d.startDate && (
                        <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                          {d.startDate} → {d.endDate}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground shrink-0">Varga:</span>
            <div className="flex flex-wrap gap-1.5">
              {DIVISIONAL_CHARTS.map(c => (
                <button
                  key={c.value}
                  onClick={() => switchChart(c.value)}
                  data-testid={`chart-tab-${c.value}`}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors border ${
                    selectedChart === c.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                  }`}
                >
                  {c.value}
                </button>
              ))}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="chart" data-testid="tab-chart">South Indian Chart</TabsTrigger>
              <TabsTrigger value="table" data-testid="tab-table">Planet Table</TabsTrigger>
              <TabsTrigger value="panchanga" data-testid="tab-panchanga">Panchanga</TabsTrigger>
            </TabsList>

            <TabsContent value="chart">
              <Card>
                <CardContent className="pt-6">
                  {calculateMutation.isPending ? (
                    <div className="flex justify-center">
                      <Skeleton className="w-96 h-96 rounded" />
                    </div>
                  ) : chartResult ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="text-center">
                        <h3 className="font-semibold text-foreground">{form.getValues().name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {form.getValues().date} · {form.getValues().time} · {form.getValues().place}
                        </p>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {DIVISIONAL_CHARTS.find(c => c.value === selectedChart)?.label || selectedChart}
                        </Badge>
                      </div>
                      <SouthIndianChart
                        planets={planets}
                        ascendantRasi={ascRasi}
                        size={400}
                        data-testid="south-indian-chart"
                      />
                      <div className="text-xs text-muted-foreground text-center">
                        Ascendant: {chartResult.ascendant?.rasiName} {chartResult.ascendant?.degree?.toFixed(2)}°
                        · Ayanamsa: {chartResult.ayanamsa?.toFixed(4)}°
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <Star className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">No chart calculated</p>
                        <p className="text-sm text-muted-foreground mt-1">Fill in birth details and click Calculate</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

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
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Planet</th>
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Sign</th>
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Degree</th>
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Nakshatra</th>
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Pada</th>
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">House</th>
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {planets.map((p: any) => {
                            const s = STRENGTH_BADGE[p.strength] || STRENGTH_BADGE.normal;
                            return (
                              <tr key={p.name} className="border-b border-border/50 hover:bg-accent/30" data-testid={`planet-row-${p.name}`}>
                                <td className="py-2 px-3 font-medium">
                                  {p.name}
                                  {p.retrograde && <span className="text-xs text-muted-foreground ml-1">(R)</span>}
                                </td>
                                <td className="py-2 px-3">{p.rasiName}</td>
                                <td className="py-2 px-3 font-mono text-xs">{p.degree?.toFixed(2)}°</td>
                                <td className="py-2 px-3">{p.nakshatraName}</td>
                                <td className="py-2 px-3">{p.pada}</td>
                                <td className="py-2 px-3">{p.house}</td>
                                <td className="py-2 px-3">
                                  {s.label && (
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.class}`}>{s.label}</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Calculate chart to view planet positions</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="panchanga">
              <PanchangaGrid panchanga={panchanga} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
