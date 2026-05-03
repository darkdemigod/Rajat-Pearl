import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Rule } from "@shared/schema";
import { BookOpen, Plus, Search, Pencil, Trash2, ChevronRight, Code } from "lucide-react";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "yoga", label: "Yoga" },
  { value: "dhasa", label: "Dhasa/Dasha" },
  { value: "prediction", label: "Prediction" },
  { value: "chakra_interpretation", label: "Chakra" },
  { value: "general", label: "General" },
];

const CATEGORY_BADGE: Record<string, string> = {
  yoga: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  dhasa: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  prediction: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  chakra_interpretation: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  general: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400",
};

const ruleFormSchema = z.object({
  name: z.string().min(1, "Name required"),
  description: z.string().min(1, "Description required"),
  category: z.string().min(1, "Category required"),
  chapter: z.string().optional(),
  code: z.string().min(1, "Code/rule expression required"),
  confidence: z.coerce.number().min(0).max(1),
  vargaApplicability: z.string().min(1, "At least one varga required"),
});

type RuleFormValues = z.infer<typeof ruleFormSchema>;

function RuleDialog({
  open, onClose, rule,
}: { open: boolean; onClose: () => void; rule?: Rule | null }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const isEdit = !!rule;

  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleFormSchema),
    defaultValues: {
      name: rule?.name || "",
      description: rule?.description || "",
      category: rule?.category || "yoga",
      chapter: rule?.chapter || "",
      code: rule?.code || "",
      confidence: rule?.confidence ?? 0.75,
      vargaApplicability: rule?.vargaApplicability?.join(", ") || "D1",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: RuleFormValues) => {
      const payload = {
        ...values,
        vargaApplicability: values.vargaApplicability.split(",").map(s => s.trim()),
        conditions: {},
        bookId: null,
      };
      const res = isEdit
        ? await apiRequest("PUT", `/api/rules/${rule!.id}`, payload)
        : await apiRequest("POST", "/api/rules", payload);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: isEdit ? "Rule updated" : "Rule created" });
      qc.invalidateQueries({ queryKey: ["/api/rules"] });
      onClose();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Rule" : "New Astrological Rule"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(v => mutation.mutate(v))} className="space-y-3">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Rule Name</FormLabel>
                <FormControl><Input data-testid="input-rule-name" placeholder="e.g. Gaja Kesari Yoga" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-rule-category">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CATEGORIES.filter(c => c.value !== "all").map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl><Textarea data-testid="input-rule-description" rows={3} placeholder="Describe the astrological rule..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="code" render={({ field }) => (
              <FormItem>
                <FormLabel>Rule Expression</FormLabel>
                <FormControl>
                  <Textarea
                    data-testid="input-rule-code"
                    rows={3}
                    placeholder="if moon_house and jup_house: ..."
                    className="font-mono text-xs"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="confidence" render={({ field }) => (
                <FormItem>
                  <FormLabel>Confidence (0–1)</FormLabel>
                  <FormControl><Input data-testid="input-rule-confidence" type="number" step="0.05" min="0" max="1" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="vargaApplicability" render={({ field }) => (
                <FormItem>
                  <FormLabel>Varga (comma-sep)</FormLabel>
                  <FormControl><Input data-testid="input-rule-varga" placeholder="D1, D9" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="chapter" render={({ field }) => (
              <FormItem>
                <FormLabel>Chapter / Source (optional)</FormLabel>
                <FormControl><Input data-testid="input-rule-chapter" placeholder="Chapter 36" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-rule">
                {mutation.isPending ? "Saving…" : isEdit ? "Update Rule" : "Create Rule"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function RuleLibrary() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRule, setEditRule] = useState<Rule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailRule, setDetailRule] = useState<Rule | null>(null);

  const { data: rules = [], isLoading } = useQuery<Rule[]>({
    queryKey: ["/api/rules", categoryFilter],
    queryFn: async () => {
      const url = categoryFilter !== "all" ? `/api/rules?category=${categoryFilter}` : "/api/rules";
      const res = await fetch(url);
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/rules/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Rule deleted" });
      qc.invalidateQueries({ queryKey: ["/api/rules"] });
      setDeleteId(null);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = rules.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            Rule Library
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            niyama kosha · नियम कोश — Astrological interpretation rules
          </p>
        </div>
        <Button onClick={() => { setEditRule(null); setDialogOpen(true); }} data-testid="button-add-rule">
          <Plus className="w-4 h-4 mr-2" />
          New Rule
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search rules…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            data-testid="input-search-rules"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44" data-testid="select-category-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-2">
          {isLoading ? (
            [...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No rules found</p>
              </CardContent>
            </Card>
          ) : (
            filtered.map(rule => (
              <Card
                key={rule.id}
                className={`cursor-pointer transition-colors hover:border-primary/50 ${detailRule?.id === rule.id ? "border-primary/60 bg-primary/5" : ""}`}
                onClick={() => setDetailRule(rule)}
                data-testid={`rule-card-${rule.id}`}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-medium text-foreground text-sm">{rule.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_BADGE[rule.category] || CATEGORY_BADGE.general}`}>
                          {rule.category.replace(/_/g, " ")}
                        </span>
                        {rule.vargaApplicability?.slice(0, 3).map(v => (
                          <Badge key={v} variant="outline" className="text-xs px-1.5 py-0">{v}</Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{rule.description}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs text-muted-foreground">{(rule.confidence * 100).toFixed(0)}%</span>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7"
                        onClick={e => { e.stopPropagation(); setEditRule(rule); setDialogOpen(true); }}
                        data-testid={`button-edit-rule-${rule.id}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={e => { e.stopPropagation(); setDeleteId(rule.id); }}
                        data-testid={`button-delete-rule-${rule.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="lg:sticky lg:top-24">
          {detailRule ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{detailRule.name}</CardTitle>
                <span className={`text-xs px-2 py-0.5 rounded-full w-fit ${CATEGORY_BADGE[detailRule.category] || CATEGORY_BADGE.general}`}>
                  {detailRule.category.replace(/_/g, " ")}
                </span>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">{detailRule.description}</p>
                <Separator />
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Code className="w-3.5 h-3.5" /> Rule Expression
                  </div>
                  <pre className="bg-muted rounded p-2.5 text-xs font-mono overflow-x-auto whitespace-pre-wrap">{detailRule.code}</pre>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Confidence</span>
                    <div className="font-medium mt-0.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${detailRule.confidence * 100}%` }} />
                        </div>
                        <span>{(detailRule.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Chapter</span>
                    <div className="font-medium mt-0.5">{detailRule.chapter || "—"}</div>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Varga Applicability</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {detailRule.vargaApplicability?.map(v => (
                      <Badge key={v} variant="outline" className="text-xs">{v}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <ChevronRight className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Select a rule to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <RuleDialog open={dialogOpen} onClose={() => setDialogOpen(false)} rule={editRule} />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rule?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
