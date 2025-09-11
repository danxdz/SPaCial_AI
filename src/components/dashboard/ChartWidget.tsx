import React from 'react';
import { 
  ChartBarIcon, 
  Cog6ToothIcon, 
  DocumentArrowDownIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import type { ChartConfig } from '../../types/spc';
import SPCChart from '../charts/SPCChart';
import { useChartStore } from '../../stores/useChartStore';
import { useAppStore } from '../../stores/useAppStore';

interface ChartWidgetProps {
  chartConfig: ChartConfig;
}

const ChartWidget: React.FC<ChartWidgetProps> = ({ chartConfig }) => {
  const { chartData, violations, generateChartData } = useChartStore();
  const { currentProcess } = useAppStore();
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  React.useEffect(() => {
    if (currentProcess && !chartData[chartConfig.id]) {
      generateChartData(chartConfig.id, currentProcess);
    }
  }, [chartConfig.id, currentProcess, generateChartData]);
  
  const data = chartData[chartConfig.id];
  const chartViolations = violations[chartConfig.id] || [];
  
  const handleExportChart = () => {
    // TODO: Implement chart export functionality
    console.log('Exporting chart:', chartConfig.id);
  };
  
  const handleConfigureChart = () => {
    // TODO: Implement chart configuration modal
    console.log('Configuring chart:', chartConfig.id);
  };
  
  if (!data) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {chartConfig.title}
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={handleConfigureChart}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <Cog6ToothIcon className="h-4 w-4" />
            </button>
            <button
              onClick={handleExportChart}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <ChartBarIcon className="h-12 w-12 mx-auto mb-2" />
            <p>Generating chart data...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {chartConfig.title}
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <EyeSlashIcon className="h-4 w-4" />
            ) : (
              <EyeIcon className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={handleConfigureChart}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            title="Configure"
          >
            <Cog6ToothIcon className="h-4 w-4" />
          </button>
          <button
            onClick={handleExportChart}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            title="Export"
          >
            <DocumentArrowDownIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Chart Type Badge */}
      <div className="mb-4">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200">
          {chartConfig.type.toUpperCase()}
        </span>
        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
          {chartConfig.sigmaLevel}σ Control Limits
        </span>
      </div>
      
      {/* Chart */}
      <div className={isExpanded ? 'h-96' : 'h-64'}>
        <SPCChart
          config={chartConfig}
          data={data}
          violations={chartViolations}
          className="w-full"
        />
      </div>
      
      {/* Chart Summary */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
        <div className="text-center">
          <div className="font-medium text-gray-600 dark:text-gray-400">Data Points</div>
          <div className="text-lg font-bold">{data.labels.length}</div>
        </div>
        <div className="text-center">
          <div className="font-medium text-gray-600 dark:text-gray-400">Violations</div>
          <div className={`text-lg font-bold ${chartViolations.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {chartViolations.length}
          </div>
        </div>
        <div className="text-center">
          <div className="font-medium text-gray-600 dark:text-gray-400">Status</div>
          <div className={`text-lg font-bold ${chartViolations.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {chartViolations.length > 0 ? 'Out of Control' : 'In Control'}
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
          <div className="flex space-x-2">
            <button className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
              View Details
            </button>
            <button className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
              Add Data Point
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartWidget;