import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useI18nStore } from '../../stores/useI18nStore';
import { useUserStore } from '../../stores/useUserStore';
import { db } from '../../services/database';
import { logger } from '../../services/logger';
import { 
  PlusIcon,
  // QrCodeIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CheckCircleIcon,
  // ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface Product {
  id: number;
  name: string;
  family_id: number;
  family_name?: string;
}

interface Feature {
  id: number;
  name: string;
  product_id: number;
  specification_type: string;
  target_value: number;
  tolerance_plus: number;
  tolerance_minus: number;
  unit: string;
}

interface Gamma {
  id: number;
  name: string;
  product_id: number;
  sequence_number: number;
  operation_name: string;
  workstation: string;
}

interface MeasurementTemplate {
  id: string;
  name: string;
  product_id: number;
  gamma_id: number;
  features: number[];
  workstation: string;
}

const ProductionMeasurements = () => {
  const { t } = useI18nStore();
  const { currentUser } = useUserStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [gammas, setGammas] = useState<Gamma[]>([]);
  const [templates, setTemplates] = useState<MeasurementTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedGamma, setSelectedGamma] = useState<Gamma | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<MeasurementTemplate | null>(null);
  const [measurements, setMeasurements] = useState<Record<number, string>>({});
  const [operator, setOperator] = useState(currentUser?.username || '');
  const [notes, setNotes] = useState('');
  
  // UI state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [recentMeasurements, setRecentMeasurements] = useState<any[]>([]);

  useEffect(() => {
    loadData();
    loadRecentMeasurements();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      loadProductData();
    }
  }, [selectedProduct]);

  useEffect(() => {
    if (selectedTemplate) {
      loadTemplateData();
    }
  }, [selectedTemplate]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Database is initialized globally in App.tsx
      
      // Load products filtered by operator's workshop and workstation
      let productsQuery = `
        SELECT p.*, f.name as family_name 
        FROM products p 
        LEFT JOIN families f ON p.family_id = f.id 
      `;
      
      const queryParams: any[] = [];
      
      // Filter by operator's selected workshop and workstation if available
      if (currentUser?.selected_workshop_id && currentUser?.selected_workstation_id) {
        productsQuery += ` WHERE p.workshop_id = ? AND p.workstation_id = ?`;
        queryParams.push(currentUser.selected_workshop_id, currentUser.selected_workstation_id);
      }
      
      productsQuery += ` ORDER BY p.name`;
      
      const productsData = await db.queryAll(productsQuery, queryParams);
      setProducts(productsData);

      // Load routes filtered by operator's workshop
      let routesQuery = `
        SELECT r.*, p.name as product_name 
        FROM routes r 
        LEFT JOIN products p ON r.product_id = p.id 
      `;
      
      const routesParams: any[] = [];
      
      if (currentUser?.selected_workshop_id) {
        routesQuery += ` WHERE r.workshop_id = ?`;
        routesParams.push(currentUser.selected_workshop_id);
      }
      
      routesQuery += ` ORDER BY r.name`;
      
      const routesData = await db.queryAll(routesQuery, routesParams);
      setRoutes(routesData);

      // Load measurement templates (stored in localStorage for now)
      loadTemplates();
      
    } catch (error) {
      console.error('Error loading data:', error);
      logger.error('ui', 'Failed to load production measurement data', { error });
      toast.error(t('production.measurements.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const loadProductData = async () => {
    if (!selectedProduct) return;
    
    try {
      // Load features for selected product
      const featuresData = await db.queryAll(`
        SELECT * FROM features WHERE product_id = ? ORDER BY name
      `, [selectedProduct.id]);
      setFeatures(featuresData);

      // Load gammas for selected product
      const gammasData = await db.queryAll(`
        SELECT * FROM gammas WHERE product_id = ? ORDER BY sequence_number
      `, [selectedProduct.id]);
      setGammas(gammasData);
      
    } catch (error) {
      console.error('Error loading product data:', error);
      logger.error('ui', 'Failed to load product data', { error, productId: selectedProduct.id });
    }
  };

  const loadTemplates = () => {
    try {
      const stored = localStorage.getItem('spc-measurement-templates');
      if (stored) {
        setTemplates(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const saveTemplates = (newTemplates: MeasurementTemplate[]) => {
    try {
      localStorage.setItem('spc-measurement-templates', JSON.stringify(newTemplates));
      setTemplates(newTemplates);
    } catch (error) {
      console.error('Error saving templates:', error);
    }
  };

  const loadTemplateData = () => {
    if (!selectedTemplate) return;
    
    setSelectedProduct(products.find(p => p.id === selectedTemplate.product_id) || null);
    setSelectedGamma(gammas.find(g => g.id === selectedTemplate.gamma_id) || null);
    
    // Clear previous measurements
    setMeasurements({});
  };

  const loadRecentMeasurements = async () => {
    try {
      const recentData = await db.queryAll(`
        SELECT 
          m.*,
          f.name as feature_name,
          p.name as product_name,
          g.name as gamma_name
        FROM measurements m
        LEFT JOIN features f ON m.feature_id = f.id
        LEFT JOIN products p ON f.product_id = p.id
        LEFT JOIN gammas g ON m.gamma_id = g.id
        ORDER BY m.timestamp DESC
        LIMIT 10
      `);
      setRecentMeasurements(recentData);
    } catch (error) {
      console.error('Error loading recent measurements:', error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedProduct || !selectedGamma) {
      toast.error(t('production.measurements.selectProductRoute'));
      return;
    }

    const featureIds = Object.keys(measurements).map(Number);
    if (featureIds.length === 0) {
      toast.error(t('production.measurements.enterMeasurement'));
      return;
    }

    try {
      setLoading(true);
      
      // Submit all measurements
      for (const featureId of featureIds) {
        const value = measurements[featureId];
        if (!value || isNaN(Number(value))) {
          toast.error(t('production.measurements.invalidMeasurement', { featureId }));
          continue;
        }

        await db.execute(
          'INSERT INTO measurements (feature_id, route_id, measured_value, operator_id, notes, timestamp) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
          [featureId, selectedGamma.id, Number(value), currentUser?.id, notes]
        );
      }

      // Database automatically saved in Electron mode
      
      // Log user action
      logger.logUserAction(
        'Add measurements',
        'ProductionMeasurements',
        {
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          gammaId: selectedGamma.id,
          gammaName: selectedGamma.name,
          featureCount: featureIds.length,
          operator
        },
        currentUser?.id?.toString(),
        currentUser?.role
      );

      toast.success(t('production.measurements.recordSuccess', { count: featureIds.length }));
      
      // Reset form
      setMeasurements({});
      setNotes('');
      loadRecentMeasurements();
      
    } catch (error) {
      console.error('Error submitting measurements:', error);
      logger.error('database', 'Failed to submit measurements', { error });
      toast.error(t('production.measurements.recordError'));
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = () => {
    if (!selectedProduct || !selectedGamma || Object.keys(measurements).length === 0) {
      toast.error(t('production.measurements.createTemplateError'));
      return;
    }

    const templateName = prompt(t('production.measurements.enterTemplateName'));
    if (!templateName) return;

    const newTemplate: MeasurementTemplate = {
      id: `template-${Date.now()}`,
      name: templateName,
      product_id: selectedProduct.id,
      gamma_id: selectedGamma.id,
      features: Object.keys(measurements).map(Number),
      workstation: selectedGamma.workstation
    };

    const newTemplates = [...templates, newTemplate];
    saveTemplates(newTemplates);
    toast.success(t('production.measurements.templateCreated'));
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.family_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // const filteredTemplates = templates.filter(template =>
  //   template.name.toLowerCase().includes(searchTerm.toLowerCase())
  // );

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('production.measurements.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('production.measurements.subtitle')}</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowQuickAdd(!showQuickAdd)}
            className="btn btn-primary flex items-center"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            {t('production.measurements.quickAdd')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Selection */}
        <div className="space-y-6">
          {/* Search */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('production.measurements.searchProducts')}</h3>
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('production.measurements.searchPlaceholder')}
                className="input w-full pl-10"
              />
            </div>
          </div>

          {/* Routes */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('production.measurements.availableRoutes')}</h3>
            {routes.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">{t('production.measurements.noRoutesAvailable')}</p>
            ) : (
              <div className="space-y-2">
                {routes.map((route) => (
                  <button
                    key={route.id}
                    onClick={() => {
                      // Find the product for this route and select it
                      const product = products.find(p => p.id === route.product_id);
                      if (product) {
                        setSelectedProduct(product);
                      }
                    }}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="font-medium text-gray-900 dark:text-white">{route.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {route.product_name}
                    </div>
                    {route.description && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {route.description}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('production.measurements.selectProduct')}</h3>
            {filteredProducts.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">{t('production.measurements.noProductsFound')}</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => {
                      setSelectedProduct(product);
                      setSelectedTemplate(null);
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedProduct?.id === product.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="font-medium text-gray-900 dark:text-white">{product.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{product.family_name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Middle Column - Route Selection */}
        <div className="space-y-6">
          {selectedProduct && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('production.measurements.selectRoute', { product: selectedProduct.name })}
              </h3>
              {gammas.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">{t('production.measurements.noRoutesForProduct')}</p>
              ) : (
                <div className="space-y-2">
                  {gammas.map((gamma) => (
                    <button
                      key={gamma.id}
                      onClick={() => setSelectedGamma(gamma)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedGamma?.id === gamma.id
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="font-medium text-gray-900 dark:text-white">{gamma.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {t('production.measurements.step', { number: gamma.sequence_number })} • {gamma.workstation}
                      </div>
                      {gamma.operation_name && (
                        <div className="text-sm text-gray-600 dark:text-gray-300">{gamma.operation_name}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Recent Measurements */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <ClockIcon className="h-5 w-5 mr-2" />
              {t('production.measurements.recentMeasurements')}
            </h3>
            {recentMeasurements.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">{t('production.measurements.noRecentMeasurements')}</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recentMeasurements.slice(0, 5).map((measurement) => (
                  <div key={measurement.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{measurement.feature_name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {measurement.product_name} • {measurement.gamma_name}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900 dark:text-white">{measurement.measured_value}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(measurement.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Measurements */}
        <div className="space-y-6">
          {selectedProduct && selectedGamma && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('production.measurements.measurements')}</h3>
                <button
                  onClick={createTemplate}
                  className="btn btn-secondary text-sm"
                >
                  {t('production.measurements.saveAsTemplate')}
                </button>
              </div>
              
              {features.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">{t('production.measurements.noFeaturesAvailable')}</p>
              ) : (
                <div className="space-y-4">
                  {features.map((feature) => (
                    <div key={feature.id} className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {feature.name}
                        <span className="text-gray-500 dark:text-gray-400 ml-2">
                          ({feature.target_value} ±{feature.tolerance_plus}/{feature.tolerance_minus} {feature.unit})
                        </span>
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="number"
                          step="0.001"
                          value={measurements[feature.id] || ''}
                          onChange={(e) => setMeasurements(prev => ({
                            ...prev,
                            [feature.id]: e.target.value
                          }))}
                          placeholder={t('production.measurements.enterValue')}
                          className="input flex-1"
                        />
                        <div className="flex items-center">
                          {measurements[feature.id] && (
                            <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Operator and Notes */}
              <div className="mt-6 space-y-4">
                <div>
                  <label className="label block mb-2">{t('production.measurements.operator')}</label>
                  <input
                    type="text"
                    value={operator}
                    onChange={(e) => setOperator(e.target.value)}
                    className="input w-full"
                    placeholder={t('production.measurements.enterOperatorName')}
                  />
                </div>
                <div>
                  <label className="label block mb-2">{t('production.measurements.notesOptional')}</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="input w-full"
                    placeholder={t('production.measurements.notesPlaceholder')}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={loading || Object.keys(measurements).length === 0}
                className="w-full btn btn-primary mt-6 flex items-center justify-center"
              >
                {loading ? (
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ClipboardDocumentListIcon className="h-4 w-4 mr-2" />
                )}
                {loading ? t('production.measurements.recording') : t('production.measurements.recordMeasurements', { count: Object.keys(measurements).length })}
              </button>
            </div>
          )}

          {/* Quick Add Panel */}
          {showQuickAdd && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-4">{t('production.measurements.quickAddTips')}</h3>
              <div className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  {t('production.measurements.tip1')}
                </div>
                <div className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  {t('production.measurements.tip2')}
                </div>
                <div className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  {t('production.measurements.tip3')}
                </div>
                <div className="flex items-center">
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  {t('production.measurements.tip4')}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductionMeasurements;
