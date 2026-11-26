import {
  AquariumState,
  Creature,
  Genome,
  OceanEventId,
  Predator,
} from '../engine/types';
import { computePhysicsTraits } from '../engine/genetics';

/**
 * Draws a bioluminescent creature anatomically driven by its 7-gene Genome.
 * Exported so both the main aquarium canvas and the DNA Inspector preview use the exact same organism art!
 */
export function drawBioluminescentCreature(
  ctx: CanvasRenderingContext2D,
  genome: Genome,
  hue: number,
  x: number,
  y: number,
  angle: number,
  swimPhase: number,
  options: {
    scale?: number;
    isElite?: boolean;
    isMutant?: boolean;
    isSelected?: boolean;
    fleeing?: boolean;
    energyRatio?: number;
    hungerRatio?: number; // 0..1 approaching starvation!
    showVision?: boolean;
  } = {}
): void {
  const s = options.scale ?? 1;
  const bodyR = (5.5 + genome.bodySize * 8.5) * s;
  const bodyLen = bodyR * (1.45 + genome.tailLength * 0.25);
  const tailLen = (10 + genome.tailLength * 28) * s;
  const finSpan = (6 + genome.finSpan * 17) * s;
  const antennaLen = (4 + genome.visionRange * 14) * s;

  const primaryHue = options.fleeing ? 345 : hue;
  const coreLight = 62 + (options.energyRatio ?? 1) * 18;
  const glowColor = `hsla(${primaryHue}, 95%, ${coreLight}%, 0.85)`;
  const softGlow = `hsla(${primaryHue}, 95%, 58%, 0.24)`;

  ctx.save();
  ctx.translate(x, y);

  // Optional vision cone/circle when selected
  if (options.showVision) {
    const { visionPx } = computePhysicsTraits(genome);
    ctx.beginPath();
    ctx.arc(0, 0, visionPx * s, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${primaryHue}, 90%, 60%, 0.06)`;
    ctx.fill();
    ctx.strokeStyle = `hsla(${primaryHue}, 90%, 70%, 0.35)`;
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Selection ring
  if (options.isSelected) {
    ctx.beginPath();
    ctx.arc(0, 0, bodyLen + 9 * s, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  // Hunger warning arc when creature hasn't eaten recently (hungerRatio > 0.5)
  const hunger = options.hungerRatio ?? 0;
  if (hunger > 0.5) {
    const remaining = Math.max(0, 1 - hunger);
    ctx.beginPath();
    ctx.arc(0, 0, bodyLen + 4 * s, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * remaining);
    ctx.strokeStyle = hunger > 0.78 ? 'rgba(244, 63, 94, 0.9)' : 'rgba(251, 191, 36, 0.85)';
    ctx.lineWidth = 1.8 * s;
    ctx.stroke();
  }

  ctx.rotate(angle);

  // 1. Soft radial bioluminescent aura
  const aura = ctx.createRadialGradient(0, 0, 1, 0, 0, bodyLen * 2.1);
  aura.addColorStop(0, softGlow);
  aura.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, bodyLen * 2.1, 0, Math.PI * 2);
  ctx.fill();

  // 2. Articulated undulating tail (5 glowing vertebrae segments)
  const segments = 6;
  ctx.beginPath();
  ctx.moveTo(-bodyLen * 0.65, 0);
  let prevX = -bodyLen * 0.65;
  let prevY = 0;
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const segX = -bodyLen * 0.65 - t * tailLen;
    const wave = Math.sin(swimPhase - t * 3.1) * (2.5 + t * (4.5 + genome.tailLength * 5.5)) * s;
    ctx.lineTo(segX, wave);
    prevX = segX;
    prevY = wave;
  }
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = Math.max(1.4, bodyR * 0.34);
  ctx.lineCap = 'round';
  ctx.stroke();

  // Tail fin filament tip glow
  ctx.beginPath();
  ctx.arc(prevX, prevY, Math.max(1.5, 2.2 * s), 0, Math.PI * 2);
  ctx.fillStyle = `hsla(${primaryHue}, 100%, 82%, 0.9)`;
  ctx.fill();

  // 3. Translucent sweeping pectoral fins (driven by finSpan!)
  const finFlutter = Math.sin(swimPhase * 0.85) * 0.18;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(bodyLen * 0.15, side * bodyR * 0.45);
    ctx.quadraticCurveTo(
      -bodyLen * 0.15,
      side * (bodyR * 0.65 + finSpan * (1 + finFlutter)),
      -bodyLen * 0.65,
      side * (bodyR * 0.3 + finSpan * 0.42)
    );
    ctx.quadraticCurveTo(
      -bodyLen * 0.35,
      side * bodyR * 0.4,
      bodyLen * 0.15,
      side * bodyR * 0.45
    );
    ctx.fillStyle = `hsla(${primaryHue}, 90%, 62%, 0.32)`;
    ctx.fill();
    ctx.strokeStyle = `hsla(${primaryHue}, 95%, 74%, 0.55)`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // 4. Sensory antennae (driven by visionRange!)
  for (const side of [-1, 1]) {
    const tipX = bodyLen * 0.72 + antennaLen;
    const tipY = side * (bodyR * 0.55 + antennaLen * 0.45);
    ctx.beginPath();
    ctx.moveTo(bodyLen * 0.62, side * bodyR * 0.28);
    ctx.quadraticCurveTo(bodyLen * 0.75 + antennaLen * 0.4, side * bodyR * 0.65, tipX, tipY);
    ctx.strokeStyle = `hsla(${primaryHue + 20}, 95%, 78%, 0.65)`;
    ctx.lineWidth = 1 * s;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(tipX, tipY, 1.5 * s, 0, Math.PI * 2);
    ctx.fillStyle = '#e0f2fe';
    ctx.fill();
  }

  // 5. Streamlined translucent outer membrane body
  ctx.beginPath();
  ctx.moveTo(bodyLen * 0.92, 0);
  ctx.bezierCurveTo(
    bodyLen * 0.55,
    -bodyR * 0.95,
    -bodyLen * 0.55,
    -bodyR * 0.72,
    -bodyLen * 0.75,
    0
  );
  ctx.bezierCurveTo(
    -bodyLen * 0.55,
    bodyR * 0.72,
    bodyLen * 0.55,
    bodyR * 0.95,
    bodyLen * 0.92,
    0
  );
  ctx.closePath();
  ctx.fillStyle = `hsla(${primaryHue}, 88%, 54%, 0.42)`;
  ctx.fill();
  ctx.strokeStyle = options.isMutant
    ? 'rgba(232, 121, 249, 0.9)'
    : `hsla(${primaryHue}, 95%, 75%, 0.85)`;
  ctx.lineWidth = options.isElite ? 2 : 1.25;
  ctx.stroke();

  // 6. Luminous inner nucleus core
  ctx.beginPath();
  ctx.ellipse(bodyLen * 0.08, 0, bodyLen * 0.42, bodyR * 0.38, 0, 0, Math.PI * 2);
  ctx.fillStyle = `hsla(${primaryHue}, 100%, 84%, 0.92)`;
  ctx.fill();

  // 7. Tiny bioluminescent eyes
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(bodyLen * 0.52, side * bodyR * 0.3, Math.max(1.2, 1.5 * s), 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  // 8. Elite golden dorsal shimmer
  if (options.isElite) {
    ctx.beginPath();
    ctx.arc(0, 0, bodyR * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = '#fde047';
    ctx.fill();
  }

  ctx.restore();
}

function drawPredator(ctx: CanvasRenderingContext2D, pred: Predator, timeSec: number): void {
  // Vivid crimson wake trail
  if (pred.trail.length > 2) {
    ctx.beginPath();
    ctx.moveTo(pred.trail[0].x, pred.trail[0].y);
    for (let i = 1; i < pred.trail.length; i++) {
      ctx.lineTo(pred.trail[i].x, pred.trail[i].y);
    }
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.36)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(pred.x, pred.y);
  ctx.rotate(pred.angle);

  // Pulsing crimson threat aura + danger ring so predators stand out unmistakably!
  const pulse = 1 + 0.12 * Math.sin(timeSec * 5 + pred.id);
  const aura = ctx.createRadialGradient(0, 0, 4, 0, 0, 52 * pulse);
  aura.addColorStop(0, 'rgba(244, 63, 94, 0.5)');
  aura.addColorStop(0.5, 'rgba(225, 29, 72, 0.18)');
  aura.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, 52 * pulse, 0, Math.PI * 2);
  ctx.fill();

  // Subtle forward crimson hunt beam
  const cone = ctx.createRadialGradient(18, 0, 2, 18, 0, 75);
  cone.addColorStop(0, 'rgba(251, 113, 133, 0.22)');
  cone.addColorStop(1, 'rgba(244, 63, 94, 0)');
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.arc(18, 0, 75, -0.42, 0.42);
  ctx.closePath();
  ctx.fill();

  // Large undulating barbed predator tail
  const wave = Math.sin(pred.swimPhase) * 13;
  ctx.beginPath();
  ctx.moveTo(-18, 0);
  ctx.quadraticCurveTo(-32, wave * 0.6, -48, wave);
  ctx.strokeStyle = 'rgba(251, 113, 133, 0.95)';
  ctx.lineWidth = 4.2;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Bold sweeping abyssal Leviathan wings (1.45x larger & brighter!)
  ctx.beginPath();
  ctx.moveTo(28, 0);
  ctx.quadraticCurveTo(10, -24, -16, -28);
  ctx.quadraticCurveTo(-10, -9, -20, 0);
  ctx.quadraticCurveTo(-10, 9, -16, 28);
  ctx.quadraticCurveTo(10, 24, 28, 0);
  ctx.closePath();
  ctx.fillStyle = 'rgba(190, 18, 60, 0.92)';
  ctx.fill();
  ctx.strokeStyle = '#fda4af';
  ctx.lineWidth = 2.1;
  ctx.stroke();

  // Glowing bioluminescent dorsal spine markings
  ctx.strokeStyle = '#fb923c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(-10, 0);
  ctx.stroke();

  // Bright fierce neon eyes
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(15, -5.5, 3, 0, Math.PI * 2);
  ctx.arc(15, 5.5, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function pickCreatureAt(
  tank: AquariumState,
  worldX: number,
  worldY: number
): Creature | null {
  let closest: Creature | null = null;
  let bestDist = 26;
  for (const c of tank.creatures) {
    if (!c.alive) continue;
    const d = Math.hypot(c.x - worldX, c.y - worldY);
    if (d < bestDist) {
      bestDist = d;
      closest = c;
    }
  }
  return closest;
}

export function renderAquarium(
  ctx: CanvasRenderingContext2D,
  tank: AquariumState,
  event: OceanEventId,
  selectedCreatureId: string | null,
  timeSec: number
): void {
  const { width: w, height: h } = tank;

  // 1. Deep Abyssal Gradient Backdrop
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, tank.id === 'A' ? '#041428' : '#130e1e');
  bg.addColorStop(0.55, '#030b19');
  bg.addColorStop(1, '#02060e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // 2. Subtle top underwater light rays (caustic shafts)
  ctx.save();
  for (let i = 0; i < 4; i++) {
    const rayX = w * (0.15 + i * 0.24) + Math.sin(timeSec * 0.35 + i) * 35;
    const grad = ctx.createLinearGradient(rayX, 0, rayX + 60, h * 0.72);
    grad.addColorStop(
      0,
      tank.id === 'A' ? 'rgba(34, 211, 238, 0.045)' : 'rgba(251, 146, 60, 0.04)'
    );
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(rayX - 35, 0);
    ctx.lineTo(rayX + 35, 0);
    ctx.lineTo(rayX + 115, h * 0.78);
    ctx.lineTo(rayX - 5, h * 0.78);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 3. Ambient deep-sea dust motes (marine snow)
  ctx.fillStyle = 'rgba(148, 163, 184, 0.16)';
  for (let i = 0; i < 30; i++) {
    const driftX = event === 'strong_current' ? timeSec * 55 : timeSec * 7;
    const mx = ((i * 97.3 + driftX) % w + w) % w;
    const my = ((i * 53.7 + Math.sin(timeSec * 0.6 + i) * 14) % h + h) % h;
    ctx.beginPath();
    ctx.arc(mx, my, 1.1 + (i % 2) * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Strong violent current visual flow streaks
  if (event === 'strong_current') {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 24; i++) {
      const sx = ((timeSec * 320 + i * 85) % (w + 160)) - 80;
      const sy = 26 + ((i * 39) % (h - 52));
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 88, sy);
      ctx.stroke();
    }
  } else if (event === 'mutagen_pulse') {
    ctx.fillStyle = 'rgba(232, 121, 249, 0.045)';
    ctx.fillRect(0, 0, w, h);
  }

  // 4. Water Ripples
  for (const r of tank.ripples) {
    const t = r.age / r.maxAge;
    ctx.beginPath();
    ctx.arc(r.x, r.y, 4 + t * r.maxRadius, 0, Math.PI * 2);
    ctx.strokeStyle = r.color;
    ctx.globalAlpha = Math.max(0, (1 - t) * 0.65);
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // 5. Bioluminescent Plankton (additive glow!)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of tank.plankton) {
    const pulse = 0.8 + 0.25 * Math.sin(timeSec * 3.5 + p.pulseOffset);
    const r = p.size * pulse;
    const halo = ctx.createRadialGradient(p.x, p.y, 0.5, p.x, p.y, r * 3.6);
    halo.addColorStop(0, 'rgba(110, 231, 183, 0.95)');
    halo.addColorStop(0.4, 'rgba(16, 185, 129, 0.35)');
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 3.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 6. Creature Bioluminescent Wake Trails
  for (const c of tank.creatures) {
    if (!c.alive || c.trail.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(c.trail[0].x, c.trail[0].y);
    for (let i = 1; i < c.trail.length; i++) {
      ctx.lineTo(c.trail[i].x, c.trail[i].y);
    }
    ctx.strokeStyle = `hsla(${c.hue}, 95%, 62%, 0.18)`;
    ctx.lineWidth = 1.8 + c.genome.bodySize * 2.2;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // 7. Living Creatures
  for (const c of tank.creatures) {
    if (!c.alive) continue;
    const isSel = c.id === selectedCreatureId;
    drawBioluminescentCreature(ctx, c.genome, c.hue, c.x, c.y, c.angle, c.swimPhase, {
      isElite: c.isElite,
      isMutant: c.isMutant,
      isSelected: isSel,
      fleeing: c.fleeing,
      energyRatio: c.energy / c.maxEnergy,
      hungerRatio: c.timeSinceLastMeal / Math.max(1, c.maxFastTime),
      showVision: isSel,
    });
  }

  // 8. Abyssal Predators (always prominent on top!)
  for (const pred of tank.predators) {
    drawPredator(ctx, pred, timeSec);
  }
}
