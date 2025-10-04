import type { DataPoint, Subgroup, ControlLimits, ProcessCapability, StatisticalSummary, RuleViolation } from '../types/spc';

// Basic Statistical Functions
export const calculateMean = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export const calculateMedian = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 
    ? (sorted[mid - 1] + sorted[mid]) / 2 
    : sorted[mid];
};

export const calculateMode = (values: number[]): number => {
  const frequency: Record<number, number> = {};
  values.forEach(value => {
    frequency[value] = (frequency[value] || 0) + 1;
  });
  
  let maxFreq = 0;
  let mode = values[0];
  Object.entries(frequency).forEach(([value, freq]) => {
    if (freq > maxFreq) {
      maxFreq = freq;
      mode = Number(value);
    }
  });
  
  return mode;
};

export const calculateStandardDeviation = (values: number[], isSample: boolean = true): number => {
  if (values.length === 0) return 0;
  const mean = calculateMean(values);
  const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0);
  const divisor = isSample ? values.length - 1 : values.length;
  return Math.sqrt(variance / divisor);
};

export const calculateRange = (values: number[]): number => {
  if (values.length === 0) return 0;
  return Math.max(...values) - Math.min(...values);
};

export const calculateVariance = (values: number[], isSample: boolean = true): number => {
  if (values.length === 0) return 0;
  const mean = calculateMean(values);
  const sumSquaredDiffs = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0);
  const divisor = isSample ? values.length - 1 : values.length;
  return sumSquaredDiffs / divisor;
};

export const calculateQuartiles = (values: number[]): { q1: number; q2: number; q3: number } => {
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

export const calculateSkewness = (values: number[]): number => {
  if (values.length < 3) return 0;
  const mean = calculateMean(values);
  const stdDev = calculateStandardDeviation(values);
  
  const skewness = values.reduce((sum, value) => {
    return sum + Math.pow((value - mean) / stdDev, 3);
  }, 0) / values.length;
  
  return skewness;
};

export const calculateKurtosis = (values: number[]): number => {
  if (values.length < 4) return 0;
  const mean = calculateMean(values);
  const stdDev = calculateStandardDeviation(values);
  
  const kurtosis = values.reduce((sum, value) => {
    return sum + Math.pow((value - mean) / stdDev, 4);
  }, 0) / values.length - 3; // Excess kurtosis
  
  return kurtosis;
};

// Control Limit Calculations
export const calculateXBarRControlLimits = (subgroups: Subgroup[], sigmaLevel: number = 3): ControlLimits => {
  if (subgroups.length === 0) return { ucl: 0, lcl: 0, cl: 0, sigma: 0 };
  
  const subgroupMeans = subgroups.map(sg => calculateMean(sg.values));
  const subgroupRanges = subgroups.map(sg => calculateRange(sg.values));
  
  const grandMean = calculateMean(subgroupMeans);
  const avgRange = calculateMean(subgroupRanges);
  const subgroupSize = subgroups[0]?.values.length || 2;
  
  // Constants for X-bar and R charts
  const A2 = getA2Constant(subgroupSize);
  // const D3 = getD3Constant(subgroupSize);
  // const D4 = getD4Constant(subgroupSize);
  
  const sigma = avgRange / getD2Constant(subgroupSize);
  
  return {
    ucl: grandMean + (A2 * avgRange * sigmaLevel / 3),
    lcl: grandMean - (A2 * avgRange * sigmaLevel / 3),
    cl: grandMean,
    sigma: sigma,
  };
};

export const calculateXBarSControlLimits = (subgroups: Subgroup[], sigmaLevel: number = 3): ControlLimits => {
  if (subgroups.length === 0) return { ucl: 0, lcl: 0, cl: 0, sigma: 0 };
  
  const subgroupMeans = subgroups.map(sg => calculateMean(sg.values));
  const subgroupStdDevs = subgroups.map(sg => calculateStandardDeviation(sg.values));
  
  const grandMean = calculateMean(subgroupMeans);
  const avgStdDev = calculateMean(subgroupStdDevs);
  const subgroupSize = subgroups[0]?.values.length || 2;
  
  // Constants for X-bar and S charts
  const A3 = getA3Constant(subgroupSize);
  
  const sigma = avgStdDev / getC4Constant(subgroupSize);
  
  return {
    ucl: grandMean + (A3 * avgStdDev * sigmaLevel / 3),
    lcl: grandMean - (A3 * avgStdDev * sigmaLevel / 3),
    cl: grandMean,
    sigma: sigma,
  };
};

export const calculateIMRControlLimits = (dataPoints: DataPoint[], sigmaLevel: number = 3): ControlLimits => {
  if (dataPoints.length < 2) return { ucl: 0, lcl: 0, cl: 0, sigma: 0 };
  
  const values = dataPoints.map(dp => dp.value);
  const movingRanges: number[] = [];
  
  for (let i = 1; i < values.length; i++) {
    movingRanges.push(Math.abs(values[i] - values[i - 1]));
  }
  
  const mean = calculateMean(values);
  const avgMovingRange = calculateMean(movingRanges);
  
  // Constants for I-MR charts
  const E2 = 2.66; // For individual charts
  const sigma = avgMovingRange / 1.128; // d2 for n=2
  
  return {
    ucl: mean + (E2 * avgMovingRange * sigmaLevel / 3),
    lcl: mean - (E2 * avgMovingRange * sigmaLevel / 3),
    cl: mean,
    sigma: sigma,
  };
};

export const calculatePChartControlLimits = (dataPoints: DataPoint[], subgroupSizes: number[], sigmaLevel: number = 3): ControlLimits => {
  if (dataPoints.length === 0) return { ucl: 0, lcl: 0, cl: 0, sigma: 0 };
  
  const proportions = dataPoints.map((dp, index) => dp.value / subgroupSizes[index]);
  const avgProportion = calculateMean(proportions);
  const avgSubgroupSize = calculateMean(subgroupSizes);
  
  const sigma = Math.sqrt((avgProportion * (1 - avgProportion)) / avgSubgroupSize);
  
  return {
    ucl: Math.max(0, avgProportion + (sigmaLevel * sigma)),
    lcl: Math.max(0, avgProportion - (sigmaLevel * sigma)),
    cl: avgProportion,
    sigma: sigma,
  };
};

export const calculateNPChartControlLimits = (dataPoints: DataPoint[], subgroupSize: number, sigmaLevel: number = 3): ControlLimits => {
  if (dataPoints.length === 0) return { ucl: 0, lcl: 0, cl: 0, sigma: 0 };
  
  const defectCounts = dataPoints.map(dp => dp.value);
  const avgDefectCount = calculateMean(defectCounts);
  const proportion = avgDefectCount / subgroupSize;
  
  const sigma = Math.sqrt(subgroupSize * proportion * (1 - proportion));
  
  return {
    ucl: avgDefectCount + (sigmaLevel * sigma),
    lcl: Math.max(0, avgDefectCount - (sigmaLevel * sigma)),
    cl: avgDefectCount,
    sigma: sigma,
  };
};

export const calculateCChartControlLimits = (dataPoints: DataPoint[], sigmaLevel: number = 3): ControlLimits => {
  if (dataPoints.length === 0) return { ucl: 0, lcl: 0, cl: 0, sigma: 0 };
  
  const defectCounts = dataPoints.map(dp => dp.value);
  const avgDefectCount = calculateMean(defectCounts);
  
  const sigma = Math.sqrt(avgDefectCount);
  
  return {
    ucl: avgDefectCount + (sigmaLevel * sigma),
    lcl: Math.max(0, avgDefectCount - (sigmaLevel * sigma)),
    cl: avgDefectCount,
    sigma: sigma,
  };
};

export const calculateUChartControlLimits = (dataPoints: DataPoint[], subgroupSizes: number[], sigmaLevel: number = 3): ControlLimits => {
  if (dataPoints.length === 0) return { ucl: 0, lcl: 0, cl: 0, sigma: 0 };
  
  const defectRates = dataPoints.map((dp, index) => dp.value / subgroupSizes[index]);
  const avgDefectRate = calculateMean(defectRates);
  const avgSubgroupSize = calculateMean(subgroupSizes);
  
  const sigma = Math.sqrt(avgDefectRate / avgSubgroupSize);
  
  return {
    ucl: avgDefectRate + (sigmaLevel * sigma),
    lcl: Math.max(0, avgDefectRate - (sigmaLevel * sigma)),
    cl: avgDefectRate,
    sigma: sigma,
  };
};

// Process Capability Calculations
export const calculateProcessCapability = (
  values: number[], 
  specifications: { usl?: number; lsl?: number; target?: number }
): ProcessCapability => {
  const mean = calculateMean(values);
  const stdDev = calculateStandardDeviation(values);
  const { usl, lsl } = specifications;
  
  let cp = 0, cpk = 0, pp = 0, ppk = 0, cpu = 0, cpl = 0;
  
  if (usl && lsl) {
    cp = (usl - lsl) / (6 * stdDev);
    cpu = (usl - mean) / (3 * stdDev);
    cpl = (mean - lsl) / (3 * stdDev);
    cpk = Math.min(cpu, cpl);
  } else if (usl) {
    cpu = (usl - mean) / (3 * stdDev);
    cpk = cpu;
  } else if (lsl) {
    cpl = (mean - lsl) / (3 * stdDev);
    cpk = cpl;
  }
  
  // Pp and Ppk are the same as Cp and Cpk for this implementation
  pp = cp;
  ppk = cpk;
  
  const sigma = Math.abs(cpk) * 3;
  const ppm = calculatePPM(cpk);
  
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

export const calculatePPM = (cpk: number): number => {
  // Convert Cpk to PPM using normal distribution
  const z = Math.abs(cpk) * 3;
  const ppm = (1 - normalCDF(z)) * 1000000;
  return ppm;
};

// Statistical Constants
const getA2Constant = (n: number): number => {
  const constants: Record<number, number> = {
    2: 1.880, 3: 1.023, 4: 0.729, 5: 0.577, 6: 0.483,
    7: 0.419, 8: 0.373, 9: 0.337, 10: 0.308, 11: 0.285,
    12: 0.266, 13: 0.249, 14: 0.235, 15: 0.223, 16: 0.212,
    17: 0.203, 18: 0.194, 19: 0.187, 20: 0.180, 21: 0.173,
    22: 0.167, 23: 0.162, 24: 0.157, 25: 0.153
  };
  return constants[n] || 0.153;
};

const getA3Constant = (n: number): number => {
  const constants: Record<number, number> = {
    2: 2.659, 3: 1.954, 4: 1.628, 5: 1.427, 6: 1.287,
    7: 1.182, 8: 1.099, 9: 1.032, 10: 0.975, 11: 0.927,
    12: 0.886, 13: 0.850, 14: 0.817, 15: 0.789, 16: 0.763,
    17: 0.739, 18: 0.718, 19: 0.698, 20: 0.680, 21: 0.663,
    22: 0.647, 23: 0.633, 24: 0.619, 25: 0.606
  };
  return constants[n] || 0.606;
};

const getD2Constant = (n: number): number => {
  const constants: Record<number, number> = {
    2: 1.128, 3: 1.693, 4: 2.059, 5: 2.326, 6: 2.534,
    7: 2.704, 8: 2.847, 9: 2.970, 10: 3.078, 11: 3.173,
    12: 3.258, 13: 3.336, 14: 3.407, 15: 3.472, 16: 3.532,
    17: 3.588, 18: 3.640, 19: 3.689, 20: 3.735, 21: 3.778,
    22: 3.819, 23: 3.858, 24: 3.895, 25: 3.931
  };
  return constants[n] || 3.931;
};

/*
const getD3Constant = (n: number): number => {
  const constants: Record<number, number> = {
    2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0.076, 8: 0.136,
    9: 0.184, 10: 0.223, 11: 0.256, 12: 0.283, 13: 0.307,
    14: 0.328, 15: 0.347, 16: 0.363, 17: 0.378, 18: 0.391,
    19: 0.403, 20: 0.415, 21: 0.425, 22: 0.434, 23: 0.443,
    24: 0.451, 25: 0.459
  };
  return constants[n] || 0.459;
};
*/

/*
const getD4Constant = (n: number): number => {
  const constants: Record<number, number> = {
    2: 3.267, 3: 2.574, 4: 2.282, 5: 2.114, 6: 2.004,
    7: 1.924, 8: 1.864, 9: 1.816, 10: 1.777, 11: 1.744,
    12: 1.717, 13: 1.693, 14: 1.672, 15: 1.653, 16: 1.637,
    17: 1.622, 18: 1.608, 19: 1.596, 20: 1.585, 21: 1.575,
    22: 1.566, 23: 1.557, 24: 1.548, 25: 1.541
  };
  return constants[n] || 1.541;
};
*/

const getC4Constant = (n: number): number => {
  const constants: Record<number, number> = {
    2: 0.7979, 3: 0.8862, 4: 0.9213, 5: 0.9400, 6: 0.9515,
    7: 0.9594, 8: 0.9650, 9: 0.9693, 10: 0.9727, 11: 0.9754,
    12: 0.9776, 13: 0.9794, 14: 0.9810, 15: 0.9823, 16: 0.9835,
    17: 0.9845, 18: 0.9854, 19: 0.9862, 20: 0.9869, 21: 0.9876,
    22: 0.9882, 23: 0.9887, 24: 0.9892, 25: 0.9896
  };
  return constants[n] || 0.9896;
};

// Normal Distribution CDF approximation
const normalCDF = (z: number): number => {
  return 0.5 * (1 + erf(z / Math.sqrt(2)));
};

const erf = (x: number): number => {
  // Abramowitz and Stegun approximation
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

// Western Electric Rules (Nelson Rules)
export const checkWesternElectricRules = (values: number[], controlLimits: ControlLimits): RuleViolation[] => {
  const violations: RuleViolation[] = [];
  const { ucl, lcl, cl } = controlLimits;
  
  // Rule 1: Point beyond 3-sigma limits
  values.forEach((value, index) => {
    if (value > ucl || value < lcl) {
      violations.push({
        id: `rule1-${index}`,
        ruleId: 'rule1',
        ruleName: 'Point beyond 3-sigma limits',
        severity: 'error',
        dataPoints: [index],
        description: `Point ${index + 1} (${value.toFixed(3)}) is beyond control limits`,
        timestamp: new Date(),
      });
    }
  });
  
  // Rule 2: Nine consecutive points on same side of center line
  let consecutiveCount = 1;
  let lastSide = values[0] > cl ? 'above' : 'below';
  
  for (let i = 1; i < values.length; i++) {
    const currentSide = values[i] > cl ? 'above' : 'below';
    if (currentSide === lastSide) {
      consecutiveCount++;
    } else {
      consecutiveCount = 1;
      lastSide = currentSide;
    }
    
    if (consecutiveCount >= 9) {
      violations.push({
        id: `rule2-${i}`,
        ruleId: 'rule2',
        ruleName: 'Nine consecutive points on same side of center line',
        severity: 'warning',
        dataPoints: Array.from({ length: 9 }, (_, j) => i - 8 + j),
        description: `Nine consecutive points on ${lastSide} side of center line`,
        timestamp: new Date(),
      });
      consecutiveCount = 1; // Reset to avoid duplicate violations
    }
  }
  
  // Rule 3: Six consecutive points increasing or decreasing
  let trendCount = 1;
  let lastDirection = values[1] > values[0] ? 'increasing' : 'decreasing';
  
  for (let i = 2; i < values.length; i++) {
    const currentDirection = values[i] > values[i - 1] ? 'increasing' : 'decreasing';
    if (currentDirection === lastDirection) {
      trendCount++;
    } else {
      trendCount = 1;
      lastDirection = currentDirection;
    }
    
    if (trendCount >= 6) {
      violations.push({
        id: `rule3-${i}`,
        ruleId: 'rule3',
        ruleName: 'Six consecutive points increasing or decreasing',
        severity: 'warning',
        dataPoints: Array.from({ length: 6 }, (_, j) => i - 5 + j),
        description: `Six consecutive points ${lastDirection}`,
        timestamp: new Date(),
      });
      trendCount = 1; // Reset to avoid duplicate violations
    }
  }
  
  // Rule 4: Fourteen consecutive points alternating up and down
  if (values.length >= 14) {
    for (let i = 13; i < values.length; i++) {
      let alternating = true;
      for (let j = i - 13; j < i; j++) {
        const expected = j % 2 === 0 ? values[j] < values[j + 1] : values[j] > values[j + 1];
        if (!expected) {
          alternating = false;
          break;
        }
      }
      
      if (alternating) {
        violations.push({
          id: `rule4-${i}`,
          ruleId: 'rule4',
          ruleName: 'Fourteen consecutive points alternating up and down',
          severity: 'warning',
          dataPoints: Array.from({ length: 14 }, (_, j) => i - 13 + j),
          description: 'Fourteen consecutive points alternating up and down',
          timestamp: new Date(),
        });
        break; // Only report first occurrence
      }
    }
  }
  
  // Rule 5: Two out of three consecutive points beyond 2-sigma limits
  const twoSigmaUcl = cl + (2 * (ucl - cl) / 3);
  const twoSigmaLcl = cl - (2 * (ucl - cl) / 3);
  
  for (let i = 2; i < values.length; i++) {
    const recentValues = values.slice(i - 2, i + 1);
    const beyondTwoSigma = recentValues.filter(v => v > twoSigmaUcl || v < twoSigmaLcl);
    
    if (beyondTwoSigma.length >= 2) {
      violations.push({
        id: `rule5-${i}`,
        ruleId: 'rule5',
        ruleName: 'Two out of three consecutive points beyond 2-sigma limits',
        severity: 'warning',
        dataPoints: [i - 2, i - 1, i],
        description: 'Two out of three consecutive points beyond 2-sigma limits',
        timestamp: new Date(),
      });
    }
  }
  
  // Rule 6: Four out of five consecutive points beyond 1-sigma limits
  const oneSigmaUcl = cl + (ucl - cl) / 3;
  const oneSigmaLcl = cl - (ucl - cl) / 3;
  
  for (let i = 4; i < values.length; i++) {
    const recentValues = values.slice(i - 4, i + 1);
    const beyondOneSigma = recentValues.filter(v => v > oneSigmaUcl || v < oneSigmaLcl);
    
    if (beyondOneSigma.length >= 4) {
      violations.push({
        id: `rule6-${i}`,
        ruleId: 'rule6',
        ruleName: 'Four out of five consecutive points beyond 1-sigma limits',
        severity: 'warning',
        dataPoints: [i - 4, i - 3, i - 2, i - 1, i],
        description: 'Four out of five consecutive points beyond 1-sigma limits',
        timestamp: new Date(),
      });
    }
  }
  
  // Rule 7: Fifteen consecutive points within 1-sigma limits
  if (values.length >= 15) {
    for (let i = 14; i < values.length; i++) {
      const recentValues = values.slice(i - 14, i + 1);
      const withinOneSigma = recentValues.filter(v => v >= oneSigmaLcl && v <= oneSigmaUcl);
      
      if (withinOneSigma.length === 15) {
        violations.push({
          id: `rule7-${i}`,
          ruleId: 'rule7',
          ruleName: 'Fifteen consecutive points within 1-sigma limits',
          severity: 'warning',
          dataPoints: Array.from({ length: 15 }, (_, j) => i - 14 + j),
          description: 'Fifteen consecutive points within 1-sigma limits',
          timestamp: new Date(),
        });
        break; // Only report first occurrence
      }
    }
  }
  
  // Rule 8: Eight consecutive points beyond 1-sigma limits
  if (values.length >= 8) {
    for (let i = 7; i < values.length; i++) {
      const recentValues = values.slice(i - 7, i + 1);
      const beyondOneSigma = recentValues.filter(v => v > oneSigmaUcl || v < oneSigmaLcl);
      
      if (beyondOneSigma.length === 8) {
        violations.push({
          id: `rule8-${i}`,
          ruleId: 'rule8',
          ruleName: 'Eight consecutive points beyond 1-sigma limits',
          severity: 'warning',
          dataPoints: Array.from({ length: 8 }, (_, j) => i - 7 + j),
          description: 'Eight consecutive points beyond 1-sigma limits',
          timestamp: new Date(),
        });
        break; // Only report first occurrence
      }
    }
  }
  
  return violations;
};

// Generate Statistical Summary
export const generateStatisticalSummary = (values: number[]): StatisticalSummary => {
  if (values.length === 0) {
    return {
      count: 0, mean: 0, median: 0, mode: 0, stdDev: 0, variance: 0,
      range: 0, min: 0, max: 0, q1: 0, q3: 0, iqr: 0, skewness: 0, kurtosis: 0
    };
  }
  
  const sorted = [...values].sort((a, b) => a - b);
  const quartiles = calculateQuartiles(values);
  
  return {
    count: values.length,
    mean: calculateMean(values),
    median: calculateMedian(values),
    mode: calculateMode(values),
    stdDev: calculateStandardDeviation(values),
    variance: calculateVariance(values),
    range: calculateRange(values),
    min: sorted[0],
    max: sorted[sorted.length - 1],
    q1: quartiles.q1,
    q3: quartiles.q3,
    iqr: quartiles.q3 - quartiles.q1,
    skewness: calculateSkewness(values),
    kurtosis: calculateKurtosis(values),
  };
};