import { ControlLimits, Specifications } from '../types/spc';

// Basic statistical functions
export const mean = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

export const mode = (values: number[]): number => {
  if (values.length === 0) return 0;
  const frequency: Record<number, number> = {};
  values.forEach(value => {
    frequency[value] = (frequency[value] || 0) + 1;
  });
  return parseInt(Object.keys(frequency).reduce((a, b) => 
    frequency[parseInt(a)] > frequency[parseInt(b)] ? a : b
  ));
};

export const standardDeviation = (values: number[], population: boolean = false): number => {
  if (values.length === 0) return 0;
  const avg = mean(values);
  const variance = values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0);
  const divisor = population ? values.length : values.length - 1;
  return Math.sqrt(variance / divisor);
};

export const variance = (values: number[], population: boolean = false): number => {
  if (values.length === 0) return 0;
  const avg = mean(values);
  const sumSquaredDiffs = values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0);
  const divisor = population ? values.length : values.length - 1;
  return sumSquaredDiffs / divisor;
};

export const range = (values: number[]): number => {
  if (values.length === 0) return 0;
  return Math.max(...values) - Math.min(...values);
};

export const min = (values: number[]): number => {
  if (values.length === 0) return 0;
  return Math.min(...values);
};

export const max = (values: number[]): number => {
  if (values.length === 0) return 0;
  return Math.max(...values);
};

// Quartiles
export const quartiles = (values: number[]): { q1: number; q2: number; q3: number } => {
  if (values.length === 0) return { q1: 0, q2: 0, q3: 0 };
  
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  
  const q1Index = Math.floor(n * 0.25);
  const q2Index = Math.floor(n * 0.5);
  const q3Index = Math.floor(n * 0.75);
  
  return {
    q1: sorted[q1Index] || 0,
    q2: sorted[q2Index] || 0,
    q3: sorted[q3Index] || 0,
  };
};

export const iqr = (values: number[]): number => {
  const { q1, q3 } = quartiles(values);
  return q3 - q1;
};

// Skewness and Kurtosis
export const skewness = (values: number[]): number => {
  if (values.length < 3) return 0;
  
  const avg = mean(values);
  const std = standardDeviation(values);
  const n = values.length;
  
  const sumCubedDiffs = values.reduce((sum, value) => {
    const diff = (value - avg) / std;
    return sum + Math.pow(diff, 3);
  }, 0);
  
  return (n / ((n - 1) * (n - 2))) * sumCubedDiffs;
};

export const kurtosis = (values: number[]): number => {
  if (values.length < 4) return 0;
  
  const avg = mean(values);
  const std = standardDeviation(values);
  const n = values.length;
  
  const sumFourthDiffs = values.reduce((sum, value) => {
    const diff = (value - avg) / std;
    return sum + Math.pow(diff, 4);
  }, 0);
  
  return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sumFourthDiffs - 
         (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
};

// Complete statistical summary
export const calculateStatisticalSummary = (values: number[]): any => {
  const { q1, q3 } = quartiles(values);
  
  return {
    count: values.length,
    mean: mean(values),
    median: median(values),
    mode: mode(values),
    stdDev: standardDeviation(values),
    variance: variance(values),
    range: range(values),
    min: min(values),
    max: max(values),
    q1,
    q3,
    iqr: q3 - q1,
    skewness: skewness(values),
    kurtosis: kurtosis(values),
  };
};

// Control chart calculations
export const calculateControlLimits = (
  values: number[],
  sigmaLevel: number = 3,
  chartType: 'xbar-r' | 'xbar-s' | 'i-mr' = 'xbar-r'
): ControlLimits => {
  if (values.length === 0) {
    return { ucl: 0, lcl: 0, centerLine: 0, sigmaLevel: 0 };
  }

  const avg = mean(values);
  let sigma: number;

  switch (chartType) {
    case 'xbar-r':
      sigma = calculateRange(values) / 2.326; // d2 constant for n=5
      break;
    case 'xbar-s':
      sigma = standardDeviation(values);
      break;
    case 'i-mr':
      sigma = standardDeviation(values);
      break;
    default:
      sigma = standardDeviation(values);
  }

  return {
    ucl: avg + (sigmaLevel * sigma),
    lcl: avg - (sigmaLevel * sigma),
    centerLine: avg,
    sigmaLevel: sigmaLevel,
  };
};

// Range calculation for X-bar R charts
export const calculateRange = (values: number[]): number => {
  if (values.length === 0) return 0;
  return Math.max(...values) - Math.min(...values);
};

// Moving range calculation
export const calculateMovingRange = (values: number[]): number[] => {
  if (values.length < 2) return [];
  
  const movingRanges: number[] = [];
  for (let i = 1; i < values.length; i++) {
    movingRanges.push(Math.abs(values[i] - values[i - 1]));
  }
  
  return movingRanges;
};

// Process capability calculations
export const calculateProcessCapability = (
  values: number[],
  specifications: Specifications
): any => {
  if (!specifications.usl || !specifications.lsl || values.length === 0) {
    return {
      cp: 0,
      cpk: 0,
      pp: 0,
      ppk: 0,
      cpu: 0,
      cpl: 0,
      sigma: 0,
      ppm: 0,
    };
  }

  const avg = mean(values);
  const std = standardDeviation(values);
  const usl = specifications.usl;
  const lsl = specifications.lsl;
  
  // Cp - Process capability index
  const cp = (usl - lsl) / (6 * std);
  
  // Cpk - Process capability index (centered)
  const cpk = Math.min(
    (usl - avg) / (3 * std),
    (avg - lsl) / (3 * std)
  );
  
  // Pp - Process performance index
  const pp = (usl - lsl) / (6 * std);
  
  // Ppk - Process performance index (centered)
  const ppk = Math.min(
    (usl - avg) / (3 * std),
    (avg - lsl) / (3 * std)
  );
  
  // CPU and CPL
  const cpu = (usl - avg) / (3 * std);
  const cpl = (avg - lsl) / (3 * std);
  
  // Sigma level
  const sigma = cpk * 3;
  
  // PPM (Parts Per Million) - estimated
  const ppm = Math.max(0, (1 - cpk) * 1000000);
  
  return {
    cp,
    cpk,
    pp,
    ppk,
    cpu,
    cpl,
    sigma,
    ppm,
  };
};

// Western Electric Rules
export const checkWesternElectricRules = (
  values: number[],
  controlLimits: ControlLimits,
  _sigmaLevel: number = 3
): Array<{ rule: string; violated: boolean; points: number[] }> => {
  const rules = [
    {
      rule: 'Rule 1: Point beyond 3σ limits',
      violated: values.some(value => value > controlLimits.ucl || value < controlLimits.lcl),
      points: values.map((value, index) => 
        value > controlLimits.ucl || value < controlLimits.lcl ? index : -1
      ).filter(index => index !== -1),
    },
    {
      rule: 'Rule 2: 2 of 3 consecutive points beyond 2σ limits',
      violated: false, // Simplified - would need more complex logic
      points: [],
    },
    {
      rule: 'Rule 3: 4 of 5 consecutive points beyond 1σ limits',
      violated: false, // Simplified - would need more complex logic
      points: [],
    },
    {
      rule: 'Rule 4: 8 consecutive points on same side of center line',
      violated: false, // Simplified - would need more complex logic
      points: [],
    },
  ];
  
  return rules;
};

// Normal distribution functions
export const normalCDF = (x: number, mean: number = 0, std: number = 1): number => {
  return 0.5 * (1 + erf((x - mean) / (std * Math.sqrt(2))));
};

export const erf = (x: number): number => {
  // Approximation of error function
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
};

// Confidence intervals
export const confidenceInterval = (
  values: number[],
  confidence: number = 0.95
): { lower: number; upper: number } => {
  if (values.length === 0) return { lower: 0, upper: 0 };
  
  const avg = mean(values);
  const std = standardDeviation(values);
  const n = values.length;
  
  // t-distribution critical value (simplified for large samples)
  const z = confidence === 0.95 ? 1.96 : confidence === 0.99 ? 2.576 : 1.96;
  const margin = z * (std / Math.sqrt(n));
  
  return {
    lower: avg - margin,
    upper: avg + margin,
  };
};
