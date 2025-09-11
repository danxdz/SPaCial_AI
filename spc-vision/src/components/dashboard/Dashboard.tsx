import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  PlusIcon, 
  Cog6ToothIcon,
  BellIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline';
import { useAppStore } from '../../stores/useAppStore';
import { useChartStore } from '../../stores/useChartStore';
import ProcessCard from './ProcessCard';
import ChartWidget from './ChartWidget';
import StatisticsWidget from './StatisticsWidget';
import AlertWidget from './AlertWidget';
import type { ChartConfig, ChartType } from '../../types/spc';

const Dashboard: React.FC = () => {
  const { 
    processes, 
    currentProcess, 
    preferences, 
    setCurrentProcess,
    updatePreferences 
  } = useAppStore();
  
  const { charts, createChart } = useChartStore();
  
  const [selectedChartType, setSelectedChartType] = useState<ChartType>('xbar-r');
  const [showNewChartModal, setShowNewChartModal] = useState(false);
  const [, setShowPreferencesModal] = useState(false);
  
  // Theme management
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  
  useEffect(() => {
    const savedTheme = preferences.theme;
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, [preferences.theme]);
  
  const applyTheme = (newTheme: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;
    
    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.toggle('dark', systemTheme === 'dark');
    } else {
      root.classList.toggle('dark', newTheme === 'dark');
    }
  };
  
  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    applyTheme(newTheme);
    updatePreferences({ theme: newTheme });
  };
  
  const handleCreateChart = () => {
    if (!currentProcess) return;
    
    const newChart: ChartConfig = {
      id: crypto.randomUUID(),
      type: selectedChartType,
      processId: currentProcess.id,
      title: `${selectedChartType.toUpperCase()} Chart - ${currentProcess.name}`,
      sigmaLevel: preferences.defaultSigmaLevel,
      showSpecifications: true,
      showTrendLine: false,
      showCapability: true,
      colors: preferences.chartColors,
    };
    
    createChart(newChart);
    setShowNewChartModal(false);
  };
  
  const processCharts = charts.filter(chart => 
    currentProcess && chart.processId === currentProcess.id
  );
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-primary-600" />
              <h1 className="ml-2 text-xl font-bold text-gray-900 dark:text-white">
                SPaCial_AI
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => handleThemeChange('light')}
                  className={`p-1 rounded ${theme === 'light' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
                  title="Light theme"
                >
                  <SunIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleThemeChange('system')}
                  className={`p-1 rounded ${theme === 'system' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
                  title="System theme"
                >
                  <ComputerDesktopIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={`p-1 rounded ${theme === 'dark' ? 'bg-white dark:bg-gray-600 shadow-sm' : ''}`}
                  title="Dark theme"
                >
                  <MoonIcon className="h-4 w-4" />
                </button>
              </div>
              
              {/* Notifications */}
              <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <BellIcon className="h-5 w-5" />
              </button>
              
              {/* Settings */}
              <button 
                onClick={() => setShowPreferencesModal(true)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <Cog6ToothIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Process Selection */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Select Process
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {processes.map((process) => (
              <ProcessCard
                key={process.id}
                process={process}
                isSelected={currentProcess?.id === process.id}
                onClick={() => setCurrentProcess(process)}
              />
            ))}
            
            {/* Add New Process Card */}
            <div className="card p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary-500 dark:hover:border-primary-400 cursor-pointer transition-colors">
              <div className="text-center">
                <PlusIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Add New Process
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Create a new statistical process control chart
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Current Process Dashboard */}
        {currentProcess && (
          <div className="space-y-8">
            {/* Process Header */}
            <div className="card p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {currentProcess.name}
                  </h2>
                  {currentProcess.description && (
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                      {currentProcess.description}
                    </p>
                  )}
                  <div className="flex items-center space-x-6 mt-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>Data Points: {currentProcess.dataPoints.length}</span>
                    <span>Created: {currentProcess.createdAt.toLocaleDateString()}</span>
                    <span>Updated: {currentProcess.updatedAt.toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button className="btn-secondary">
                    <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
                    Import Data
                  </button>
                  <button className="btn-secondary">
                    <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
                    Export Data
                  </button>
                  <button 
                    onClick={() => setShowNewChartModal(true)}
                    className="btn-primary"
                  >
                    <ChartBarIcon className="h-4 w-4 mr-2" />
                    New Chart
                  </button>
                </div>
              </div>
            </div>
            
            {/* Statistics Overview */}
            <StatisticsWidget process={currentProcess} />
            
            {/* Charts Grid */}
            {processCharts.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Control Charts
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {processCharts.map((chart) => (
                    <ChartWidget key={chart.id} chartConfig={chart} />
                  ))}
                </div>
              </div>
            )}
            
            {/* Alerts */}
            <AlertWidget process={currentProcess} />
          </div>
        )}
        
        {/* Empty State */}
        {!currentProcess && processes.length === 0 && (
          <div className="text-center py-12">
            <ChartBarIcon className="h-24 w-24 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No processes yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Get started by creating your first statistical process control chart
            </p>
            <button className="btn-primary">
              <PlusIcon className="h-4 w-4 mr-2" />
              Create First Process
            </button>
          </div>
        )}
      </main>
      
      {/* New Chart Modal */}
      {showNewChartModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Create New Chart
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Chart Type
                </label>
                <select
                  value={selectedChartType}
                  onChange={(e) => setSelectedChartType(e.target.value as ChartType)}
                  className="input-field"
                >
                  <option value="xbar-r">X-bar and R Chart</option>
                  <option value="xbar-s">X-bar and S Chart</option>
                  <option value="i-mr">Individual and Moving Range Chart</option>
                  <option value="p-chart">p-Chart (Proportion)</option>
                  <option value="np-chart">np-Chart (Number Defective)</option>
                  <option value="c-chart">c-Chart (Defects per Unit)</option>
                  <option value="u-chart">u-Chart (Defects per Unit Variable)</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowNewChartModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateChart}
                className="btn-primary"
              >
                Create Chart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;