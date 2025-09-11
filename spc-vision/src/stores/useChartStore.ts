import { create } from 'zustand';
import type { ChartConfig, ChartData, ControlLimits } from '../types/spc';
import { 
  calculateXBarRControlLimits, 
  calculateXBarSControlLimits, 
  calculateIMRControlLimits,
  calculatePChartControlLimits,
  calculateNPChartControlLimits,
  calculateCChartControlLimits,
  calculateUChartControlLimits,
  checkWesternElectricRules
} from '../utils/statistics';

interface ChartStore {
  charts: ChartConfig[];
  currentChart: ChartConfig | undefined;
  chartData: Record<string, ChartData>;
  violations: Record<string, any[]>;
  
  // Actions
  createChart: (config: ChartConfig) => void;
  updateChart: (id: string, updates: Partial<ChartConfig>) => void;
  deleteChart: (id: string) => void;
  setCurrentChart: (chart: ChartConfig | undefined) => void;
  
  // Data operations
  generateChartData: (chartId: string, processData: any) => void;
  updateChartData: (chartId: string, data: ChartData) => void;
  
  // Control limits
  calculateControlLimits: (chartId: string, processData: any) => ControlLimits | null;
  
  // Rule violations
  checkRuleViolations: (chartId: string, values: number[], controlLimits: ControlLimits) => void;
  getViolations: (chartId: string) => any[];
  clearViolations: (chartId: string) => void;
}

export const useChartStore = create<ChartStore>((set, get) => ({
  charts: [],
  currentChart: undefined,
  chartData: {},
  violations: {},
  
  createChart: (config) => set((state) => ({
    charts: [...state.charts, config],
    currentChart: config,
  })),
  
  updateChart: (id, updates) => set((state) => ({
    charts: state.charts.map(chart => 
      chart.id === id ? { ...chart, ...updates } : chart
    ),
    currentChart: state.currentChart?.id === id 
      ? { ...state.currentChart, ...updates }
      : state.currentChart,
  })),
  
  deleteChart: (id) => set((state) => ({
    charts: state.charts.filter(chart => chart.id !== id),
    currentChart: state.currentChart?.id === id ? undefined : state.currentChart,
    chartData: Object.fromEntries(
      Object.entries(state.chartData).filter(([key]) => key !== id)
    ),
    violations: Object.fromEntries(
      Object.entries(state.violations).filter(([key]) => key !== id)
    ),
  })),
  
  setCurrentChart: (chart) => set({ currentChart: chart }),
  
  generateChartData: (chartId, processData) => {
    const chart = get().charts.find(c => c.id === chartId);
    if (!chart) return;
    
    const controlLimits = get().calculateControlLimits(chartId, processData);
    if (!controlLimits) return;
    
    // Generate chart data based on chart type
    let labels: string[] = [];
    let datasets: any[] = [];
    
    switch (chart.type) {
      case 'xbar-r':
      case 'xbar-s':
        labels = processData.subgroups?.map((_sg: any, index: number) => `SG${index + 1}`) || [];
        datasets = [{
          label: chart.title,
          data: processData.subgroups?.map((sg: any) => 
            sg.values.reduce((sum: number, val: number) => sum + val, 0) / sg.values.length
          ) || [],
          borderColor: chart.colors.dataPoint,
          backgroundColor: chart.colors.dataPoint + '20',
          pointBackgroundColor: chart.colors.dataPoint,
          pointBorderColor: chart.colors.dataPoint,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0,
        }];
        break;
        
      case 'i-mr':
        labels = processData.dataPoints?.map((_dp: any, index: number) => `Point ${index + 1}`) || [];
        datasets = [{
          label: chart.title,
          data: processData.dataPoints?.map((dp: any) => dp.value) || [],
          borderColor: chart.colors.dataPoint,
          backgroundColor: chart.colors.dataPoint + '20',
          pointBackgroundColor: chart.colors.dataPoint,
          pointBorderColor: chart.colors.dataPoint,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0,
        }];
        break;
        
      case 'p-chart':
      case 'np-chart':
      case 'c-chart':
      case 'u-chart':
        labels = processData.dataPoints?.map((_dp: any, index: number) => `Sample ${index + 1}`) || [];
        datasets = [{
          label: chart.title,
          data: processData.dataPoints?.map((dp: any) => dp.value) || [],
          borderColor: chart.colors.dataPoint,
          backgroundColor: chart.colors.dataPoint + '20',
          pointBackgroundColor: chart.colors.dataPoint,
          pointBorderColor: chart.colors.dataPoint,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0,
        }];
        break;
    }
    
    const chartData: ChartData = {
      labels,
      datasets,
      controlLimits,
      specifications: processData.specifications,
    };
    
    set((state) => ({
      chartData: {
        ...state.chartData,
        [chartId]: chartData,
      },
    }));
    
    // Check for rule violations
    const values = datasets[0]?.data || [];
    get().checkRuleViolations(chartId, values, controlLimits);
  },
  
  updateChartData: (chartId, data) => set((state) => ({
    chartData: {
      ...state.chartData,
      [chartId]: data,
    },
  })),
  
  calculateControlLimits: (chartId, processData) => {
    const chart = get().charts.find(c => c.id === chartId);
    if (!chart) return null;
    
    try {
      switch (chart.type) {
        case 'xbar-r':
          return calculateXBarRControlLimits(processData.subgroups || [], chart.sigmaLevel);
        case 'xbar-s':
          return calculateXBarSControlLimits(processData.subgroups || [], chart.sigmaLevel);
        case 'i-mr':
          return calculateIMRControlLimits(processData.dataPoints || [], chart.sigmaLevel);
        case 'p-chart':
          const subgroupSizes = processData.subgroups?.map((sg: any) => sg.values.length) || [];
          return calculatePChartControlLimits(processData.dataPoints || [], subgroupSizes, chart.sigmaLevel);
        case 'np-chart':
          const npSubgroupSize = processData.subgroups?.[0]?.values.length || 1;
          return calculateNPChartControlLimits(processData.dataPoints || [], npSubgroupSize, chart.sigmaLevel);
        case 'c-chart':
          return calculateCChartControlLimits(processData.dataPoints || [], chart.sigmaLevel);
        case 'u-chart':
          const uSubgroupSizes = processData.subgroups?.map((sg: any) => sg.values.length) || [];
          return calculateUChartControlLimits(processData.dataPoints || [], uSubgroupSizes, chart.sigmaLevel);
        default:
          return null;
      }
    } catch (error) {
      console.error('Error calculating control limits:', error);
      return null;
    }
  },
  
  checkRuleViolations: (chartId, values, controlLimits) => {
    const violations = checkWesternElectricRules(values, controlLimits);
    set((state) => ({
      violations: {
        ...state.violations,
        [chartId]: violations,
      },
    }));
  },
  
  getViolations: (chartId) => {
    return get().violations[chartId] || [];
  },
  
  clearViolations: (chartId) => set((state) => ({
    violations: {
      ...state.violations,
      [chartId]: [],
    },
  })),
}));