// Navigation service for module-to-module navigation with filtering
export interface NavigationFilter {
  type: 'workshop' | 'family' | 'product' | 'gamma' | 'feature' | 'user' | 'group';
  id: number;
  name?: string;
  module?: string; // Which module this filter applies to
}

export interface NavigationState {
  currentModule: string;
  filters: NavigationFilter[];
  breadcrumb: Array<{
    module: string;
    name: string;
    id: number;
  }>;
}

class NavigationService {
  private state: NavigationState = {
    currentModule: 'home',
    filters: [],
    breadcrumb: []
  };

  private listeners: Array<(state: NavigationState) => void> = [];

  // Subscribe to navigation state changes
  subscribe(listener: (state: NavigationState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Get current navigation state
  getState(): NavigationState {
    return { ...this.state };
  }

  // Navigate to a module with optional filtering
  navigateTo(module: string, filter?: NavigationFilter, breadcrumbItem?: { name: string; id: number }): void {
    let newFilters = [...this.state.filters];
    
    // If filter is provided, add it or update existing filter of same type
    if (filter) {
      const existingFilterIndex = newFilters.findIndex(f => f.type === filter.type);
      if (existingFilterIndex >= 0) {
        newFilters[existingFilterIndex] = { ...filter, module };
      } else {
        newFilters.push({ ...filter, module });
      }
    }

    const newBreadcrumb = breadcrumbItem 
      ? [...this.state.breadcrumb, { module, name: breadcrumbItem.name, id: breadcrumbItem.id }]
      : this.state.breadcrumb;

    this.state = {
      currentModule: module,
      filters: newFilters,
      breadcrumb: newBreadcrumb
    };

    // Store in session storage for persistence
    sessionStorage.setItem('navigationState', JSON.stringify(this.state));

    // Notify listeners
    this.listeners.forEach(listener => listener(this.state));
  }

  // Navigate back in breadcrumb
  navigateBack(): void {
    if (this.state.breadcrumb.length > 0) {
      const previousItem = this.state.breadcrumb[this.state.breadcrumb.length - 1];
      const newBreadcrumb = this.state.breadcrumb.slice(0, -1);
      const newFilters = this.state.filters.slice(0, -1);

      this.state = {
        currentModule: previousItem.module,
        filters: newFilters,
        breadcrumb: newBreadcrumb
      };

      sessionStorage.setItem('navigationState', JSON.stringify(this.state));
      this.listeners.forEach(listener => listener(this.state));
    }
  }

  // Clear all filters and reset to home
  reset(): void {
    this.state = {
      currentModule: 'home',
      filters: [],
      breadcrumb: []
    };

    sessionStorage.removeItem('navigationState');
    this.listeners.forEach(listener => listener(this.state));
  }

  // Get filters for a specific module
  getFiltersForModule(module: string): NavigationFilter[] {
    return this.state.filters.filter(filter => this.isFilterRelevantForModule(filter, module));
  }

  // Check if a filter is relevant for a module
  private isFilterRelevantForModule(filter: NavigationFilter, module: string): boolean {
    const moduleFilterMap: Record<string, NavigationFilter['type'][]> = {
      'sections': ['workshop'],
      'families': ['workshop', 'family'],
      'products': ['workshop', 'family', 'product'],
      'features': ['workshop', 'family', 'product', 'gamma', 'feature'],
      'gammas': ['workshop', 'family', 'product', 'gamma'],
      'measurements': ['workshop', 'family', 'product', 'gamma', 'feature'],
      'users': ['workshop', 'group'],
      'groups': ['group']
    };

    return moduleFilterMap[module]?.includes(filter.type) || false;
  }

  // Load state from session storage
  loadFromStorage(): void {
    try {
      const stored = sessionStorage.getItem('navigationState');
      if (stored) {
        this.state = JSON.parse(stored);
        this.listeners.forEach(listener => listener(this.state));
      }
    } catch (error) {
      console.error('Failed to load navigation state:', error);
    }
  }

  // Common navigation patterns
  static readonly NAVIGATION_PATTERNS = {
    // Workshop → Families
    workshopToFamilies: (workshopId: number, workshopName: string) => ({
      module: 'families',
      filter: { type: 'workshop' as const, id: workshopId, name: workshopName },
      breadcrumb: { name: workshopName, id: workshopId }
    }),

    // Family → Products
    familyToProducts: (familyId: number, familyName: string, _workshopId?: number, _workshopName?: string) => ({
      module: 'products',
      filter: { type: 'family' as const, id: familyId, name: familyName },
      breadcrumb: { name: familyName, id: familyId }
    }),

    // Product → Routes/Gammas
    productToGammas: (productId: number, productName: string, _familyId?: number, _familyName?: string) => ({
      module: 'gammas',
      filter: { type: 'product' as const, id: productId, name: productName },
      breadcrumb: { name: productName, id: productId }
    }),

    // Gamma → Features
    gammaToFeatures: (gammaId: number, gammaName: string, _productId?: number, _productName?: string) => ({
      module: 'features',
      filter: { type: 'gamma' as const, id: gammaId, name: gammaName },
      breadcrumb: { name: gammaName, id: gammaId }
    }),

    // Feature → Measurements
    featureToMeasurements: (featureId: number, featureName: string, _gammaId?: number, _gammaName?: string) => ({
      module: 'measurements',
      filter: { type: 'feature' as const, id: featureId, name: featureName },
      breadcrumb: { name: featureName, id: featureId }
    }),

    // Workshop → Users
    workshopToUsers: (workshopId: number, workshopName: string) => ({
      module: 'users',
      filter: { type: 'workshop' as const, id: workshopId, name: workshopName },
      breadcrumb: { name: workshopName, id: workshopId }
    }),

    // Group → Users
    groupToUsers: (groupId: number, groupName: string) => ({
      module: 'users',
      filter: { type: 'group' as const, id: groupId, name: groupName },
      breadcrumb: { name: groupName, id: groupId }
    })
  };

  // Clear filters for a specific module
  clearFiltersForModule(module: string): void {
    this.state.filters = this.state.filters.filter(filter => filter.module !== module);
    sessionStorage.setItem('navigationState', JSON.stringify(this.state));
    this.listeners.forEach(listener => listener(this.state));
  }
}

// Export singleton instance
export const navigationService = new NavigationService();

// Initialize from storage on import
navigationService.loadFromStorage();
