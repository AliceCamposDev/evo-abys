import React, { useEffect, useRef } from 'react';
import {
  AquariumState,
  Creature,
  GAConfig,
  GENE_META,
  MORPH_KEYS,
} from '../engine/types';
import {
  NN_HIDDEN1,
  NN_HIDDEN2,
  NN_INPUT_LABELS,
  NN_INPUTS,
  NN_L1_BLOCK,
  NN_L1_COUNT,
  NN_L2_BLOCK,
  NN_OUTPUT_LABELS,
  NN_OUTPUTS,
  NN_WEIGHT_COUNT,
} from '../engine/neuralNet';
import { computePhysicsTraits } from '../engine/genetics';
import { drawBioluminescentCreature } from '../renderer/abyssCanvas';
import { Brain, Crown, Dna, GitBranch, Sparkles, UserCheck } from 'lucide-react';

interface CreatureInspectorProps {
  tankA: AquariumState;
  tankB: AquariumState;
  selectedTankId: 'A' | 'B';
  selectedCreatureId: string | null;
  config: GAConfig;
  renderTick: number;
  onSelectCreature: (tankId: 'A' | 'B', id: string) => void;
}

function neuronFill(val: number): string {
  const clamped = Math.max(-1, Math.min(1, val));
  if (clamped >= 0) {
    return `rgba(34, 211, 238, ${0.22 + clamped * 0.78})`;
  }
  return `rgba(251, 113, 133, ${0.22 + Math.abs(clamped) * 0.78})`;
}

export const CreatureInspector: React.FC<CreatureInspectorProps> = ({
  tankA,
  tankB,
  selectedTankId,
  selectedCreatureId,
  config,
  renderTick,
  onSelectCreature,
}) => {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const activeTank = selectedTankId === 'A' ? tankA : tankB;
  const creature: Creature | undefined =
    activeTank.creatures.find((c) => c.id === selectedCreatureId) ??
    [...activeTank.creatures].sort((a, b) => b.fitness - a.fitness)[0];

  const topA = [...tankA.creatures].sort((a, b) => b.fitness - a.fitness)[0];
  const topB = [...tankB.creatures].sort((a, b) => b.fitness - a.fitness)[0];

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !creature) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 148;
    const h = 96;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const bg = ctx.createRadialGradient(w * 0.5, h * 0.5, 4, w * 0.5, h * 0.5, 80);
    bg.addColorStop(0, `hsla(${creature.hue}, 80%, 24%, 0.45)`);
    bg.addColorStop(1, 'rgba(3, 9, 22, 0.95)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const phase = performance.now() * 0.006;
    drawBioluminescentCreature(ctx, creature.genome, creature.hue, w * 0.58, h * 0.5, 0, phase, {
      scale: 1.45,
      isElite: creature.isElite,
      isMutant: creature.isMutant,
      energyRatio: creature.energy / creature.maxEnergy,
    });
    ctx.restore();
  }, [creature, renderTick]);

  if (!creature) {
    return <div className="glass-card">Nenhuma criatura selecionada.</div>;
  }

  const traits = computePhysicsTraits(creature.genome);
  const originLabel =
    creature.lineage.origin === 'crossover'
      ? 'Crossover em Blocos Neurais'
      : creature.lineage.origin === 'asexual_mutation'
        ? 'Clone Assexuado + Mutação 10%'
        : creature.lineage.origin === 'elite'
          ? 'Preservação Elitista'
          : 'Geração #1 (Pesos Aleatórios)';

  // 4-Column Deep SVG Network coordinates (8 -> 6 -> 4 -> 2)
  const inX = 96;
  const h1X = 198;
  const h2X = 294;
  const outX = 382;
  const inYs = [22, 47, 72, 97, 122, 147, 172, 197];
  const h1Ys = [32, 63, 94, 125, 156, 187];
  const h2Ys = [52, 90, 128, 166];
  const outYs = [78, 142];

  const mutatedSet = new Set(creature.lineage.mutatedWeightIndices);
  const brain = creature.lastBrain;
  const weights = creature.genome.weights;

  return (
    <div className="inspector-grid">
      {/* Left: Animated Anatomy + Morphology Genes + Genealogy */}
      <div className="glass-card">
        <div className="card-header">
          <div>
            <h3>
              <Dna size={15} /> Anatomia, DNA (96 genes) & Linhagem
            </h3>
            <p className="card-sub">4 genes morfológicos + 92 sinapses da Rede Neural Profunda</p>
          </div>
          <div className="quick-pickers">
            {topA && (
              <button
                className={`btn btn-xs ${creature.id === topA.id ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => onSelectCreature('A', topA.id)}
              >
                <UserCheck size={12} /> Líder A
              </button>
            )}
            {topB && (
              <button
                className={`btn btn-xs ${creature.id === topB.id ? 'btn-amber' : 'btn-ghost'}`}
                onClick={() => onSelectCreature('B', topB.id)}
              >
                <UserCheck size={12} /> Líder B
              </button>
            )}
          </div>
        </div>

        <div className="creature-hero">
          <canvas
            ref={previewCanvasRef}
            className="creature-preview-canvas"
            style={{ width: 148, height: 96 }}
          />
          <div className="creature-hero-info">
            <div className="name-row">
              <strong>{creature.name}</strong>
              <span className={`mini-tag ${creature.tankId === 'A' ? 'tag-a' : 'tag-b'}`}>
                Aquário {creature.tankId}
              </span>
              <span className="species-chip">{creature.species}</span>
              {creature.isElite && (
                <span className="elite-chip">
                  <Crown size={11} /> Elite
                </span>
              )}
              {creature.isMutant && (
                <span className="mutant-chip">
                  <Sparkles size={11} /> {creature.lineage.mutatedWeightCount} sinapses mut.
                </span>
              )}
            </div>
            <div className="sub-meta">
              Ger #{creature.generation} • {originLabel}
            </div>
            <div className="creature-kpis">
              <span>
                Fitness: <strong className="text-cyan">{creature.fitness.toFixed(1)}</strong>
              </span>
              <span>
                Plâncton: <strong className="text-emerald">{creature.foodEaten}</strong>
              </span>
              <span>
                Sem comer:{' '}
                <strong
                  style={{
                    color:
                      creature.timeSinceLastMeal / creature.maxFastTime > 0.7
                        ? '#fb7185'
                        : '#fbbf24',
                  }}
                >
                  {creature.timeSinceLastMeal.toFixed(1)}/{creature.maxFastTime.toFixed(1)}s
                </strong>
              </span>
              <span>
                Energia:{' '}
                <strong
                  style={{
                    color:
                      creature.energy / creature.maxEnergy < 0.35 ? '#fb7185' : '#38bdf8',
                  }}
                >
                  {Math.round((creature.energy / Math.max(1, creature.maxEnergy)) * 100)}%
                </strong>
              </span>
              <span>
                Vel: <strong>{Math.round(traits.maxSpeed)}</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="dna-bars">
          {MORPH_KEYS.map((key) => {
            const pct = Math.round(creature.genome[key] * 100);
            const info = creature.lineage.morphOrigins[key];
            const originBadge =
              info.from === 'parentA'
                ? 'Pai A'
                : info.from === 'parentB'
                  ? 'Mãe B'
                  : info.from === 'blend'
                    ? 'A+B'
                    : info.from === 'clone'
                      ? 'Clone'
                      : 'Init';

            return (
              <div key={key} className="dna-row">
                <div className="dna-label">
                  <span style={{ color: GENE_META[key].color }}>{GENE_META[key].label}</span>
                  <span className="dna-badges">
                    <span className={`origin-pill from-${info.from}`}>{originBadge}</span>
                    {info.mutated && (
                      <span className="mut-delta">
                        Mut {info.delta >= 0 ? '+' : ''}
                        {Math.round(info.delta * 100)}
                      </span>
                    )}
                    <strong className="mono">{pct}</strong>
                  </span>
                </div>
                <div className="dna-track">
                  <div
                    className={`dna-fill ${info.mutated ? 'mutated-glow' : ''}`}
                    style={{ width: `${pct}%`, background: GENE_META[key].color }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mini-lineage">
          <div className="mini-section-title" style={{ marginBottom: 6 }}>
            <GitBranch size={13} /> Linhagem ({creature.lineage.origin})
          </div>
          {creature.lineage.origin === 'initial' ? (
            <p className="card-sub">
              Geração #1 inicial (92 pesos neurais aleatórios). Avance para ver Crossover vs. Clone!
            </p>
          ) : (
            <div className="lineage-parents">
              <div className="lineage-node parent-a">
                <div className="node-tag">
                  {creature.lineage.origin === 'asexual_mutation'
                    ? 'Progenitor Único'
                    : 'Progenitor A'}
                </div>
                <div className="node-name">{creature.lineage.parentAName}</div>
                <div className="node-fit">
                  Fitness: <strong>{creature.lineage.parentAFitness?.toFixed(1)}</strong>
                </div>
              </div>
              {creature.lineage.parentBName ? (
                <div className="lineage-node parent-b">
                  <div className="node-tag">Progenitor B</div>
                  <div className="node-name">{creature.lineage.parentBName}</div>
                  <div className="node-fit">
                    Fitness: <strong>{creature.lineage.parentBFitness?.toFixed(1)}</strong>
                  </div>
                </div>
              ) : (
                <div className="lineage-node parent-none">
                  <div className="node-tag">Sem Crossover</div>
                  <div className="node-desc">
                    {creature.lineage.origin === 'asexual_mutation'
                      ? `Clone + Mutação 10% (${creature.lineage.mutatedWeightCount}/${NN_WEIGHT_COUNT} pesos alterados)`
                      : 'Cópia Elitista intacta'}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: LIVE Deep 8 -> 6 -> 4 -> 2 Neural Network Visualization! */}
      <div className="glass-card">
        <div className="card-header">
          <div>
            <h3>
              <Brain size={15} /> Rede Neural Profunda ao Vivo (8 → 6 → 4 → 2)
            </h3>
            <p className="card-sub">
              {NN_WEIGHT_COUNT} pesos sinápticos • 2 camadas ocultas (tanh) acendendo em tempo real
            </p>
          </div>
          <span className="stat-pill pos">
            {creature.lineage.origin === 'crossover'
              ? `Crossover (${config.crossoverMethod})`
              : creature.tankId === 'B'
                ? 'Sem Crossover • Mut. 10%'
                : 'Elite / Inicial'}
          </span>
        </div>

        <svg viewBox="0 0 460 220" className="svg-chart" style={{ padding: 4 }}>
          {/* Synapses Layer 1: Input(8) -> Hidden1(6) */}
          {Array.from({ length: NN_HIDDEN1 }).map((_, h1) =>
            Array.from({ length: NN_INPUTS }).map((__, i) => {
              const wIdx = h1 * NN_L1_BLOCK + i;
              const w = weights[wIdx] ?? 0;
              const mag = Math.min(1, Math.abs(w) / 2.2);
              const isMut = mutatedSet.has(wIdx);
              if (mag < 0.14 && !isMut) return null; // Keep strong synapses crisp and clean!
              const stroke = isMut
                ? '#e879f9'
                : w >= 0
                  ? 'rgba(34, 211, 238, 0.85)'
                  : 'rgba(251, 113, 133, 0.85)';
              return (
                <line
                  key={`l1-${h1}-${i}`}
                  x1={inX + 8.5}
                  y1={inYs[i]}
                  x2={h1X - 9.5}
                  y2={h1Ys[h1]}
                  stroke={stroke}
                  strokeOpacity={0.14 + mag * 0.58}
                  strokeWidth={0.55 + mag * 1.65}
                />
              );
            })
          )}

          {/* Synapses Layer 2: Hidden1(6) -> Hidden2(4) */}
          {Array.from({ length: NN_HIDDEN2 }).map((_, h2) =>
            Array.from({ length: NN_HIDDEN1 }).map((__, h1) => {
              const wIdx = NN_L1_COUNT + h2 * NN_L2_BLOCK + h1;
              const w = weights[wIdx] ?? 0;
              const mag = Math.min(1, Math.abs(w) / 2.2);
              const isMut = mutatedSet.has(wIdx);
              if (mag < 0.12 && !isMut) return null;
              const stroke = isMut
                ? '#e879f9'
                : w >= 0
                  ? 'rgba(56, 189, 248, 0.9)'
                  : 'rgba(251, 113, 133, 0.85)';
              return (
                <line
                  key={`l2-${h2}-${h1}`}
                  x1={h1X + 9.5}
                  y1={h1Ys[h1]}
                  x2={h2X - 10}
                  y2={h2Ys[h2]}
                  stroke={stroke}
                  strokeOpacity={0.18 + mag * 0.65}
                  strokeWidth={0.65 + mag * 1.8}
                />
              );
            })
          )}

          {/* Synapses Layer 3: Hidden2(4) -> Output(2) */}
          {Array.from({ length: NN_HIDDEN2 }).map((_, h2) =>
            Array.from({ length: NN_OUTPUTS }).map((__, o) => {
              const wIdx = NN_L1_COUNT + h2 * NN_L2_BLOCK + NN_HIDDEN1 + 1 + o;
              const w = weights[wIdx] ?? 0;
              const mag = Math.min(1, Math.abs(w) / 2.2);
              const isMut = mutatedSet.has(wIdx);
              const stroke = isMut
                ? '#e879f9'
                : w >= 0
                  ? 'rgba(52, 211, 153, 0.92)'
                  : 'rgba(251, 113, 133, 0.92)';
              return (
                <line
                  key={`l3-${h2}-${o}`}
                  x1={h2X + 10}
                  y1={h2Ys[h2]}
                  x2={outX - 11.5}
                  y2={outYs[o]}
                  stroke={stroke}
                  strokeOpacity={0.22 + mag * 0.72}
                  strokeWidth={0.8 + mag * 2.1}
                />
              );
            })
          )}

          {/* Input Layer Nodes (8) */}
          {inYs.map((y, i) => (
            <g key={`in-${i}`}>
              <text x={inX - 13} y={y + 3} fontSize="8.8" fill="#94a3b8" textAnchor="end">
                {NN_INPUT_LABELS[i]}
              </text>
              <circle
                cx={inX}
                cy={y}
                r="8.2"
                fill={neuronFill(brain.inputs[i] ?? 0)}
                stroke="#38bdf8"
                strokeWidth="1.1"
              />
              <text x={inX} y={y + 2.8} fontSize="6.8" fill="#fff" textAnchor="middle" fontWeight="700">
                {(brain.inputs[i] ?? 0).toFixed(1)}
              </text>
            </g>
          ))}

          {/* Hidden Layer 1 Nodes (6) */}
          {h1Ys.map((y, h1) => (
            <g key={`h1-${h1}`}>
              <circle
                cx={h1X}
                cy={y}
                r="9.2"
                fill={neuronFill(brain.hidden1[h1] ?? 0)}
                stroke="#7dd3fc"
                strokeWidth="1.1"
              />
              <text x={h1X} y={y + 2.8} fontSize="6.9" fill="#fff" textAnchor="middle" fontWeight="700">
                A{h1 + 1}
              </text>
            </g>
          ))}

          {/* Hidden Layer 2 Nodes (4) */}
          {h2Ys.map((y, h2) => (
            <g key={`h2-${h2}`}>
              <circle
                cx={h2X}
                cy={y}
                r="9.8"
                fill={neuronFill(brain.hidden2[h2] ?? 0)}
                stroke="#c4b5fd"
                strokeWidth="1.2"
              />
              <text x={h2X} y={y + 3} fontSize="7.2" fill="#fff" textAnchor="middle" fontWeight="700">
                B{h2 + 1}
              </text>
            </g>
          ))}

          {/* Output Layer Nodes (2) */}
          {outYs.map((y, o) => {
            const val = brain.outputs[o] ?? 0;
            const norm = o === 1 ? val * 2 - 1 : val;
            return (
              <g key={`out-${o}`}>
                <circle
                  cx={outX}
                  cy={y}
                  r="11.2"
                  fill={neuronFill(norm)}
                  stroke="#34d399"
                  strokeWidth="1.4"
                />
                <text x={outX} y={y + 3} fontSize="7.5" fill="#fff" textAnchor="middle" fontWeight="700">
                  {val.toFixed(1)}
                </text>
                <text x={outX + 15} y={y + 3} fontSize="9.2" fill="#e2e8f0" fontWeight="600">
                  {NN_OUTPUT_LABELS[o]}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="chart-legend">
          <span>
            <i className="leg-line" style={{ background: '#22d3ee' }} /> Peso Positivo (+)
          </span>
          <span>
            <i className="leg-line" style={{ background: '#fb7185' }} /> Peso Negativo (−)
          </span>
          <span>
            <i className="leg-line" style={{ background: '#e879f9' }} /> Sinapse Mutada
          </span>
        </div>

        <p className="card-sub" style={{ lineHeight: 1.45 }}>
          <strong>Rede Profunda em Cascata:</strong> a 1ª camada oculta (<code>A1..A6</code>)
          detecta padrões sensoriais (comida, fome, predador, 2º plâncton), e a 2ª camada oculta (
          <code>B1..B4</code>) combina esses sinais em decisões motoras de direção e impulso.
        </p>
      </div>
    </div>
  );
};
