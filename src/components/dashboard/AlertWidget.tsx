import React, { useMemo } from 'react';
import { 
  ExclamationTriangleIcon, 
  CheckCircleIcon,
  InformationCircleIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import type { ProcessData } from '../../types/spc';
import { useChartStore } from '../../stores/useChartStore';

interface AlertWidgetProps {
  process: ProcessData;
}

const AlertWidget: React.FC<AlertWidgetProps> = ({ process: _process }) => {
  const { violations } = useChartStore();
  
  const allViolations = useMemo(() => {
    const allViolations: any[] = [];
    Object.values(violations).forEach(chartViolations => {
      allViolations.push(...chartViolations);
    });
    
    // Sort by severity and timestamp
    return allViolations.sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === 'error' ? -1 : 1;
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [violations]);
  
  const errorViolations = allViolations.filter(v => v.severity === 'error');
  const warningViolations = allViolations.filter(v => v.severity === 'warning');
  
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
    }
  };
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };
  
  const getSeverityTextColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'text-red-800 dark:text-red-200';
      case 'warning':
        return 'text-yellow-800 dark:text-yellow-200';
      default:
        return 'text-blue-800 dark:text-blue-200';
    }
  };
  
  if (allViolations.length === 0) {
    return (
      <div className="card p-6">
        <div className="flex items-center">
          <CheckCircleIcon className="h-8 w-8 text-green-500 mr-3" />
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Process In Control
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No control rule violations detected
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <BellIcon className="h-6 w-6 text-gray-500 mr-3" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Control Rule Violations
          </h3>
        </div>
        <div className="flex space-x-4 text-sm">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-4 w-4 text-red-500 mr-1" />
            <span className="text-red-600 dark:text-red-400">{errorViolations.length} Errors</span>
          </div>
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500 mr-1" />
            <span className="text-yellow-600 dark:text-yellow-400">{warningViolations.length} Warnings</span>
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        {allViolations.slice(0, 10).map((violation) => (
          <div
            key={violation.id}
            className={`p-3 rounded-lg border ${getSeverityColor(violation.severity)}`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-3 mt-0.5">
                {getSeverityIcon(violation.severity)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-medium ${getSeverityTextColor(violation.severity)}`}>
                    {violation.ruleName}
                  </h4>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(violation.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className={`text-sm mt-1 ${getSeverityTextColor(violation.severity)}`}>
                  {violation.description}
                </p>
                {violation.dataPoints && violation.dataPoints.length > 0 && (
                  <div className="mt-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Affected points: {violation.dataPoints.map((p: number) => p + 1).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {allViolations.length > 10 && (
          <div className="text-center pt-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ... and {allViolations.length - 10} more violations
            </span>
          </div>
        )}
      </div>
      
      {/* Action Buttons */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between">
          <button className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
            View All Violations
          </button>
          <button className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300">
            Configure Rules
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertWidget;