import React from 'react';
import { ChartBarIcon, CalendarIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import type { ProcessData } from '../../types/spc';

interface ProcessCardProps {
  process: ProcessData;
  isSelected: boolean;
  onClick: () => void;
}

const ProcessCard: React.FC<ProcessCardProps> = ({ process, isSelected, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`card p-6 cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected 
          ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20' 
          : 'hover:shadow-lg'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <ChartBarIcon className="h-8 w-8 text-primary-600 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {process.name}
            </h3>
            {process.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {process.description}
              </p>
            )}
          </div>
        </div>
        
        {isSelected && (
          <div className="flex-shrink-0">
            <div className="w-3 h-3 bg-primary-600 rounded-full"></div>
          </div>
        )}
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
          <DocumentTextIcon className="h-4 w-4 mr-2" />
          <span>{process.dataPoints.length} data points</span>
        </div>
        
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
          <CalendarIcon className="h-4 w-4 mr-2" />
          <span>Updated {process.updatedAt.toLocaleDateString()}</span>
        </div>
        
        {process.specifications && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Specifications:
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {process.specifications.usl && (
                <span>USL: {process.specifications.usl}</span>
              )}
              {process.specifications.usl && process.specifications.lsl && ' | '}
              {process.specifications.lsl && (
                <span>LSL: {process.specifications.lsl}</span>
              )}
              {process.specifications.target && (
                <span> | Target: {process.specifications.target}</span>
              )}
              <span className="ml-1 text-gray-500">
                {process.specifications.unit}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessCard;