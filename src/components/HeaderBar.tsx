import React from 'react';
import {
  Columns2,
  Download,
  FastForward,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  Square,
  Zap,
} from 'lucide-react';
import { OCEAN_EVENTS, OceanEventId } from '../engine/types';

export type ViewMode = 'split' | 'focusA' | 'focusB';

interface HeaderBarProps {
  isRunning: boolean;
  speed: number;
  seed: number;
  generation: number;
  event: OceanEventId;
  viewMode: ViewMode;
  onToggleRun: () => void;
  onSetSpeed: (speed: number) => void;
  onTurbo: (gens: number) => void;
  onResetSameSeed: () => void;
  onResetNewSeed: () => void;
  onSetViewMode: (mode: ViewMode) => void;
  onExportCsv: () => void;
  onExportJson: () => void;
}

const SPEEDS = [1, 2, 5, 10];

export const HeaderBar: React.FC<HeaderBarProps> = ({
  isRunning,
  speed,
  seed,
  generation,
  event,
  viewMode,
  onToggleRun,
  onSetSpeed,
  onTurbo,
  onResetSameSeed,
  onResetNewSeed,
  onSetViewMode,
  onExportCsv,
  onExportJson,
}) => {
  const eventInfo = OCEAN_EVENTS[event];

  return (
    <header className="top-header">
      <div className="brand-block">
        <div className="brand-logo">
          <span className="brand-orb" />
          <h1>EvoAbyss</h1>
          <span className="brand-tag">AG Bioluminescente</span>
        </div>
        <div className="brand-meta">
          <span>Ger #{generation}</span>
          <span>•</span>
          <span>Seed {seed}</span>
          <span>•</span>
          <span
            className="event-chip"
            style={{ color: eventInfo.color, borderColor: `${eventInfo.color}66` }}
          >
            {eventInfo.shortName}
          </span>
        </div>
      </div>

      <div className="header-controls">
        <div className="control-group">
          <button
            className={`btn ${isRunning ? 'btn-amber' : 'btn-primary'}`}
            onClick={onToggleRun}
          >
            {isRunning ? <Pause size={14} /> : <Play size={14} />}
            {isRunning ? 'Pausar' : 'Rodar'}
          </button>

          <div className="segmented">
            {SPEEDS.map((s) => (
              <button
                key={s}
                className={`seg-btn ${speed === s ? 'active' : ''}`}
                onClick={() => onSetSpeed(s)}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        <div className="control-group">
          <button
            className="btn btn-turbo"
            onClick={() => onTurbo(10)}
            title="Treinar 10 gerações completas instantaneamente"
          >
            <FastForward size={14} /> +10 Ger
          </button>
          <button
            className="btn btn-turbo-strong"
            onClick={() => onTurbo(50)}
            title="Treinar 50 gerações completas instantaneamente"
          >
            <Zap size={14} /> +50 Ger
          </button>
        </div>

        <div className="segmented">
          <button
            className={`seg-btn ${viewMode === 'split' ? 'active' : ''}`}
            onClick={() => onSetViewMode('split')}
          >
            <Columns2 size={13} /> A vs B
          </button>
          <button
            className={`seg-btn ${viewMode === 'focusA' ? 'active' : ''}`}
            onClick={() => onSetViewMode('focusA')}
          >
            <Square size={11} /> A
          </button>
          <button
            className={`seg-btn ${viewMode === 'focusB' ? 'active' : ''}`}
            onClick={() => onSetViewMode('focusB')}
          >
            <Square size={11} /> B
          </button>
        </div>

        <div className="control-group">
          <button className="btn btn-ghost" onClick={onResetSameSeed} title="Reiniciar (mesma seed)">
            <RotateCcw size={14} />
          </button>
          <button className="btn btn-ghost" onClick={onResetNewSeed} title="Nova seed aleatória">
            <Shuffle size={14} />
          </button>
          <button className="btn btn-ghost" onClick={onExportCsv} title="Exportar CSV">
            <Download size={13} /> CSV
          </button>
          <button className="btn btn-ghost" onClick={onExportJson} title="Exportar JSON">
            JSON
          </button>
        </div>
      </div>
    </header>
  );
};
