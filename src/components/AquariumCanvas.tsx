import React, { useEffect, useRef } from 'react';
import { AquariumState, OceanEventId } from '../engine/types';
import { pickCreatureAt, renderAquarium } from '../renderer/abyssCanvas';
import { Dna, Flame } from 'lucide-react';

interface AquariumCanvasProps {
  tank: AquariumState;
  otherTank: AquariumState;
  event: OceanEventId;
  selectedCreatureId: string | null;
  generationDuration: number;
  renderTick: number;
  compact?: boolean;
  onSelectCreature?: (tankId: 'A' | 'B', creatureId: string) => void;
  onDropPlankton: (tankId: 'A' | 'B', worldX: number, worldY: number) => void;
}

export const AquariumCanvas: React.FC<AquariumCanvasProps> = ({
  tank,
  otherTank,
  event,
  selectedCreatureId,
  generationDuration,
  renderTick,
  compact = false,
  onSelectCreature,
  onDropPlankton,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = Math.floor(tank.width * dpr);
    const targetH = Math.floor(tank.height * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    renderAquarium(ctx, tank, event, selectedCreatureId, performance.now() * 0.001);
    ctx.restore();
  }, [tank, event, selectedCreatureId, renderTick]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const worldX = ((e.clientX - rect.left) / rect.width) * tank.width;
    const worldY = ((e.clientY - rect.top) / rect.height) * tank.height;

    if (onSelectCreature) {
      const picked = pickCreatureAt(tank, worldX, worldY);
      if (picked) {
        onSelectCreature(tank.id, picked.id);
        return;
      }
    }
    onDropPlankton(tank.id, worldX, worldY);
  };

  const aliveCount = tank.creatures.filter((c) => c.alive).length;
  const foodThisGen = tank.creatures.reduce((s, c) => s + c.foodEaten, 0);
  const avgFit =
    tank.creatures.length > 0
      ? tank.creatures.reduce((s, c) => s + c.fitness, 0) / tank.creatures.length
      : 0;
  const otherAvgFit =
    otherTank.creatures.length > 0
      ? otherTank.creatures.reduce((s, c) => s + c.fitness, 0) / otherTank.creatures.length
      : 0;
  const deltaPct = otherAvgFit > 1 ? ((avgFit - otherAvgFit) / otherAvgFit) * 100 : 0;
  const genPct = Math.min(100, (tank.generationTime / Math.max(1, generationDuration)) * 100);
  const isA = tank.id === 'A';

  return (
    <div className={`tank-card ${isA ? 'tank-a' : 'tank-b'} ${compact ? 'tank-card-compact' : ''}`}>
      <div className="tank-canvas-wrap">
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          className="tank-canvas"
          title={
            compact
              ? 'Clique na água para soltar plâncton ao vivo!'
              : 'Clique em uma criatura para inspecionar seu DNA, ou na água para soltar plâncton!'
          }
        />

        {/* Minimalist Floating Glass Pill (Top Left) */}
        <div className="tank-overlay-tl">
          <span className={`tank-pill ${isA ? 'pill-a' : 'pill-b'}`}>
            {isA ? <Dna size={compact ? 11 : 13} /> : <Flame size={compact ? 11 : 13} />}
            {compact ? (isA ? 'Aquário A — AG' : 'Aquário B — Controle') : tank.name}
          </span>
          {!compact && <span className="tank-sub">{tank.subtitle}</span>}
        </div>

        {/* Minimalist Floating KPI Glass Pill (Top Right) */}
        <div className="tank-overlay-tr">
          <div className="tank-stat">
            <span>Vivas</span>
            <strong>
              {aliveCount}/{tank.creatures.length}
            </strong>
          </div>
          {!compact && (
            <div className="tank-stat">
              <span>Predad.</span>
              <strong className="text-red">{tank.predators.length}</strong>
            </div>
          )}
          <div className="tank-stat">
            <span>Plâncton</span>
            <strong className="text-emerald">
              {compact ? foodThisGen : `${foodThisGen} (${tank.plankton.length})`}
            </strong>
          </div>
          <div className="tank-stat">
            <span>Fitness</span>
            <strong>
              {avgFit.toFixed(0)}
              {Math.abs(deltaPct) >= 1 && (
                <em className={`delta-chip ${deltaPct >= 0 ? 'pos' : 'neg'}`}>
                  {deltaPct >= 0 ? '+' : ''}
                  {deltaPct.toFixed(0)}%
                </em>
              )}
            </strong>
          </div>
        </div>

        {/* Subtle Bottom Interaction Hint */}
        {!compact && (
          <div className="tank-overlay-br">Clique na criatura = DNA • Clique na água = +Plâncton</div>
        )}

        {/* Hairline Generation Progress Bar along bottom */}
        <div className="tank-gen-bar">
          <div
            className="tank-gen-fill"
            style={{ width: `${genPct}%`, background: tank.accentColor }}
          />
        </div>
      </div>
    </div>
  );
};
