import React from 'react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useNavigationHistory } from '../../services/navigationHistory';
import { navigationService } from '../../services/navigationService';
import { useI18nStore } from '../../stores/useI18nStore';

interface BackButtonProps {
  className?: string;
  showText?: boolean;
  onClick?: () => void;
}

const BackButton: React.FC<BackButtonProps> = ({ 
  className = '', 
  showText = true,
  onClick 
}) => {
  const { canGoBack, goBack } = useNavigationHistory();
  const { t } = useI18nStore();

  const handleBack = () => {
    if (onClick) {
      onClick();
      return;
    }

    if (canGoBack()) {
      const previousModule = goBack();
      if (previousModule) {
        navigationService.navigateTo(previousModule);
      }
    }
  };

  if (!canGoBack() && !onClick) {
    return null;
  }

  return (
    <button
      onClick={handleBack}
      className={`
        inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
        bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 
        rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
        transition-colors duration-200
        ${className}
      `}
    >
      <ArrowLeftIcon className="h-4 w-4" />
      {showText && t('ui.back')}
    </button>
  );
};

export default BackButton;
