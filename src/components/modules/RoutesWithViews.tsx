import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useI18nStore } from '../../stores/useI18nStore';
import { db } from '../../services/database';
import { useNavigationHistory } from '../../services/navigationHistory';
import { navigationService } from '../../services/navigationService';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import EnhancedTableWithFilters from '../ui/EnhancedTableWithFilters';
import RouteFeaturesList from '../ui/RouteFeaturesList';

interface Route {
  id: number;
  name: string;
  product_id: number;
  sequence_number: number;
  operation_name: string;
  workstation: string;
  estimated_time: number;
  workshop_id?: number;
  image_filename?: string;
  created_at: string;
  updated_at: string;
  product_name?: string;
  family_name?: string;
  workshop_name?: string;
  feature_count?: number;
}

interface Product {
  id: number;
  name: string;
}

interface Workshop {
  id: number;
  name: string;
}

interface Workstation {
  id: number;
  name: string;
  workshop_id: number;
}

interface RoutesWithViewsProps {
  onNavigateToFeatures?: (routeId: number) => void;
  onNavigateToMeasurements?: (routeId: number) => void;
}

type ViewMode = 'list' | 'cards';

const RoutesWithViews = ({}: RoutesWithViewsProps) => {
  const { t } = useI18nStore();
  const { canGoBack, goBack } = useNavigationHistory();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [workstations, setWorkstations] = useState<Workstation[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('routes-view-mode');
    return (saved as ViewMode) || 'cards';
  });
  const [showForm, setShowForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    product_id: '',
    sequence_number: '',
    operation_name: '',
    workstation: '',
    estimated_time: '',
    workshop_id: ''
  });
  const [selectedProductFilter, setSelectedProductFilter] = useState<number | null>(null);

  // Filter routes based on selected filters
  const filteredRoutes = routes.filter(route => {
    const productMatch = !selectedProductFilter || route.product_id === selectedProductFilter;
    return productMatch;
  });

  useEffect(() => {
    loadData();
  }, []);

  // Handle product filter from navigation
  useEffect(() => {
    const productFilter = sessionStorage.getItem('routesProductFilter');
    if (productFilter) {
      const productId = parseInt(productFilter);
      setSelectedProductFilter(productId);
      // Clear the filter after applying
      sessionStorage.removeItem('routesProductFilter');
    }
  }, []);

  const loadData = async () => {
    try {
      // Load products for dropdown
      const productsData = await db.queryAll('SELECT * FROM products ORDER BY name');
      setProducts(productsData);

      // Load workshops for dropdown
      const workshopsData = await db.queryAll('SELECT * FROM workshops ORDER BY name');
      setWorkshops(workshopsData);

      // Load workstations for dropdown
      const workstationsData = await db.queryAll('SELECT * FROM workstations ORDER BY name');
      setWorkstations(workstationsData);

      // Load routes (gammas) with product names, family info, workshop info, and feature counts
      const routesData = await db.queryAll(`
        SELECT g.*, p.name as product_name, f.name as family_name, w.name as workshop_name,
               COALESCE(feat_count.feature_count, 0) as feature_count
        FROM gammas g 
        LEFT JOIN products p ON g.product_id = p.id 
        LEFT JOIN families f ON p.family_id = f.id
        LEFT JOIN workshops w ON g.workshop_id = w.id
        LEFT JOIN (
          SELECT gamma_id, COUNT(*) as feature_count 
          FROM features 
          WHERE gamma_id IS NOT NULL
          GROUP BY gamma_id
        ) feat_count ON g.id = feat_count.gamma_id
        ORDER BY g.sequence_number, g.name
      `);
      setRoutes(routesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingRoute(null);
    setFormData({
      name: '',
      product_id: '',
      sequence_number: '',
      operation_name: '',
      workstation: '',
      estimated_time: '',
      workshop_id: ''
    });
    setShowForm(true);
  };

  const handleEdit = (route: Route) => {
    setEditingRoute(route);
    setFormData({
      name: route.name,
      product_id: route.product_id.toString(),
      sequence_number: route.sequence_number.toString(),
      operation_name: route.operation_name,
      workstation: route.workstation,
      estimated_time: route.estimated_time.toString(),
      workshop_id: route.workshop_id?.toString() || ''
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.name.trim()) {
        toast.error('Route name is required');
      return;
    }

      if (!formData.product_id) {
        toast.error('Product selection is required');
        return;
      }

      if (editingRoute) {
        // Update existing route
        await db.execute(
          `UPDATE gammas SET 
           name = ?, product_id = ?, sequence_number = ?, operation_name = ?, workstation = ?, estimated_time = ?, workshop_id = ?, updated_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [
            formData.name,
            parseInt(formData.product_id),
            parseInt(formData.sequence_number),
            formData.operation_name,
            formData.workstation,
            parseFloat(formData.estimated_time),
            formData.workshop_id ? parseInt(formData.workshop_id) : null,
            editingRoute.id
          ]
        );
        toast.success('Route updated successfully');
      } else {
        // Create new route
        await db.execute(
          `INSERT INTO gammas 
           (name, product_id, sequence_number, operation_name, workstation, estimated_time, workshop_id) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            formData.name,
            parseInt(formData.product_id),
            parseInt(formData.sequence_number),
            formData.operation_name,
            formData.workstation,
            parseFloat(formData.estimated_time),
            formData.workshop_id ? parseInt(formData.workshop_id) : null
          ]
        );
        toast.success('Route added successfully');
      }

      await loadData();
      setShowForm(false);
      setEditingRoute(null);
    } catch (error) {
      console.error('Error saving route:', error);
      toast.error('Failed to save route');
    }
  };

  const handleDelete = async (routeId: number) => {
    if (!confirm('Are you sure you want to delete this route?')) {
      return;
    }

    try {
      await db.execute('DELETE FROM gammas WHERE id = ?', [routeId]);
      toast.success('Route deleted successfully');
      await loadData();
    } catch (error) {
      console.error('Error deleting route:', error);
      toast.error('Failed to delete route');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      product_id: '',
      sequence_number: '',
      operation_name: '',
      workstation: '',
      estimated_time: '',
      workshop_id: ''
    });
    setShowForm(false);
    setEditingRoute(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('routes-view-mode', mode);
  };

  const handleDeleteRow = async (rowIndex: number) => {
    const route = filteredRoutes[rowIndex];
    if (route) {
      await handleDelete(route.id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (showForm) {
  return (
    <div className="p-8">
      {/* Header */}
        <div className="flex justify-between items-center mb-8">
        <div>
            <div className="flex items-center gap-4 mb-2">
              {canGoBack() && (
            <button
                  onClick={() => {
                    const previousModule = goBack();
                    if (previousModule) {
                      navigationService.navigateTo(previousModule);
                    }
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  Back
            </button>
          )}
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {editingRoute ? 'Edit Route' : 'Add New Route'}
              </h1>
        </div>
            <p className="text-gray-600 dark:text-gray-400">Manage manufacturing operations and sequences</p>
          </div>
        </div>

      {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Route Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter route name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Product *
                </label>
                <select
                  name="product_id"
                  value={formData.product_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="">Select a product</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Workshop
                </label>
                <select
                  name="workshop_id"
                  value={formData.workshop_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select a workshop (optional)</option>
                  {workshops.map(workshop => (
                    <option key={workshop.id} value={workshop.id}>
                      {workshop.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sequence Number *
                </label>
                <input
                  type="number"
                  step="10"
                  name="sequence_number"
                  value={formData.sequence_number}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter sequence number (step 10)"
                  required
                />
                {formData.sequence_number && (
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {(() => {
                      const seqNum = parseInt(formData.sequence_number);
                      const existingRoute = routes.find(r => 
                        r.sequence_number === seqNum && 
                        (!editingRoute || r.id !== editingRoute.id)
                      );
                      return existingRoute ? 
                        `⚠️ Sequence number ${seqNum} already used by "${existingRoute.name}"` : 
                        `✓ Sequence number ${seqNum} is available`;
                    })()}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Operation Name *
                </label>
                <input
                  type="text"
                  name="operation_name"
                  value={formData.operation_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter operation name"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Workstation *
                </label>
                <select
                  name="workstation"
                  value={formData.workstation}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="">Select a workstation</option>
                  {workstations.map(workstation => (
                    <option key={workstation.id} value={workstation.name}>
                      {workstation.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Estimated Time (minutes) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  name="estimated_time"
                  value={formData.estimated_time}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter estimated time"
                  required
                />
              </div>
            </div>

            {/* Features Management - Show when editing existing route or when product is selected for new route */}
            {(editingRoute || (formData.product_id && !editingRoute)) && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <RouteFeaturesList
                  routeId={editingRoute?.id || -1} // Use -1 for new routes
                  routeName={editingRoute?.name || 'New Route'}
                  productId={parseInt(formData.product_id) || undefined}
                  onFeaturesChange={() => {
                    // Optionally refresh data or show updated count
                    loadData();
                  }}
                  />
                </div>
              )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="btn btn-primary"
              >
                {editingRoute ? 'Update Route' : 'Add Route'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="flex items-center gap-4 mb-2">
            {canGoBack() && (
              <button
                onClick={() => {
                  const previousModule = goBack();
                  if (previousModule) {
                    navigationService.navigateTo(previousModule);
                  }
                }}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                Back
              </button>
            )}
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('nav.gammas')}</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Manage manufacturing operations and sequences</p>
        </div>
        <button
          onClick={handleAdd}
          className="btn btn-primary"
        >
          Add Route
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Product
            </label>
            <select
              value={selectedProductFilter || ''}
              onChange={(e) => setSelectedProductFilter(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Products</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSelectedProductFilter(null);
              }}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex justify-between items-center mb-6">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredRoutes.length} of {routes.length} routes
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">View:</span>
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => handleViewModeChange('cards')}
              className={`px-3 py-2 text-sm font-medium rounded-l-md border ${
                viewMode === 'cards'
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => handleViewModeChange('list')}
              className={`px-3 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                viewMode === 'list'
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Routes Display */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRoutes.map((route) => (
            <div
              key={route.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleEdit(route)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                handleEdit(route);
              }}
              title="Click to edit route"
            >
              {/* Route Image */}
              <div className="bg-gray-100 dark:bg-gray-700" style={{ aspectRatio: '16 / 9' }}>
                <div className="w-full h-48 flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800">
                  <svg className="w-24 h-24 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
              </div>

              {/* Route Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {route.name}
                </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                      {route.operation_name}
                    </p>
                  </div>
                </div>
                
                {/* Feature Count */}
                <div className="flex items-center justify-center mb-3">
                  <div className="bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 px-3 py-1 rounded-full text-sm font-medium">
                    {route.feature_count || 0} features
                  </div>
                </div>
                
                {/* Product & Sequence Info */}
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center justify-between">
                    <span>Product:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {route.product_name || 'Unknown'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Sequence:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {route.sequence_number}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Workstation:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {route.workstation}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Est. Time:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {route.estimated_time} min
                    </span>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(route.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(route);
                      }}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(route.id);
                      }}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EnhancedTableWithFilters
          data={filteredRoutes}
          columns={[
            { key: 'name', label: 'Name', sortable: true },
            { key: 'operation_name', label: 'Operation', sortable: true },
            { key: 'product_name', label: 'Product', sortable: true },
            { key: 'sequence_number', label: 'Sequence', sortable: true },
            { key: 'workstation', label: 'Workstation', sortable: true },
            { key: 'estimated_time', label: 'Est. Time', sortable: true },
            { key: 'feature_count', label: 'Features', sortable: true },
            { key: 'created_at', label: 'Created', sortable: true }
          ]}
          onEdit={() => {}}
          onDelete={handleDeleteRow}
          onAdd={() => setShowForm(true)}
          onRowClick={(_, rowData) => handleEdit(rowData)}
          loading={loading}
          emptyMessage="No routes found"
          className="table-zebra"
        />
      )}

      {/* Empty State */}
      {filteredRoutes.length === 0 && routes.length > 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 dark:text-gray-500 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.57" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No routes match your filters</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Try adjusting your filter criteria</p>
          <button
            onClick={() => {
              setSelectedProductFilter(null);
            }}
            className="btn btn-primary"
          >
            Clear Filters
          </button>
        </div>
      )}

      {routes.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 dark:text-gray-500 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.57" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No routes created yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Get started by creating your first route</p>
            <button
            onClick={handleAdd}
              className="btn btn-primary"
            >
              Add First Route
            </button>
        </div>
      )}
    </div>
  );
};

export default RoutesWithViews;