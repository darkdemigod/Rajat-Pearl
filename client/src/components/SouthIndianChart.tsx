import { RASI_NAMES_SANSKRIT, RASI_NAMES } from "@shared/schema";

interface PlanetInChart {
  name: string;
  shortName: string;
  rasi: number;
  retrograde?: boolean;
  strength?: string;
}

interface SouthIndianChartProps {
  planets?: PlanetInChart[];
  ascendantRasi?: number;
  showSanskrit?: boolean;
  size?: number;
  highlightRasi?: number;
  className?: string;
}

const GRID_LAYOUT: (number | null)[][] = [
  [11, 0, 1, 2],
  [10, null, null, 3],
  [9, null, null, 4],
  [8, 7, 6, 5],
];

const PLANET_COLORS: Record<string, string> = {
  Sun: "#e85d04",
  Moon: "#6096ba",
  Mars: "#c1121f",
  Mercury: "#52b788",
  Jupiter: "#f4a261",
  Venus: "#d4a5a5",
  Saturn: "#457b9d",
  Rahu: "#6d6875",
  Ketu: "#b5838d",
};

export default function SouthIndianChart({
  planets = [],
  ascendantRasi = 0,
  showSanskrit = false,
  size = 420,
  highlightRasi,
  className = "",
}: SouthIndianChartProps) {
  const cellSize = size / 4;
  const planetsByRasi: Record<number, PlanetInChart[]> = {};
  for (const p of planets) {
    if (!planetsByRasi[p.rasi]) planetsByRasi[p.rasi] = [];
    planetsByRasi[p.rasi].push(p);
  }

  const centerX = size / 2;
  const centerY = size / 2;
  const rasiNames = showSanskrit ? RASI_NAMES_SANSKRIT : RASI_NAMES;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={`select-none ${className}`}
      style={{ maxWidth: "100%", height: "auto" }}
    >
      <defs>
        <style>{`
          .chart-cell { stroke: hsl(var(--border)); stroke-width: 1.5; }
          .rasi-label { font-family: inherit; fill: hsl(var(--muted-foreground)); }
          .asc-label { font-family: inherit; fill: hsl(var(--primary)); font-weight: 600; }
          .planet-label { font-family: inherit; font-size: 11px; }
          .center-text { font-family: inherit; fill: hsl(var(--muted-foreground)); }
        `}</style>
      </defs>

      {GRID_LAYOUT.map((row, rowIdx) =>
        row.map((rasiIdx, colIdx) => {
          if (rasiIdx === null) return null;
          const x = colIdx * cellSize;
          const y = rowIdx * cellSize;
          const cellPlanets = planetsByRasi[rasiIdx] || [];
          const isAsc = rasiIdx === ascendantRasi;
          const isHighlight = highlightRasi === rasiIdx;

          const cellFill = isHighlight
            ? "hsl(var(--primary) / 0.15)"
            : isAsc
            ? "hsl(var(--primary) / 0.08)"
            : "hsl(var(--card))";

          return (
            <g key={`cell-${rowIdx}-${colIdx}`}>
              <rect
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                fill={cellFill}
                className="chart-cell"
                rx={rowIdx === 0 && colIdx === 0 ? 6 : rowIdx === 0 && colIdx === 3 ? 6 : rowIdx === 3 && colIdx === 0 ? 6 : rowIdx === 3 && colIdx === 3 ? 6 : 0}
              />

              {/* Diagonal lines for corner cells */}
              {(rowIdx === 0 && colIdx === 0) && (
                <line x1={x} y1={y} x2={x + cellSize} y2={y + cellSize} stroke="hsl(var(--border))" strokeWidth="1" opacity="0.5" />
              )}
              {(rowIdx === 0 && colIdx === 3) && (
                <line x1={x + cellSize} y1={y} x2={x} y2={y + cellSize} stroke="hsl(var(--border))" strokeWidth="1" opacity="0.5" />
              )}
              {(rowIdx === 3 && colIdx === 0) && (
                <line x1={x} y1={y + cellSize} x2={x + cellSize} y2={y} stroke="hsl(var(--border))" strokeWidth="1" opacity="0.5" />
              )}
              {(rowIdx === 3 && colIdx === 3) && (
                <line x1={x} y1={y} x2={x + cellSize} y2={y + cellSize} stroke="hsl(var(--border))" strokeWidth="1" opacity="0.5" />
              )}

              <text
                x={x + cellSize / 2}
                y={y + 14}
                textAnchor="middle"
                fontSize="9"
                className="rasi-label"
                opacity="0.6"
              >
                {rasiNames[rasiIdx]}
              </text>

              {isAsc && (
                <text
                  x={x + 6}
                  y={y + cellSize - 6}
                  fontSize="10"
                  className="asc-label"
                >
                  Asc
                </text>
              )}

              {cellPlanets.map((planet, pi) => {
                const col = pi % 2;
                const rowP = Math.floor(pi / 2);
                const px = x + 10 + col * (cellSize / 2 - 8);
                const py = y + 24 + rowP * 16;
                const color = PLANET_COLORS[planet.name] || "hsl(var(--foreground))";

                return (
                  <g key={planet.name}>
                    <text
                      x={px}
                      y={py}
                      fontSize="11"
                      fill={color}
                      className="planet-label"
                      fontWeight={planet.strength === "exalted" ? "700" : "400"}
                    >
                      {planet.shortName || planet.name.slice(0, 2)}
                      {planet.retrograde ? "ᴿ" : ""}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })
      )}

      {/* Center 2x2 area */}
      <rect
        x={cellSize}
        y={cellSize}
        width={cellSize * 2}
        height={cellSize * 2}
        fill="hsl(var(--background))"
        stroke="hsl(var(--border))"
        strokeWidth="1.5"
      />
      <text x={centerX} y={centerY - 16} textAnchor="middle" fontSize="13" fontWeight="600" fill="hsl(var(--primary))" className="center-text">
        ज्योतिष
      </text>
      <text x={centerX} y={centerY + 2} textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))" className="center-text">
        South Indian
      </text>
      <text x={centerX} y={centerY + 18} textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))" className="center-text">
        Lagna Chart
      </text>
    </svg>
  );
}
