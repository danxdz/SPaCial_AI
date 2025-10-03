import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { db } from '../../services/database';
import { PencilIcon, TrashIcon, PlusIcon, EyeIcon, Squares2X2Icon, ListBulletIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import RouteModal from './RouteModal';

interface Route {
  id: number;
  name: string;
  description?: string;
  product_id: number;
  workshop_id?: number;
  created_at: string;
  updated_at: string;
}

interface RouteFormData {
  name: string;
  description?: string;
  product_id: number;
  workshop_id?: number;
}

interface RoutesListProps {
  productId: number;
  productName: string;
  onRoutesChange?: () => void;
}

type ViewMode = 'list' | 'cards';

const RoutesList: React.FC<RoutesListProps> = ({
  productId,
  productName,
  onRoutesChange
}) => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadRoutes();
  }, [productId]);

  const loadRoutes = async () => {
    try {
      setLoading(true);
      const routesData = await db.queryAll(
        'SELECT * FROM routes WHERE product_id = ? ORDER BY name',
        [productId]
      );
      setRoutes(routesData);
    } catch (error) {
      console.error('Error loading routes:', error);
      toast.error('Failed to load routes');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoute = () => {
    setEditingRoute(null);
    setShowModal(true);
  };

  const handleEditRoute = (route: Route) => {
    setEditingRoute(route);
    setShowModal(true);
  };

  const handleSaveRoute = async (routeData: RouteFormData) => {
    try {
      if (editingRoute) {
        // Update existing route
        await db.execute(
          `UPDATE routes SET 
           name = ?, description = ?, workshop_id = ?, updated_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [
            routeData.name,
            routeData.description,
            routeData.workshop_id,
            editingRoute.id
          ]
        );
        toast.success('Route updated successfully');
      } else {
        // Create new route
        await db.execute(
          `INSERT INTO routes 
           (name, description, product_id, workshop_id) 
           VALUES (?, ?, ?, ?)`,
          [
            routeData.name,
            routeData.description,
            routeData.product_id,
            routeData.workshop_id
          ]
        );
        toast.success('Route added successfully');
      }

      await loadRoutes();
      onRoutesChange?.();
    } catch (error) {
      console.error('Error saving route:', error);
      toast.error('Failed to save route');
    }
  };

  const handleDeleteRoute = async (routeId: number) => {
    if (!confirm('Are you sure you want to delete this route?')) {
      return;
    }

    try {
      await db.execute('DELETE FROM routes WHERE id = ?', [routeId]);
      toast.success('Route deleted successfully');
      await loadRoutes();
      onRoutesChange?.();
    } catch (error) {
      console.error('Error deleting route:', error);
      toast.error('Failed to delete route');
    }
  };

  // Filter routes based on search term
  const filteredRoutes = routes.filter(route =>
    route.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (route.description && route.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Routes ({filteredRoutes.length}{searchTerm ? ` of ${routes.length}` : ''})
        </h3>
        <button
          onClick={handleAddRoute}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Route
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between space-x-4">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search routes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">View:</span>
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-2 text-sm font-medium rounded-l-md border ${
                viewMode === 'cards'
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              <Squares2X2Icon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                viewMode === 'list'
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              <ListBulletIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Routes Display */}
      {routes.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <EyeIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No routes defined for this product yet.</p>
          <p className="text-sm mt-1">Click "Add Route" to get started.</p>
        </div>
      ) : filteredRoutes.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <MagnifyingGlassIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No routes match your search criteria.</p>
          <p className="text-sm mt-1">Try adjusting your search terms.</p>
        </div>
      ) : viewMode === 'cards' ? (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRoutes.map((route) => (
            <div
              key={route.id}
              className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    {route.name}
                  </h4>
                  {route.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                      {route.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-1 ml-2">
                  <button
                    onClick={() => handleEditRoute(route)}
                    className="p-1 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                    title="Edit route"
                  >
                    <PencilIcon className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleDeleteRoute(route.id)}
                    className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Delete route"
                  >
                    <TrashIcon className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <div>Created: {new Date(route.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="space-y-3">
          {filteredRoutes.map((route) => (
            <div
              key={route.id}
              className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {route.name}
                      </h4>
                      {route.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {route.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>Created: {new Date(route.created_at).toLocaleDateString()}</span>
                        {route.workshop_id && (
                          <span>Workshop ID: {route.workshop_id}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleEditRoute(route)}
                    className="p-2 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                    title="Edit route"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteRoute(route.id)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Delete route"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Route Modal */}
      <RouteModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveRoute}
        route={editingRoute}
        productId={productId}
        productName={productName}
      />
    </div>
  );
};

export default RoutesList;

