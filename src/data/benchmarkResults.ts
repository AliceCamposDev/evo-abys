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
 * - 5 independent seeds x 50 generations (20 creatures, 96-gene chromosome: 4 morph + 92 weights)
 * - 4 environmental stress events x 3 seeds x 35 generations
 */
export const BENCHMARK_DATA = {
  seedsCount: 5,
  generationsCount: 50,
  populationSize: 20,
  genomeLength: 96, // 4 morph + 92 deep neural weights

  seedRuns: [
    {
      seed: 202607,
      gen1Fit: 91.9,
      avgFitA: 406.0,
      avgFitB: 128.8,
      gainPct: 215.2,
      foodA: 136.8,
      foodB: 22.1,
      survA: 36,
      survB: 14,
    },
    {
      seed: 111222,
      gen1Fit: 93.0,
      avgFitA: 322.6,
      avgFitB: 150.4,
      gainPct: 114.5,
      foodA: 101.0,
      foodB: 31.1,
      survA: 40,
      survB: 14,
    },
    {
      seed: 424242,
      gen1Fit: 120.1,
      avgFitA: 592.4,
      avgFitB: 150.7,
      gainPct: 293.1,
      foodA: 219.5,
      foodB: 33.8,
      survA: 43,
      survB: 15,
    },
    {
      seed: 909090,
      gen1Fit: 120.3,
      avgFitA: 288.8,
      avgFitB: 141.6,
      gainPct: 104.0,
      foodA: 84.6,
      foodB: 27.3,
      survA: 32,
      survB: 13,
    },
    {
      seed: 777888,
      gen1Fit: 143.0,
      avgFitA: 150.9,
      avgFitB: 156.4,
      gainPct: -3.5,
      foodA: 31.1,
      foodB: 31.4,
      survA: 6,
      survB: 17,
    },
  ] as SeedRunSummary[],

  curveA: [
    113.7, 140.9, 142.5, 163.1, 157.6, 166.8, 153, 155, 185.4, 192.7, 203.8, 177.8, 216.4, 176.7,
    178.1, 194.8, 200.2, 230.2, 211.4, 241.5, 269.2, 283.3, 265.5, 270.1, 274.4, 302, 294.1, 306.5,
    291.7, 272.5, 334.1, 279.8, 272.9, 338.8, 293.1, 283.9, 302.2, 338.4, 302, 307.8, 279.9, 335.3,
    367.4, 319.5, 344.8, 371.3, 321.5, 394.8, 394.8, 392.2,
  ],
  curveB: [
    116, 109.8, 95.5, 107.3, 103.3, 99.6, 106.5, 108.9, 109.9, 106.7, 107.6, 103.2, 109.2, 124.7,
    112.1, 111.1, 126.1, 113.3, 107.8, 117.3, 109.2, 106.1, 129.8, 107.7, 114.1, 103.7, 122, 122.6,
    127.8, 123.1, 133.2, 138.8, 123.2, 160.8, 133.5, 148.2, 143.6, 136.7, 124.3, 135.3, 132.9,
    149.5, 146.1, 143.6, 137.8, 154, 140.2, 153.2, 155, 143.5,
  ],
  foodCurveA: [
    17.6, 26.8, 28, 33.6, 32.6, 36.2, 31.4, 32.6, 42.4, 45.8, 50.2, 40, 54.2, 40.8, 43.2, 49, 49.8,
    61.8, 54.4, 68.2, 76.6, 82.2, 78.8, 78, 79.6, 91.4, 86.8, 92, 89.6, 80.8, 105.2, 83.4, 78.4,
    108, 90.8, 85.4, 93.4, 108, 93.8, 95.2, 87, 106, 120.2, 101.6, 111.4, 123, 104.8, 131.2, 131.4,
    129.4,
  ],
  foodCurveB: [
    19, 18, 12.6, 16.4, 14.6, 14.8, 16, 16.2, 17.4, 16.8, 16.4, 15.8, 17, 20.4, 16.2, 15.6, 21,
    17.6, 16.2, 18.4, 15.8, 14.8, 23.4, 16, 20, 14.4, 19.4, 21, 22.4, 20.4, 23.8, 25.2, 23.2, 34.2,
    26, 30, 29.2, 25.2, 21.8, 27.2, 25.8, 31.2, 30.6, 28.6, 26.4, 32, 27.4, 32.4, 30, 27,
  ],

  eventResults: [
    {
      event: 'calm',
      label: 'Oceano Calmo',
      avgFitA: 369.9,
      avgFitB: 135.5,
      gainPct: 173.0,
      foodA: 119.9,
      foodB: 25.5,
      survA: 43,
      survB: 12,
      morphA: { bodySize: 41, tailLength: 65, finSpan: 72, visionRange: 32 },
      adaptationNote:
        'Corpo leve (41), Nadadeiras ágeis (72) e Cauda forte (65) para curvas rápidas e captura contínua.',
    },
    {
      event: 'scarcity',
      label: 'Escassez Extrema',
      avgFitA: 126.5,
      avgFitB: 98.3,
      gainPct: 28.7,
      foodA: 19.6,
      foodB: 12.8,
      survA: 0,
      survB: 1,
      morphA: { bodySize: 80, tailLength: 46, finSpan: 22, visionRange: 56 },
      adaptationNote:
        'Corpo grande (80) para máxima reserva energética + Visão ampla (56) e baixa propulsão (46) com apenas 6 plânctons.',
    },
    {
      event: 'strong_current',
      label: 'Correnteza Violenta',
      avgFitA: 199.7,
      avgFitB: 130.1,
      gainPct: 53.5,
      foodA: 52.3,
      foodB: 21.8,
      survA: 7,
      survB: 6,
      morphA: { bodySize: 63, tailLength: 71, finSpan: 52, visionRange: 36 },
      adaptationNote:
        'Corpo robusto (63) e Cauda forte (71) para resistir ao fluxo lateral intenso da correnteza.',
    },
    {
      event: 'predator_surge',
      label: 'Invasão de Predadores',
      avgFitA: 148.6,
      avgFitB: 105.6,
      gainPct: 40.7,
      foodA: 21.5,
      foodB: 13.7,
      survA: 1,
      survB: 0,
      morphA: { bodySize: 39, tailLength: 67, finSpan: 31, visionRange: 53 },
      adaptationNote:
        'Corpo compacto (39), Cauda veloz (67) e Visão ampla (53) para detectar e escapar dos 5 predadores.',
    },
  ] as EventBenchmarkSummary[],
};
