import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, User, Briefcase, Coins, Heart, Baby, Users, Activity, Star, Plane, BookOpen, Sparkles, Clock, AlertTriangle, CheckCircle, Info } from "lucide-react";

type Finding = {
  title: string;
  detail: string;
  strength: string;
  domain: string;
  evidence: string[];
};

type Domain = {
  title: string;
  findings: Finding[];
};

type DiscussData = {
  birthDetails: any;
  chartData: any;
  domains: Record<string, Domain>;
};

const DOMAIN_ORDER = [
  'personality', 'career', 'wealth', 'relationships', 'children',
  'siblings', 'health', 'spirituality', 'foreign_travel', 'education', 'yogas', 'dasha',
];

const DOMAIN_ICONS: Record<string, any> = {
  personality: User,
  career: Briefcase,
  wealth: Coins,
  relationships: Heart,
  children: Baby,
  siblings: Users,
  health: Activity,
  spirituality: Star,
  foreign_travel: Plane,
  education: BookOpen,
  yogas: Sparkles,
  dasha: Clock,
};

const DOMAIN_COLORS: Record<string, string> = {
  personality:   'from-amber-500/10 to-orange-500/5 border-amber-200 dark:border-amber-900',
  career:        'from-blue-500/10 to-indigo-500/5 border-blue-200 dark:border-blue-900',
  wealth:        'from-emerald-500/10 to-green-500/5 border-emerald-200 dark:border-emerald-900',
  relationships: 'from-rose-500/10 to-pink-500/5 border-rose-200 dark:border-rose-900',
  children:      'from-violet-500/10 to-purple-500/5 border-violet-200 dark:border-violet-900',
  siblings:      'from-cyan-500/10 to-teal-500/5 border-cyan-200 dark:border-cyan-900',
  health:        'from-red-500/10 to-rose-500/5 border-red-200 dark:border-red-900',
  spirituality:  'from-yellow-500/10 to-amber-500/5 border-yellow-200 dark:border-yellow-900',
  foreign_travel:'from-sky-500/10 to-blue-500/5 border-sky-200 dark:border-sky-900',
  education:     'from-lime-500/10 to-green-500/5 border-lime-200 dark:border-lime-900',
  yogas:         'from-purple-500/10 to-violet-500/5 border-purple-200 dark:border-purple-900',
  dasha:         'from-orange-500/10 to-amber-500/5 border-orange-200 dark:border-orange-900',
};

function StrengthIcon({ strength }: { strength: string }) {
  if (strength === 'strong') return <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
  if (strength === 'warning') return <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
  if (strength === 'weak') return <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />;
  return <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
}

function StrengthBadge({ strength }: { strength: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    strong:   { label: 'Favorable', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
    moderate: { label: 'Moderate',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    neutral:  { label: 'Neutral',   cls: 'bg-muted text-muted-foreground' },
    weak:     { label: 'Challenging', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
    warning:  { label: 'Watch',     cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  };
  const { label, cls } = map[strength] || map.neutral;
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

function FindingCard({ finding }: { finding: Finding }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = finding.detail.length > 160;
  const preview = isLong && !expanded ? finding.detail.slice(0, 160) + '…' : finding.detail;

  return (
    <div
      className="border border-border rounded-lg p-3 bg-background hover:bg-accent/30 transition-colors"
      data-testid={`finding-card-${finding.title.replace(/\s+/g,'-').slice(0,30)}`}
    >
      <div className="flex items-start gap-2 mb-1.5">
        <StrengthIcon strength={finding.strength} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground leading-tight">{finding.title}</span>
            <StrengthBadge strength={finding.strength} />
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed ml-5">
        {preview}
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-1 text-primary hover:underline font-medium"
          >
            {expanded ? 'less' : 'more'}
          </button>
        )}
      </p>
      {finding.evidence && finding.evidence.filter(Boolean).length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 ml-5">
          {finding.evidence.filter(Boolean).map((ev, i) => (
            <span key={i} className="text-[10px] bg-primary/8 text-primary/70 px-1.5 py-0.5 rounded font-mono border border-primary/10">
              {ev}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function DomainSection({ domainKey, domain }: { domainKey: string; domain: Domain }) {
  const Icon = DOMAIN_ICONS[domainKey] || Star;
  const colorClass = DOMAIN_COLORS[domainKey] || '';
  const findings = domain.findings || [];
  const strongCount = findings.filter(f => f.strength === 'strong').length;
  const warningCount = findings.filter(f => f.strength === 'warning' || f.strength === 'weak').length;

  return (
    <AccordionItem
      value={domainKey}
      className={`border rounded-xl mb-3 bg-gradient-to-br ${colorClass} overflow-hidden`}
      data-testid={`domain-section-${domainKey}`}
    >
      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-white/10 transition-colors [&>svg]:shrink-0">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-background/60 flex items-center justify-center shrink-0 shadow-sm">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="font-semibold text-sm text-foreground">{domain.title}</div>
            <div className="text-xs text-muted-foreground">{findings.length} findings</div>
          </div>
          <div className="flex gap-1.5 mr-2 shrink-0">
            {strongCount > 0 && (
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-1.5 py-0.5 rounded-full">
                {strongCount} favorable
              </span>
            )}
            {warningCount > 0 && (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-1.5 py-0.5 rounded-full">
                {warningCount} watch
              </span>
            )}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4 pt-1">
        <div className="flex flex-col gap-2">
          {findings.map((f, i) => (
            <FindingCard key={i} finding={f} />
          ))}
          {findings.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No findings for this domain.</p>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export default function LifeDiscussion() {
  const [selectedBdId, setSelectedBdId] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const { data: savedCharts, isLoading: chartsLoading } = useQuery<any[]>({
    queryKey: ['/api/birth-details'],
  });

  const { data: discussData, isLoading: analysisLoading, error } = useQuery<DiscussData>({
    queryKey: ['/api/discuss', selectedBdId],
    queryFn: async () => {
      const res = await fetch(`/api/discuss/${selectedBdId}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!selectedBdId,
    staleTime: 5 * 60 * 1000,
  });

  const domains = discussData?.domains;
  const bd = discussData?.birthDetails;

  const filteredDomains = DOMAIN_ORDER.filter(k => {
    if (!domains) return false;
    if (activeFilter === 'all') return true;
    const d = domains[k];
    if (!d) return false;
    if (activeFilter === 'strong') return d.findings.some(f => f.strength === 'strong');
    if (activeFilter === 'warning') return d.findings.some(f => f.strength === 'warning' || f.strength === 'weak');
    return true;
  });

  const totalFindings = domains
    ? Object.values(domains).reduce((s, d) => s + (d.findings?.length || 0), 0)
    : 0;
  const totalStrong = domains
    ? Object.values(domains).reduce((s, d) => s + d.findings.filter(f => f.strength === 'strong').length, 0)
    : 0;
  const totalWarning = domains
    ? Object.values(domains).reduce((s, d) => s + d.findings.filter(f => f.strength === 'warning' || f.strength === 'weak').length, 0)
    : 0;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Life Discussion</h1>
        <p className="text-sm text-muted-foreground">
          Comprehensive chart analysis based on P.V.R. Narasimha Rao's 45 Lessons on Vedic Astrology
        </p>
      </div>

      {/* Chart selector */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select a Saved Chart</CardTitle>
        </CardHeader>
        <CardContent>
          {chartsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading saved charts…
            </div>
          ) : !savedCharts || savedCharts.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No saved charts found. Use the Chart Calculator to calculate and save a chart first.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <Select
                value={selectedBdId}
                onValueChange={setSelectedBdId}
                data-testid="select-birth-details"
              >
                <SelectTrigger className="flex-1" data-testid="select-chart-trigger">
                  <SelectValue placeholder="Choose a chart to analyse…" />
                </SelectTrigger>
                <SelectContent>
                  {savedCharts.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)} data-testid={`select-chart-${c.id}`}>
                      {c.name} — {c.date} · {c.place}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading state */}
      {analysisLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <Star className="absolute inset-0 m-auto w-7 h-7 text-primary" />
          </div>
          <div className="text-center">
            <div className="font-semibold text-foreground mb-1">Running PVR Analysis</div>
            <div className="text-sm text-muted-foreground">Applying all 45 lessons from Vedic Astrology…</div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !analysisLoading && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold text-sm">Analysis failed</div>
                <div className="text-xs mt-0.5 opacity-80">{(error as any).message}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {domains && !analysisLoading && (
        <>
          {/* Summary bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {bd && (
              <Card className="col-span-2 sm:col-span-1 bg-primary/5 border-primary/20">
                <CardContent className="pt-3 pb-3">
                  <div className="text-xs text-muted-foreground mb-0.5">Chart</div>
                  <div className="font-bold text-sm text-foreground truncate">{bd.name}</div>
                  <div className="text-xs text-muted-foreground">{bd.date} · {bd.place}</div>
                </CardContent>
              </Card>
            )}
            <Card className="bg-card">
              <CardContent className="pt-3 pb-3">
                <div className="text-xs text-muted-foreground mb-0.5">Total Findings</div>
                <div className="text-2xl font-bold text-foreground">{totalFindings}</div>
              </CardContent>
            </Card>
            <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900">
              <CardContent className="pt-3 pb-3">
                <div className="text-xs text-emerald-600 dark:text-emerald-400 mb-0.5">Favorable</div>
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{totalStrong}</div>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900">
              <CardContent className="pt-3 pb-3">
                <div className="text-xs text-amber-600 dark:text-amber-400 mb-0.5">Watch</div>
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{totalWarning}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filter buttons */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {[
              { key: 'all',     label: 'All Domains' },
              { key: 'strong',  label: 'Favorable Only' },
              { key: 'warning', label: 'Watch Areas' },
            ].map(({ key, label }) => (
              <Button
                key={key}
                size="sm"
                variant={activeFilter === key ? 'default' : 'outline'}
                onClick={() => setActiveFilter(key)}
                data-testid={`filter-${key}`}
                className="text-xs"
              >
                {label}
              </Button>
            ))}
          </div>

          {/* Domain accordions */}
          <Accordion type="multiple" defaultValue={DOMAIN_ORDER.slice(0, 3)}>
            {filteredDomains.map(k => (
              domains[k] ? (
                <DomainSection key={k} domainKey={k} domain={domains[k]} />
              ) : null
            ))}
          </Accordion>

          {filteredDomains.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No domains match the selected filter.
            </div>
          )}

          {/* Source note */}
          <div className="mt-6 p-4 rounded-xl border border-border bg-muted/30 text-xs text-muted-foreground">
            <strong className="text-foreground">Source:</strong>{" "}
            P.V.R. Narasimha Rao, <em>Lessons on Vedic Astrology</em> (45 Lessons). Rules cover personality,
            career, wealth, marriage, children, siblings, health, spirituality, foreign travel, education,
            yoga detection, and dasha analysis. MKS, Arudha Padas, Vipareeta Raja Yoga, Harsha/Sarala/Vimala
            yogas, Badhakasthana, and divisional chart analysis are all included.
          </div>
        </>
      )}

      {/* Placeholder when no chart selected */}
      {!selectedBdId && !analysisLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Star className="w-8 h-8 text-primary/60" />
          </div>
          <div className="font-semibold text-foreground">Select a Chart to Begin</div>
          <div className="text-sm text-muted-foreground max-w-sm">
            Choose a saved chart above to run a full life discussion based on P.V.R. Narasimha Rao's 45 lessons on Vedic Astrology.
          </div>
        </div>
      )}
    </div>
  );
}
