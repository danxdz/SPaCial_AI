import React, { useState, useEffect } from 'react';
import { useUserStore } from '../../stores/useUserStore';
import { useI18nStore } from '../../stores/useI18nStore';
import { db } from '../../services/database';
// import { logger } from '../../services/logger';
import { toast } from 'react-hot-toast';
import { 
  BuildingOfficeIcon,
  ComputerDesktopIcon,
  MapIcon,
  ChartBarIcon,
  ClockIcon,
  UserIcon,
  StarIcon,
  ArrowRightIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

interface Workshop {
  id: number;
  name: string;
  description?: string;
}

interface Workstation {
  id: number;
  name: string;
  workshop_id: number;
  workshop_name?: string;
}

interface Route {
  id: number;
  name: string;
  description?: string;
  product_id: number;
  workshop_id: number;
  product_name?: string;
}

// interface UserPreference {
//   id: number;
//   user_id: number;
//   preference_type: string;
//   preference_value: number;
//   created_at: string;
// }

interface RecentMeasurement {
  id: number;
  feature_id: number;
  route_id: number;
  measured_value: number;
  timestamp: string;
  notes?: string;
  route_name?: string;
  product_name?: string;
}

const ProductionDashboard: React.FC = () => {
  const { currentUser } = useUserStore();
  const { t } = useI18nStore();
  const [favoriteWorkshops, setFavoriteWorkshops] = useState<Workshop[]>([]);
  const [favoriteWorkstations, setFavoriteWorkstations] = useState<Workstation[]>([]);
  const [favoriteRoutes, setFavoriteRoutes] = useState<Route[]>([]);
  const [recentMeasurements, setRecentMeasurements] = useState<RecentMeasurement[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadDashboardData();
    }
  }, [currentUser]);

  const loadDashboardData = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);

      // Load favorite workshops
      const favoriteWorkshopsData = await db.queryAll(`
        SELECT w.* FROM workshops w
        INNER JOIN user_preferences up ON w.id = up.preference_value
        WHERE up.user_id = ? AND up.preference_type = 'favorite_workshop'
        ORDER BY up.created_at DESC
        LIMIT 6
      `, [currentUser.id]);
      setFavoriteWorkshops(favoriteWorkshopsData);

      // Load favorite workstations
      const favoriteWorkstationsData = await db.queryAll(`
        SELECT ws.*, w.name as workshop_name FROM workstations ws
        INNER JOIN user_preferences up ON ws.id = up.preference_value
        LEFT JOIN workshops w ON ws.workshop_id = w.id
        WHERE up.user_id = ? AND up.preference_type = 'favorite_workstation'
        ORDER BY up.created_at DESC
        LIMIT 6
      `, [currentUser.id]);
      setFavoriteWorkstations(favoriteWorkstationsData);

      // Load favorite routes
      const favoriteRoutesData = await db.queryAll(`
        SELECT r.*, p.name as product_name FROM routes r
        INNER JOIN user_preferences up ON r.id = up.preference_value
        LEFT JOIN products p ON r.product_id = p.id
        WHERE up.user_id = ? AND up.preference_type = 'favorite_route'
        ORDER BY up.created_at DESC
        LIMIT 6
      `, [currentUser.id]);
      setFavoriteRoutes(favoriteRoutesData);

      // Load recent measurements
      const recentMeasurementsData = await db.queryAll(`
        SELECT m.*, r.name as route_name, p.name as product_name FROM measurements m
        LEFT JOIN routes r ON m.route_id = r.id
        LEFT JOIN products p ON m.product_id = p.id
        WHERE m.operator_id = ?
        ORDER BY m.timestamp DESC
        LIMIT 10
      `, [currentUser.id]);
      setRecentMeasurements(recentMeasurementsData);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error(t('production.dashboard.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickStart = (route: Route) => {
    // Navigate to measurements with this route pre-selected
    toast.success(t('production.dashboard.startRoute', { route: route.name }));
    // TODO: Implement navigation to measurements module with route pre-selected
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!currentUser) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500 dark:text-gray-400">
          {t('production.dashboard.loginRequired')}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <ChartBarIcon className="h-6 w-6 mr-3 text-blue-600" />
          {t('production.dashboard.welcome', { username: currentUser.username })}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t('production.dashboard.subtitle')}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <BuildingOfficeIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {favoriteWorkshops.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{t('production.dashboard.favoriteWorkshops')}</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <ComputerDesktopIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {favoriteWorkstations.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{t('production.dashboard.favoriteWorkstations')}</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <MapIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {favoriteRoutes.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{t('production.dashboard.favoriteRoutes')}</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                  <ClockIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {recentMeasurements.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{t('production.dashboard.recentMeasurements')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Favorite Routes - Quick Start */}
          {favoriteRoutes.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <StarIcon className="h-5 w-5 mr-2 text-yellow-600" />
                {t('production.dashboard.quickStart')}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favoriteRoutes.map((route) => (
                  <div key={route.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white">{route.name}</h3>
                        {route.product_name && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{route.product_name}</p>
                        )}
                        {route.description && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{route.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleQuickStart(route)}
                        className="ml-2 p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title={t('production.dashboard.startWork')}
                      >
                        <PlayIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Measurements */}
          {recentMeasurements.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <ClockIcon className="h-5 w-5 mr-2 text-gray-600" />
                {t('production.dashboard.recentMeasurements')}
              </h2>
              
              <div className="space-y-3">
                {recentMeasurements.slice(0, 5).map((measurement) => (
                  <div key={measurement.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                        <UserIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {measurement.route_name || t('production.dashboard.unknownRoute')}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {t('production.dashboard.value')}: {measurement.measured_value} | {formatDate(measurement.timestamp)}
                        </div>
                      </div>
                    </div>
                    {measurement.notes && (
                      <div className="text-xs text-gray-400 dark:text-gray-500 max-w-xs truncate">
                        {measurement.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {favoriteWorkshops.length === 0 && favoriteWorkstations.length === 0 && favoriteRoutes.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
              <StarIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {t('production.dashboard.noFavorites')}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {t('production.dashboard.noFavoritesDescription')}
              </p>
              <button
                onClick={() => {
                  // Navigate to User Preferences
                  toast.success(t('production.dashboard.navigatePreferences'));
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <StarIcon className="h-4 w-4 mr-2" />
                {t('production.dashboard.manageFavorites')}
                <ArrowRightIcon className="h-4 w-4 ml-2" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductionDashboard;
