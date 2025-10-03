import { useState, useEffect } from 'react';
import { useUserStore } from '../../stores/useUserStore';
import { db } from '../../services/database';
import toast from 'react-hot-toast';

interface Route {
  id: number;
  name: string;
  description?: string;
  product_id: number;
  workshop_id: number;
  product_name?: string;
}

interface RouteSelectionProps {
  onStart: () => void;
  onBackToMain?: () => void;
}

const RouteSelection = ({ onStart, onBackToMain }: RouteSelectionProps) => {
  const { currentUser } = useUserStore();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.selected_workshop_id && currentUser?.selected_workstation_id) {
      loadRoutes();
    }
  }, [currentUser?.selected_workshop_id, currentUser?.selected_workstation_id]);

  const loadRoutes = async () => {
    try {
      setLoading(true);
      const routesData = await db.queryAll(`
        SELECT r.id, r.name, r.description, r.product_id, r.workshop_id, p.name as product_name
        FROM routes r
        LEFT JOIN products p ON r.product_id = p.id
        WHERE r.workshop_id = ? AND p.workstation_id = ?
        ORDER BY r.name
      `, [currentUser?.selected_workshop_id, currentUser?.selected_workstation_id]);
      setRoutes(routesData);
    } catch (error) {
      console.error('Error loading routes:', error);
      toast.error('Failed to load routes');
    } finally {
      setLoading(false);
    }
  };

  const handleRouteSelect = (routeId: number) => {
    setSelectedRouteId(routeId);
  };

  const handleStart = () => {
    if (!selectedRouteId) {
      toast.error('Please select a route');
      return;
    }
    
    // Store selected route in session/localStorage for the measurements page
    localStorage.setItem('selectedRouteId', selectedRouteId.toString());
    onStart();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Select Your Route
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Choose the route you want to work on
          </p>
        </div>

        <div className="space-y-4">
          {routes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No routes available for your workstation
              </p>
              {onBackToMain && (
                <button
                  onClick={onBackToMain}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-medium transition-colors"
                >
                  Back to Main
                </button>
              )}
            </div>
          ) : (
            routes.map((route) => (
              <div
                key={route.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedRouteId === route.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
                onClick={() => handleRouteSelect(route.id)}
              >
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 ${
                    selectedRouteId === route.id
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {selectedRouteId === route.id && (
                      <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {route.name}
                    </h3>
                    {route.product_name && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Product: {route.product_name}
                      </p>
                    )}
                    {route.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {route.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {routes.length > 0 && (
          <div className="flex justify-between">
            {onBackToMain && (
              <button
                onClick={onBackToMain}
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-medium transition-colors"
              >
                Back to Main
              </button>
            )}
            <button
              onClick={handleStart}
              disabled={!selectedRouteId}
              className={`px-6 py-2 rounded-md font-medium ${
                selectedRouteId
                  ? 'bg-primary-600 hover:bg-primary-700 text-white'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
            >
              Start Work
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RouteSelection;
