/**
 * DeepMind/RL-style chart smoothing & downsampling utilities.
 * Keeps learning curves crisp and readable at 10, 500, or 5,000 generations!
 */

export interface SampledPoint {
  gen: number;
  value: number;
  min?: number;
  max?: number;
}

/**
 * Centered symmetric moving average (no phase lag!) applied twice (triangular kernel)
 * for genuinely silky-smooth learning curves even across 500+ noisy generations.
 */
function centeredPass(values: number[], radius: number): number[] {
  const n = values.length;
  if (radius <= 0 || n <= 2) return values;
  const prefix = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + values[i];

  const out = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - radius);
    const hi = Math.min(n - 1, i + radius);
    out[i] = (prefix[hi + 1] - prefix[lo]) / (hi - lo + 1);
  }
  return out;
}

export function movingAverage(values: number[], windowSize: number): number[] {
  if (windowSize <= 1 || values.length <= 2) return values;
  const radius = Math.max(1, Math.floor(windowSize / 2));
  // Two-pass symmetric kernel = smooth Gaussian-like trend with zero lag!
  return centeredPass(centeredPass(values, radius), Math.max(1, Math.floor(radius * 0.7)));
}

/**
 * Aggregates a long series into at most `maxBuckets` buckets, keeping both
 * the bucket mean and a clean ±0.6σ dispersion envelope (min/max) for RL-style shaded bands.
 */
export function downsamplePoints(
  gens: number[],
  values: number[],
  maxBuckets = 32,
  rawForBand?: number[]
): SampledPoint[] {
  const n = Math.min(gens.length, values.length);
  if (n === 0) return [];
  if (n <= maxBuckets) {
    return Array.from({ length: n }, (_, i) => ({
      gen: gens[i],
      value: values[i],
      min: values[i],
      max: values[i],
    }));
  }

  const bandSrc = rawForBand && rawForBand.length === n ? rawForBand : values;
  const result: SampledPoint[] = [];
  const bucketSize = n / maxBuckets;

  for (let b = 0; b < maxBuckets; b++) {
    const start = Math.floor(b * bucketSize);
    const end = b === maxBuckets - 1 ? n : Math.max(start + 1, Math.floor((b + 1) * bucketSize));
    const count = end - start;

    let sum = 0;
    let rawSum = 0;
    for (let i = start; i < end; i++) {
      sum += values[i];
      rawSum += bandSrc[i];
    }
    const mean = sum / count;
    const rawMean = rawSum / count;

    let varSum = 0;
    for (let i = start; i < end; i++) {
      const diff = bandSrc[i] - rawMean;
      varSum += diff * diff;
    }
    const std = Math.sqrt(varSum / count);
    const midIdx = Math.min(n - 1, Math.floor((start + end - 1) / 2));

    result.push({
      gen: b === 0 ? gens[0] : b === maxBuckets - 1 ? gens[n - 1] : gens[midIdx],
      value: mean,
      min: Math.max(0, mean - std * 0.55),
      max: mean + std * 0.55,
    });
  }

  return result;
}

export function buildPathFromPoints(
  points: SampledPoint[],
  width: number,
  height: number,
  padLeft: number,
  padRight: number,
  padTop: number,
  padBottom: number,
  minVal: number,
  maxVal: number
): string {
  if (points.length === 0) return '';
  const usableW = width - padLeft - padRight;
  const usableH = height - padTop - padBottom;
  const span = Math.max(1e-6, maxVal - minVal);

  const coords = points.map((p, i) => {
    const x =
      points.length === 1 ? padLeft + usableW * 0.5 : padLeft + (i / (points.length - 1)) * usableW;
    const y = padTop + usableH - ((p.value - minVal) / span) * usableH;
    return { x, y };
  });

  if (coords.length === 1) {
    return `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  }

  let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
  for (let i = 1; i < coords.length - 1; i++) {
    const midX = (coords[i].x + coords[i + 1].x) * 0.5;
    const midY = (coords[i].y + coords[i + 1].y) * 0.5;
    d += ` Q ${coords[i].x.toFixed(1)} ${coords[i].y.toFixed(1)}, ${midX.toFixed(1)} ${midY.toFixed(1)}`;
  }
  const last = coords[coords.length - 1];
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  return d;
}

/**
 * Builds a clean shaded dispersion ribbon (upper bound forward -> lower bound backward)
 * like modern ML/RL training curves.
 */
export function buildConfidenceBandPath(
  points: SampledPoint[],
  width: number,
  height: number,
  padLeft: number,
  padRight: number,
  padTop: number,
  padBottom: number,
  minVal: number,
  maxVal: number
): string {
  if (points.length < 2) return '';
  const usableW = width - padLeft - padRight;
  const usableH = height - padTop - padBottom;
  const span = Math.max(1e-6, maxVal - minVal);

  const toX = (i: number) => padLeft + (i / (points.length - 1)) * usableW;
  const toY = (v: number) =>
    padTop + usableH - ((Math.max(minVal, Math.min(maxVal, v)) - minVal) / span) * usableH;

  let d = `M ${toX(0).toFixed(1)} ${toY(points[0].max ?? points[0].value).toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${toX(i).toFixed(1)} ${toY(points[i].max ?? points[i].value).toFixed(1)}`;
  }
  for (let i = points.length - 1; i >= 0; i--) {
    d += ` L ${toX(i).toFixed(1)} ${toY(points[i].min ?? points[i].value).toFixed(1)}`;
  }
  return `${d} Z`;
}

export function buildAreaPath(
  linePath: string,
  points: SampledPoint[],
  width: number,
  height: number,
  padLeft: number,
  padRight: number,
  padBottom: number
): string {
  if (!linePath || points.length < 2) return '';
  const baseY = height - padBottom;
  const endX = width - padRight;
  return `${linePath} L ${endX.toFixed(1)} ${baseY.toFixed(1)} L ${padLeft.toFixed(1)} ${baseY.toFixed(1)} Z`;
}

export function computeXAxisTicks(
  points: SampledPoint[],
  width: number,
  padLeft: number,
  padRight: number,
  tickCount = 5
): { x: number; label: string }[] {
  if (points.length === 0) return [];
  const usableW = width - padLeft - padRight;
  if (points.length === 1) {
    return [{ x: padLeft + usableW * 0.5, label: `G${points[0].gen}` }];
  }
  const count = Math.min(tickCount, points.length);
  const ticks: { x: number; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const idx = Math.round(t * (points.length - 1));
    ticks.push({
      x: padLeft + t * usableW,
      label: `G${points[idx].gen}`,
    });
  }
  return ticks;
}
