import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useI18nStore } from '../../stores/useI18nStore';
// import { useUserStore } from '../../stores/useUserStore';
import { db } from '../../services/database';
import { 
  MagnifyingGlassIcon, 
  XMarkIcon,
  FolderIcon,
  CubeIcon,
  CogIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

interface SearchResult {
  id: number;
  type: 'family' | 'product' | 'route' | 'feature' | 'measurement';
  title: string;
  subtitle: string;
  description?: string;
  module: string;
  icon: React.ComponentType<any>;
}

interface GlobalSearchProps {
  onNavigate: (module: string, id?: number) => void;
}

const GlobalSearch = ({ onNavigate }: GlobalSearchProps) => {
  const { t } = useI18nStore();
  // const { currentUser } = useUserStore();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when search opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          setIsOpen(false);
          break;
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          event.preventDefault();
          if (results[selectedIndex]) {
            handleResultClick(results[selectedIndex]);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Global keyboard shortcut (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const searchAllModules = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      // Database is initialized globally in App.tsx
      const allResults: SearchResult[] = [];

      // Search Families
      const families = await db.queryAll(`
        SELECT f.*, 
               COUNT(p.id) as product_count
        FROM families f 
        LEFT JOIN products p ON f.id = p.family_id 
        WHERE f.name LIKE ? OR f.description LIKE ?
        GROUP BY f.id
        ORDER BY f.name
      `, [`%${searchQuery}%`, `%${searchQuery}%`]);

      families.forEach((family: any) => {
        allResults.push({
          id: family.id,
          type: 'family',
          title: family.name,
          subtitle: `${family.product_count} products`,
          description: family.description,
          module: 'families',
          icon: FolderIcon
        });
      });

      // Search Products
      const products = await db.queryAll(`
        SELECT p.*, f.name as family_name
        FROM products p 
        LEFT JOIN families f ON p.family_id = f.id
        WHERE p.name LIKE ? OR p.description LIKE ? OR f.name LIKE ?
        ORDER BY p.name
      `, [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`]);

      products.forEach((product: any) => {
        allResults.push({
          id: product.id,
          type: 'product',
          title: product.name,
          subtitle: product.family_name ? `Family: ${product.family_name}` : 'No family',
          description: product.description,
          module: 'products',
          icon: CubeIcon
        });
      });

      // Search Routes (Gammas)
      const routes = await db.queryAll(`
        SELECT g.*, p.name as product_name, f.name as family_name
        FROM gammas g 
        LEFT JOIN products p ON g.product_id = p.id 
        LEFT JOIN families f ON p.family_id = f.id
        WHERE g.name LIKE ? OR g.operation_name LIKE ? OR g.workstation LIKE ? OR p.name LIKE ?
        ORDER BY g.sequence_number, g.name
      `, [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`]);

      routes.forEach((route: any) => {
        allResults.push({
          id: route.id,
          type: 'route',
          title: route.name,
          subtitle: `${route.product_name} - ${route.operation_name}`,
          description: `Workstation: ${route.workstation} | Est. Time: ${route.estimated_time}min`,
          module: 'gammas',
          icon: CogIcon
        });
      });

      // Search Features
      const features = await db.queryAll(`
        SELECT f.*, p.name as product_name, fam.name as family_name
        FROM features f 
        LEFT JOIN products p ON f.product_id = p.id 
        LEFT JOIN families fam ON p.family_id = fam.id
        WHERE f.name LIKE ? OR f.description LIKE ? OR p.name LIKE ?
        ORDER BY f.name
      `, [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`]);

      features.forEach((feature: any) => {
        allResults.push({
          id: feature.id,
          type: 'feature',
          title: feature.name,
          subtitle: `${feature.product_name} - ${feature.specification_type}`,
          description: `Target: ${feature.target_value} ±${feature.tolerance_plus}/${feature.tolerance_minus} ${feature.unit || ''}`,
          module: 'features',
          icon: ChartBarIcon
        });
      });

      // Search Measurements (recent ones)
      const measurements = await db.queryAll(`
        SELECT m.*, f.name as feature_name, p.name as product_name, g.name as route_name, u.username as operator
        FROM measurements m 
        LEFT JOIN features f ON m.feature_id = f.id 
        LEFT JOIN products p ON f.product_id = p.id
        LEFT JOIN gammas g ON m.gamma_id = g.id
        LEFT JOIN users u ON m.operator_id = u.id
        WHERE f.name LIKE ? OR p.name LIKE ? OR g.name LIKE ? OR u.username LIKE ?
        ORDER BY m.timestamp DESC
        LIMIT 20
      `, [`%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`]);

      measurements.forEach((measurement: any) => {
        allResults.push({
          id: measurement.id,
          type: 'measurement',
          title: `${measurement.feature_name} - ${measurement.measured_value}`,
          subtitle: `${measurement.product_name} | Route: ${measurement.route_name}`,
          description: `Operator: ${measurement.operator} | ${new Date(measurement.timestamp).toLocaleDateString()}`,
          module: 'measurements',
          icon: ClipboardDocumentListIcon
        });
      });

      setResults(allResults.slice(0, 10)); // Limit to 10 results
      setSelectedIndex(0);
    } catch (error) {
      console.error('Error searching:', error);
      toast.error(t('ui.search.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    const timeoutId = setTimeout(() => {
      searchAllModules(value);
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  };

  const handleResultClick = (result: SearchResult) => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    onNavigate(result.module, result.id);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'family': return 'text-blue-600 dark:text-blue-400';
      case 'product': return 'text-green-600 dark:text-green-400';
      case 'route': return 'text-purple-600 dark:text-purple-400';
      case 'feature': return 'text-orange-600 dark:text-orange-400';
      case 'measurement': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'family': return t('ui.search.types.family');
      case 'product': return t('ui.search.types.product');
      case 'route': return t('ui.search.types.route');
      case 'feature': return t('ui.search.types.feature');
      case 'measurement': return t('ui.search.types.measurement');
      default: return t('ui.search.types.item');
    }
  };

  return (
    <div className="relative" ref={searchRef}>
      {/* Search Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:shadow-md transition-shadow text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
      >
        <MagnifyingGlassIcon className="h-5 w-5" />
        <span className="hidden sm:inline">{t('ui.search.everything')}</span>
        <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">⌘K</span>
      </button>

      {/* Search Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-20 z-[9990]">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4">
            {/* Search Input */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder={t('ui.search.placeholder')}
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Search Results */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">{t('ui.search.searching')}...</p>
                </div>
              ) : results.length === 0 && query ? (
                <div className="p-8 text-center">
                  <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">{t('ui.search.noResultsFor', { query })}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">{t('ui.search.tryDifferentKeywords')}</p>
                </div>
              ) : results.length === 0 ? (
                <div className="p-8 text-center">
                  <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">{t('ui.search.startTyping')}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">{t('ui.search.searchAllModules')}</p>
                </div>
              ) : (
                <div className="py-2">
                  {results.map((result, index) => {
                    const IconComponent = result.icon;
                    return (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleResultClick(result)}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                          index === selectedIndex ? 'bg-gray-50 dark:bg-gray-700' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <IconComponent className={`h-5 w-5 mt-0.5 ${getTypeColor(result.type)}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {result.title}
                              </p>
                              <span className={`text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-600 ${getTypeColor(result.type)}`}>
                                {getTypeLabel(result.type)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                              {result.subtitle}
                            </p>
                            {result.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-500 truncate mt-1">
                                {result.description}
                              </p>
                            )}
                          </div>
                          <ArrowRightIcon className="h-4 w-4 text-gray-400 mt-1" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-b-lg">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center space-x-4">
                  <span>{t('ui.search.navigate')}</span>
                  <span>{t('ui.search.select')}</span>
                  <span>{t('ui.search.close')}</span>
                </div>
                <span>{t('ui.search.openShortcut')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
