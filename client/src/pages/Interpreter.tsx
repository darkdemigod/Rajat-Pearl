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
import { apiRequest } from "@/lib/queryClient";
import type { BirthDetails, Rule, Interpretation } from "@shared/schema";
import {
  MessageSquare, Star, ChevronRight, RefreshCw, BookOpen, User,
  Wand2, Download, Check,
} from "lucide-react";

const CATEGORY_BADGE: Record<string, string> = {
  yoga: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  dhasa: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  prediction: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  chakra_interpretation: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  general: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400",
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
  const qc = useQueryClient();
  const [selectedBD, setSelectedBD] = useState<BirthDetails | null>(null);
  const [selectedRuleIds, setSelectedRuleIds] = useState<Set<string>>(new Set());
  const [generatedReport, setGeneratedReport] = useState<Interpretation | null>(null);

  const { data: birthDetailsList = [], isLoading: bdLoading } = useQuery<BirthDetails[]>({
    queryKey: ["/api/birth-details"],
  });

  const { data: rules = [], isLoading: rulesLoading } = useQuery<Rule[]>({
    queryKey: ["/api/rules"],
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/interpretations/generate", {
        birthDetailsId: selectedBD?.id,
        ruleIds: selectedRuleIds.size > 0 ? Array.from(selectedRuleIds) : undefined,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setGeneratedReport(data.interpretation);
        toast({ title: "Report generated", description: "Interpretation report is ready." });
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleRule = (id: string) => {
    setSelectedRuleIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllRules = () => {
    if (selectedRuleIds.size === rules.length) {
      setSelectedRuleIds(new Set());
    } else {
      setSelectedRuleIds(new Set(rules.map(r => r.id)));
    }
  };

  const downloadReport = () => {
    if (!generatedReport) return;
    const blob = new Blob([generatedReport.report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interpretation-${selectedBD?.name || "chart"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" />
          Interpretations
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          vivaran · विवरण — Generate astrological interpretation reports
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_280px_1fr] gap-5">
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" /> Birth Charts
          </h3>
          {bdLoading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)
          ) : birthDetailsList.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <Star className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No charts saved yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Use Chart Calculator to save a chart.</p>
              </CardContent>
            </Card>
          ) : (
            birthDetailsList.map(bd => (
              <Card
                key={bd.id}
                className={`cursor-pointer transition-colors hover:border-primary/50 ${
                  selectedBD?.id === bd.id ? "border-primary/60 bg-primary/5" : ""
                }`}
                onClick={() => { setSelectedBD(bd); setGeneratedReport(null); }}
                data-testid={`bd-card-${bd.id}`}
              >
                <CardContent className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    {selectedBD?.id === bd.id && (
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{bd.name}</div>
                      <div className="text-xs text-muted-foreground">{bd.date} · {bd.place}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Apply Rules
            </h3>
            <button
              className="text-xs text-primary hover:underline"
              onClick={toggleAllRules}
              data-testid="button-toggle-all-rules"
            >
              {selectedRuleIds.size === rules.length ? "Deselect all" : "Select all"}
            </button>
          </div>
          {rulesLoading ? (
            [...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)
          ) : rules.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-6 text-center">
                <p className="text-xs text-muted-foreground">No rules in library</p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-80 rounded-md border border-border">
              <div className="p-2 space-y-1">
                {rules.map(rule => (
                  <div
                    key={rule.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-md cursor-pointer transition-colors hover:bg-accent/50 ${
                      selectedRuleIds.has(rule.id) ? "bg-primary/5" : ""
                    }`}
                    onClick={() => toggleRule(rule.id)}
                    data-testid={`rule-checkbox-${rule.id}`}
                  >
                    <Checkbox
                      checked={selectedRuleIds.has(rule.id)}
                      onCheckedChange={() => toggleRule(rule.id)}
                      className="mt-0.5 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-foreground leading-tight">{rule.name}</div>
                      <span className={`text-xs px-1.5 py-0 rounded-full mt-0.5 inline-block ${CATEGORY_BADGE[rule.category] || CATEGORY_BADGE.general}`}>
                        {rule.category.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          <Button
            className="w-full"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || (!selectedBD && selectedRuleIds.size === 0)}
            data-testid="button-generate-report"
          >
            {generateMutation.isPending ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Generating…</>
            ) : (
              <><Wand2 className="w-4 h-4 mr-2" />Generate Report</>
            )}
          </Button>
          {selectedRuleIds.size > 0 && (
            <p className="text-xs text-center text-muted-foreground">
              {selectedRuleIds.size} rule{selectedRuleIds.size !== 1 ? "s" : ""} selected
            </p>
          )}
          {selectedRuleIds.size === 0 && rules.length > 0 && (
            <p className="text-xs text-center text-muted-foreground">
              All rules will be applied
            </p>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">Interpretation Report</h3>
            {generatedReport && (
              <Button
                variant="outline"
                size="sm"
                onClick={downloadReport}
                data-testid="button-download-report"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Download
              </Button>
            )}
          </div>

          {generateMutation.isPending ? (
            <Card>
              <CardContent className="py-6 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className={`h-4 w-${i % 2 === 0 ? "full" : "4/5"}`} />
                ))}
              </CardContent>
            </Card>
          ) : generatedReport ? (
            <Card data-testid="report-card">
              <CardContent className="py-5 px-5">
                <div
                  className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: `<p class="mb-3">${parseMarkdown(generatedReport.report)}</p>`
                  }}
                />
                <Separator className="my-4" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {generatedReport.appliedRuleIds.length} rules applied
                  </span>
                  <span>
                    {generatedReport.generatedAt
                      ? new Date(generatedReport.generatedAt).toLocaleString()
                      : "Just now"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="font-medium text-foreground">No report generated yet</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                  {!selectedBD
                    ? "Save a chart in the Chart Calculator, then select it here"
                    : "Select rules and click Generate Report to create an interpretation"
                  }
                </p>
                {!selectedBD && (
                  <Badge variant="outline" className="mt-3 text-xs">
                    Tip: Save charts first
                  </Badge>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
