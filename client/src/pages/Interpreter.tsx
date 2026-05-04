import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { BirthDetails, Rule, Interpretation } from "@shared/schema";
import {
  MessageSquare, Star, ChevronRight, RefreshCw, BookOpen, User,
  Wand2, Download, Check, Zap, BarChart2,
} from "lucide-react";

const CATEGORY_BADGE: Record<string, string> = {
  yoga: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  dhasa: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  prediction: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  chakra_interpretation: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  general: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400",
};

const YOGA_TYPE_STYLE: Record<string, string> = {
  mahapurusha: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  raja: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  special: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  wealth: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  exchange: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  solar: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  challenging: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

function parseMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-6 mb-2 text-primary">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-2 mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-muted-foreground">$1</em>')
    .replace(/\n\n/g, '</p><p class="mb-3">')
    .replace(/\n/g, '<br/>');
}

export default function Interpreter() {
  const { toast } = useToast();
  const [selectedBD, setSelectedBD] = useState<BirthDetails | null>(null);
  const [selectedRuleIds, setSelectedRuleIds] = useState<Set<string>>(new Set());
  const [generatedReport, setGeneratedReport] = useState<Interpretation | null>(null);
  const [activeView, setActiveView] = useState<"rules" | "yogas" | "report">("rules");

  const { data: birthDetailsList = [], isLoading: bdLoading } = useQuery<BirthDetails[]>({
    queryKey: ["/api/birth-details"],
  });

  const { data: allRules = [], isLoading: rulesLoading } = useQuery<Rule[]>({
    queryKey: ["/api/rules"],
  });

  // Auto-interpret when a chart is selected
  const interpretQuery = useQuery({
    queryKey: ["/api/interpret", selectedBD?.id],
    enabled: !!selectedBD?.id,
    queryFn: async () => {
      const res = await fetch(`/api/interpret/${selectedBD!.id}`);
      if (!res.ok) throw new Error("Interpretation failed");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const matchedRules: any[] = interpretQuery.data?.matchedRules || [];
  const yogas: any[] = interpretQuery.data?.yogas || [];
  const chartData: any = interpretQuery.data?.chart || null;

  // Auto-select matched rules when interpretation loads
  const selectBD = (bd: BirthDetails) => {
    setSelectedBD(bd);
    setGeneratedReport(null);
    setSelectedRuleIds(new Set());
    setActiveView("yogas");
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/interpretations/generate", {
        birthDetailsId: selectedBD?.id,
        ruleIds: selectedRuleIds.size > 0 ? Array.from(selectedRuleIds) : matchedRules.slice(0, 15).map((r: any) => r.id),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setGeneratedReport(data.interpretation);
        setActiveView("report");
        toast({ title: "Report generated" });
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const downloadReport = () => {
    if (!generatedReport) return;
    const blob = new Blob([generatedReport.report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `interpretation-${selectedBD?.name || "chart"}.txt`;
    a.click(); URL.revokeObjectURL(url);
  };

  const toggleRule = (id: string) => {
    setSelectedRuleIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" />
          Interpretations
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          vivaran · विवरण — Select a saved chart to auto-interpret with Rule Library matching
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5">
        {/* ── Chart List ── */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" /> Saved Charts
          </h3>
          {bdLoading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
          ) : birthDetailsList.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <Star className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No charts saved yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Save a chart from the Chart Calculator.</p>
              </CardContent>
            </Card>
          ) : (
            birthDetailsList.map(bd => (
              <Card
                key={bd.id}
                className={`cursor-pointer transition-colors hover:border-primary/50 ${selectedBD?.id === bd.id ? "border-primary/60 bg-primary/5" : ""}`}
                onClick={() => selectBD(bd)}
                data-testid={`bd-card-${bd.id}`}
              >
                <CardContent className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    {selectedBD?.id === bd.id && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{bd.name}</div>
                      <div className="text-xs text-muted-foreground">{bd.date} · {bd.place}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* ── Main Panel ── */}
        <div className="space-y-4">
          {!selectedBD ? (
            <Card className="border-dashed">
              <CardContent className="py-20 text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="font-medium">Select a chart to begin</p>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                  Choose a saved chart on the left. The system will automatically calculate yogas and match relevant BPHS rules.
                </p>
                <Badge variant="outline" className="mt-3 text-xs">Tip: Save charts in Chart Calculator first</Badge>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Chart summary */}
              {interpretQuery.isLoading ? (
                <Card><CardContent className="py-4"><div className="space-y-2">{[...Array(3)].map((_,i) => <Skeleton key={i} className="h-4 w-full" />)}</div></CardContent></Card>
              ) : chartData ? (
                <Card>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div>
                        <span className="text-xs text-muted-foreground">Ascendant</span>
                        <div className="text-sm font-semibold">{chartData.ascendant?.rasiName} {chartData.ascendant?.degree?.toFixed(1)}°</div>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Birth Nakshatra</span>
                        <div className="text-sm font-semibold">{chartData.birthNakshatra || "—"}</div>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Panchanga Yoga</span>
                        <div className="text-sm font-semibold">{chartData.panchanga?.yoga?.name || "—"}</div>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Yogas detected</span>
                        <div className="text-sm font-semibold text-primary">{yogas.length}</div>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Rules matched</span>
                        <div className="text-sm font-semibold text-primary">{matchedRules.length}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {/* Tab row */}
              <div className="flex items-center gap-2 border-b border-border pb-0">
                {[
                  { key: "yogas", label: `Yogas (${yogas.length})`, icon: Zap },
                  { key: "rules", label: `Matched Rules (${matchedRules.length})`, icon: BookOpen },
                  { key: "report", label: "Report", icon: BarChart2 },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveView(key as any)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                      activeView === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid={`interp-tab-${key}`}
                  >
                    <Icon className="w-3.5 h-3.5" />{label}
                  </button>
                ))}
                <div className="ml-auto flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => generateMutation.mutate()}
                    disabled={generateMutation.isPending || !selectedBD}
                    data-testid="button-generate-report"
                  >
                    {generateMutation.isPending
                      ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Generating…</>
                      : <><Wand2 className="w-3.5 h-3.5 mr-1.5" />Generate Report</>}
                  </Button>
                  {generatedReport && (
                    <Button size="sm" variant="outline" onClick={downloadReport} data-testid="button-download">
                      <Download className="w-3.5 h-3.5 mr-1.5" />Download
                    </Button>
                  )}
                </div>
              </div>

              {/* Yogas view */}
              {activeView === "yogas" && (
                interpretQuery.isLoading ? (
                  <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
                ) : yogas.length > 0 ? (
                  <div className="space-y-3" data-testid="interp-yogas">
                    {yogas.map((y: any, i: number) => (
                      <div key={i} className="rounded-lg border border-border p-4 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{y.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${YOGA_TYPE_STYLE[y.type] || YOGA_TYPE_STYLE.special}`}>
                              {y.type}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">{(y.confidence * 100).toFixed(0)}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{y.description}</p>
                        {y.planets?.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {y.planets.map((pn: string) => <Badge key={pn} variant="secondary" className="text-xs">{pn}</Badge>)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="py-10 text-center">
                      <p className="text-muted-foreground text-sm">
                        {interpretQuery.isLoading ? "Calculating…" : "No classical yogas detected in this chart"}
                      </p>
                    </CardContent>
                  </Card>
                )
              )}

              {/* Rules view */}
              {activeView === "rules" && (
                <div className="space-y-3">
                  {interpretQuery.isLoading ? (
                    <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
                  ) : matchedRules.length > 0 ? (
                    <>
                      <p className="text-xs text-muted-foreground">
                        {matchedRules.length} rules matched from {interpretQuery.data?.totalRulesSearched || 0} in library. Select rules to include in the report.
                      </p>
                      <ScrollArea className="h-[500px] rounded-md border border-border">
                        <div className="p-2 space-y-1">
                          {matchedRules.map((rule: any) => (
                            <div
                              key={rule.id}
                              className={`flex items-start gap-2.5 p-2.5 rounded-md cursor-pointer transition-colors hover:bg-accent/50 ${selectedRuleIds.has(rule.id) ? "bg-primary/5" : ""}`}
                              onClick={() => toggleRule(rule.id)}
                              data-testid={`matched-rule-${rule.id}`}
                            >
                              <Checkbox checked={selectedRuleIds.has(rule.id)} onCheckedChange={() => toggleRule(rule.id)} className="mt-0.5 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-medium text-foreground">{rule.name}</span>
                                  <span className={`text-xs px-1.5 py-0 rounded-full ${CATEGORY_BADGE[rule.category] || CATEGORY_BADGE.general}`}>
                                    {rule.category.replace(/_/g, " ")}
                                  </span>
                                  {rule.matchScore > 2 && (
                                    <span className="text-xs text-primary">●{rule.matchScore} match</span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{rule.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      <p className="text-xs text-muted-foreground">
                        {selectedRuleIds.size > 0
                          ? `${selectedRuleIds.size} selected`
                          : `Top ${Math.min(15, matchedRules.length)} rules will be used in report`}
                      </p>
                    </>
                  ) : (
                    <Card className="border-dashed">
                      <CardContent className="py-10 text-center">
                        <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">No matching rules found in library</p>
                        <p className="text-xs text-muted-foreground mt-1">Import BPHS rules in the PDF Toolkit to populate the library</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Report view */}
              {activeView === "report" && (
                generateMutation.isPending ? (
                  <Card><CardContent className="py-6 space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}</CardContent></Card>
                ) : generatedReport ? (
                  <Card data-testid="report-card">
                    <CardContent className="py-5 px-5">
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: `<p class="mb-3">${parseMarkdown(generatedReport.report)}</p>` }}
                      />
                      <Separator className="my-4" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{generatedReport.appliedRuleIds.length} rules applied</span>
                        <span>{generatedReport.generatedAt ? new Date(generatedReport.generatedAt).toLocaleString() : "Just now"}</span>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="py-16 text-center">
                      <BarChart2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="font-medium">No report generated yet</p>
                      <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                        Review the matched rules, then click Generate Report
                      </p>
                    </CardContent>
                  </Card>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
