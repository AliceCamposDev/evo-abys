import React, { useMemo, useState } from 'react';
import {
  AquariumState,
  GENE_META,
  GenerationStats,
  MORPH_KEYS,
} from '../engine/types';
import { computeAverageMorph } from '../engine/genetics';
import {
  buildAreaPath,
  buildConfidenceBandPath,
  buildPathFromPoints,
  computeXAxisTicks,
  downsamplePoints,
  movingAverage,
} from '../utils/chartMath';
import { AlertTriangle, Eye, SlidersHorizontal, TrendingUp } from 'lucide-react';

interface ChartsPanelProps {
  tankA: AquariumState;
  tankB: AquariumState;
}

type WindowRange = 'all' | '30' | '80';

export const ChartsPanel: React.FC<ChartsPanelProps> = ({ tankA, tankB }) => {
  const [morphTarget, setMorphTarget] = useState<'A' | 'B'>('A');
  const [windowRange, setWindowRange] = useState<WindowRange>('all');
  const [smoothEnabled, setSmoothEnabled] = useState(true);
  const [showBestLines, setShowBestLines] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const rawHistA: GenerationStats[] = tankA.history;
  const rawHistB: GenerationStats[] = tankB.history;
  const hasHistory = rawHistA.length > 0;

  // Apply zoom window (Todas / Últimas 80 / Últimas 30)
  const sliceCount =
    windowRange === '30' ? 30 : windowRange === '80' ? 80 : rawHistA.length;
  const histA = rawHistA.slice(-sliceCount);
  const histB = rawHistB.slice(-sliceCount);
  const gens = histA.map((h) => h.generation);

  // Proportional smoothing window (uncapped!) so 500 or 2000 generations stay silky smooth!
  const smoothWin = smoothEnabled
    ? Math.max(3, Math.round(histA.length * 0.085))
    : 1;
  // Cap rendered curve resolution at 30 clean buckets so lines NEVER become jagged ink walls
  const maxBuckets = 30;

  const prepared = useMemo(() => {
    const rawValsA = histA.map((h) => h.avgFitness);
    const rawValsB = histB.map((h) => h.avgFitness);
    const avgA = downsamplePoints(gens, movingAverage(rawValsA, smoothWin), maxBuckets, rawValsA);
    const avgB = downsamplePoints(gens, movingAverage(rawValsB, smoothWin), maxBuckets, rawValsB);
    const bestA = downsamplePoints(
      gens,
      movingAverage(histA.map((h) => h.bestFitness), smoothWin),
      maxBuckets
    );
    const bestB = downsamplePoints(
      gens,
      movingAverage(histB.map((h) => h.bestFitness), smoothWin),
      maxBuckets
    );

    const divA = downsamplePoints(
      gens,
      movingAverage(histA.map((h) => h.diversity), smoothWin),
      maxBuckets
    );
    const divB = downsamplePoints(
      gens,
      movingAverage(histB.map((h) => h.diversity), smoothWin),
      maxBuckets
    );

    const morphSource = morphTarget === 'A' ? histA : histB;
    const morphSeries = MORPH_KEYS.map((k) => ({
      key: k,
      points: downsamplePoints(
        gens,
        movingAverage(morphSource.map((h) => h.avgMorph[k]), smoothWin),
        maxBuckets
      ),
    }));

    return { avgA, avgB, bestA, bestB, divA, divB, morphSeries };
  }, [gens, histA, histB, smoothWin, morphTarget]);

  const visibleFitVals = [
    ...prepared.avgA.map((p) => p.max ?? p.value),
    ...prepared.avgB.map((p) => p.max ?? p.value),
    ...(showBestLines
      ? [...prepared.bestA.map((p) => p.value), ...prepared.bestB.map((p) => p.value)]
      : []),
  ];
  const maxFit = Math.max(80, ...(visibleFitVals.length > 0 ? visibleFitVals : [120])) * 1.12;

  const latestA = rawHistA[rawHistA.length - 1];
  const latestB = rawHistB[rawHistB.length - 1];

  const avgMorphA = latestA ? latestA.avgMorph : computeAverageMorph(tankA.creatures);
  const avgMorphB = latestB ? latestB.avgMorph : computeAverageMorph(tankB.creatures);

  // Use last 5-gen mean for stable comparison badge
  const recentA =
    rawHistA.slice(-5).reduce((s, h) => s + h.avgFitness, 0) / Math.max(1, rawHistA.slice(-5).length);
  const recentB =
    rawHistB.slice(-5).reduce((s, h) => s + h.avgFitness, 0) / Math.max(1, rawHistB.slice(-5).length);
  const avgAdvPct = recentB > 0 ? ((recentA - recentB) / recentB) * 100 : 0;

  // Chart dimensions
  const W = 390;
  const H = 172;
  const PL = 38;
  const PR = 12;
  const PT = 14;
  const PB = 24;

  const xTicks = computeXAxisTicks(prepared.avgA, W, PL, PR, 5);
  const pathAvgA = buildPathFromPoints(prepared.avgA, W, H, PL, PR, PT, PB, 0, maxFit);
  const pathAvgB = buildPathFromPoints(prepared.avgB, W, H, PL, PR, PT, PB, 0, maxFit);
  const areaAvgA = buildAreaPath(pathAvgA, prepared.avgA, W, H, PL, PR, PB);
  const areaAvgB = buildAreaPath(pathAvgB, prepared.avgB, W, H, PL, PR, PB);
  const bandA = buildConfidenceBandPath(prepared.avgA, W, H, PL, PR, PT, PB, 0, maxFit);
  const bandB = buildConfidenceBandPath(prepared.avgB, W, H, PL, PR, PT, PB, 0, maxFit);

  // Interactive hover on Fitness chart
  const handleFitMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (prepared.avgA.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    const t = Math.max(0, Math.min(1, (relX - PL) / (W - PL - PR)));
    const idx = Math.round(t * (prepared.avgA.length - 1));
    setHoverIdx(idx);
  };

  const hoveredA = hoverIdx !== null ? prepared.avgA[hoverIdx] : null;
  const hoveredB = hoverIdx !== null ? prepared.avgB[hoverIdx] : null;
  const hoverX =
    hoverIdx !== null && prepared.avgA.length > 1
      ? PL + (hoverIdx / (prepared.avgA.length - 1)) * (W - PL - PR)
      : PL + (W - PL - PR) * 0.5;

  // Radar geometry
  const radarSize = 186;
  const cx = radarSize / 2;
  const cy = radarSize / 2;
  const rMax = 64;
  const radarPoints = (morph: Record<string, number>) =>
    MORPH_KEYS.map((k, idx) => {
      const angle = (Math.PI * 2 * idx) / MORPH_KEYS.length - Math.PI / 2;
      const r = morph[k] * rMax;
      return `${(cx + Math.cos(angle) * r).toFixed(1)},${(cy + Math.sin(angle) * r).toFixed(1)}`;
    }).join(' ');

  return (
    <div className="charts-wrapper">
      {/* Shared Chart Legibility Toolbar */}
      <div className="chart-toolbar">
        <div className="toolbar-left">
          <SlidersHorizontal size={13} className="text-cyan" />
          <span className="toolbar-label">
            Exibindo <strong>{histA.length}</strong> de <strong>{rawHistA.length}</strong> gerações
            {rawHistA.length > maxBuckets && ` (${maxBuckets} blocos suavizados + faixa ±σ)`}
          </span>
        </div>

        <div className="toolbar-right">
          <div className="segmented small" title="Janela de gerações exibidas nos gráficos">
            <button
              className={`seg-btn ${windowRange === '30' ? 'active' : ''}`}
              onClick={() => setWindowRange('30')}
            >
              Últ. 30
            </button>
            <button
              className={`seg-btn ${windowRange === '80' ? 'active' : ''}`}
              onClick={() => setWindowRange('80')}
            >
              Últ. 80
            </button>
            <button
              className={`seg-btn ${windowRange === 'all' ? 'active' : ''}`}
              onClick={() => setWindowRange('all')}
            >
              Todas
            </button>
          </div>

          <button
            className={`btn btn-xs ${smoothEnabled ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setSmoothEnabled((s) => !s)}
            title="Aplica média móvel para deixar tendências nítidas em muitas gerações"
          >
            Suavizar {smoothEnabled ? `(MM${smoothWin})` : 'OFF'}
          </button>

          <button
            className={`btn btn-xs ${showBestLines ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setShowBestLines((s) => !s)}
            title="Mostrar ou ocultar linhas do melhor indivíduo para evitar poluição visual"
          >
            <Eye size={12} /> {showBestLines ? 'Ocultar Melhor' : 'Mostrar Melhor'}
          </button>
        </div>
      </div>

      <div className="charts-grid">
        {/* 1. Comparative Fitness Curve with Area Fill, X-Axis & Hover Tooltip */}
        <div className="glass-card">
          <div className="card-header">
            <div>
              <h3>
                <TrendingUp size={15} /> Curva de Aprendizado Neural (Fitness A vs B)
              </h3>
              <p className="card-sub">
                {hoveredA && hoveredB
                  ? `Geração #${hoveredA.gen} → A: ${hoveredA.value.toFixed(1)} | B: ${hoveredB.value.toFixed(1)}`
                  : 'Passe o mouse no gráfico para inspecionar cada geração'}
              </p>
            </div>
            {latestA && latestB && (
              <span className={`stat-pill ${avgAdvPct >= 0 ? 'pos' : 'neg'}`}>
                A vs B (últ. 5): {avgAdvPct >= 0 ? '+' : ''}
                {avgAdvPct.toFixed(0)}%
              </span>
            )}
          </div>

          {!hasHistory ? (
            <div className="chart-empty">
              Aguardando fim da Geração #1 (ou clique em <strong>+10 Ger</strong> no topo)...
            </div>
          ) : (
            <>
              <svg
                viewBox={`0 0 ${W} ${H}`}
                className="svg-chart interactive-chart"
                onMouseMove={handleFitMouseMove}
                onMouseLeave={() => setHoverIdx(null)}
              >
                <defs>
                  <linearGradient id="areaGradA" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.26" />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="areaGradB" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb923c" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#fb923c" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid + Y labels */}
                {[0, 0.33, 0.66, 1].map((t) => {
                  const y = PT + (1 - t) * (H - PT - PB);
                  return (
                    <g key={t}>
                      <line
                        x1={PL}
                        y1={y}
                        x2={W - PR}
                        y2={y}
                        stroke="rgba(148,163,184,0.12)"
                        strokeDasharray="3 3"
                      />
                      <text x={PL - 5} y={y + 3} fontSize="8.8" fill="#64748b" textAnchor="end">
                        {Math.round(maxFit * t)}
                      </text>
                    </g>
                  );
                })}

                {/* X-axis generation labels */}
                {xTicks.map((tk) => (
                  <text
                    key={tk.label + tk.x}
                    x={tk.x}
                    y={H - 6}
                    fontSize="8.6"
                    fill="#64748b"
                    textAnchor="middle"
                  >
                    {tk.label}
                  </text>
                ))}

                {/* RL-style smooth dispersion bands (±0.55σ) instead of jagged raw scribbles */}
                {smoothEnabled && histA.length > maxBuckets && (
                  <>
                    {bandB && <path d={bandB} fill="rgba(251, 146, 60, 0.14)" />}
                    {bandA && <path d={bandA} fill="rgba(34, 211, 238, 0.16)" />}
                  </>
                )}

                {/* Soft area gradients */}
                {areaAvgB && <path d={areaAvgB} fill="url(#areaGradB)" />}
                {areaAvgA && <path d={areaAvgA} fill="url(#areaGradA)" />}

                {/* Optional Best lines */}
                {showBestLines && (
                  <>
                    <path
                      d={buildPathFromPoints(prepared.bestB, W, H, PL, PR, PT, PB, 0, maxFit)}
                      fill="none"
                      stroke="#fb923c"
                      strokeWidth="1.4"
                      strokeDasharray="4 3"
                      strokeOpacity="0.7"
                    />
                    <path
                      d={buildPathFromPoints(prepared.bestA, W, H, PL, PR, PT, PB, 0, maxFit)}
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                      strokeOpacity="0.8"
                    />
                  </>
                )}

                {/* Crisp Main Average Trend Curves */}
                <path d={pathAvgB} fill="none" stroke="#fb923c" strokeWidth="2.3" />
                <path d={pathAvgA} fill="none" stroke="#22d3ee" strokeWidth="2.8" />

                {/* Interactive Crosshair */}
                {hoveredA && hoveredB && (
                  <g>
                    <line
                      x1={hoverX}
                      y1={PT}
                      x2={hoverX}
                      y2={H - PB}
                      stroke="rgba(226,232,240,0.4)"
                      strokeDasharray="2 2"
                    />
                    <circle
                      cx={hoverX}
                      cy={PT + (H - PT - PB) - (hoveredA.value / maxFit) * (H - PT - PB)}
                      r="4"
                      fill="#22d3ee"
                      stroke="#fff"
                      strokeWidth="1.4"
                    />
                    <circle
                      cx={hoverX}
                      cy={PT + (H - PT - PB) - (hoveredB.value / maxFit) * (H - PT - PB)}
                      r="3.5"
                      fill="#fb923c"
                      stroke="#fff"
                      strokeWidth="1.4"
                    />
                  </g>
                )}
              </svg>

              <div className="chart-legend">
                <span>
                  <i className="leg-line" style={{ background: '#22d3ee' }} /> Média A (AG Neural)
                </span>
                <span>
                  <i className="leg-line" style={{ background: '#fb923c' }} /> Média B (Mut. 10%)
                </span>
                {showBestLines && (
                  <span>
                    <i className="leg-dash" style={{ borderColor: '#cbd5e1' }} /> Tracejado = Melhor
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* 2. Morphology Evolution (Smoothed & Downsampled) */}
        <div className="glass-card">
          <div className="card-header">
            <div>
              <h3>Evolução da Anatomia Média</h3>
              <p className="card-sub">Tendência de corpo, cauda, nadadeiras e alcance sensorial</p>
            </div>
            <div className="segmented small">
              <button
                className={`seg-btn ${morphTarget === 'A' ? 'active' : ''}`}
                onClick={() => setMorphTarget('A')}
              >
                Aquário A
              </button>
              <button
                className={`seg-btn ${morphTarget === 'B' ? 'active' : ''}`}
                onClick={() => setMorphTarget('B')}
              >
                Aquário B
              </button>
            </div>
          </div>

          {!hasHistory ? (
            <div className="chart-empty">
              Os traços médios aparecerão após a Geração #1 concluída.
            </div>
          ) : (
            <>
              <svg viewBox={`0 0 ${W} ${H}`} className="svg-chart">
                {[0.25, 0.5, 0.75, 1].map((t) => {
                  const y = PT + (1 - t) * (H - PT - PB);
                  return (
                    <g key={t}>
                      <line
                        x1={PL}
                        y1={y}
                        x2={W - PR}
                        y2={y}
                        stroke="rgba(148,163,184,0.12)"
                        strokeDasharray="3 3"
                      />
                      <text x={PL - 5} y={y + 3} fontSize="8.8" fill="#64748b" textAnchor="end">
                        {Math.round(t * 100)}
                      </text>
                    </g>
                  );
                })}

                {xTicks.map((tk) => (
                  <text
                    key={`m-${tk.label}-${tk.x}`}
                    x={tk.x}
                    y={H - 6}
                    fontSize="8.6"
                    fill="#64748b"
                    textAnchor="middle"
                  >
                    {tk.label}
                  </text>
                ))}

                {prepared.morphSeries.map((s) => (
                  <path
                    key={s.key}
                    d={buildPathFromPoints(s.points, W, H, PL, PR, PT, PB, 0, 1)}
                    fill="none"
                    stroke={GENE_META[s.key].color}
                    strokeWidth="2.3"
                  />
                ))}
              </svg>
              <div className="chart-legend">
                {MORPH_KEYS.map((k) => (
                  <span key={k}>
                    <i className="leg-line" style={{ background: GENE_META[k].color }} />
                    {GENE_META[k].label}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 3. Morphological Radar (A vs B) */}
        <div className="glass-card">
          <div className="card-header">
            <div>
              <h3>Radar Morfológico (A vs B)</h3>
              <p className="card-sub">Comparativo dos 4 genes físicos médios</p>
            </div>
          </div>

          <div className="radar-layout">
            <svg viewBox={`0 0 ${radarSize} ${radarSize}`} className="radar-svg">
              {[0.25, 0.5, 0.75, 1].map((ring) => (
                <circle
                  key={ring}
                  cx={cx}
                  cy={cy}
                  r={rMax * ring}
                  fill="none"
                  stroke="rgba(148,163,184,0.15)"
                />
              ))}
              {MORPH_KEYS.map((k, idx) => {
                const angle = (Math.PI * 2 * idx) / MORPH_KEYS.length - Math.PI / 2;
                const x2 = cx + Math.cos(angle) * rMax;
                const y2 = cy + Math.sin(angle) * rMax;
                const lx = cx + Math.cos(angle) * (rMax + 15);
                const ly = cy + Math.sin(angle) * (rMax + 15);
                return (
                  <g key={k}>
                    <line x1={cx} y1={cy} x2={x2} y2={y2} stroke="rgba(148,163,184,0.16)" />
                    <text
                      x={lx}
                      y={ly + 3}
                      fontSize="8.8"
                      fontWeight="600"
                      fill={GENE_META[k].color}
                      textAnchor="middle"
                    >
                      {GENE_META[k].shortLabel}
                    </text>
                  </g>
                );
              })}

              <polygon
                points={radarPoints(avgMorphB)}
                fill="rgba(251, 146, 60, 0.22)"
                stroke="#fb923c"
                strokeWidth="1.8"
              />
              <polygon
                points={radarPoints(avgMorphA)}
                fill="rgba(34, 211, 238, 0.25)"
                stroke="#22d3ee"
                strokeWidth="2.1"
              />
            </svg>

            <div className="radar-table">
              <div className="radar-row head">
                <span>Traço</span>
                <span className="text-cyan">A</span>
                <span className="text-orange">B</span>
              </div>
              {MORPH_KEYS.map((k) => (
                <div key={k} className="radar-row">
                  <span style={{ color: GENE_META[k].color }}>{GENE_META[k].label}</span>
                  <span className="mono">{Math.round(avgMorphA[k] * 100)}</span>
                  <span className="mono">{Math.round(avgMorphB[k] * 100)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Genetic Diversity (38 genes) & Survival Rate */}
        <div className="glass-card">
          <div className="card-header">
            <div>
              <h3>Diversidade Genética (96 Genes) & Plâncton</h3>
              <p className="card-sub">Desvio padrão suavizado nos pesos neurais + sobrevivência</p>
            </div>
            {latestA && latestA.diversity < 20 && (
              <span className="warn-chip">
                <AlertTriangle size={12} /> Convergência Alta
              </span>
            )}
          </div>

          {!hasHistory ? (
            <div className="chart-empty">
              A diversidade neural e o plâncton coletado aparecerão após a Geração #1.
            </div>
          ) : (
            <>
              <svg viewBox={`0 0 ${W} 130`} className="svg-chart">
                {[0, 0.5, 1].map((t) => {
                  const y = 14 + (1 - t) * 90;
                  return (
                    <g key={t}>
                      <line
                        x1={PL}
                        y1={y}
                        x2={W - PR}
                        y2={y}
                        stroke="rgba(148,163,184,0.12)"
                        strokeDasharray="3 3"
                      />
                      <text x={PL - 5} y={y + 3} fontSize="8.5" fill="#64748b" textAnchor="end">
                        {Math.round(t * 100)}
                      </text>
                    </g>
                  );
                })}

                {xTicks.map((tk) => (
                  <text
                    key={`d-${tk.label}-${tk.x}`}
                    x={tk.x}
                    y={123}
                    fontSize="8.4"
                    fill="#64748b"
                    textAnchor="middle"
                  >
                    {tk.label}
                  </text>
                ))}

                <path
                  d={buildPathFromPoints(prepared.divB, W, 130, PL, PR, 14, 26, 0, 100)}
                  fill="none"
                  stroke="#fb923c"
                  strokeWidth="2.1"
                />
                <path
                  d={buildPathFromPoints(prepared.divA, W, 130, PL, PR, 14, 26, 0, 100)}
                  fill="none"
                  stroke="#22d3ee"
                  strokeWidth="2.4"
                />
              </svg>

              {latestA && latestB && (
                <div className="summary-strip">
                  <div>
                    <span>Diversidade A / B</span>
                    <strong className="mono">
                      <span className="text-cyan">{latestA.diversity}</span> /{' '}
                      <span className="text-orange">{latestB.diversity}</span>
                    </strong>
                  </div>
                  <div>
                    <span>Sobrevivência A / B</span>
                    <strong className="mono">
                      <span className="text-cyan">{latestA.survivalRate}%</span> /{' '}
                      <span className="text-orange">{latestB.survivalRate}%</span>
                    </strong>
                  </div>
                  <div>
                    <span>Plâncton (Últ. Ger)</span>
                    <strong className="mono">
                      <span className="text-cyan">{latestA.totalFoodEaten}</span> /{' '}
                      <span className="text-orange">{latestB.totalFoodEaten}</span>
                    </strong>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
