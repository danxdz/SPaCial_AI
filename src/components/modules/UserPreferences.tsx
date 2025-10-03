import React, { useState, useEffect } from 'react';
import { useUserStore } from '../../stores/useUserStore';
import { db } from '../../services/database';
// import { logger } from '../../services/logger';
import { toast } from 'react-hot-toast';
import { 
  HeartIcon, 
  Cog6ToothIcon,
  BuildingOfficeIcon,
  ComputerDesktopIcon,
  MapIcon,
  StarIcon
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

interface UserPreference {
  id: number;
  user_id: number;
  preference_type: string;
  preference_value: number;
  created_at: string;
}

const UserPreferences: React.FC = () => {
  const { currentUser } = useUserStore();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [workstations, setWorkstations] = useState<Workstation[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [favorites, setFavorites] = useState<UserPreference[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      console.log('Loading preferences data for user:', currentUser.id);

      // Load workshops
      const workshopsData = await db.queryAll('SELECT * FROM workshops ORDER BY name');
      console.log('Loaded workshops:', workshopsData.length);
      setWorkshops(workshopsData);

      // Load workstations
      const workstationsData = await db.queryAll(`
        SELECT w.*, ws.name as workshop_name 
        FROM workstations w 
        LEFT JOIN workshops ws ON w.workshop_id = ws.id 
        ORDER BY w.name
      `);
      console.log('Loaded workstations:', workstationsData.length);
      setWorkstations(workstationsData);

      // Load routes
      const routesData = await db.queryAll(`
        SELECT r.*, p.name as product_name 
        FROM routes r 
        LEFT JOIN products p ON r.product_id = p.id 
        ORDER BY r.name
      `);
      console.log('Loaded routes:', routesData.length);
      setRoutes(routesData);

      // Check if user_preferences table exists
      try {
        await db.queryAll('SELECT COUNT(*) as count FROM user_preferences LIMIT 1');
        console.log('user_preferences table exists');
      } catch (tableError) {
        console.error('user_preferences table does not exist:', tableError);
        toast.error('Database table missing. Please contact administrator.');
        return;
      }

      // Load user favorites
      const favoritesData = await db.queryAll(
        'SELECT * FROM user_preferences WHERE user_id = ? ORDER BY created_at DESC',
        [currentUser.id]
      );
      console.log('Loaded favorites:', favoritesData.length, favoritesData);
      setFavorites(favoritesData);

    } catch (error) {
      console.error('Error loading preferences data:', error);
      toast.error(`Failed to load preferences data: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const isFavorite = (type: string, value: number): boolean => {
    return favorites.some(fav => fav.preference_type === type && fav.preference_value === value);
  };

  const toggleFavorite = async (type: string, value: number, name: string) => {
    if (!currentUser) return;

    try {
      console.log('Toggling favorite:', { type, value, name, userId: currentUser.id });
      const isCurrentlyFavorite = isFavorite(type, value);

      if (isCurrentlyFavorite) {
        // Remove from favorites
        console.log('Removing from favorites');
        await db.execute(
          'DELETE FROM user_preferences WHERE user_id = ? AND preference_type = ? AND preference_value = ?',
          [currentUser.id, type, value]
        );
        toast.success(`Removed ${name} from favorites`);
      } else {
        // Add to favorites
        console.log('Adding to favorites');
        await db.execute(
          'INSERT INTO user_preferences (user_id, preference_type, preference_value) VALUES (?, ?, ?)',
          [currentUser.id, type, value]
        );
        toast.success(`Added ${name} to favorites`);
      }

      // Reload favorites
      console.log('Reloading favorites data');
      await loadData();

    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error(`Failed to update favorites: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const getFavoriteItems = (type: string) => {
    return favorites
      .filter(fav => fav.preference_type === type)
      .map(fav => {
        const value = fav.preference_value;
        switch (type) {
          case 'favorite_workshop':
            return workshops.find(w => w.id === value);
          case 'favorite_workstation':
            return workstations.find(w => w.id === value);
          case 'favorite_route':
            return routes.find(r => r.id === value);
          default:
            return null;
        }
      })
      .filter(Boolean);
  };

  if (!currentUser) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500 dark:text-gray-400">
          Please log in to manage your preferences.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <Cog6ToothIcon className="h-6 w-6 mr-3 text-blue-600" />
          My Preferences
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your favorite workshops, workstations, and routes for quick access.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Favorite Workshops */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <BuildingOfficeIcon className="h-5 w-5 mr-2 text-green-600" />
              Favorite Workshops
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workshops.map((workshop) => (
                <div key={workshop.id} className="relative p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <button
                    onClick={() => toggleFavorite('favorite_workshop', workshop.id, workshop.name)}
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                    title={isFavorite('favorite_workshop', workshop.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {isFavorite('favorite_workshop', workshop.id) ? (
                      <HeartIcon className="h-5 w-5 text-red-500 fill-current" />
                    ) : (
                      <HeartIcon className="h-5 w-5" />
                    )}
                  </button>
                  
                  <div className="pr-8">
                    <h3 className="font-medium text-gray-900 dark:text-white">{workshop.name}</h3>
                    {workshop.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{workshop.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Favorite Workstations */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <ComputerDesktopIcon className="h-5 w-5 mr-2 text-blue-600" />
              Favorite Workstations
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workstations.map((workstation) => (
                <div key={workstation.id} className="relative p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <button
                    onClick={() => toggleFavorite('favorite_workstation', workstation.id, workstation.name)}
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                    title={isFavorite('favorite_workstation', workstation.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {isFavorite('favorite_workstation', workstation.id) ? (
                      <HeartIcon className="h-5 w-5 text-red-500 fill-current" />
                    ) : (
                      <HeartIcon className="h-5 w-5" />
                    )}
                  </button>
                  
                  <div className="pr-8">
                    <h3 className="font-medium text-gray-900 dark:text-white">{workstation.name}</h3>
                    {workstation.workshop_name && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{workstation.workshop_name}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Favorite Routes */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <MapIcon className="h-5 w-5 mr-2 text-purple-600" />
              Favorite Routes
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {routes.map((route) => (
                <div key={route.id} className="relative p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <button
                    onClick={() => toggleFavorite('favorite_route', route.id, route.name)}
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                    title={isFavorite('favorite_route', route.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {isFavorite('favorite_route', route.id) ? (
                      <HeartIcon className="h-5 w-5 text-red-500 fill-current" />
                    ) : (
                      <HeartIcon className="h-5 w-5" />
                    )}
                  </button>
                  
                  <div className="pr-8">
                    <h3 className="font-medium text-gray-900 dark:text-white">{route.name}</h3>
                    {route.product_name && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{route.product_name}</p>
                    )}
                    {route.description && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{route.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Current Favorites Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <StarIcon className="h-5 w-5 mr-2 text-yellow-600" />
              My Favorites Summary
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {getFavoriteItems('favorite_workshop').length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Favorite Workshops</div>
              </div>
              
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {getFavoriteItems('favorite_workstation').length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Favorite Workstations</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {getFavoriteItems('favorite_route').length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Favorite Routes</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPreferences;
