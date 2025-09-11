import type { ProcessData, DataPoint } from '../types/spc';

// Generate random data within specified ranges
const generateRandomData = (count: number, mean: number, stdDev: number): number[] => {
  const data: number[] = [];
  for (let i = 0; i < count; i++) {
    // Box-Muller transformation for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    data.push(mean + z0 * stdDev);
  }
  return data;
};

// Automotive Parts Manufacturing Data
export const automotiveProcessData: ProcessData = {
  id: 'automotive-parts-001',
  name: 'Engine Piston Diameter',
  description: 'Measurement of piston diameter in automotive engine manufacturing',
  dataPoints: [],
  subgroups: [],
  specifications: {
    usl: 95.5,
    lsl: 94.5,
    target: 95.0,
    unit: 'mm',
  },
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date(),
};

// Generate automotive data
const automotiveValues = generateRandomData(100, 95.0, 0.15);
automotiveProcessData.dataPoints = automotiveValues.map((value, index) => ({
  id: `auto-${index}`,
  timestamp: new Date(Date.now() - (100 - index) * 24 * 60 * 60 * 1000),
  value: Math.round(value * 1000) / 1000, // Round to 3 decimal places
  subgroup: Math.floor(index / 5) + 1,
  batch: `BATCH-${String(Math.floor(index / 20) + 1).padStart(3, '0')}`,
  operator: ['John Smith', 'Jane Doe', 'Mike Johnson'][index % 3],
  notes: index % 10 === 0 ? 'Quality check performed' : undefined,
}));

// Generate subgroups for X-bar charts
automotiveProcessData.subgroups = Array.from({ length: 20 }, (_, i) => {
  const subgroupData = automotiveProcessData.dataPoints.slice(i * 5, (i + 1) * 5);
  return {
    id: `sg-auto-${i + 1}`,
    subgroupNumber: i + 1,
    values: subgroupData.map(dp => dp.value),
    timestamp: subgroupData[0].timestamp,
    batch: subgroupData[0].batch,
    operator: subgroupData[0].operator,
  };
});

// Food Processing Data
export const foodProcessData: ProcessData = {
  id: 'food-processing-001',
  name: 'Cookie Weight Control',
  description: 'Weight monitoring for packaged cookies in food processing',
  dataPoints: [],
  subgroups: [],
  specifications: {
    usl: 52.0,
    lsl: 48.0,
    target: 50.0,
    unit: 'g',
  },
  createdAt: new Date('2024-02-01'),
  updatedAt: new Date(),
};

// Generate food processing data with some out-of-control points
const foodValues = generateRandomData(80, 50.0, 0.8);
// Add some out-of-control points
foodValues[15] = 53.2; // Above USL
foodValues[25] = 46.8; // Below LSL
foodValues[35] = 52.8; // Above USL
foodValues[45] = 47.2; // Below LSL

foodProcessData.dataPoints = foodValues.map((value, index) => ({
  id: `food-${index}`,
  timestamp: new Date(Date.now() - (80 - index) * 2 * 60 * 60 * 1000), // Every 2 hours
  value: Math.round(value * 100) / 100, // Round to 2 decimal places
  subgroup: Math.floor(index / 4) + 1,
  batch: `COOKIE-${String(Math.floor(index / 16) + 1).padStart(3, '0')}`,
  operator: ['Alice Brown', 'Bob Wilson', 'Carol Davis'][index % 3],
  notes: index % 15 === 0 ? 'Temperature check' : undefined,
}));

// Generate subgroups
foodProcessData.subgroups = Array.from({ length: 20 }, (_, i) => {
  const subgroupData = foodProcessData.dataPoints.slice(i * 4, (i + 1) * 4);
  return {
    id: `sg-food-${i + 1}`,
    subgroupNumber: i + 1,
    values: subgroupData.map(dp => dp.value),
    timestamp: subgroupData[0].timestamp,
    batch: subgroupData[0].batch,
    operator: subgroupData[0].operator,
  };
});

// Chemical Batch Data
export const chemicalProcessData: ProcessData = {
  id: 'chemical-batch-001',
  name: 'pH Level Control',
  description: 'pH monitoring in chemical batch processing',
  dataPoints: [],
  subgroups: [],
  specifications: {
    usl: 7.5,
    lsl: 6.5,
    target: 7.0,
    unit: 'pH',
  },
  createdAt: new Date('2024-01-20'),
  updatedAt: new Date(),
};

// Generate chemical data with trend
const chemicalValues = generateRandomData(60, 7.0, 0.2);
// Add a trend
for (let i = 0; i < chemicalValues.length; i++) {
  chemicalValues[i] += (i / chemicalValues.length) * 0.3; // Gradual increase
}

chemicalProcessData.dataPoints = chemicalValues.map((value, index) => ({
  id: `chem-${index}`,
  timestamp: new Date(Date.now() - (60 - index) * 4 * 60 * 60 * 1000), // Every 4 hours
  value: Math.round(value * 100) / 100, // Round to 2 decimal places
  subgroup: Math.floor(index / 3) + 1,
  batch: `CHEM-${String(Math.floor(index / 12) + 1).padStart(3, '0')}`,
  operator: ['David Lee', 'Emma Taylor', 'Frank Miller'][index % 3],
  notes: index % 20 === 0 ? 'Calibration check' : undefined,
}));

// Generate subgroups
chemicalProcessData.subgroups = Array.from({ length: 20 }, (_, i) => {
  const subgroupData = chemicalProcessData.dataPoints.slice(i * 3, (i + 1) * 3);
  return {
    id: `sg-chem-${i + 1}`,
    subgroupNumber: i + 1,
    values: subgroupData.map(dp => dp.value),
    timestamp: subgroupData[0].timestamp,
    batch: subgroupData[0].batch,
    operator: subgroupData[0].operator,
  };
});

// Electronics Testing Data
export const electronicsProcessData: ProcessData = {
  id: 'electronics-test-001',
  name: 'Resistor Resistance',
  description: 'Resistance measurement for electronic components',
  dataPoints: [],
  subgroups: [],
  specifications: {
    usl: 1020,
    lsl: 980,
    target: 1000,
    unit: 'Ω',
  },
  createdAt: new Date('2024-02-10'),
  updatedAt: new Date(),
};

// Generate electronics data
const electronicsValues = generateRandomData(120, 1000, 8);
electronicsProcessData.dataPoints = electronicsValues.map((value, index) => ({
  id: `elec-${index}`,
  timestamp: new Date(Date.now() - (120 - index) * 30 * 60 * 1000), // Every 30 minutes
  value: Math.round(value), // Round to whole number
  subgroup: Math.floor(index / 6) + 1,
  batch: `RES-${String(Math.floor(index / 24) + 1).padStart(3, '0')}`,
  operator: ['Grace Kim', 'Henry Chen', 'Ivy Rodriguez'][index % 3],
  notes: index % 25 === 0 ? 'Environmental check' : undefined,
}));

// Generate subgroups
electronicsProcessData.subgroups = Array.from({ length: 20 }, (_, i) => {
  const subgroupData = electronicsProcessData.dataPoints.slice(i * 6, (i + 1) * 6);
  return {
    id: `sg-elec-${i + 1}`,
    subgroupNumber: i + 1,
    values: subgroupData.map(dp => dp.value),
    timestamp: subgroupData[0].timestamp,
    batch: subgroupData[0].batch,
    operator: subgroupData[0].operator,
  };
});

// Defect Count Data (for p-charts, np-charts, c-charts, u-charts)
export const defectProcessData: ProcessData = {
  id: 'defect-count-001',
  name: 'Surface Defects',
  description: 'Count of surface defects per inspection unit',
  dataPoints: [],
  subgroups: [],
  specifications: {
    usl: 5,
    lsl: 0,
    target: 2,
    unit: 'defects',
  },
  createdAt: new Date('2024-02-15'),
  updatedAt: new Date(),
};

// Generate defect data (Poisson distribution)
const generatePoissonData = (count: number, lambda: number): number[] => {
  const data: number[] = [];
  for (let i = 0; i < count; i++) {
    let k = 0;
    let p = 1;
    const L = Math.exp(-lambda);
    
    do {
      k++;
      p *= Math.random();
    } while (p > L);
    
    data.push(k - 1);
  }
  return data;
};

const defectValues = generatePoissonData(50, 2.5);
defectProcessData.dataPoints = defectValues.map((value, index) => ({
  id: `defect-${index}`,
  timestamp: new Date(Date.now() - (50 - index) * 6 * 60 * 60 * 1000), // Every 6 hours
  value,
  subgroup: index + 1,
  batch: `INSP-${String(Math.floor(index / 10) + 1).padStart(3, '0')}`,
  operator: ['Jack Wilson', 'Kate Anderson', 'Liam Murphy'][index % 3],
  notes: value > 4 ? 'High defect count - investigate' : undefined,
}));

// Generate subgroups (each inspection unit)
defectProcessData.subgroups = defectProcessData.dataPoints.map((dp, index) => ({
  id: `sg-defect-${index + 1}`,
  subgroupNumber: index + 1,
  values: [dp.value], // Single value per subgroup for defect counts
  timestamp: dp.timestamp,
  batch: dp.batch,
  operator: dp.operator,
}));

// Export all sample data
export const sampleProcesses: ProcessData[] = [
  automotiveProcessData,
  foodProcessData,
  chemicalProcessData,
  electronicsProcessData,
  defectProcessData,
];

// Helper function to get process by type
export const getProcessByType = (type: string): ProcessData | undefined => {
  switch (type) {
    case 'automotive':
      return automotiveProcessData;
    case 'food':
      return foodProcessData;
    case 'chemical':
      return chemicalProcessData;
    case 'electronics':
      return electronicsProcessData;
    case 'defects':
      return defectProcessData;
    default:
      return undefined;
  }
};

// Helper function to generate additional data points
export const generateAdditionalDataPoints = (process: ProcessData, count: number): DataPoint[] => {
  // const lastValue = process.dataPoints[process.dataPoints.length - 1]?.value || 0;
  const mean = process.specifications?.target || 0;
  const stdDev = 0.1; // Default standard deviation
  
  const newValues = generateRandomData(count, mean, stdDev);
  
  return newValues.map((value, index) => ({
    id: `${process.id}-new-${index}`,
    timestamp: new Date(Date.now() + index * 60 * 60 * 1000), // Every hour
    value: Math.round(value * 1000) / 1000,
    subgroup: (process.dataPoints.length + index) + 1,
    batch: `BATCH-${String(Math.floor((process.dataPoints.length + index) / 20) + 1).padStart(3, '0')}`,
    operator: ['Operator A', 'Operator B', 'Operator C'][index % 3],
    notes: undefined,
  }));
};