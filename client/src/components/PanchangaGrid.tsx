import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Sun, Moon, Clock } from "lucide-react";

interface PanchangaData {
  tithi?: { number: number; name: string; paksha: string; deity: string };
  nakshatra?: { number: number; name: string; lord: string; pada: number };
  yoga?: { number: number; name: string };
  karana?: { number: number; name: string };
  vaara?: number;
  vaaraName?: string;
  rasiName?: string;
  sunSignName?: string;
  sunrise?: string;
  sunset?: string;
  moonrise?: string;
  moonset?: string;
  ayanamsa?: number;
  ayanamsaMode?: string;
  rahuKalam?: { start: string; end: string };
  gulikaKalam?: { start: string; end: string };
  yamaGandam?: { start: string; end: string };
}

const PAKSHA_BADGE: Record<string, string> = {
  Shukla: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  Krishna: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400",
};

export default function PanchangaGrid({ panchanga }: { panchanga?: PanchangaData }) {
  if (!panchanga) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Panchanga</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">Calculate chart to view Panchanga</p>
        </CardContent>
      </Card>
    );
  }

  const items = [
    { label: "Vaara (Day)", value: panchanga.vaaraName || "—", sub: "" },
    {
      label: "Tithi",
      value: panchanga.tithi?.name || "—",
      sub: panchanga.tithi ? `${panchanga.tithi.paksha} Paksha · Deity: ${panchanga.tithi.deity}` : "",
      badge: panchanga.tithi?.paksha,
    },
    {
      label: "Nakshatra",
      value: panchanga.nakshatra?.name || "—",
      sub: panchanga.nakshatra ? `Lord: ${panchanga.nakshatra.lord} · Pada ${panchanga.nakshatra.pada}` : "",
    },
    { label: "Yoga", value: panchanga.yoga?.name || "—", sub: "" },
    { label: "Karana", value: panchanga.karana?.name || "—", sub: "" },
    { label: "Moon Sign", value: panchanga.rasiName || "—", sub: "" },
    { label: "Sun Sign", value: panchanga.sunSignName || "—", sub: "" },
  ];

  return (
    <Card data-testid="panchanga-grid">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Moon className="w-4 h-4 text-primary" />
          Panchanga · पञ्चाङ्ग
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
          {items.map((item) => (
            <div key={item.label} className="bg-accent/40 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-medium text-foreground">{item.value}</span>
                {item.badge && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${PAKSHA_BADGE[item.badge] || ""}`}>
                    {item.badge}
                  </span>
                )}
              </div>
              {item.sub && <div className="text-xs text-muted-foreground mt-0.5">{item.sub}</div>}
            </div>
          ))}
        </div>

        <Separator className="my-3" />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <div>
              <div className="text-xs text-muted-foreground">Sunrise</div>
              <div className="font-medium text-xs">{panchanga.sunrise || "—"}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Sun className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <div>
              <div className="text-xs text-muted-foreground">Sunset</div>
              <div className="font-medium text-xs">{panchanga.sunset || "—"}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Moon className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <div>
              <div className="text-xs text-muted-foreground">Moonrise</div>
              <div className="font-medium text-xs">{panchanga.moonrise || "—"}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <div>
              <div className="text-xs text-muted-foreground">Rahu Kalam</div>
              <div className="font-medium text-xs">
                {panchanga.rahuKalam ? `${panchanga.rahuKalam.start}–${panchanga.rahuKalam.end}` : "—"}
              </div>
            </div>
          </div>
        </div>

        {panchanga.ayanamsa !== undefined && (
          <>
            <Separator className="my-3" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Ayanamsa ({panchanga.ayanamsaMode || "Lahiri"})</span>
              <span className="font-mono">{panchanga.ayanamsa?.toFixed(4)}°</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
