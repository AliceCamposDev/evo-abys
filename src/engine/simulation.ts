import {
  AquariumState,
  Creature,
  DEFAULT_GA_CONFIG,
  DualOceanState,
  GAConfig,
  GenerationStats,
  Genome,
  LineageGeneInfo,
  MORPH_KEYS,
  MorphGeneKey,
  OceanEventId,
  Plankton,
  Predator,
} from './types';
import { evaluateBrain } from './neuralNet';
import { SeededRandom } from './prng';
import {
  breedNextGeneration,
  classifySpecies,
  cloneGenome,
  computeAverageMorph,
  computeCreatureFitness,
  computeCreatureHue,
  computeGeneticDiversity,
  computeMetabolicDrain,
  computePhysicsTraits,
  createRandomGenome,
  generateCreatureName,
} from './genetics';

export const TANK_WIDTH = 900;
export const TANK_HEIGHT = 560;
export const FIXED_DT = 0.04; // 25Hz deterministic physics

function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function createEmptyBrain() {
  return {
    inputs: [0, 0, 0, 0, 0, 0, 1, 0],
    hidden1: [0, 0, 0, 0, 0, 0],
    hidden2: [0, 0, 0, 0],
    outputs: [0, 0.5] as [number, number],
  };
}

export class DualOceanEngine {
  public state: DualOceanState;
  private rngA: SeededRandom;
  private rngB: SeededRandom;

  constructor(seed?: number, config?: Partial<GAConfig>) {
    const initialSeed = seed ?? Math.floor(Math.random() * 899999) + 100000;
    const merged: GAConfig = { ...DEFAULT_GA_CONFIG, ...config };
    this.rngA = new SeededRandom(initialSeed + 101);
    this.rngB = new SeededRandom(initialSeed + 202);
    this.state = this.createInitialState(initialSeed, merged);
  }

  public reset(newSeed?: number, preserveConfig = true): void {
    const seed = newSeed ?? this.state.seed;
    const config = preserveConfig ? this.state.config : { ...DEFAULT_GA_CONFIG };
    this.rngA = new SeededRandom(seed + 101);
    this.rngB = new SeededRandom(seed + 202);
    this.state = this.createInitialState(seed, config);
  }

  public updateConfig(partial: Partial<GAConfig>): void {
    this.state.config = { ...this.state.config, ...partial };
  }

  public setEvent(event: OceanEventId): void {
    this.state.event = event;
    this.syncPredatorCount(this.state.tankA, this.rngA);
    this.syncPredatorCount(this.state.tankB, this.rngB);
  }

  public dropPlanktonBurst(tankId: 'A' | 'B', x: number, y: number): void {
    const tank = tankId === 'A' ? this.state.tankA : this.state.tankB;
    const rng = tankId === 'A' ? this.rngA : this.rngB;
    for (let i = 0; i < 6; i++) {
      const ang = rng.range(0, Math.PI * 2);
      const dist = rng.range(4, 28);
      tank.plankton.push({
        id: tank.nextId++,
        x: Math.max(24, Math.min(tank.width - 24, x + Math.cos(ang) * dist)),
        y: Math.max(24, Math.min(tank.height - 24, y + Math.sin(ang) * dist)),
        vx: rng.range(-10, 10),
        vy: rng.range(-10, 10),
        size: rng.range(3.2, 5.2),
        pulseOffset: rng.range(0, Math.PI * 2),
        energyValue: 28,
      });
    }
    tank.ripples.push({
      id: tank.nextId++,
      x,
      y,
      color: '#34d399',
      age: 0,
      maxAge: 0.9,
      maxRadius: 42,
    });
  }

  private createInitialState(seed: number, config: GAConfig): DualOceanState {
    const initRng = new SeededRandom(seed ^ 0x517cc1b7);
    const initialBlueprints: {
      genome: Genome;
      name: string;
      x: number;
      y: number;
      angle: number;
    }[] = [];

    for (let i = 0; i < config.populationSize; i++) {
      initialBlueprints.push({
        genome: createRandomGenome(initRng),
        name: generateCreatureName(initRng, i + 1),
        x: initRng.range(80, TANK_WIDTH - 80),
        y: initRng.range(70, TANK_HEIGHT - 70),
        angle: initRng.range(0, Math.PI * 2),
      });
    }

    const initialPlankton = this.createPlanktonPool(initRng, 16, 1);
    const initialPredators = this.createPredators(initRng, 2, 1000);

    const tankA = this.createAquarium(
      'A',
      'Aquário A — AG Neural Profundo',
      'Seleção + Crossover + Mutação + Elitismo (96 genes • 8→6→4→2)',
      'full_ga',
      '#22d3ee',
      initialBlueprints,
      initialPlankton.map((p) => ({ ...p })),
      initialPredators.map((p) => ({ ...p, trail: [] }))
    );

    const tankB = this.createAquarium(
      'B',
      'Aquário B — Controle (Sem Crossover)',
      'Clonagem Assexuada + Mutação 10% por Gene (96 genes • 8→6→4→2)',
      'mutation_only_10',
      '#fb923c',
      initialBlueprints,
      initialPlankton.map((p) => ({ ...p })),
      initialPredators.map((p) => ({ ...p, trail: [] }))
    );

    return {
      seed,
      event: 'calm',
      config,
      tankA,
      tankB,
    };
  }

  private createAquarium(
    id: 'A' | 'B',
    name: string,
    subtitle: string,
    mode: 'full_ga' | 'mutation_only_10',
    accentColor: string,
    blueprints: { genome: Genome; name: string; x: number; y: number; angle: number }[],
    plankton: Plankton[],
    predators: Predator[]
  ): AquariumState {
    const creatures: Creature[] = blueprints.map((bp, idx) => {
      const morphOrigins = {} as Record<MorphGeneKey, LineageGeneInfo>;
      for (const k of MORPH_KEYS) morphOrigins[k] = { from: 'initial', mutated: false, delta: 0 };
      const genome = cloneGenome(bp.genome);
      const traits = computePhysicsTraits(genome);

      return {
        id: `${id}-g1-${idx + 1}`,
        name: bp.name,
        tankId: id,
        generation: 1,
        genome,
        species: classifySpecies(genome),
        hue: computeCreatureHue(genome),
        isElite: false,
        isMutant: false,
        lineage: {
          origin: 'initial',
          parentAId: null,
          parentAName: null,
          parentAFitness: null,
          parentAMorph: null,
          parentBId: null,
          parentBName: null,
          parentBFitness: null,
          parentBMorph: null,
          mutatedMorphCount: 0,
          mutatedWeightCount: 0,
          mutatedWeightIndices: [],
          morphOrigins,
        },
        lastBrain: createEmptyBrain(),
        x: bp.x,
        y: bp.y,
        vx: Math.cos(bp.angle) * 40,
        vy: Math.sin(bp.angle) * 40,
        angle: bp.angle,
        swimPhase: idx * 0.7,
        trail: [],
        alive: true,
        deathCause: 'none',
        energy: traits.maxEnergy,
        maxEnergy: traits.maxEnergy,
        timeSinceLastMeal: 0,
        maxFastTime: traits.maxFastTime,
        fleeing: false,
        evasionCooldown: 0,
        foodEaten: 0,
        timeSurvived: 0,
        predatorEvasions: 0,
        distanceTraveled: 0,
        approachScore: 0,
        energySpent: 0,
        fitness: 0,
      };
    });

    return {
      id,
      name,
      subtitle,
      mode,
      accentColor,
      width: TANK_WIDTH,
      height: TANK_HEIGHT,
      generation: 1,
      generationTime: 0,
      creatures,
      plankton,
      predators,
      ripples: [],
      totalFoodEatenAllTime: 0,
      history: [],
      nextId: 2000,
    };
  }

  private createPlanktonPool(rng: SeededRandom, count: number, startId: number): Plankton[] {
    const list: Plankton[] = [];
    for (let i = 0; i < count; i++) {
      list.push({
        id: startId + i,
        x: rng.range(36, TANK_WIDTH - 36),
        y: rng.range(36, TANK_HEIGHT - 36),
        vx: rng.range(-8, 8),
        vy: rng.range(-8, 8),
        size: rng.range(3.0, 5.0),
        pulseOffset: rng.range(0, Math.PI * 2),
        energyValue: 28,
      });
    }
    return list;
  }

  private createPredators(rng: SeededRandom, count: number, startId: number): Predator[] {
    const list: Predator[] = [];
    for (let i = 0; i < count; i++) {
      const x =
        i % 2 === 0
          ? rng.range(180, TANK_WIDTH * 0.42)
          : rng.range(TANK_WIDTH * 0.58, TANK_WIDTH - 180);
      const y = rng.range(120, TANK_HEIGHT - 120);
      list.push({
        id: startId + i,
        x,
        y,
        angle: rng.range(0, Math.PI * 2),
        speed: 88,
        swimPhase: i * 1.9,
        trail: [],
        eatCooldown: 0,
      });
    }
    return list;
  }

  private syncPredatorCount(tank: AquariumState, rng: SeededRandom): void {
    const target = this.state.event === 'predator_surge' ? 5 : 2;
    while (tank.predators.length < target) {
      tank.predators.push({
        id: tank.nextId++,
        x: rng.range(160, tank.width - 160),
        y: rng.range(110, tank.height - 110),
        angle: rng.range(0, Math.PI * 2),
        speed: 118,
        swimPhase: rng.range(0, 6),
        trail: [],
        eatCooldown: 0.4,
      });
    }
    if (tank.predators.length > target) {
      tank.predators = tank.predators.slice(0, target);
    }
  }

  public step(recordVisuals = true): boolean {
    this.stepTank(this.state.tankA, this.rngA, recordVisuals);
    this.stepTank(this.state.tankB, this.rngB, recordVisuals);

    const aliveA = this.state.tankA.creatures.some((c) => c.alive);
    const aliveB = this.state.tankB.creatures.some((c) => c.alive);
    const timeUp = this.state.tankA.generationTime >= this.state.config.generationDuration;

    // Synchronized generation rollover: both tanks stay 1-to-1 aligned with identical arena spawns!
    if (timeUp || (!aliveA && !aliveB)) {
      const nextGen = this.state.tankA.generation + 1;
      const arenaRngA = new SeededRandom((this.state.seed ^ (nextGen * 2654435761)) >>> 0);
      const arenaRngB = new SeededRandom((this.state.seed ^ (nextGen * 2654435761)) >>> 0);
      this.completeGeneration(this.state.tankA, this.rngA, arenaRngA);
      this.completeGeneration(this.state.tankB, this.rngB, arenaRngB);
      return true;
    }
    return false;
  }

  public runTurboGenerations(count: number): void {
    const targetGen = this.state.tankA.generation + count;
    const maxTicks = count * Math.ceil(this.state.config.generationDuration / FIXED_DT) + 250;
    let ticks = 0;
    while (this.state.tankA.generation < targetGen && ticks < maxTicks) {
      this.step(false);
      ticks++;
    }
  }

  private stepTank(tank: AquariumState, rng: SeededRandom, recordVisuals: boolean): void {
    const config = this.state.config;
    const event = this.state.event;
    const currentVx = event === 'strong_current' ? 118 : 0;

    // 1. Plankton
    const targetPlankton = event === 'scarcity' ? 6 : event === 'bloom' ? 34 : 16;
    if (tank.plankton.length > targetPlankton + 12) {
      tank.plankton.length = targetPlankton + 12;
    }
    while (tank.plankton.length < targetPlankton) {
      tank.plankton.push({
        id: tank.nextId++,
        x: rng.range(36, tank.width - 36),
        y: rng.range(36, tank.height - 36),
        vx: rng.range(-8, 8),
        vy: rng.range(-8, 8),
        size: rng.range(3.0, 5.0),
        pulseOffset: rng.range(0, Math.PI * 2),
        energyValue: event === 'scarcity' ? 20 : 24,
      });
    }

    for (const p of tank.plankton) {
      p.x += (p.vx + currentVx * 0.65) * FIXED_DT;
      p.y += p.vy * FIXED_DT;
      if (p.x < 18) p.x = tank.width - 20;
      if (p.x > tank.width - 18) p.x = 20;
      if (p.y < 18 || p.y > tank.height - 18) p.vy *= -1;
    }

    // 2. Predators (independent patrol + separation + clean edge reflection)
    const predSpeed = event === 'predator_surge' ? 128 : 88;
    const predDetect = event === 'predator_surge' ? 460 : 340;
    const predTurn = event === 'predator_surge' ? 3.1 : 2.4;

    for (const pred of tank.predators) {
      pred.eatCooldown = Math.max(0, pred.eatCooldown - FIXED_DT);
      pred.swimPhase += FIXED_DT * (event === 'predator_surge' ? 8.5 : 6.5);

      let nearest: Creature | null = null;
      let bestScore = predDetect;
      let nearestDist = predDetect;
      for (const c of tank.creatures) {
        if (!c.alive) continue;
        const d = Math.hypot(c.x - pred.x, c.y - pred.y);
        if (d >= predDetect) continue;
        let contestedPenalty = 0;
        for (const other of tank.predators) {
          if (other.id === pred.id) continue;
          const otherDist = Math.hypot(c.x - other.x, c.y - other.y);
          if (otherDist < d * 0.95) contestedPenalty += 115;
        }
        const score = d + contestedPenalty;
        if (score < bestScore) {
          bestScore = score;
          nearestDist = d;
          nearest = c;
        }
      }

      const meander =
        Math.sin(pred.swimPhase * 0.28 + pred.id * 2.3) * 0.55 + rng.range(-0.35, 0.35);
      const driftAngle = pred.angle + meander;
      let steerX = Math.cos(driftAngle) * 0.95;
      let steerY = Math.sin(driftAngle) * 0.95;

      if (nearest) {
        const dx = nearest.x - pred.x;
        const dy = nearest.y - pred.y;
        const d = Math.max(1, nearestDist);
        steerX += (dx / d) * 1.75;
        steerY += (dy / d) * 1.75;
      } else {
        const wander = pred.angle + rng.range(-1.6, 1.6);
        steerX += Math.cos(wander) * 0.85;
        steerY += Math.sin(wander) * 0.85;
      }

      const sepRadius = 165;
      for (const other of tank.predators) {
        if (other.id === pred.id) continue;
        const dx = pred.x - other.x;
        const dy = pred.y - other.y;
        const dist = Math.hypot(dx, dy);
        if (dist < sepRadius) {
          const safeDist = Math.max(1, dist);
          const push = Math.pow((sepRadius - dist) / sepRadius, 1.2) * 3.8;
          steerX += (dx / safeDist) * push;
          steerY += (dy / safeDist) * push;
        }
      }

      const margin = 90;
      if (pred.x < margin) steerX += ((margin - pred.x) / margin) * 3.2;
      if (pred.x > tank.width - margin)
        steerX -= ((pred.x - (tank.width - margin)) / margin) * 3.2;
      if (pred.y < margin) steerY += ((margin - pred.y) / margin) * 3.2;
      if (pred.y > tank.height - margin)
        steerY -= ((pred.y - (tank.height - margin)) / margin) * 3.2;

      const desired = Math.atan2(steerY, steerX);
      const diff = normalizeAngle(desired - pred.angle);
      const maxTurn = predTurn * FIXED_DT;
      pred.angle = normalizeAngle(pred.angle + Math.max(-maxTurn, Math.min(maxTurn, diff)));

      const speedVar = 1 + Math.sin(pred.id * 1.7 + pred.swimPhase * 0.12) * 0.06;
      let vx = Math.cos(pred.angle) * predSpeed * speedVar;
      let vy = Math.sin(pred.angle) * predSpeed * speedVar;
      let nextX = pred.x + vx * FIXED_DT;
      let nextY = pred.y + vy * FIXED_DT;

      const pad = 24;
      let bounced = false;
      if (nextX < pad) {
        nextX = pad;
        vx = Math.abs(vx);
        bounced = true;
      } else if (nextX > tank.width - pad) {
        nextX = tank.width - pad;
        vx = -Math.abs(vx);
        bounced = true;
      }
      if (nextY < pad) {
        nextY = pad;
        vy = Math.abs(vy);
        bounced = true;
      } else if (nextY > tank.height - pad) {
        nextY = tank.height - pad;
        vy = -Math.abs(vy);
        bounced = true;
      }
      if (bounced) {
        const toCenterX = tank.width * 0.5 - nextX;
        const toCenterY = tank.height * 0.5 - nextY;
        const cLen = Math.max(1, Math.hypot(toCenterX, toCenterY));
        pred.angle = Math.atan2(
          vy / predSpeed + (toCenterY / cLen) * 0.45,
          vx / predSpeed + (toCenterX / cLen) * 0.45
        );
      }

      pred.x = nextX;
      pred.y = nextY;

      if (recordVisuals) {
        pred.trail.push({ x: pred.x, y: pred.y });
        if (pred.trail.length > 16) pred.trail.shift();
      } else if (pred.trail.length > 0) {
        pred.trail = [];
      }

      if (pred.eatCooldown <= 0) {
        for (const c of tank.creatures) {
          if (!c.alive) continue;
          const d = Math.hypot(c.x - pred.x, c.y - pred.y);
          if (d < 20 + c.genome.bodySize * 6) {
            c.alive = false;
            c.deathCause = 'eaten';
            pred.eatCooldown = event === 'predator_surge' ? 0.65 : 1.05;
            if (recordVisuals) {
              tank.ripples.push({
                id: tank.nextId++,
                x: c.x,
                y: c.y,
                color: '#f43f5e',
                age: 0,
                maxAge: 0.9,
                maxRadius: 42,
              });
            }
            break;
          }
        }
      }
    }

    // 3. Step Creatures — 100% Neural Network Driven!
    for (const c of tank.creatures) {
      if (!c.alive) {
        c.fitness = computeCreatureFitness(c, event, config.generationDuration);
        continue;
      }
      c.timeSurvived += FIXED_DT;
      c.evasionCooldown = Math.max(0, c.evasionCooldown - FIXED_DT);

      const g = c.genome;
      const traits = computePhysicsTraits(g);

      // Sensor 1, 2 & 8: Nearest AND 2nd-nearest visible Plankton
      let bestFoodDist = traits.visionPx;
      let bestPlanktonIdx = -1;
      let secondFoodDist = traits.visionPx * 1.15;
      let secondPlanktonIdx = -1;

      for (let i = 0; i < tank.plankton.length; i++) {
        const p = tank.plankton[i];
        const d = Math.hypot(p.x - c.x, p.y - c.y);
        if (d < bestFoodDist) {
          secondFoodDist = bestFoodDist;
          secondPlanktonIdx = bestPlanktonIdx;
          bestFoodDist = d;
          bestPlanktonIdx = i;
        } else if (d < secondFoodDist) {
          secondFoodDist = d;
          secondPlanktonIdx = i;
        }
      }

      let foodRelAngle = 0;
      let foodCloseness = 0;
      if (bestPlanktonIdx >= 0) {
        const p = tank.plankton[bestPlanktonIdx];
        foodRelAngle = normalizeAngle(Math.atan2(p.y - c.y, p.x - c.x) - c.angle);
        foodCloseness = 1 - bestFoodDist / traits.visionPx;
      }

      let food2RelAngle = 0;
      if (secondPlanktonIdx >= 0) {
        const p2 = tank.plankton[secondPlanktonIdx];
        food2RelAngle = normalizeAngle(Math.atan2(p2.y - c.y, p2.x - c.x) - c.angle);
      }

      // Sensor 3 & 4: Nearest visible Predator (angle & closeness)
      const predRange = traits.visionPx * 1.25;
      let bestPredDist = predRange;
      let nearestPred: Predator | null = null;
      for (const pred of tank.predators) {
        const d = Math.hypot(pred.x - c.x, pred.y - c.y);
        if (d < bestPredDist) {
          bestPredDist = d;
          nearestPred = pred;
        }
      }

      let predRelAngle = 0;
      let predCloseness = 0;
      if (nearestPred) {
        predRelAngle = normalizeAngle(
          Math.atan2(nearestPred.y - c.y, nearestPred.x - c.x) - c.angle
        );
        predCloseness = 1 - bestPredDist / predRange;
      }

      c.fleeing = nearestPred !== null && predCloseness > 0.35;
      if (nearestPred && bestPredDist < 90 && Math.abs(predRelAngle) > Math.PI * 0.5 && c.evasionCooldown <= 0) {
        c.predatorEvasions++;
        c.evasionCooldown = 2.4;
      }

      // Sensor 5: Signed wall proximity cue
      const wallMargin = 75;
      let wallVecX = 0;
      let wallVecY = 0;
      if (c.x < wallMargin) wallVecX += (wallMargin - c.x) / wallMargin;
      if (c.x > tank.width - wallMargin) wallVecX -= (c.x - (tank.width - wallMargin)) / wallMargin;
      if (c.y < wallMargin) wallVecY += (wallMargin - c.y) / wallMargin;
      if (c.y > tank.height - wallMargin) wallVecY -= (c.y - (tank.height - wallMargin)) / wallMargin;

      let wallCue = 0;
      const wallMag = Math.hypot(wallVecX, wallVecY);
      if (wallMag > 0.01) {
        const awayAngle = normalizeAngle(Math.atan2(wallVecY, wallVecX) - c.angle);
        wallCue = Math.max(-1, Math.min(1, (awayAngle / Math.PI) * Math.min(1, wallMag)));
      }

      // Sensor 6 & 7: Internal biological state (Hunger urgency + Energy reserve)
      const hungerSensor = Math.min(1, c.timeSinceLastMeal / Math.max(1, c.maxFastTime));
      const energySensor = Math.max(0, Math.min(1, c.energy / Math.max(1, c.maxEnergy)));

      // Evaluate Deep 8 -> 6 -> 4 -> 2 Neural Network Brain!
      const inputs = [
        foodRelAngle / Math.PI,
        foodCloseness,
        predRelAngle / Math.PI,
        predCloseness,
        wallCue,
        hungerSensor,
        energySensor,
        food2RelAngle / Math.PI,
      ];
      const brain = evaluateBrain(g.weights, inputs);
      c.lastBrain = brain;

      const [turnOut, thrustOut] = brain.outputs;

      // Apply neural motor outputs directly to steering & propulsion
      c.angle = normalizeAngle(c.angle + turnOut * traits.turnRate * FIXED_DT);
      const speedRatio = 0.28 + 0.72 * thrustOut;
      const spd = traits.maxSpeed * speedRatio;
      c.vx = Math.cos(c.angle) * spd + currentVx * (0.55 + g.bodySize * 0.45);
      c.vy = Math.sin(c.angle) * spd;

      const prevX = c.x;
      const prevY = c.y;
      c.x = Math.max(20, Math.min(tank.width - 20, c.x + c.vx * FIXED_DT));
      c.y = Math.max(20, Math.min(tank.height - 20, c.y + c.vy * FIXED_DT));

      const moved = Math.hypot(c.x - prevX, c.y - prevY);
      c.distanceTraveled += moved;

      // Mild shaping reward for steering cleanly toward visible plankton
      if (bestPlanktonIdx >= 0 && Math.cos(foodRelAngle) > 0.35) {
        c.approachScore += Math.cos(foodRelAngle) * (0.3 + foodCloseness) * FIXED_DT * 4.5;
      }

      c.swimPhase += FIXED_DT * (4.5 + speedRatio * 8.0 + g.tailLength * 3);

      if (recordVisuals) {
        c.trail.push({ x: c.x, y: c.y });
        if (c.trail.length > 10) c.trail.shift();
      } else if (c.trail.length > 0) {
        c.trail = [];
      }

      // Starvation timer
      c.timeSinceLastMeal += FIXED_DT * (event === 'scarcity' ? 1.3 : 1.0);

      // Eat plankton on contact
      if (bestPlanktonIdx >= 0 && bestFoodDist <= traits.captureRadius) {
        const eaten = tank.plankton[bestPlanktonIdx];
        tank.plankton.splice(bestPlanktonIdx, 1);
        c.foodEaten++;
        c.timeSinceLastMeal = 0;
        tank.totalFoodEatenAllTime++;
        c.energy = Math.min(c.maxEnergy, c.energy + eaten.energyValue);
        if (recordVisuals && tank.ripples.length < 24) {
          tank.ripples.push({
            id: tank.nextId++,
            x: eaten.x,
            y: eaten.y,
            color: `hsl(${c.hue}, 90%, 65%)`,
            age: 0,
            maxAge: 0.65,
            maxRadius: 22,
          });
        }
      }

      // Metabolic drain
      const drain =
        computeMetabolicDrain(g, thrustOut, config.metabolicMultiplier, event) * FIXED_DT;
      c.energy = Math.max(0, c.energy - drain);
      c.energySpent += drain;

      if (c.energy <= 0 || c.timeSinceLastMeal >= c.maxFastTime) {
        c.alive = false;
        c.deathCause = 'starved';
        if (recordVisuals && tank.ripples.length < 24) {
          tank.ripples.push({
            id: tank.nextId++,
            x: c.x,
            y: c.y,
            color: '#fbbf24',
            age: 0,
            maxAge: 0.75,
            maxRadius: 26,
          });
        }
      }

      c.fitness = computeCreatureFitness(c, event, config.generationDuration);
    }

    // 4. Water ripples
    if (recordVisuals && tank.ripples.length > 0) {
      for (const r of tank.ripples) r.age += FIXED_DT;
      tank.ripples = tank.ripples.filter((r) => r.age < r.maxAge);
    } else if (!recordVisuals && tank.ripples.length > 0) {
      tank.ripples = [];
    }

    // 5. Advance generation clock (synchronized rollover handled in step())
    tank.generationTime += FIXED_DT;
  }

  private completeGeneration(
    tank: AquariumState,
    rng: SeededRandom,
    arenaRng: SeededRandom
  ): void {
    const config = this.state.config;
    const event = this.state.event;

    for (const c of tank.creatures) {
      c.fitness = computeCreatureFitness(c, event, config.generationDuration);
    }

    const fits = tank.creatures.map((c) => c.fitness);
    const bestFitness = Math.max(...fits);
    const worstFitness = Math.min(...fits);
    const avgFitness = fits.reduce((a, b) => a + b, 0) / Math.max(1, fits.length);
    const aliveCount = tank.creatures.filter((c) => c.alive).length;

    const stats: GenerationStats = {
      generation: tank.generation,
      bestFitness: Number(bestFitness.toFixed(1)),
      avgFitness: Number(avgFitness.toFixed(1)),
      worstFitness: Number(worstFitness.toFixed(1)),
      survivalRate: Math.round((aliveCount / Math.max(1, tank.creatures.length)) * 100),
      totalFoodEaten: tank.creatures.reduce((s, c) => s + c.foodEaten, 0),
      totalEvasions: tank.creatures.reduce((s, c) => s + c.predatorEvasions, 0),
      diversity: computeGeneticDiversity(tank.creatures),
      avgMorph: computeAverageMorph(tank.creatures),
      event,
    };
    tank.history.push(stats);

    const blueprints = breedNextGeneration(tank.creatures, tank.mode, config, event, rng);
    const nextGen = tank.generation + 1;

    tank.creatures = blueprints.map((bp, idx) => {
      const seq = tank.nextId++;
      const traits = computePhysicsTraits(bp.genome);
      const x = arenaRng.range(70, tank.width - 70);
      const y = arenaRng.range(60, tank.height - 60);
      const angle = arenaRng.range(0, Math.PI * 2);

      return {
        id: `${tank.id}-g${nextGen}-${seq}`,
        name: generateCreatureName(rng, seq % 999),
        tankId: tank.id,
        generation: nextGen,
        genome: bp.genome,
        species: classifySpecies(bp.genome),
        hue: computeCreatureHue(bp.genome),
        isElite: bp.isElite,
        isMutant: bp.isMutant,
        lineage: bp.lineage,
        lastBrain: createEmptyBrain(),
        x,
        y,
        vx: Math.cos(angle) * 40,
        vy: Math.sin(angle) * 40,
        angle,
        swimPhase: idx * 0.6,
        trail: [],
        alive: true,
        deathCause: 'none',
        energy: traits.maxEnergy,
        maxEnergy: traits.maxEnergy,
        timeSinceLastMeal: 0,
        maxFastTime: traits.maxFastTime,
        fleeing: false,
        evasionCooldown: 0,
        foodEaten: 0,
        timeSurvived: 0,
        predatorEvasions: 0,
        distanceTraveled: 0,
        approachScore: 0,
        energySpent: 0,
        fitness: 0,
      };
    });

    tank.generation = nextGen;
    tank.generationTime = 0;
  }
}
