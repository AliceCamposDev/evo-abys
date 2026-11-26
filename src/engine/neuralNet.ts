/**
 * Deep 8 -> 6 -> 4 -> 2 Feedforward Neural Network evolved by the Genetic Algorithm.
 *
 * Inputs (8):
 *   0: foodAngle   (-1..1, relative angle to nearest visible plankton)
 *   1: foodDist    (0..1, closeness to nearest visible plankton)
 *   2: predAngle   (-1..1, relative angle to nearest visible predator)
 *   3: predDist    (0..1, urgency/closeness to nearest visible predator)
 *   4: wallCue     (-1..1, signed turn cue away from nearby aquarium walls)
 *   5: hungerRatio (0..1, approaching starvation timer)
 *   6: energyRatio (0..1, remaining metabolic energy)
 *   7: food2Angle  (-1..1, relative angle to 2nd nearest visible plankton for route chaining)
 *
 * Hidden Layer 1: 6 tanh neurons  (6 blocks * 9 genes = 54 genes)
 * Hidden Layer 2: 4 tanh neurons  (4 blocks * 9 genes = 36 genes)
 * Output Layer:   2 outputs       (2 biases = 2 genes) -> [turn (-1..1), thrust (0..1)]
 *
 * Total synaptic weights = 92 genes (+ 4 morphology genes = 96-gene chromosome!).
 * Laid out neuron-by-neuron so Crossover swaps cohesive functional neuron blocks!
 */

export const NN_INPUTS = 8;
export const NN_HIDDEN1 = 6;
export const NN_HIDDEN2 = 4;
export const NN_OUTPUTS = 2;

// Layer 1 block: 8 input weights + 1 bias = 9 genes per H1 neuron
export const NN_L1_BLOCK = NN_INPUTS + 1; // 9
export const NN_L1_COUNT = NN_HIDDEN1 * NN_L1_BLOCK; // 54

// Layer 2 block: 6 H1 weights + 1 bias + 2 output weights = 9 genes per H2 neuron
export const NN_L2_BLOCK = NN_HIDDEN1 + 1 + NN_OUTPUTS; // 9
export const NN_L2_COUNT = NN_HIDDEN2 * NN_L2_BLOCK; // 36

export const NN_OUT_BIAS_OFFSET = NN_L1_COUNT + NN_L2_COUNT; // 90
export const NN_WEIGHT_COUNT = NN_OUT_BIAS_OFFSET + NN_OUTPUTS; // 92 synaptic weights

export const NN_TOTAL_BLOCKS = NN_HIDDEN1 + NN_HIDDEN2; // 10 functional neuron blocks

export const NN_INPUT_LABELS = [
  'Âng. Comida',
  'Dist. Comida',
  'Âng. Pred.',
  'Dist. Pred.',
  'Parede',
  'Fome',
  'Energia',
  '2º Plâncton',
];
export const NN_OUTPUT_LABELS = ['Direção', 'Impulso'];

export interface BrainEvaluation {
  inputs: number[];
  hidden1: number[];
  hidden2: number[];
  outputs: [number, number]; // [turn (-1..1), thrust (0..1)]
}

export function clampWeight(w: number): number {
  return Math.max(-3.0, Math.min(3.0, w));
}

export function evaluateBrain(weights: number[], inputs: number[]): BrainEvaluation {
  const hidden1 = new Array<number>(NN_HIDDEN1);
  const hidden2 = new Array<number>(NN_HIDDEN2);

  // Layer 1: 8 inputs -> 6 hidden1 neurons
  for (let h1 = 0; h1 < NN_HIDDEN1; h1++) {
    const base = h1 * NN_L1_BLOCK;
    let sum = weights[base + NN_INPUTS]; // H1 bias
    for (let i = 0; i < NN_INPUTS; i++) {
      sum += inputs[i] * weights[base + i];
    }
    hidden1[h1] = Math.tanh(sum);
  }

  // Layer 2: 6 hidden1 -> 4 hidden2 neurons
  for (let h2 = 0; h2 < NN_HIDDEN2; h2++) {
    const base = NN_L1_COUNT + h2 * NN_L2_BLOCK;
    let sum = weights[base + NN_HIDDEN1]; // H2 bias
    for (let h1 = 0; h1 < NN_HIDDEN1; h1++) {
      sum += hidden1[h1] * weights[base + h1];
    }
    hidden2[h2] = Math.tanh(sum);
  }

  // Output Layer: 4 hidden2 -> 2 motor outputs
  let sumTurn = weights[NN_OUT_BIAS_OFFSET];
  let sumThrust = weights[NN_OUT_BIAS_OFFSET + 1];

  for (let h2 = 0; h2 < NN_HIDDEN2; h2++) {
    const base = NN_L1_COUNT + h2 * NN_L2_BLOCK;
    sumTurn += hidden2[h2] * weights[base + NN_HIDDEN1 + 1];
    sumThrust += hidden2[h2] * weights[base + NN_HIDDEN1 + 2];
  }

  const turn = Math.tanh(sumTurn);
  const thrust = (Math.tanh(sumThrust) + 1) * 0.5;

  return {
    inputs,
    hidden1,
    hidden2,
    outputs: [turn, thrust],
  };
}
