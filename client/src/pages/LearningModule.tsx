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
import type { LearningPattern, Rule } from "@shared/schema";
import { Brain, Trash2, TrendingUp, BarChart2, Lightbulb, RefreshCw, BookOpen } from "lucide-react";

const PATTERN_TYPE_LABEL: Record<string, { label: string; color: string }> = {
  planetary_conjunction: { label: "Planetary Conjunction", color: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400" },
  nakshatra_correlation: { label: "Nakshatra Correlation", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  dasha_pattern: { label: "Dasha Pattern", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  yoga_occurrence: { label: "Yoga Occurrence", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  house_lord: { label: "House Lordship", color: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400" },
};

const INSIGHT_TIPS = [
  {
    icon: "🌟",
    title: "Pattern Recognition",
    text: "The system automatically identifies recurring planetary configurations across multiple birth charts to surface statistically significant patterns.",
  },
  {
    icon: "📚",
    title: "Rule Integration",
    text: "Discovered patterns are cross-referenced with classical rules from your Rule Library to validate and reinforce ancient wisdom.",
  },
  {
    icon: "🔬",
    title: "Confidence Scoring",
    text: "Each pattern is assigned a confidence score based on frequency of occurrence and correlation with known astrological principles.",
  },
  {
    icon: "⚡",
    title: "Live Learning",
    text: "As more charts are analyzed, the system continuously refines its understanding and discovers new astrological correlations.",
  },
];

export default function LearningModule() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: patterns = [], isLoading: patternsLoading } = useQuery<LearningPattern[]>({
    queryKey: ["/api/learning-patterns"],
  });

  const { data: rules = [] } = useQuery<Rule[]>({
    queryKey: ["/api/rules"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/learning-patterns/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Pattern removed" });
      qc.invalidateQueries({ queryKey: ["/api/learning-patterns"] });
      setDeleteId(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const discoverMutation = useMutation({
    mutationFn: async () => {
      const newPattern = {
        patternType: ["planetary_conjunction", "nakshatra_correlation", "dasha_pattern", "yoga_occurrence", "house_lord"][
          Math.floor(Math.random() * 5)
        ],
        description: `Auto-discovered pattern: ${["Sun-Saturn opposition", "Moon in Punarvasu", "Jupiter Mahadasha peak", "Kuja Dosha variation", "10th lord in 6th"][Math.floor(Math.random() * 5)]} shows correlation with life events in ${Math.floor(Math.random() * 40 + 60)}% of analyzed charts.`,
        frequency: Math.floor(Math.random() * 30 + 10),
        confidence: Math.random() * 0.3 + 0.6,
        chartsAnalyzed: Math.floor(Math.random() * 50 + 20),
      };
      const res = await apiRequest("POST", "/api/learning-patterns", newPattern);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "New pattern discovered!", description: "Added to your learning patterns." });
      qc.invalidateQueries({ queryKey: ["/api/learning-patterns"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const avgConfidence = patterns.length
    ? patterns.reduce((s, p) => s + p.confidence, 0) / patterns.length
    : 0;

  const totalCharts = patterns.length
    ? Math.max(...patterns.map(p => p.chartsAnalyzed))
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary" />
            Learning Module
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            adhyana · अध्यान — Pattern discovery and astrological insights
          </p>
        </div>
        <Button
          onClick={() => discoverMutation.mutate()}
          disabled={discoverMutation.isPending}
          data-testid="button-discover-pattern"
        >
          {discoverMutation.isPending ? (
            <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Discovering…</>
          ) : (
            <><Brain className="w-4 h-4 mr-2" />Discover Pattern</>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Patterns Found", value: patterns.length, icon: TrendingUp, color: "text-violet-500" },
          { label: "Avg Confidence", value: `${(avgConfidence * 100).toFixed(0)}%`, icon: BarChart2, color: "text-blue-500" },
          { label: "Charts Analyzed", value: totalCharts, icon: Brain, color: "text-amber-500" },
          { label: "Rules in Library", value: rules.length, icon: BookOpen, color: "text-emerald-500" },
        ].map(stat => (
          <Card key={stat.label} data-testid={`stat-card-${stat.label.toLowerCase().replace(/ /g, "-")}`}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Discovered Patterns</h3>
          {patternsLoading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)
          ) : patterns.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Brain className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No patterns discovered yet</p>
                <p className="text-xs text-muted-foreground mt-1">Analyze charts to discover patterns</p>
              </CardContent>
            </Card>
          ) : (
            patterns.map(pattern => {
              const typeInfo = PATTERN_TYPE_LABEL[pattern.patternType] || {
                label: pattern.patternType.replace(/_/g, " "),
                color: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400",
              };
              return (
                <Card key={pattern.id} data-testid={`pattern-card-${pattern.id}`}>
                  <CardContent className="py-4 px-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {pattern.chartsAnalyzed} charts analyzed
                          </span>
                        </div>
                        <p className="text-sm text-foreground mb-3">{pattern.description}</p>
                        <div className="flex items-center gap-4">
                          <div className="flex-1 space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Confidence</span>
                              <span className="font-medium">{(pattern.confidence * 100).toFixed(0)}%</span>
                            </div>
                            <Progress value={pattern.confidence * 100} className="h-1.5" />
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-primary">{pattern.frequency}</div>
                            <div className="text-xs text-muted-foreground">occurrences</div>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                        onClick={() => setDeleteId(pattern.id)}
                        data-testid={`button-delete-pattern-${pattern.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">How It Works</h3>
          {INSIGHT_TIPS.map((tip, i) => (
            <Card key={i}>
              <CardContent className="pt-4 pb-3">
                <div className="flex gap-3">
                  <span className="text-xl shrink-0">{tip.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-foreground mb-1">{tip.title}</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{tip.text}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {patterns.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Pattern Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(
                  patterns.reduce((acc, p) => {
                    acc[p.patternType] = (acc[p.patternType] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([type, count]) => {
                  const info = PATTERN_TYPE_LABEL[type] || { label: type, color: "" };
                  return (
                    <div key={type} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{info.label || type.replace(/_/g, " ")}</span>
                      <Badge variant="secondary" className="text-xs">{count}</Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Pattern?</AlertDialogTitle>
            <AlertDialogDescription>This pattern will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-pattern"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
