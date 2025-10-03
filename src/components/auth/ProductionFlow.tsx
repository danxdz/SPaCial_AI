import { useState } from 'react';
import { useUserStore } from '../../stores/useUserStore';
import WorkshopSelection from './WorkshopSelection';
import WorkstationSelection from './WorkstationSelection';
import RouteSelection from './RouteSelection';

type FlowStep = 'workshop' | 'workstation' | 'route' | 'measurements';

interface ProductionFlowProps {
  onSkipToMain?: () => void;
}

const ProductionFlow = ({ onSkipToMain }: ProductionFlowProps) => {
  const { needsWorkshopSelection, needsWorkstationSelection } = useUserStore();
  const [currentStep, setCurrentStep] = useState<FlowStep>('workshop');

  // Determine initial step based on user's current selections
  useState(() => {
    if (needsWorkshopSelection()) {
      setCurrentStep('workshop');
    } else if (needsWorkstationSelection()) {
      setCurrentStep('workstation');
    } else {
      setCurrentStep('route');
    }
  });

  const handleWorkshopNext = () => {
    setCurrentStep('workstation');
  };

  const handleWorkstationNext = () => {
    setCurrentStep('route');
  };

  const handleRouteStart = () => {
    // The RouteSelection component already stored the selected route in localStorage
    // Now go back to main app with sidebar visible
    // Use window.location.reload() to refresh the app state properly
    window.location.reload();
  };

  const handleBackToMain = () => {
    // Go back to main app without logging out
    // The user's workshop/workstation selections are already saved in the store
    if (onSkipToMain) {
      onSkipToMain();
    } else {
      // Fallback to reload if onSkipToMain is not provided
      window.location.reload();
    }
  };

  const handleLogout = async () => {
    const { logout } = useUserStore.getState();
    await logout();
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'workshop':
        return <WorkshopSelection onNext={handleWorkshopNext} onBackToMain={handleBackToMain} />;
      case 'workstation':
        return <WorkstationSelection onNext={handleWorkstationNext} onBackToMain={handleBackToMain} />;
      case 'route':
        return <RouteSelection onStart={handleRouteStart} onBackToMain={handleBackToMain} />;
      default:
        return <WorkshopSelection onNext={handleWorkshopNext} onBackToMain={handleBackToMain} />;
    }
  };

  return (
    <div className="relative">
      {/* Logout button in top-right corner */}
      <button
        onClick={handleLogout}
        className="absolute top-4 right-4 z-50 p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors bg-white dark:bg-gray-800 rounded-lg shadow-md"
        title="Logout"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>
      {renderCurrentStep()}
    </div>
  );
};

export default ProductionFlow;
