import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { LearningPattern } from "@shared/schema";
import { Brain, Trash2, TrendingUp, BarChart2, Lightbulb, RefreshCw, Sparkles, ChevronRight } from "lucide-react";

const PATTERN_TYPE_META: Record<string, { label: string; color: string; icon: string }> = {
  planetary_conjunction: { label: "Planetary Conjunction", color: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400", icon: "⚡" },
  nakshatra_correlation: { label: "Nakshatra Correlation", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: "⭐" },
  dasha_pattern:        { label: "Dasha Pattern",         color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400", icon: "⏳" },
  yoga_occurrence:      { label: "Yoga Occurrence",       color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400", icon: "🔄" },
  house_lord:           { label: "House Lordship",        color: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400", icon: "🏠" },
};

const INSIGHT_TIPS = [
  { icon: "🔭", title: "Yoga Detection", text: "Automatically identifies Pancha Mahapurusha yogas, Gaja Kesari, Parivartana, Neecha Bhanga and 15+ classical yoga formations across all saved charts." },
  { icon: "📊", title: "Frequency Analysis", text: "Counts how often each yoga or planetary pattern appears across your chart collection. High-frequency patterns reveal common astrological signatures." },
  { icon: "🔗", title: "Rule Matching", text: "Each detected pattern is cross-referenced with the BPHS Rule Library to surface classical shlokas and interpretations that apply." },
  { icon: "⚡", title: "Live Analysis", text: "Click Analyze Patterns to calculate yogas across all saved charts and discover recurring astrological signatures in your collection." },
];

export default function LearningModule() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [lastAnalysis, setLastAnalysis] = useState<{ analyzed: number } | null>(null);

  const { data: patterns = [], isLoading } = useQuery<LearningPattern[]>({
    queryKey: ["/api/learning-patterns"],
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/learning-patterns/analyze", {});
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setLastAnalysis({ analyzed: data.analyzed });
        qc.invalidateQueries({ queryKey: ["/api/learning-patterns"] });
        toast({
          title: "Analysis complete",
          description: `Analyzed ${data.analyzed} chart${data.analyzed !== 1 ? "s" : ""}, found ${data.patterns.length} pattern${data.patterns.length !== 1 ? "s" : ""}.`,
        });
      } else {
        toast({ title: "Analysis failed", description: data.error, variant: "destructive" });
      }
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/learning-patterns/${id}`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/learning-patterns"] });
      toast({ title: "Pattern removed" });
      setDeleteId(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      for (const p of patterns) {
        await apiRequest("DELETE", `/api/learning-patterns/${p.id}`);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/learning-patterns"] });
      toast({ title: "All patterns cleared" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const sortedPatterns = [...patterns].sort((a, b) => (b.frequency || 0) - (a.frequency || 0));
  const topYogas = sortedPatterns.filter(p => p.patternType === "yoga_occurrence").slice(0, 5);
  const maxFreq = sortedPatterns.reduce((m, p) => Math.max(m, p.frequency || 0), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            Pattern Recognition
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            praruup vivechan · प्रारूप विवेचन — Detect yoga patterns across all saved charts
          </p>
        </div>
        <div className="flex gap-2">
          {patterns.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearAllMutation.mutate()}
              disabled={clearAllMutation.isPending}
              data-testid="button-clear-patterns"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          )}
          <Button
            onClick={() => analyzeMutation.mutate()}
            disabled={analyzeMutation.isPending}
            data-testid="button-analyze-patterns"
          >
            {analyzeMutation.isPending
              ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Analyzing Charts…</>
              : <><Sparkles className="w-4 h-4 mr-2" />Analyze Patterns</>}
          </Button>
        </div>
      </div>

      {lastAnalysis && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <Brain className="w-4 h-4 text-primary shrink-0" />
            <p className="text-sm text-primary">
              Last analysis: <strong>{lastAnalysis.analyzed}</strong> chart{lastAnalysis.analyzed !== 1 ? "s" : ""} processed, <strong>{patterns.length}</strong> patterns discovered.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Pattern List ── */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" />
              Discovered Patterns ({patterns.length})
            </h3>
          </div>

          {isLoading ? (
            [...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)
          ) : sortedPatterns.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="font-medium text-foreground">No patterns discovered yet</p>
                <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">
                  Save multiple birth charts in the Chart Calculator, then click <strong>Analyze Patterns</strong> to detect yoga occurrences.
                </p>
                <Button className="mt-4" onClick={() => analyzeMutation.mutate()} disabled={analyzeMutation.isPending} data-testid="button-analyze-empty">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze Now
                </Button>
              </CardContent>
            </Card>
          ) : (
            sortedPatterns.map(pattern => {
              const meta = PATTERN_TYPE_META[pattern.patternType] || PATTERN_TYPE_META.yoga_occurrence;
              const pct = Math.round(((pattern.frequency || 0) / maxFreq) * 100);
              const conf = Math.round((pattern.confidence || 0) * 100);
              return (
                <Card key={pattern.id} className="hover:border-primary/30 transition-colors" data-testid={`pattern-card-${pattern.id}`}>
                  <CardContent className="py-4 px-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <span className="text-lg shrink-0 mt-0.5">{meta.icon}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.color}`}>
                              {meta.label}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              freq: <strong>{pattern.frequency || 0}</strong> · conf: <strong>{conf}%</strong>
                            </span>
                          </div>
                          <p className="text-sm text-foreground leading-relaxed">{pattern.description}</p>
                          {pattern.exampleChartIds && (
                            <p className="text-xs text-muted-foreground mt-1.5">
                              Charts: {pattern.exampleChartIds}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteId(pattern.id)}
                        data-testid={`button-delete-pattern-${pattern.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Relative frequency</span>
                        <span>{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* ── Right Panel ── */}
        <div className="space-y-4">
          {/* Top yogas summary */}
          {topYogas.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-primary" />
                  Top Yoga Occurrences
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {topYogas.map((p, i) => {
                  const yogaName = p.description.split(":")[0];
                  const pct = Math.round(((p.frequency || 0) / maxFreq) * 100);
                  return (
                    <div key={p.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-foreground font-medium truncate">{yogaName}</span>
                        <span className="text-muted-foreground ml-2 shrink-0">{p.frequency}×</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Info tips */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-primary" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {INSIGHT_TIPS.map((tip, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-base shrink-0 mt-0.5">{tip.icon}</span>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{tip.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{tip.text}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pattern</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this discovered pattern.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
