import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { ChartData, ChartConfig } from '../../types/spc';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface SPCChartProps {
  config: ChartConfig;
  data: ChartData;
  violations?: any[];
  onPointClick?: (pointIndex: number) => void;
  className?: string;
}

const SPCChart: React.FC<SPCChartProps> = ({
  config,
  data,
  violations = [],
  onPointClick,
  className = '',
}) => {
  const chartData = useMemo(() => {
    const { controlLimits, specifications } = data;
    const datasets = [...data.datasets];
    
    // Add center line
    datasets.push({
      label: 'Center Line',
      data: data.labels.map(() => controlLimits.cl),
      borderColor: config.colors.centerLine,
      backgroundColor: 'transparent',
      pointBackgroundColor: 'transparent',
      pointBorderColor: 'transparent',
      pointRadius: 0,
      pointHoverRadius: 0,
      borderDash: [5, 5],
      fill: false,
    } as any);
    
    // Add upper control limit
    datasets.push({
      label: 'Upper Control Limit',
      data: data.labels.map(() => controlLimits.ucl),
      borderColor: config.colors.controlLimits,
      backgroundColor: 'transparent',
      pointBackgroundColor: 'transparent',
      pointBorderColor: 'transparent',
      pointRadius: 0,
      pointHoverRadius: 0,
      borderDash: [10, 5],
      fill: false,
    } as any);
    
    // Add lower control limit
    datasets.push({
      label: 'Lower Control Limit',
      data: data.labels.map(() => controlLimits.lcl),
      borderColor: config.colors.controlLimits,
      backgroundColor: 'transparent',
      pointBackgroundColor: 'transparent',
      pointBorderColor: 'transparent',
      pointRadius: 0,
      pointHoverRadius: 0,
      borderDash: [10, 5],
      fill: false,
    } as any);
    
    // Add specification limits if available
    if (specifications) {
      if (specifications.usl) {
        datasets.push({
          label: 'Upper Specification Limit',
          data: data.labels.map(() => specifications.usl!),
          borderColor: config.colors.specificationLimits,
          backgroundColor: 'transparent',
          pointBackgroundColor: 'transparent',
          pointBorderColor: 'transparent',
          pointRadius: 0,
          pointHoverRadius: 0,
          borderDash: [15, 5],
          fill: false,
        } as any);
      }
      
      if (specifications.lsl) {
        datasets.push({
          label: 'Lower Specification Limit',
          data: data.labels.map(() => specifications.lsl!),
          borderColor: config.colors.specificationLimits,
          backgroundColor: 'transparent',
          pointBackgroundColor: 'transparent',
          pointBorderColor: 'transparent',
          pointRadius: 0,
          pointHoverRadius: 0,
          borderDash: [15, 5],
          fill: false,
        } as any);
      }
    }
    
    // Highlight out-of-control points
    const violationPoints = new Set(violations.flatMap(v => v.dataPoints));
    const highlightedDataset = {
      ...datasets[0],
      pointBackgroundColor: data.labels.map((_, index) => 
        violationPoints.has(index) ? config.colors.outOfControl : config.colors.dataPoint
      ),
      pointBorderColor: data.labels.map((_, index) => 
        violationPoints.has(index) ? config.colors.outOfControl : config.colors.dataPoint
      ),
      pointRadius: data.labels.map((_, index) => 
        violationPoints.has(index) ? 6 : 4
      ),
    } as any;
    
    datasets[0] = highlightedDataset;
    
    return {
      labels: data.labels,
      datasets,
    };
  }, [data, config.colors, violations]);
  
  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    plugins: {
      title: {
        display: true,
        text: config.title,
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        callbacks: {
          title: (context: any) => {
            return `Point ${context[0].dataIndex + 1}`;
          },
          label: (context: any) => {
            const datasetLabel = context.dataset.label;
            const value = context.parsed.y;
            
            if (datasetLabel === 'Center Line') {
              return `Center Line: ${value.toFixed(3)}`;
            } else if (datasetLabel === 'Upper Control Limit') {
              return `UCL: ${value.toFixed(3)}`;
            } else if (datasetLabel === 'Lower Control Limit') {
              return `LCL: ${value.toFixed(3)}`;
            } else if (datasetLabel === 'Upper Specification Limit') {
              return `USL: ${value.toFixed(3)}`;
            } else if (datasetLabel === 'Lower Specification Limit') {
              return `LSL: ${value.toFixed(3)}`;
            } else {
              return `${datasetLabel}: ${value.toFixed(3)}`;
            }
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: config.xAxisLabel || 'Sample',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: config.yAxisLabel || 'Value',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
    onClick: (_event: any, elements: any[]) => {
      if (elements.length > 0 && onPointClick) {
        const element = elements[0];
        onPointClick(element.index);
      }
    },
  }), [config, onPointClick]);
  
  return (
    <div className={`relative ${className}`}>
      <div className="h-96 w-full">
        <Line data={chartData} options={options} />
      </div>
      
      {/* Control Limits Info */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
        <div className="text-center">
          <div className="font-medium text-gray-600 dark:text-gray-400">Center Line</div>
          <div className="text-lg font-bold">{data.controlLimits.cl.toFixed(3)}</div>
        </div>
        <div className="text-center">
          <div className="font-medium text-gray-600 dark:text-gray-400">Upper Control Limit</div>
          <div className="text-lg font-bold text-red-600">{data.controlLimits.ucl.toFixed(3)}</div>
        </div>
        <div className="text-center">
          <div className="font-medium text-gray-600 dark:text-gray-400">Lower Control Limit</div>
          <div className="text-lg font-bold text-red-600">{data.controlLimits.lcl.toFixed(3)}</div>
        </div>
      </div>
      
      {/* Violations Summary */}
      {violations.length > 0 && (
        <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
          <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
            Control Rule Violations ({violations.length})
          </h4>
          <div className="space-y-1">
            {violations.slice(0, 5).map((violation, index) => (
              <div key={index} className="text-sm text-red-700 dark:text-red-300">
                • {violation.description}
              </div>
            ))}
            {violations.length > 5 && (
              <div className="text-sm text-red-600 dark:text-red-400">
                ... and {violations.length - 5} more violations
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SPCChart;