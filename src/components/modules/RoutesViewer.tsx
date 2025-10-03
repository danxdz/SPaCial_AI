import { useEffect, useState } from 'react';
import { db } from '../../services/database';
import toast from 'react-hot-toast';
import { useUserStore } from '../../stores/useUserStore';

interface Route {
  id: number;
  name: string;
  product_id: number;
  sequence_number: number;
  operation_name: string;
  workstation: string;
  estimated_time: number;
  product_name?: string;
  family_name?: string;
  workshop_name?: string;
}

interface UserRoute {
  id?: number;
  name: string;
  product_id: number;
  sequence_number: number;
  operation_name: string;
  workstation: string;
  estimated_time: number;
  user_id?: number;
  is_saved: boolean;
  product_name?: string;
  family_name?: string;
  workshop_name?: string;
}

const RoutesViewer = () => {
  const { currentUser } = useUserStore();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [userRoutes, setUserRoutes] = useState<UserRoute[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<UserRoute | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  
  const [formData, setFormData] = useState({
    name: '',
    product_id: '',
    sequence_number: '',
    operation_name: '',
    workstation: '',
    estimated_time: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Database is initialized globally in App.tsx

      // Load all routes with product and family info
      const routesData = await db.queryAll(`
        SELECT g.*, p.name as product_name, f.name as family_name, ws.name as workshop_name
        FROM gammas g
        LEFT JOIN products p ON g.product_id = p.id
        LEFT JOIN families f ON p.family_id = f.id
        LEFT JOIN workshops ws ON p.workshop_id = ws.id
        ORDER BY g.product_id, g.sequence_number
      `);
      setRoutes(routesData);

      // Load products for dropdown
      const productsData = await db.queryAll(`
        SELECT p.*, f.name as family_name, ws.name as workshop_name
        FROM products p
        LEFT JOIN families f ON p.family_id = f.id
        LEFT JOIN workshops ws ON p.workshop_id = ws.id
        ORDER BY p.name
      `);
      setProducts(productsData);

      // Load user's saved routes if logged in
      if (currentUser) {
        const userRoutesData = await db.queryAll(`
          SELECT ur.*, p.name as product_name, f.name as family_name, ws.name as workshop_name
          FROM user_routes ur
          LEFT JOIN products p ON ur.product_id = p.id
          LEFT JOIN families f ON p.family_id = f.id
          LEFT JOIN workshops ws ON p.workshop_id = ws.id
          WHERE ur.user_id = ?
          ORDER BY ur.product_id, ur.sequence_number
        `, [currentUser.id]);
        setUserRoutes(userRoutesData);
      }

    } catch (error) {
      console.error('Error loading routes data:', error);
      toast.error('Failed to load routes data');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      product_id: '',
      sequence_number: '',
      operation_name: '',
      workstation: '',
      estimated_time: ''
    });
    setEditingRoute(null);
    setShowForm(false);
  };

  const handleEdit = (route: Route | UserRoute) => {
    setEditingRoute(route as UserRoute);
    setFormData({
      name: route.name,
      product_id: route.product_id.toString(),
      sequence_number: route.sequence_number.toString(),
      operation_name: route.operation_name,
      workstation: route.workstation,
      estimated_time: route.estimated_time.toString()
    });
    setShowForm(true);
  };

  const handleSaveRoute = async (route: Route | UserRoute) => {
    if (!currentUser) {
      toast.error('Please log in to save routes');
      return;
    }

    try {
      // Check if route already exists for this user
      const existingRoute = await db.queryAll(`
        SELECT id FROM user_routes 
        WHERE user_id = ? AND product_id = ? AND sequence_number = ? AND operation_name = ?
      `, [currentUser.id, route.product_id, route.sequence_number, route.operation_name]);

      if (existingRoute.length > 0) {
        toast.error('This route is already saved');
        return;
      }

      // Save the route
      await db.execute(`
        INSERT INTO user_routes (name, product_id, sequence_number, operation_name, workstation, estimated_time, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [route.name, route.product_id, route.sequence_number, route.operation_name, route.workstation, route.estimated_time, currentUser.id]);

      toast.success('Route saved successfully');
      loadData(); // Reload data to show updated list
    } catch (error) {
      console.error('Error saving route:', error);
      toast.error('Failed to save route');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast.error('Please log in to create routes');
      return;
    }

    if (!formData.name.trim() || !formData.product_id || !formData.operation_name.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingRoute) {
        // Update existing route
        await db.execute(`
          UPDATE user_routes 
          SET name = ?, product_id = ?, sequence_number = ?, operation_name = ?, workstation = ?, estimated_time = ?
          WHERE id = ? AND user_id = ?
        `, [
          formData.name,
          parseInt(formData.product_id),
          parseInt(formData.sequence_number),
          formData.operation_name,
          formData.workstation,
          parseFloat(formData.estimated_time),
          editingRoute.id,
          currentUser.id
        ]);
        toast.success('Route updated successfully');
      } else {
        // Create new route
        await db.execute(`
          INSERT INTO user_routes (name, product_id, sequence_number, operation_name, workstation, estimated_time, user_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          formData.name,
          parseInt(formData.product_id),
          parseInt(formData.sequence_number),
          formData.operation_name,
          formData.workstation,
          parseFloat(formData.estimated_time),
          currentUser.id
        ]);
        toast.success('Route created successfully');
      }
      
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving route:', error);
      toast.error('Failed to save route');
    }
  };

  const handleDelete = async (route: Route | UserRoute) => {
    if (!currentUser || !('id' in route) || !route.id) return;
    
    if (!confirm('Are you sure you want to delete this route?')) return;

    try {
      await db.execute('DELETE FROM user_routes WHERE id = ? AND user_id = ?', [route.id, currentUser.id]);
      toast.success('Route deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting route:', error);
      toast.error('Failed to delete route');
    }
  };

  // Filter routes by user's workstation if they have one
  const getFilteredRoutes = () => {
    if (!currentUser?.workstation_id) return routes;
    
    // For now, we'll filter by workstation name since we don't have workstation_id in routes
    // In a real implementation, you'd want to join with workstations table
    return routes.filter(route => 
      route.workstation.includes(currentUser.username) || 
      route.workstation.includes('WS-ELEC') || // Default filter for demo
      route.workstation.includes('WS-MECH')
    );
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Production Routes</h1>
            <p className="text-gray-600 dark:text-gray-400">
              {currentUser ? `Welcome, ${currentUser.username}` : 'Browse and save production routes'}
            </p>
          </div>
          {currentUser && (
            <button
              onClick={() => setShowForm(true)}
              className="btn btn-primary"
            >
              Add My Route
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      {currentUser && (
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('all')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'all'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                All Routes
              </button>
              <button
                onClick={() => setActiveTab('my')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'my'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                My Saved Routes ({userRoutes.length})
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Routes List */}
      <div className="space-y-4">
        {(activeTab === 'all' ? getFilteredRoutes() : userRoutes).map((route) => (
          <div key={`${route.id}-${route.sequence_number}`} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-4 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {route.name} - Step {route.sequence_number}
                  </h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {route.estimated_time} min
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Operation:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{route.operation_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Product:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{route.product_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Workstation:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{route.workstation}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Workshop:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{route.workshop_name}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2 ml-4">
                {activeTab === 'all' && currentUser && (
                  <button
                    onClick={() => handleSaveRoute(route)}
                    className="btn btn-secondary text-sm"
                  >
                    Save Route
                  </button>
                )}
                {activeTab === 'my' && currentUser && (
                  <>
                    <button
                      onClick={() => handleEdit(route)}
                      className="btn btn-secondary text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(route)}
                      className="btn btn-danger text-sm"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {(activeTab === 'all' ? getFilteredRoutes() : userRoutes).length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 dark:text-gray-500 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {activeTab === 'all' ? 'No routes found' : 'No saved routes'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {activeTab === 'all' 
              ? 'Try adjusting your filters or check back later.' 
              : 'Start by saving some routes from the "All Routes" tab.'
            }
          </p>
          {activeTab === 'my' && (
            <button
              onClick={() => setActiveTab('all')}
              className="btn btn-primary"
            >
              Browse All Routes
            </button>
          )}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editingRoute ? 'Edit Route' : 'Add My Route'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label block mb-2">Route Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input w-full"
                  required
                />
              </div>

              <div>
                <label className="label block mb-2">Product *</label>
                <select
                  value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  className="input w-full"
                  required
                >
                  <option value="">Select a product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.family_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label block mb-2">Sequence Number *</label>
                <input
                  type="number"
                  value={formData.sequence_number}
                  onChange={(e) => setFormData({ ...formData, sequence_number: e.target.value })}
                  className="input w-full"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="label block mb-2">Operation Name *</label>
                <input
                  type="text"
                  value={formData.operation_name}
                  onChange={(e) => setFormData({ ...formData, operation_name: e.target.value })}
                  className="input w-full"
                  required
                />
              </div>

              <div>
                <label className="label block mb-2">Workstation</label>
                <input
                  type="text"
                  value={formData.workstation}
                  onChange={(e) => setFormData({ ...formData, workstation: e.target.value })}
                  className="input w-full"
                  placeholder="e.g., WS-ELEC-01"
                />
              </div>

              <div>
                <label className="label block mb-2">Estimated Time (minutes)</label>
                <input
                  type="number"
                  value={formData.estimated_time}
                  onChange={(e) => setFormData({ ...formData, estimated_time: e.target.value })}
                  className="input w-full"
                  min="0"
                  step="0.1"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button type="button" onClick={resetForm} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingRoute ? 'Update' : 'Create'} Route
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutesViewer;
