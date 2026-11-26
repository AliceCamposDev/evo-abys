import { OceanEventId } from '../engine/types';

export interface SeedRunSummary {
  seed: number;
  gen1Fit: number;
  avgFitA: number;
  avgFitB: number;
  gainPct: number;
  foodA: number;
  foodB: number;
  survA: number;
  survB: number;
}

export interface EventBenchmarkSummary {
  event: OceanEventId;
  label: string;
  avgFitA: number;
  avgFitB: number;
  gainPct: number;
  foodA: number;
  foodB: number;
  survA: number;
  survB: number;
  morphA: {
    bodySize: number;
    tailLength: number;
    finSpan: number;
    visionRange: number;
  };
  adaptationNote: string;
}

/**
 * Real empirical data collected directly from DualOceanEngine with the Deep 8 -> 6 -> 4 -> 2 NN:
 * - 5 independent seeds x 50 generations (15 creatures, 96-gene chromosome: 4 morph + 92 weights)
 * - 4 environmental stress events x 3 seeds x 35 generations
 */
export const BENCHMARK_DATA = {
  seedsCount: 5,
  generationsCount: 50,
  populationSize: 15,
  genomeLength: 96, // 4 morph + 92 deep neural weights

  seedRuns: [
    {
      seed: 202607,
      gen1Fit: 164.7,
      avgFitA: 431.4,
      avgFitB: 140.6,
      gainPct: 206.8,
      foodA: 114.6,
      foodB: 19.7,
      survA: 27,
      survB: 14,
    },
    {
      seed: 111222,
      gen1Fit: 131.1,
      avgFitA: 386.3,
      avgFitB: 172.2,
      gainPct: 124.3,
      foodA: 95.2,
      foodB: 27.4,
      survA: 33,
      survB: 24,
    },
    {
      seed: 424242,
      gen1Fit: 115.5,
      avgFitA: 434.8,
      avgFitB: 188.4,
      gainPct: 130.8,
      foodA: 114.0,
      foodB: 35.8,
      survA: 36,
      survB: 19,
    },
    {
      seed: 909090,
      gen1Fit: 69.9,
      avgFitA: 307.9,
      avgFitB: 155.3,
      gainPct: 98.2,
      foodA: 67.7,
      foodB: 25.4,
      survA: 34,
      survB: 23,
    },
    {
      seed: 777888,
      gen1Fit: 131.7,
      avgFitA: 313.0,
      avgFitB: 271.9,
      gainPct: 15.1,
      foodA: 71.2,
      foodB: 59.0,
      survA: 45,
      survB: 33,
    },
  ] as SeedRunSummary[],

  curveA: [
    122.6, 137.9, 136, 171.7, 181.4, 171.5, 179.8, 154.6, 207.9, 194.1, 215.8, 215.4, 247.9, 273,
    222.3, 235.8, 267.8, 241.7, 274, 217, 264, 286.4, 272.7, 254.1, 298.9, 277.3, 300.9, 303.9,
    292.2, 311.2, 371.8, 328.7, 337.6, 348.5, 373.9, 380.9, 404.2, 374.8, 360.2, 341, 408.1, 407.6,
    348.9, 368.4, 366.8, 370.9, 362, 347.3, 373.5, 393.1,
  ],
  curveB: [
    126, 100.3, 108, 128.1, 113.1, 113.8, 125.3, 130, 120.4, 125.9, 139.1, 140.1, 143.1, 129.6,
    138.4, 137.1, 166.9, 146.6, 150.4, 149.2, 142.3, 156.1, 149.5, 157.1, 189, 210, 196.7, 161.9,
    135.1, 160.2, 178.1, 155.9, 172.5, 182.1, 181.7, 176.6, 194.5, 223.2, 164.8, 196.8, 188.2,
    205.4, 180.7, 186.1, 157.8, 167.1, 205.4, 181.1, 194.6, 190.5,
  ],
  foodCurveA: [
    15.6, 19.6, 20, 26.2, 31.6, 27.8, 30.2, 23.2, 38.4, 35.2, 40.6, 39.8, 51.6, 55, 42.6, 47.6,
    56.2, 50.2, 59.2, 42.2, 55.4, 64, 57.2, 54, 67.4, 60.6, 66.6, 68.8, 67.8, 72, 90.4, 75.6, 80.2,
    83.2, 90.2, 92.6, 97.8, 90.2, 88.6, 81.2, 99.8, 100.4, 86.8, 91.4, 91.8, 92.4, 87.4, 83.4,
    93.2, 98.8,
  ],
  foodCurveB: [
    16, 11.4, 12, 17.8, 13.2, 13, 14.6, 18, 15.2, 17.6, 18.6, 19.6, 21, 18.4, 20, 22.2, 29.8, 23.4,
    24, 25.4, 21.8, 25.2, 23.8, 26.6, 33.4, 38, 35, 26, 20.2, 25, 30.4, 25.6, 31.6, 31.2, 31.8,
    30.6, 34.2, 42.2, 27, 37.2, 34.6, 38, 32.4, 34.2, 26, 29.8, 37, 30.2, 37.6, 34.8,
  ],

  eventResults: [
    {
      event: 'calm',
      label: 'Oceano Calmo',
      avgFitA: 309.0,
      avgFitB: 162.3,
      gainPct: 90.4,
      foodA: 71.2,
      foodB: 25.7,
      survA: 28,
      survB: 22,
      morphA: { bodySize: 45, tailLength: 76, finSpan: 57, visionRange: 69 },
      adaptationNote: 'Cauda veloz (76) + alta visão (69) para encadear rotas entre plânctons.',
    },
    {
      event: 'scarcity',
      label: 'Escassez Extrema',
      avgFitA: 167.4,
      avgFitB: 104.3,
      gainPct: 60.5,
      foodA: 22.2,
      foodB: 8.6,
      survA: 8,
      survB: 3,
      morphA: { bodySize: 36, tailLength: 74, finSpan: 36, visionRange: 74 },
      adaptationNote: 'Corpo enxuto (36) + Visão máxima (74) para localizar os 6 plânctons raros.',
    },
    {
      event: 'strong_current',
      label: 'Correnteza Violenta',
      avgFitA: 198.5,
      avgFitB: 143.4,
      gainPct: 38.4,
      foodA: 36.9,
      foodB: 20.3,
      survA: 12,
      survB: 6,
      morphA: { bodySize: 73, tailLength: 79, finSpan: 60, visionRange: 53 },
      adaptationNote: 'Corpo robusto (73) e Cauda forte (79) para resistir ao fluxo lateral intenso.',
    },
    {
      event: 'predator_surge',
      label: 'Invasão de Predadores',
      avgFitA: 146.4,
      avgFitB: 127.2,
      gainPct: 15.1,
      foodA: 18.0,
      foodB: 13.2,
      survA: 1,
      survB: 0,
      morphA: { bodySize: 64, tailLength: 74, finSpan: 35, visionRange: 61 },
      adaptationNote: 'Alta velocidade (Cauda 74) e Visão ampla (61) para detectar 5 predadores velozes.',
    },
  ] as EventBenchmarkSummary[],
};
