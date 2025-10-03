import React from 'react';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';
import { useNavigation } from '../../hooks/useNavigation';
import { useI18nStore } from '../../stores/useI18nStore';

const Breadcrumb: React.FC = () => {
  const { breadcrumb, navigateTo, navigateBack } = useNavigation();
  const { t } = useI18nStore();

  if (breadcrumb.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
      <button
        onClick={() => navigateTo('home')}
        className="flex items-center hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
      >
        <HomeIcon className="h-4 w-4 mr-1" />
        {t('ui.home')}
      </button>
      
      {breadcrumb.map((item) => (
        <React.Fragment key={`${item.module}-${item.id}`}>
          <ChevronRightIcon className="h-4 w-4" />
          <button
            onClick={() => {
              // Navigate back to this level
              // This is a simplified approach - in a real implementation,
              // you'd want to reconstruct the proper navigation state
              navigateBack();
            }}
            className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors truncate max-w-32"
            title={item.name}
          >
            {item.name}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumb;
