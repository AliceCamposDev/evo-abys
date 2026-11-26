import React from 'react';
import {
  CrossoverMethod,
  DEFAULT_GA_CONFIG,
  GAConfig,
  OCEAN_EVENTS,
  OceanEventId,
  SelectionMethod,
} from '../engine/types';
import { Lock, Sliders, Sparkles, Waves } from 'lucide-react';

interface ControlsPanelProps {
  config: GAConfig;
  event: OceanEventId;
  onUpdateConfig: (partial: Partial<GAConfig>) => void;
  onSetEvent: (event: OceanEventId) => void;
}

const PRESETS: { id: string; label: string; desc: string; patch: Partial<GAConfig> }[] = [
  {
    id: 'balanced',
    label: 'Padrão Equilibrado',
    desc: 'Crossover Uniforme • Mutação 12% • Elitismo 18%',
    patch: { ...DEFAULT_GA_CONFIG },
  },
  {
    id: 'zero_mut',
    label: 'Mutação 0% (Estagnação)',
    desc: 'Mostra perda rápida de diversidade no Aquário A',
    patch: { mutationRate: 0, elitismRate: 0.25 },
  },
  {
    id: 'high_mut',
    label: 'Mutação Extrema (45%)',
    desc: 'Demonstra o caos quando a mutação supera o limiar estável',
    patch: { mutationRate: 0.45, mutationAmplitude: 0.28, elitismRate: 0.04 },
  },
  {
    id: 'no_elitism',
    label: 'Sem Elitismo (0%)',
    desc: 'Permite regressões temporárias da melhor anatomia',
    patch: { elitismRate: 0, mutationRate: 0.14 },
  },
];

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  config,
  event,
  onUpdateConfig,
  onSetEvent,
}) => {
  return (
    <div className="controls-grid">
      {/* Left: Ocean Selective Pressure Events */}
      <div className="glass-card">
        <div className="card-header">
          <div>
            <h3>
              <Waves size={15} /> Eventos Oceânicos (Pressão Seletiva A + B)
            </h3>
            <p className="card-sub">
              Mude o ambiente ao vivo e observe a anatomia das criaturas se adaptar
            </p>
          </div>
        </div>

        <div className="events-grid">
          {(Object.keys(OCEAN_EVENTS) as OceanEventId[]).map((evId) => {
            const info = OCEAN_EVENTS[evId];
            const active = event === evId;
            return (
              <button
                key={evId}
                className={`event-btn ${active ? 'active' : ''}`}
                style={
                  active
                    ? { borderColor: info.color, boxShadow: `0 0 0 1px ${info.color}44` }
                    : undefined
                }
                onClick={() => onSetEvent(evId)}
              >
                <div className="event-top">
                  <strong style={{ color: active ? info.color : '#e2e8f0' }}>{info.name}</strong>
                  <span style={{ color: info.color }}>{info.pressureTarget}</span>
                </div>
                <p>{info.description}</p>
              </button>
            );
          })}
        </div>

        <div className="presets-section">
          <div className="mini-section-title">
            <Sparkles size={13} /> Presets Didáticos (Aquário A)
          </div>
          <div className="presets-row">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                className="preset-btn"
                onClick={() => onUpdateConfig(p.patch)}
              >
                <strong>{p.label}</strong>
                <span>{p.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: GA Controls A vs Locked B */}
      <div className="glass-card">
        <div className="card-header">
          <div>
            <h3>
              <Sliders size={15} /> Hiperparâmetros do Algoritmo Genético
            </h3>
            <p className="card-sub">
              Ajuste o Aquário A ao vivo; Aquário B permanece fixo como controle
            </p>
          </div>
        </div>

        <div className="params-layout">
          <div className="params-col">
            <div className="col-badge badge-a">Aquário A — AG Completo</div>

            <div className="param-select">
              <label>Seleção</label>
              <select
                value={config.selectionMethod}
                onChange={(e) =>
                  onUpdateConfig({ selectionMethod: e.target.value as SelectionMethod })
                }
              >
                <option value="tournament">Torneio (k = 3)</option>
                <option value="roulette">Roleta</option>
                <option value="ranking">Ranking Linear</option>
              </select>
            </div>

            <div className="param-select">
              <label>Crossover</label>
              <select
                value={config.crossoverMethod}
                onChange={(e) =>
                  onUpdateConfig({ crossoverMethod: e.target.value as CrossoverMethod })
                }
              >
                <option value="uniform">Uniforme (Gene a Gene)</option>
                <option value="single-point">Ponto Único</option>
                <option value="arithmetic">Aritmético (Média)</option>
              </select>
            </div>

            <div className="slider-row">
              <div className="slider-head">
                <label>Taxa de Mutação (A)</label>
                <span className="mono">{Math.round(config.mutationRate * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={0.6}
                step={0.01}
                value={config.mutationRate}
                onChange={(e) => onUpdateConfig({ mutationRate: parseFloat(e.target.value) })}
              />
            </div>

            <div className="slider-row">
              <div className="slider-head">
                <label>Elitismo (A)</label>
                <span className="mono">{Math.round(config.elitismRate * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={0.4}
                step={0.02}
                value={config.elitismRate}
                onChange={(e) => onUpdateConfig({ elitismRate: parseFloat(e.target.value) })}
              />
            </div>

            <div className="slider-row">
              <div className="slider-head">
                <label>População por Aquário</label>
                <span className="mono">{config.populationSize}</span>
              </div>
              <input
                type="range"
                min={6}
                max={36}
                step={1}
                value={config.populationSize}
                onChange={(e) =>
                  onUpdateConfig({ populationSize: parseInt(e.target.value, 10) })
                }
              />
            </div>

            <div className="slider-row">
              <div className="slider-head">
                <label>Custo Metabólico</label>
                <span className="mono">{config.metabolicMultiplier.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2.0}
                step={0.05}
                value={config.metabolicMultiplier}
                onChange={(e) =>
                  onUpdateConfig({ metabolicMultiplier: parseFloat(e.target.value) })
                }
              />
            </div>
          </div>

          <div className="params-col control-spec-col">
            <div className="col-badge badge-b">
              <Lock size={12} /> Aquário B — Controle Fixo
            </div>
            <ul className="spec-list">
              <li>
                <span>Crossover</span>
                <strong className="text-red">DESATIVADO</strong>
              </li>
              <li>
                <span>Reprodução</span>
                <strong>Clone Assexuado (1 Pai)</strong>
              </li>
              <li>
                <span>Taxa de Mutação</span>
                <strong className="text-orange">10% fixa por gene</strong>
              </li>
              <li>
                <span>Elitismo</span>
                <strong>0%</strong>
              </li>
              <li>
                <span>Condições Iniciais</span>
                <strong>Idênticas ao Aquário A</strong>
              </li>
            </ul>
            <p className="control-note">
              Usa seleção suave por fitness (roleta raiz, então o cardume <strong>aprende</strong> a
              caçar!), mas <strong>sem crossover</strong> e <strong>sem elitismo</strong> — apenas
              clonagem assexuada + 10% de mutação por gene. Mostra de forma justa quanto o Crossover
              e o Elitismo aceleram a evolução no Aquário A.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
