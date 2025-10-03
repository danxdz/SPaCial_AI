import React from 'react';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';
import { useNavigationHistory } from '../../services/navigationHistory';
import { navigationService } from '../../services/navigationService';
import { useI18nStore } from '../../stores/useI18nStore';

interface BreadcrumbItem {
  name: string;
  module: string;
}

const getModuleName = (module: string, t: (key: string) => string): string => {
  const moduleNames: Record<string, string> = {
    'home': t('ui.breadcrumb.home'),
    'production-dashboard': t('ui.breadcrumb.productionDashboard'),
    'user-preferences': t('ui.breadcrumb.userPreferences'),
    'sections': t('ui.breadcrumb.sections'),
    'families': t('ui.breadcrumb.families'),
    'products': t('ui.breadcrumb.products'),
    'features': t('ui.breadcrumb.features'),
    'gammas': t('ui.breadcrumb.gammas'),
    'measurements': t('ui.breadcrumb.measurements'),
    'users': t('ui.breadcrumb.users'),
    'groups': t('ui.breadcrumb.groups'),
    'registration-codes': t('ui.breadcrumb.registrationCodes'),
    'user-validation': t('ui.breadcrumb.userValidation'),
    'database': t('ui.breadcrumb.database'),
    'logs': t('ui.breadcrumb.logs'),
    'storage': t('ui.breadcrumb.storage'),
    'system-settings': t('ui.breadcrumb.systemSettings'),
    'database-crud': t('ui.breadcrumb.databaseCrud'),
    'translations': t('ui.breadcrumb.translations')
  };
  return moduleNames[module] || module;
};

const ProfessionalBreadcrumb: React.FC = () => {
  const { history, currentIndex } = useNavigationHistory();
  const { t } = useI18nStore();

  if (history.length <= 1) {
    return null;
  }

  const breadcrumbItems: BreadcrumbItem[] = history.slice(0, currentIndex + 1).map(module => ({
    name: getModuleName(module, t),
    module
  }));

  const handleBreadcrumbClick = (module: string, index: number) => {
    // Navigate to the clicked module
    navigationService.navigateTo(module);
    
    // Update history index
    const { setCurrentIndex } = useNavigationHistory.getState();
    setCurrentIndex(index);
  };

  return (
    <nav className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400 mb-4">
      <HomeIcon className="h-4 w-4" />
      
      {breadcrumbItems.map((item, index) => (
        <React.Fragment key={item.module}>
          <ChevronRightIcon className="h-4 w-4 mx-1" />
          
          {index === breadcrumbItems.length - 1 ? (
            // Current page - not clickable
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {item.name}
            </span>
          ) : (
            // Previous pages - clickable
            <button
              onClick={() => handleBreadcrumbClick(item.module, index)}
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
            >
              {item.name}
            </button>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default ProfessionalBreadcrumb;
