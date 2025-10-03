import { useState, useEffect } from 'react';
import { navigationService, NavigationState, NavigationFilter } from '../services/navigationService';

export const useNavigation = () => {
  const [state, setState] = useState<NavigationState>(navigationService.getState());

  useEffect(() => {
    const unsubscribe = navigationService.subscribe(setState);
    return unsubscribe;
  }, []);

  const navigateTo = (module: string, filter?: NavigationFilter, breadcrumbItem?: { name: string; id: number }) => {
    navigationService.navigateTo(module, filter, breadcrumbItem);
  };

  const navigateBack = () => {
    navigationService.navigateBack();
  };

  const reset = () => {
    navigationService.reset();
  };

  const getFiltersForModule = (module: string) => {
    return navigationService.getFiltersForModule(module);
  };

  return {
    currentModule: state.currentModule,
    filters: state.filters,
    breadcrumb: state.breadcrumb,
    navigateTo,
    navigateBack,
    reset,
    getFiltersForModule
  };
};
