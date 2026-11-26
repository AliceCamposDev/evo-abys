import {
  Creature,
  CreatureLineage,
  CreatureSpecies,
  GAConfig,
  Genome,
  LineageGeneInfo,
  MORPH_KEYS,
  MorphGeneKey,
  OceanEventId,
  SelectionMethod,
} from './types';
import {
  clampWeight,
  NN_L1_BLOCK,
  NN_L1_COUNT,
  NN_L2_BLOCK,
  NN_TOTAL_BLOCKS,
  NN_WEIGHT_COUNT,
} from './neuralNet';
import { SeededRandom } from './prng';

const PREFIXES = [
  'Nyx', 'Lum', 'Vel', 'Azu', 'Cor', 'Pel', 'Sir', 'Thal', 'Vex', 'Kri', 'Oph', 'Zep', 'Mor', 'Hal',
];
const SUFFIXES = [
  'is', 'on', 'ae', 'ux', 'ia', 'or', 'en', 'al', 'yn', 'os', 'ra', 'el',
];

export function clampMorph(v: number): number {
  return Math.max(0.1, Math.min(1.0, v));
}

export function generateCreatureName(rng: SeededRandom, seq: number): string {
  const a = PREFIXES[rng.int(0, PREFIXES.length - 1)];
  const b = SUFFIXES[rng.int(0, SUFFIXES.length - 1)];
  return `${a}${b}-${seq}`;
}

export function createRandomGenome(rng: SeededRandom): Genome {
  // Xavier-like initialization (-0.95..0.95) prevents tanh saturation in 2-hidden-layer network
  const weights: number[] = [];
  for (let i = 0; i < NN_WEIGHT_COUNT; i++) {
    weights.push(clampWeight(rng.range(-0.95, 0.95)));
  }
  return {
    bodySize: clampMorph(rng.range(0.18, 0.85)),
    tailLength: clampMorph(rng.range(0.18, 0.85)),
    finSpan: clampMorph(rng.range(0.18, 0.85)),
    visionRange: clampMorph(rng.range(0.2, 0.88)),
    weights,
  };
}

export function cloneGenome(g: Genome): Genome {
  return {
    bodySize: g.bodySize,
    tailLength: g.tailLength,
    finSpan: g.finSpan,
    visionRange: g.visionRange,
    weights: [...g.weights],
  };
}

export function extractMorph(g: Genome): Record<MorphGeneKey, number> {
  return {
    bodySize: g.bodySize,
    tailLength: g.tailLength,
    finSpan: g.finSpan,
    visionRange: g.visionRange,
  };
}

export function computeCreatureHue(g: Genome): number {
  if (g.tailLength > 0.65 && g.visionRange > 0.6) return 188;
  if (g.finSpan > 0.66) return 152;
  if (g.visionRange > 0.68) return 224;
  if (g.bodySize > 0.68) return 42;
  return Math.round(162 + g.visionRange * 52 - g.finSpan * 18 + g.bodySize * 24);
}

export function classifySpecies(g: Genome): CreatureSpecies {
  if (g.tailLength >= 0.64 && g.visionRange >= 0.55) return 'Caçador';
  if (g.finSpan >= 0.64) return 'Ágil';
  if (g.visionRange >= 0.66) return 'Vigia';
  if (g.bodySize >= 0.64) return 'Robusto';
  return 'Explorador';
}

export function computePhysicsTraits(g: Genome) {
  const maxSpeed = (86 + g.tailLength * 165) / (0.68 + g.bodySize * 0.38 + g.finSpan * 0.14);
  const turnRate = (2.4 + g.finSpan * 5.0) / (0.72 + g.bodySize * 0.32);
  const visionPx = 90 + g.visionRange * 235;
  const captureRadius = 11 + g.bodySize * 12;
  const maxEnergy = 78 + g.bodySize * 48;
  // Smart hunters easily survive full 18s; clueless swimmers still starve around 9-12s!
  const maxFastTime = 9.0 + g.bodySize * 3.0 + (1 - g.tailLength) * 1.2;
  return { maxSpeed, turnRate, visionPx, captureRadius, maxEnergy, maxFastTime };
}

export function computeMetabolicDrain(
  g: Genome,
  thrust: number,
  metabolicMultiplier: number,
  event: OceanEventId
): number {
  const bodyCost = 2.6 * Math.pow(g.bodySize, 1.45);
  // Sprinting at full thrust burns energy sharply; cruising conserves it!
  const thrustFactor = 0.28 + 1.75 * thrust * thrust;
  const propulsionCost = 5.4 * Math.pow(g.tailLength, 1.45) * thrustFactor;
  const neuralCost = 2.8 * Math.pow(g.visionRange, 1.45);
  const finCost = 1.4 * Math.pow(g.finSpan, 1.3);

  const organSum = g.bodySize + g.tailLength + g.finSpan + g.visionRange;
  const overload = organSum > 2.35 ? Math.pow(organSum - 2.35, 2) * 12.0 : 0;

  const eventMult = event === 'scarcity' ? 1.45 : event === 'strong_current' ? 1.35 : 1.0;
  return (
    (2.4 + bodyCost + propulsionCost + neuralCost + finCost + overload) *
    metabolicMultiplier *
    eventMult
  );
}

/**
 * Pure behavioral + survival fitness for Neuroevolution:
 * Creatures earn fitness by actually learning to hunt plankton, approach food,
 * explore instead of spinning in place, evade predators, and stay alive!
 */
export function computeCreatureFitness(
  c: Creature,
  event: OceanEventId,
  generationDuration: number
): number {
  const foodPts = c.foodEaten * (event === 'scarcity' ? 58 : event === 'bloom' ? 34 : 44);
  const survivalPts = c.timeSurvived * 2.5 + (c.alive ? 24 : 0);
  const evasionPts = c.predatorEvasions * (event === 'predator_surge' ? 34 : 18);
  const explorePts = Math.min(35, c.distanceTraveled * 0.032);
  const approachPts = Math.min(60, c.approachScore * 0.55);

  const durNorm = 18 / Math.max(8, generationDuration);
  return Math.max(1, (foodPts + survivalPts + evasionPts + explorePts + approachPts) * durNorm);
}

export function computeAverageMorph(creatures: Creature[]): Record<MorphGeneKey, number> {
  const avg: Record<MorphGeneKey, number> = {
    bodySize: 0,
    tailLength: 0,
    finSpan: 0,
    visionRange: 0,
  };
  if (creatures.length === 0) return avg;
  for (const c of creatures) {
    for (const k of MORPH_KEYS) avg[k] += c.genome[k];
  }
  for (const k of MORPH_KEYS) avg[k] /= creatures.length;
  return avg;
}

/**
 * Genetic diversity across ALL 38 genes (4 morphology + 34 neural weights), normalized 0..100.
 */
export function computeGeneticDiversity(creatures: Creature[]): number {
  if (creatures.length <= 1) return 0;
  let totalNormStd = 0;

  // Morph genes std (scale 0..0.26)
  const avgM = computeAverageMorph(creatures);
  for (const k of MORPH_KEYS) {
    let v = 0;
    for (const c of creatures) {
      const d = c.genome[k] - avgM[k];
      v += d * d;
    }
    totalNormStd += Math.sqrt(v / creatures.length) / 0.26;
  }

  // Neural weights std (scale 0..0.95)
  for (let w = 0; w < NN_WEIGHT_COUNT; w++) {
    let mean = 0;
    for (const c of creatures) mean += c.genome.weights[w];
    mean /= creatures.length;
    let v = 0;
    for (const c of creatures) {
      const d = c.genome.weights[w] - mean;
      v += d * d;
    }
    totalNormStd += Math.sqrt(v / creatures.length) / 0.95;
  }

  const meanNorm = totalNormStd / (MORPH_KEYS.length + NN_WEIGHT_COUNT);
  return Math.min(100, Math.round(meanNorm * 100));
}

function selectParent(
  sortedDesc: Creature[],
  method: SelectionMethod,
  rng: SeededRandom,
  excludeId?: string
): Creature {
  const pool =
    excludeId && sortedDesc.length > 1
      ? sortedDesc.filter((c) => c.id !== excludeId)
      : sortedDesc;
  const n = pool.length;
  if (n === 1) return pool[0];

  if (method === 'tournament') {
    const k = Math.min(4, n);
    let best = pool[rng.int(0, n - 1)];
    for (let i = 1; i < k; i++) {
      const cand = pool[rng.int(0, n - 1)];
      if (cand.fitness > best.fitness) best = cand;
    }
    return best;
  }

  if (method === 'ranking') {
    const totalRank = (n * (n + 1)) / 2;
    let pick = rng.range(0, totalRank);
    for (let i = 0; i < n; i++) {
      pick -= n - i;
      if (pick <= 0) return pool[i];
    }
    return pool[0];
  }

  const totalFit = pool.reduce((s, c) => s + Math.max(0.1, c.fitness), 0);
  let pick = rng.range(0, totalFit);
  for (const c of pool) {
    pick -= Math.max(0.1, c.fitness);
    if (pick <= 0) return c;
  }
  return pool[0];
}

export interface OffspringBlueprint {
  genome: Genome;
  isElite: boolean;
  isMutant: boolean;
  lineage: CreatureLineage;
}

/**
 * Breeds the next generation of 38-gene Neuroevolution creatures:
 * - Tank A ('full_ga'): Elitism + Selection + Neuron-Aware Crossover + Calibrated Mutation
 * - Tank B ('mutation_only_10'): NO Crossover (Asexual cloning) + 0% Elitism + Fixed 10% Mutation per gene!
 */
export function breedNextGeneration(
  parents: Creature[],
  mode: 'full_ga' | 'mutation_only_10',
  config: GAConfig,
  event: OceanEventId,
  rng: SeededRandom
): OffspringBlueprint[] {
  const sorted = [...parents].sort((a, b) => b.fitness - a.fitness);
  const popSize = config.populationSize;
  const offspring: OffspringBlueprint[] = [];

  if (mode === 'mutation_only_10') {
    // TANK B Control: Gentle fitness selection (sqrt-roulette, so creatures DO learn to hunt!),
    // but NO Crossover and NO Elitism — asexual cloning + fixed 10% mutation per gene!
    const fixedMutationRate = 0.1;
    const morphAmp = 0.18;
    const weightAmp = 0.36;
    const weights = sorted.map((c) => Math.pow(Math.max(1, c.fitness), 0.55));
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    for (let i = 0; i < popSize; i++) {
      let pick = rng.range(0, totalWeight);
      let parent = sorted[0];
      for (let idx = 0; idx < sorted.length; idx++) {
        pick -= weights[idx];
        if (pick <= 0) {
          parent = sorted[idx];
          break;
        }
      }
      const child = cloneGenome(parent.genome);
      const morphOrigins = {} as Record<MorphGeneKey, LineageGeneInfo>;
      let mutatedMorphCount = 0;
      const mutatedWeightIndices: number[] = [];

      for (const k of MORPH_KEYS) {
        let mutated = false;
        let delta = 0;
        if (rng.next() < fixedMutationRate) {
          const oldVal = child[k];
          const nextVal = clampMorph(oldVal + rng.gaussian() * morphAmp);
          delta = nextVal - oldVal;
          child[k] = nextVal;
          mutated = true;
          mutatedMorphCount++;
        }
        morphOrigins[k] = { from: 'clone', mutated, delta };
      }

      for (let w = 0; w < NN_WEIGHT_COUNT; w++) {
        if (rng.next() < fixedMutationRate) {
          child.weights[w] = clampWeight(child.weights[w] + rng.gaussian() * weightAmp);
          mutatedWeightIndices.push(w);
        }
      }

      offspring.push({
        genome: child,
        isElite: false,
        isMutant: mutatedMorphCount + mutatedWeightIndices.length > 0,
        lineage: {
          origin: 'asexual_mutation',
          parentAId: parent.id,
          parentAName: parent.name,
          parentAFitness: parent.fitness,
          parentAMorph: extractMorph(parent.genome),
          parentBId: null,
          parentBName: null,
          parentBFitness: null,
          parentBMorph: null,
          mutatedMorphCount,
          mutatedWeightCount: mutatedWeightIndices.length,
          mutatedWeightIndices,
          morphOrigins,
        },
      });
    }
    return offspring;
  }

  // Tank A: Full Genetic Algorithm with Elitism + Crossover + Mutation
  const eliteCount = Math.min(
    Math.max(0, Math.round(popSize * config.elitismRate)),
    Math.floor(popSize * 0.5)
  );

  for (let i = 0; i < eliteCount && i < sorted.length; i++) {
    const elite = sorted[i];
    const morphOrigins = {} as Record<MorphGeneKey, LineageGeneInfo>;
    for (const k of MORPH_KEYS) morphOrigins[k] = { from: 'parentA', mutated: false, delta: 0 };

    offspring.push({
      genome: cloneGenome(elite.genome),
      isElite: true,
      isMutant: false,
      lineage: {
        origin: 'elite',
        parentAId: elite.id,
        parentAName: elite.name,
        parentAFitness: elite.fitness,
        parentAMorph: extractMorph(elite.genome),
        parentBId: null,
        parentBName: null,
        parentBFitness: null,
        parentBMorph: null,
        mutatedMorphCount: 0,
        mutatedWeightCount: 0,
        mutatedWeightIndices: [],
        morphOrigins,
      },
    });
  }

  const effectiveMutRate = Math.min(
    0.85,
    config.mutationRate + (event === 'mutagen_pulse' ? 0.25 : 0)
  );

  // Restrict Tank A breeding pool to top 60% performers so broken brains don't pollute crossover!
  const breedingPool = sorted.slice(0, Math.max(4, Math.ceil(sorted.length * 0.6)));

  while (offspring.length < popSize) {
    let parentA = selectParent(breedingPool, config.selectionMethod, rng);
    let parentB = selectParent(breedingPool, config.selectionMethod, rng, parentA.id);
    // Ensure parentA is the fitter parent (NEAT-style dominant-parent alignment)
    if (parentB.fitness > parentA.fitness) {
      const tmp = parentA;
      parentA = parentB;
      parentB = tmp;
    }

    const morphOrigins = {} as Record<MorphGeneKey, LineageGeneInfo>;
    let mutatedMorphCount = 0;
    const mutatedWeightIndices: number[] = [];

    const morphCut = rng.int(1, MORPH_KEYS.length - 1);
    const blendAlpha = rng.range(0.45, 0.75);
    const childMorph = {} as Record<MorphGeneKey, number>;

    MORPH_KEYS.forEach((k, idx) => {
      let val: number;
      let from: LineageGeneInfo['from'];
      if (config.crossoverMethod === 'uniform') {
        if (rng.next() < 0.6) {
          val = parentA.genome[k];
          from = 'parentA';
        } else {
          val = parentB.genome[k];
          from = 'parentB';
        }
      } else if (config.crossoverMethod === 'single-point') {
        if (idx < morphCut) {
          val = parentA.genome[k];
          from = 'parentA';
        } else {
          val = parentB.genome[k];
          from = 'parentB';
        }
      } else {
        val = parentA.genome[k] * blendAlpha + parentB.genome[k] * (1 - blendAlpha);
        from = 'blend';
      }

      let mutated = false;
      let delta = 0;
      if (rng.next() < effectiveMutRate) {
        const nextVal = clampMorph(val + rng.gaussian() * 0.2);
        delta = nextVal - val;
        val = nextVal;
        mutated = true;
        mutatedMorphCount++;
      }
      childMorph[k] = clampMorph(val);
      morphOrigins[k] = { from, mutated, delta };
    });

    // Deep 10-Neuron-Block-Aware Crossover (6 blocks in Layer 1 + 4 blocks in Layer 2)
    // Preserves cohesive hidden-neuron feature detectors & motor circuits across both layers!
    const childWeights = new Array<number>(NN_WEIGHT_COUNT);
    const neuronCutBlock = rng.int(1, NN_TOTAL_BLOCKS - 1);
    const blockFromA = Array.from({ length: NN_TOTAL_BLOCKS }, () => rng.next() < 0.65);

    for (let w = 0; w < NN_WEIGHT_COUNT; w++) {
      const wA = parentA.genome.weights[w];
      const wB = parentB.genome.weights[w];

      let blockIdx: number;
      if (w < NN_L1_COUNT) {
        blockIdx = Math.floor(w / NN_L1_BLOCK); // 0..5 (Layer 1 neurons)
      } else {
        blockIdx = Math.min(NN_TOTAL_BLOCKS - 1, 6 + Math.floor((w - NN_L1_COUNT) / NN_L2_BLOCK)); // 6..9 (Layer 2 neurons)
      }

      let val: number;
      if (config.crossoverMethod === 'single-point') {
        val = blockIdx < neuronCutBlock ? wA : wB;
      } else if (config.crossoverMethod === 'uniform') {
        val = blockFromA[blockIdx] ? wA : wB;
      } else {
        // Sign-safe arithmetic blend (prevents +w and -w canceling to 0)
        val = wA * wB >= 0 ? wA * blendAlpha + wB * (1 - blendAlpha) : wA;
      }

      if (rng.next() < effectiveMutRate) {
        val = clampWeight(val + rng.gaussian() * config.mutationAmplitude);
        mutatedWeightIndices.push(w);
      }
      childWeights[w] = clampWeight(val);
    }

    offspring.push({
      genome: {
        ...childMorph,
        weights: childWeights,
      },
      isElite: false,
      isMutant: mutatedMorphCount + mutatedWeightIndices.length > 0,
      lineage: {
        origin: 'crossover',
        parentAId: parentA.id,
        parentAName: parentA.name,
        parentAFitness: parentA.fitness,
        parentAMorph: extractMorph(parentA.genome),
        parentBId: parentB.id,
        parentBName: parentB.name,
        parentBFitness: parentB.fitness,
        parentBMorph: extractMorph(parentB.genome),
        mutatedMorphCount,
        mutatedWeightCount: mutatedWeightIndices.length,
        mutatedWeightIndices,
        morphOrigins,
      },
    });
  }

  return offspring;
}
