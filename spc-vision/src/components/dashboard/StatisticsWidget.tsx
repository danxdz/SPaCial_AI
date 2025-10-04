import React, { useMemo } from 'react';
import type { ProcessData } from '../../types/spc';
import { generateStatisticalSummary, calculateProcessCapability } from '../../utils/statistics';

interface StatisticsWidgetProps {
  process: ProcessData;
}

const StatisticsWidget: React.FC<StatisticsWidgetProps> = ({ process }) => {
  const statistics = useMemo(() => {
    const values = process.dataPoints.map(dp => dp.value);
    return generateStatisticalSummary(values);
  }, [process.dataPoints]);
  
  const capability = useMemo(() => {
    if (!process.specifications) return null;
    const values = process.dataPoints.map(dp => dp.value);
    return calculateProcessCapability(values, process.specifications);
  }, [process.dataPoints, process.specifications]);
  
  const getCapabilityStatus = (cpk: number) => {
    if (cpk >= 1.67) return { status: 'Excellent', color: 'text-green-600' };
    if (cpk >= 1.33) return { status: 'Good', color: 'text-blue-600' };
    if (cpk >= 1.0) return { status: 'Marginal', color: 'text-yellow-600' };
    return { status: 'Poor', color: 'text-red-600' };
  };
  
  return (
    <div className="card p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
        Statistical Summary
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {/* Basic Statistics */}
        <div className="text-center">
          <div className="text-2xl font-bold text-primary-600">
            {statistics.count}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Count
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {statistics.mean.toFixed(3)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Mean
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {statistics.median.toFixed(3)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Median
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {statistics.stdDev.toFixed(3)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Std Dev
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {statistics.min.toFixed(3)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Min
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {statistics.max.toFixed(3)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Max
          </div>
        </div>
      </div>
      
      {/* Process Capability */}
      {capability && (
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
            Process Capability
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {capability.cp.toFixed(2)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Cp
              </div>
            </div>
            
            <div className="text-center">
              <div className={`text-xl font-bold ${getCapabilityStatus(capability.cpk).color}`}>
                {capability.cpk.toFixed(2)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Cpk
              </div>
              <div className={`text-xs ${getCapabilityStatus(capability.cpk).color}`}>
                {getCapabilityStatus(capability.cpk).status}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {capability.pp.toFixed(2)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Pp
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {capability.ppk.toFixed(2)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Ppk
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Sigma Level: <span className="font-medium">{capability.sigma.toFixed(2)}σ</span>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              PPM: <span className="font-medium">{capability.ppm.toFixed(0)}</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Distribution Shape */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
          Distribution Shape
        </h4>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {statistics.skewness.toFixed(3)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Skewness
            </div>
            <div className="text-xs text-gray-400">
              {Math.abs(statistics.skewness) < 0.5 ? 'Symmetric' : 
               statistics.skewness > 0 ? 'Right-skewed' : 'Left-skewed'}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {statistics.kurtosis.toFixed(3)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Kurtosis
            </div>
            <div className="text-xs text-gray-400">
              {statistics.kurtosis > 0 ? 'Heavy-tailed' : 
               statistics.kurtosis < 0 ? 'Light-tailed' : 'Normal'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsWidget;