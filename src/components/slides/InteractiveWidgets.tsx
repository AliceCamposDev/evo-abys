import React, { useEffect, useRef, useState } from 'react';
import { drawBioluminescentCreature } from '../../renderer/abyssCanvas';
import {
  computeCreatureHue,
  computeMetabolicDrain,
  computePhysicsTraits,
} from '../../engine/genetics';
import { BENCHMARK_DATA, EventBenchmarkSummary } from '../../data/benchmarkResults';
import { CrossoverMethod, Genome } from '../../engine/types';
import { RefreshCw } from 'lucide-react';

/* ============================================================================
 * INTERACTIVE LAB 1 (Slide 5): Live Morphology & Metabolic Trade-off Builder
 * ==========================================================================*/
export const InteractiveMorphLab: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bodySize, setBodySize] = useState(0.48);
  const [tailLength, setTailLength] = useState(0.72);
  const [finSpan, setFinSpan] = useState(0.6);
  const [visionRange, setVisionRange] = useState(0.62);
  const [thrust, setThrust] = useState(0.75);

  const genome: Genome = {
    bodySize,
    tailLength,
    finSpan,
    visionRange,
    weights: [],
  };
  const hue = computeCreatureHue(genome);
  const traits = computePhysicsTraits(genome);
  const drain = computeMetabolicDrain(genome, thrust, 1.0, 'calm');
  const autonomySec = traits.maxEnergy / Math.max(0.5, drain);

  useEffect(() => {
    let raf = 0;
    const render = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const w = 290;
        const h = 190;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
          canvas.width = w * dpr;
          canvas.height = h * dpr;
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.scale(dpr, dpr);
          const bg = ctx.createRadialGradient(w * 0.5, h * 0.5, 8, w * 0.5, h * 0.5, 160);
          bg.addColorStop(0, `hsla(${hue}, 70%, 18%, 0.6)`);
          bg.addColorStop(1, '#020814');
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, w, h);

          // Subtle scaled vision radius indicator
          const visR = Math.min(86, 26 + visionRange * 60);
          ctx.beginPath();
          ctx.arc(w * 0.54, h * 0.5, visR, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(${hue}, 90%, 70%, 0.28)`;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          const phase = performance.now() * (0.004 + thrust * 0.008);
          drawBioluminescentCreature(ctx, genome, hue, w * 0.54, h * 0.5, 0, phase, {
            scale: 1.75,
            isElite: true,
            energyRatio: Math.min(1, autonomySec / 14),
          });
          ctx.restore();
        }
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [bodySize, tailLength, finSpan, visionRange, thrust, hue, autonomySec]);

  return (
    <div className="interactive-lab-grid">
      <div className="lab-canvas-col">
        <canvas
          ref={canvasRef}
          className="lab-canvas"
          style={{ width: 290, height: 190 }}
        />
        <div className="lab-metrics-strip">
          <div>
            <span>Vel. Máx</span>
            <strong className="text-cyan">{Math.round(traits.maxSpeed)} px/s</strong>
          </div>
          <div>
            <span>Curva</span>
            <strong className="text-emerald">{traits.turnRate.toFixed(1)} rad/s</strong>
          </div>
          <div>
            <span>Gasto Energ.</span>
            <strong className="text-orange">{drain.toFixed(1)}/s</strong>
          </div>
          <div>
            <span>Autonomia</span>
            <strong style={{ color: autonomySec < 7 ? '#fb7185' : '#34d399' }}>
              {autonomySec.toFixed(1)}s
            </strong>
          </div>
        </div>
      </div>

      <div className="lab-sliders-col">
        <div className="lab-badge">INTERATIVO • Teste o Trade-off Biológico</div>
        {[
          { label: 'Corpo (bodySize)', val: bodySize, set: setBodySize, color: '#fbbf24' },
          { label: 'Cauda (tailLength)', val: tailLength, set: setTailLength, color: '#22d3ee' },
          { label: 'Nadadeiras (finSpan)', val: finSpan, set: setFinSpan, color: '#34d399' },
          { label: 'Visão (visionRange)', val: visionRange, set: setVisionRange, color: '#818cf8' },
          { label: 'Impulso Atual (thrust)', val: thrust, set: setThrust, color: '#f472b6' },
        ].map((item) => (
          <div key={item.label} className="slider-row">
            <div className="slider-head">
              <label style={{ color: item.color }}>{item.label}</label>
              <span className="mono">{Math.round(item.val * 100)}</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={1.0}
              step={0.02}
              value={item.val}
              onChange={(e) => item.set(parseFloat(e.target.value))}
            />
          </div>
        ))}
        <p className="card-sub">
          Experimente subir todos os 4 traços para <code>100</code>: veja o gasto disparar pela{' '}
          <strong>penalidade de sobrecarga metabólica</strong> e a autonomia despencar!
        </p>
      </div>
    </div>
  );
};

/* ============================================================================
 * INTERACTIVE LAB 2 (Slide 8): Live tanh Neuron & Synapse Simulator
 * ==========================================================================*/
export const InteractiveNeuronLab: React.FC = () => {
  const [xFood, setXFood] = useState(0.6); // food angle (-1 left, +1 right)
  const [xPred, setXPred] = useState(-0.4); // predator angle
  const [wFood, setWFood] = useState(1.8); // positive = attract to food
  const [wPred, setWPred] = useState(-2.0); // negative = steer away from predator
  const [bias, setBias] = useState(0.0);

  const z = xFood * wFood + xPred * wPred + bias;
  const out = Math.tanh(z);

  // Build tanh curve points for SVG (-4..+4)
  const curvePts = Array.from({ length: 49 }, (_, i) => {
    const xv = -4 + (i / 48) * 8;
    const yv = Math.tanh(xv);
    const px = 28 + ((xv + 4) / 8) * 236;
    const py = 78 - yv * 56;
    return `${px.toFixed(1)},${py.toFixed(1)}`;
  }).join(' ');

  const dotZ = Math.max(-4, Math.min(4, z));
  const dotX = 28 + ((dotZ + 4) / 8) * 236;
  const dotY = 78 - out * 56;

  const decision =
    out > 0.2 ? 'Vira à DIREITA ↻' : out < -0.2 ? 'Vira à ESQUERDA ↺' : 'Segue RETO ↑';

  return (
    <div className="interactive-lab-grid">
      <div className="lab-sliders-col">
        <div className="lab-badge">INTERATIVO • Simule um Neurônio tanh</div>
        <div className="slider-row">
          <div className="slider-head">
            <label className="text-emerald">x₁: Ângulo da Comida (−Esq / +Dir)</label>
            <span className="mono">{xFood.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.05}
            value={xFood}
            onChange={(e) => setXFood(parseFloat(e.target.value))}
          />
        </div>
        <div className="slider-row">
          <div className="slider-head">
            <label className="text-cyan">w₁: Peso Sináptico da Comida (DNA)</label>
            <span className="mono">{wFood >= 0 ? `+${wFood.toFixed(1)}` : wFood.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min={-3}
            max={3}
            step={0.1}
            value={wFood}
            onChange={(e) => setWFood(parseFloat(e.target.value))}
          />
        </div>
        <div className="slider-row">
          <div className="slider-head">
            <label className="text-red">x₂: Ângulo do Predador (−Esq / +Dir)</label>
            <span className="mono">{xPred.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.05}
            value={xPred}
            onChange={(e) => setXPred(parseFloat(e.target.value))}
          />
        </div>
        <div className="slider-row">
          <div className="slider-head">
            <label className="text-orange">w₂: Peso Sináptico do Predador (DNA)</label>
            <span className="mono">{wPred >= 0 ? `+${wPred.toFixed(1)}` : wPred.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min={-3}
            max={3}
            step={0.1}
            value={wPred}
            onChange={(e) => setWPred(parseFloat(e.target.value))}
          />
        </div>
        <div className="slider-row">
          <div className="slider-head">
            <label>b: Bias (Tendência Natural)</label>
            <span className="mono">{bias.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={-1.5}
            max={1.5}
            step={0.05}
            value={bias}
            onChange={(e) => setBias(parseFloat(e.target.value))}
          />
        </div>
      </div>

      <div className="lab-canvas-col">
        <div className="formula-card mono" style={{ width: '100%', fontSize: '0.76rem' }}>
          z = ({xFood.toFixed(2)})×({wFood.toFixed(1)}) + ({xPred.toFixed(2)})×({wPred.toFixed(1)})
          + ({bias.toFixed(1)}) = <strong>{z.toFixed(2)}</strong>
          <br />
          saída = tanh({z.toFixed(2)}) = <strong className="text-cyan">{out.toFixed(2)}</strong>
        </div>

        <svg viewBox="0 0 290 154" className="slide-svg">
          {/* Axes */}
          <line x1="28" y1="78" x2="264" y2="78" stroke="rgba(148,163,184,0.28)" />
          <line x1="146" y1="16" x2="146" y2="140" stroke="rgba(148,163,184,0.28)" />
          <text x="22" y="26" fontSize="8.5" fill="#64748b" textAnchor="end">+1</text>
          <text x="22" y="81" fontSize="8.5" fill="#64748b" textAnchor="end">0</text>
          <text x="22" y="137" fontSize="8.5" fill="#64748b" textAnchor="end">-1</text>
          <text x="264" y="90" fontSize="8.5" fill="#64748b" textAnchor="end">z</text>

          {/* tanh(z) curve */}
          <polyline fill="none" stroke="#38bdf8" strokeWidth="2.4" points={curvePts} />

          {/* Active Operating Point */}
          <line x1={dotX} y1="78" x2={dotX} y2={dotY} stroke="#34d399" strokeDasharray="3 2" />
          <circle cx={dotX} cy={dotY} r="6" fill="#34d399" stroke="#fff" strokeWidth="1.8" />
        </svg>

        <div className="decision-banner">
          Decisão Motora: <strong className="text-emerald">{decision}</strong>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * INTERACTIVE LAB 3 (Slide 13): 10-Block Neural Crossover Simulator
 * ==========================================================================*/
const BLOCK_LABELS = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'B1', 'B2', 'B3', 'B4'];

interface SimBlock {
  label: string;
  layer: 1 | 2;
  from: 'A' | 'B' | 'blend' | 'clone';
  mutated: boolean;
}

export const InteractiveCrossoverLab: React.FC = () => {
  const [mode, setMode] = useState<CrossoverMethod | 'asexual'>('uniform');
  const [mutRate, setMutRate] = useState(0.15);
  const [nonce, setNonce] = useState(1);

  // Deterministic pseudo-random per nonce so clicking "Gerar Novo Filho" produces crisp new DNA
  const blocks: SimBlock[] = BLOCK_LABELS.map((label, idx) => {
    const seed = (idx + 1) * 73 + nonce * 997;
    const r1 = Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
    const r2 = Math.abs(Math.sin((seed + 17) * 78.233) * 19283.12) % 1;
    const cut = 2 + (nonce % 6);

    let from: SimBlock['from'];
    if (mode === 'asexual') from = 'clone';
    else if (mode === 'single-point') from = idx < cut ? 'A' : 'B';
    else if (mode === 'uniform') from = r1 < 0.6 ? 'A' : 'B';
    else from = 'blend';

    return {
      label,
      layer: idx < 6 ? 1 : 2,
      from,
      mutated: r2 < (mode === 'asexual' ? 0.1 : mutRate),
    };
  });

  const countA = blocks.filter((b) => b.from === 'A').length;
  const countB = blocks.filter((b) => b.from === 'B').length;
  const countMut = blocks.filter((b) => b.mutated).length;

  return (
    <div className="crossover-lab">
      <div className="crossover-controls">
        <div className="segmented small">
          <button
            className={`seg-btn ${mode === 'uniform' ? 'active' : ''}`}
            onClick={() => setMode('uniform')}
          >
            Uniforme (Blocos)
          </button>
          <button
            className={`seg-btn ${mode === 'single-point' ? 'active' : ''}`}
            onClick={() => setMode('single-point')}
          >
            Ponto Único
          </button>
          <button
            className={`seg-btn ${mode === 'arithmetic' ? 'active' : ''}`}
            onClick={() => setMode('arithmetic')}
          >
            Aritmético Seguro
          </button>
          <button
            className={`seg-btn ${mode === 'asexual' ? 'active' : ''}`}
            onClick={() => setMode('asexual')}
          >
            Aquário B (Sem Crossover)
          </button>
        </div>

        <div className="crossover-right-tools">
          {mode !== 'asexual' && (
            <label className="inline-mut-slider">
              <span>Mutação: {Math.round(mutRate * 100)}%</span>
              <input
                type="range"
                min={0}
                max={0.5}
                step={0.05}
                value={mutRate}
                onChange={(e) => setMutRate(parseFloat(e.target.value))}
              />
            </label>
          )}
          <button className="btn btn-xs btn-primary" onClick={() => setNonce((n) => n + 1)}>
            <RefreshCw size={12} /> Gerar Novo Filho
          </button>
        </div>
      </div>

      {/* Parent A + Parent B -> Child Block Grid */}
      <div className="dna-block-rows">
        <div className="dna-block-row">
          <span className="row-tag text-cyan">Pai A (Forte em Caça)</span>
          <div className="blocks-10">
            {BLOCK_LABELS.map((lbl) => (
              <div key={`pa-${lbl}`} className="gene-block blk-a">
                {lbl}
              </div>
            ))}
          </div>
        </div>

        <div className="dna-block-row">
          <span className="row-tag" style={{ color: mode === 'asexual' ? '#64748b' : '#c4b5fd' }}>
            {mode === 'asexual' ? 'Mãe B (Não usada)' : 'Mãe B (Forte em Fuga)'}
          </span>
          <div className="blocks-10">
            {BLOCK_LABELS.map((lbl) => (
              <div
                key={`pb-${lbl}`}
                className={`gene-block ${mode === 'asexual' ? 'blk-off' : 'blk-b'}`}
              >
                {lbl}
              </div>
            ))}
          </div>
        </div>

        <div className="dna-block-row child-row">
          <span className="row-tag text-emerald">Filho Gerado (10 Blocos)</span>
          <div className="blocks-10">
            {blocks.map((b) => (
              <div
                key={`ch-${b.label}`}
                className={`gene-block blk-${b.from} ${b.mutated ? 'blk-mut' : ''}`}
                title={`${b.label} (Camada ${b.layer}) • Origem: ${b.from}${b.mutated ? ' • Mutado!' : ''}`}
              >
                {b.label}
                {b.mutated ? '*' : ''}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="crossover-summary">
        {mode === 'asexual' ? (
          <span>
            <strong>Aquário B:</strong> 10/10 blocos clonados de 1 único pai (sem combinação de
            circuitos de outro pai) + <strong>{countMut}</strong> bloco(s) com mutação de 10%.
          </span>
        ) : (
          <span>
            <strong>Resultado do Crossover:</strong>{' '}
            {mode === 'arithmetic'
              ? '10 blocos mesclados (mesmo sinal)'
              : `${countA} blocos do Pai A + ${countB} blocos da Mãe B`}{' '}
            •{' '}
            <span style={{ color: '#e879f9' }}>
              {countMut} bloco(s) com mutação (*)
            </span>
            .
          </span>
        )}
      </div>
    </div>
  );
};

/* ============================================================================
 * INTERACTIVE LAB 4 (Slide 18): Interactive Selective Pressure Explorer
 * ==========================================================================*/
export const InteractiveEventExplorer: React.FC = () => {
  const [selectedEv, setSelectedEv] = useState<EventBenchmarkSummary>(
    BENCHMARK_DATA.eventResults[0]
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let raf = 0;
    const render = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const w = 260;
        const h = 165;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
          canvas.width = w * dpr;
          canvas.height = h * dpr;
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.scale(dpr, dpr);
          const g: Genome = {
            bodySize: selectedEv.morphA.bodySize / 100,
            tailLength: selectedEv.morphA.tailLength / 100,
            finSpan: selectedEv.morphA.finSpan / 100,
            visionRange: selectedEv.morphA.visionRange / 100,
            weights: [],
          };
          const hue = computeCreatureHue(g);
          const bg = ctx.createRadialGradient(w * 0.5, h * 0.5, 6, w * 0.5, h * 0.5, 140);
          bg.addColorStop(
            0,
            selectedEv.event === 'predator_surge'
              ? 'rgba(136,19,55,0.45)'
              : selectedEv.event === 'scarcity'
                ? 'rgba(120,53,15,0.4)'
                : 'rgba(8,51,68,0.55)'
          );
          bg.addColorStop(1, '#020814');
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, w, h);

          const phase = performance.now() * 0.007;
          drawBioluminescentCreature(ctx, g, hue, w * 0.56, h * 0.52, 0, phase, {
            scale: 1.65,
            isElite: true,
          });
          ctx.restore();
        }
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [selectedEv]);

  const maxBar = Math.max(
    400,
    ...BENCHMARK_DATA.eventResults.map((e) => Math.max(e.avgFitA, e.avgFitB) * 1.08)
  );

  return (
    <div className="event-explorer">
      <div className="event-selector-row">
        {BENCHMARK_DATA.eventResults.map((ev) => (
          <button
            key={ev.event}
            className={`event-tab-pill ${selectedEv.event === ev.event ? 'active' : ''}`}
            onClick={() => setSelectedEv(ev)}
          >
            <strong>{ev.label}</strong>
            <span className="text-emerald mono">+{ev.gainPct}% A vs B</span>
          </button>
        ))}
      </div>

      <div className="slide-two-col">
        <div className="slide-box box-cyan">
          <div className="ev-bench-head">
            <h4>Anatomia Média Evoluída — {selectedEv.label}</h4>
            <span className="stat-pill pos">+{selectedEv.gainPct}%</span>
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <canvas
              ref={canvasRef}
              className="lab-canvas"
              style={{ width: 260, height: 165 }}
            />
            <div style={{ flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="morph-chips">
                <span style={{ borderColor: '#fbbf24', color: '#fbbf24' }}>
                  Corpo: {selectedEv.morphA.bodySize}
                </span>
                <span style={{ borderColor: '#22d3ee', color: '#22d3ee' }}>
                  Cauda: {selectedEv.morphA.tailLength}
                </span>
                <span style={{ borderColor: '#34d399', color: '#34d399' }}>
                  Nadad.: {selectedEv.morphA.finSpan}
                </span>
                <span style={{ borderColor: '#818cf8', color: '#818cf8' }}>
                  Visão: {selectedEv.morphA.visionRange}
                </span>
              </div>
              <p className="ev-note">{selectedEv.adaptationNote}</p>
            </div>
          </div>
        </div>

        <div className="slide-box">
          <h4>Desempenho A vs B neste Cenário (35 Gerações)</h4>
          <div className="ev-bars" style={{ marginTop: 6 }}>
            <div className="ev-bar-row">
              <span className="text-cyan mono">A: {selectedEv.avgFitA}</span>
              <div className="ev-track">
                <div
                  style={{
                    width: `${Math.min(100, (selectedEv.avgFitA / maxBar) * 100)}%`,
                    background: '#22d3ee',
                  }}
                />
              </div>
            </div>
            <div className="ev-bar-row">
              <span className="text-orange mono">B: {selectedEv.avgFitB}</span>
              <div className="ev-track">
                <div
                  style={{
                    width: `${Math.min(100, (selectedEv.avgFitB / maxBar) * 100)}%`,
                    background: '#fb923c',
                  }}
                />
              </div>
            </div>
          </div>
          <div className="summary-strip" style={{ marginTop: 8 }}>
            <div>
              <span>Plâncton A / B</span>
              <strong className="mono">
                <span className="text-cyan">{selectedEv.foodA}</span> /{' '}
                <span className="text-orange">{selectedEv.foodB}</span>
              </strong>
            </div>
            <div>
              <span>Sobrevivência A / B</span>
              <strong className="mono">
                <span className="text-cyan">{selectedEv.survA}%</span> /{' '}
                <span className="text-orange">{selectedEv.survB}%</span>
              </strong>
            </div>
            <div>
              <span>Vantagem AG</span>
              <strong className="mono text-emerald">+{selectedEv.gainPct}%</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
