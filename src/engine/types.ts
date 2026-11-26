import { BrainEvaluation } from './neuralNet';

export type MorphGeneKey = 'bodySize' | 'tailLength' | 'finSpan' | 'visionRange';

export const MORPH_KEYS: MorphGeneKey[] = ['bodySize', 'tailLength', 'finSpan', 'visionRange'];

export const GENE_META: Record<
  MorphGeneKey,
  { label: string; shortLabel: string; color: string; description: string }
> = {
  bodySize: {
    label: 'Corpo',
    shortLabel: 'COR',
    color: '#fbbf24',
    description: 'Reserva de energia e alcance de captura vs. arrasto na água',
  },
  tailLength: {
    label: 'Cauda',
    shortLabel: 'CAU',
    color: '#22d3ee',
    description: 'Impulso e velocidade máxima de nado vs. gasto energético',
  },
  finSpan: {
    label: 'Nadadeiras',
    shortLabel: 'NAD',
    color: '#34d399',
    description: 'Agilidade em curvas e esquiva rápida de predadores',
  },
  visionRange: {
    label: 'Visão',
    shortLabel: 'VIS',
    color: '#818cf8',
    description: 'Alcance dos sensores neurais para plâncton e predadores',
  },
};

/**
 * Full 96-gene Deep Neuroevolution Genome:
 * - 4 Morphology genes in [0.1, 1.0] (visual body + physics)
 * - 92 Deep Neural Network synaptic weights in [-3.0, +3.0] (8 -> 6 -> 4 -> 2 brain!)
 */
export interface Genome {
  bodySize: number;
  tailLength: number;
  finSpan: number;
  visionRange: number;
  weights: number[]; // length 92
}

export type SelectionMethod = 'tournament' | 'roulette' | 'ranking';
export type CrossoverMethod = 'uniform' | 'single-point' | 'arithmetic';

export type OceanEventId =
  | 'calm'
  | 'predator_surge'
  | 'scarcity'
  | 'strong_current'
  | 'bloom'
  | 'mutagen_pulse';

export interface OceanEventInfo {
  id: OceanEventId;
  name: string;
  shortName: string;
  description: string;
  pressureTarget: string;
  color: string;
}

export const OCEAN_EVENTS: Record<OceanEventId, OceanEventInfo> = {
  calm: {
    id: 'calm',
    name: 'Oceano Calmo',
    shortName: 'Calmo',
    description: 'Plâncton escasso (16) e 2 predadores abissais em patrulha.',
    pressureTarget: 'Aprendizado neural equilibrado',
    color: '#38bdf8',
  },
  predator_surge: {
    id: 'predator_surge',
    name: 'Invasão de Predadores',
    shortName: 'Predadores',
    description: '5 predadores velozes caçam o cardume! Exige reflexos neurais de fuga.',
    pressureTarget: 'Pressão em Reflexo de Fuga & Visão',
    color: '#f43f5e',
  },
  scarcity: {
    id: 'scarcity',
    name: 'Escassez Extrema',
    shortName: 'Escassez',
    description: 'Apenas 6 plânctons no aquário! Quem não aprender a caçar morre de fome.',
    pressureTarget: 'Pressão em Navegação & Eficiência',
    color: '#fbbf24',
  },
  strong_current: {
    id: 'strong_current',
    name: 'Correnteza Violenta',
    shortName: 'Correnteza',
    description: 'Fluxo lateral intenso exige controle neural de direção e cauda forte.',
    pressureTarget: 'Pressão em Controle de Cauda',
    color: '#22d3ee',
  },
  bloom: {
    id: 'bloom',
    name: 'Flora Bioluminescente',
    shortName: 'Abundância',
    description: 'Mais plâncton (34) acelera o aprendizado inicial de caça.',
    pressureTarget: 'Treinamento Rápido de Caça',
    color: '#34d399',
  },
  mutagen_pulse: {
    id: 'mutagen_pulse',
    name: 'Pulso Mutagênico',
    shortName: 'Mutagênico',
    description: 'Eleva a mutação no Aquário A em +25% para explorar novas redes neurais.',
    pressureTarget: 'Exploração Sináptica',
    color: '#e879f9',
  },
};

export interface GAConfig {
  populationSize: number;
  generationDuration: number;
  selectionMethod: SelectionMethod;
  crossoverMethod: CrossoverMethod;
  mutationRate: number; // Aquário A (0..0.6)
  mutationAmplitude: number; // Aquário A
  elitismRate: number; // Aquário A (0..0.4)
  metabolicMultiplier: number; // 0.5..2.0
}

export const DEFAULT_GA_CONFIG: GAConfig = {
  populationSize: 20,
  generationDuration: 18,
  selectionMethod: 'tournament',
  crossoverMethod: 'uniform',
  mutationRate: 0.1,
  mutationAmplitude: 0.42,
  elitismRate: 0.2,
  metabolicMultiplier: 1.0,
};

export interface LineageGeneInfo {
  from: 'parentA' | 'parentB' | 'blend' | 'clone' | 'initial';
  mutated: boolean;
  delta: number;
}

export interface CreatureLineage {
  origin: 'initial' | 'elite' | 'crossover' | 'asexual_mutation';
  parentAId: string | null;
  parentAName: string | null;
  parentAFitness: number | null;
  parentAMorph: Record<MorphGeneKey, number> | null;
  parentBId: string | null;
  parentBName: string | null;
  parentBFitness: number | null;
  parentBMorph: Record<MorphGeneKey, number> | null;
  mutatedMorphCount: number;
  mutatedWeightCount: number;
  mutatedWeightIndices: number[];
  morphOrigins: Record<MorphGeneKey, LineageGeneInfo>;
}

export type CreatureSpecies = 'Caçador' | 'Ágil' | 'Vigia' | 'Robusto' | 'Explorador';

export interface TrailPoint {
  x: number;
  y: number;
}

export interface Creature {
  id: string;
  name: string;
  tankId: 'A' | 'B';
  generation: number;
  genome: Genome;
  species: CreatureSpecies;
  hue: number;
  isElite: boolean;
  isMutant: boolean;
  lineage: CreatureLineage;

  // Live neural brain activations (for real-time visualization!)
  lastBrain: BrainEvaluation;

  // Physics
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  swimPhase: number;
  trail: TrailPoint[];

  // State
  alive: boolean;
  deathCause: 'none' | 'starved' | 'eaten';
  energy: number;
  maxEnergy: number;
  timeSinceLastMeal: number;
  maxFastTime: number;
  fleeing: boolean;
  evasionCooldown: number;

  // Performance metrics
  foodEaten: number;
  timeSurvived: number;
  predatorEvasions: number;
  distanceTraveled: number;
  approachScore: number; // small shaping reward for moving toward visible plankton
  energySpent: number;
  fitness: number;
}

export interface Plankton {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  pulseOffset: number;
  energyValue: number;
}

export interface Predator {
  id: number;
  x: number;
  y: number;
  angle: number;
  speed: number;
  swimPhase: number;
  trail: TrailPoint[];
  eatCooldown: number;
}

export interface WaterRipple {
  id: number;
  x: number;
  y: number;
  color: string;
  age: number;
  maxAge: number;
  maxRadius: number;
}

export interface GenerationStats {
  generation: number;
  bestFitness: number;
  avgFitness: number;
  worstFitness: number;
  survivalRate: number;
  totalFoodEaten: number;
  totalEvasions: number;
  diversity: number; // 0..100 normalized std across all 38 genes (morph + neural!)
  avgMorph: Record<MorphGeneKey, number>;
  event: OceanEventId;
}

export interface AquariumState {
  id: 'A' | 'B';
  name: string;
  subtitle: string;
  mode: 'full_ga' | 'mutation_only_10';
  accentColor: string;
  width: number;
  height: number;
  generation: number;
  generationTime: number;
  creatures: Creature[];
  plankton: Plankton[];
  predators: Predator[];
  ripples: WaterRipple[];
  totalFoodEatenAllTime: number;
  history: GenerationStats[];
  nextId: number;
}

export interface DualOceanState {
  seed: number;
  event: OceanEventId;
  config: GAConfig;
  tankA: AquariumState;
  tankB: AquariumState;
}
