import { useEffect, useState } from 'react';
import { db } from '../../services/database';
import { useUserStore } from '../../stores/useUserStore';
import { useI18nStore } from '../../stores/useI18nStore';
import { useNavigationHistory } from '../../services/navigationHistory';
import { navigationService } from '../../services/navigationService';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import GlobalSearch from '../ui/GlobalSearch';

interface DashboardStats {
  totalProducts: number;
  totalFamilies: number;
  totalFeatures: number;
  totalGammas: number;
  totalMeasurements: number;
  recentMeasurements: any[];
  outOfControlMeasurements: any[];
  myWorkshops: any[];
  myWorkstations: any[];
  myProducts: any[];
  pendingTasks: any[];
  alerts: any[];
}

interface DashboardProps {
  onNavigate: (module: string, id?: number) => void;
}

const Dashboard = ({ onNavigate }: DashboardProps) => {
  const { currentUser, hasRole } = useUserStore();
  const { canGoBack, goBack } = useNavigationHistory();
  const { t } = useI18nStore();
  
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalFamilies: 0,
    totalFeatures: 0,
    totalGammas: 0,
    totalMeasurements: 0,
    recentMeasurements: [],
    outOfControlMeasurements: [],
    myWorkshops: [],
    myWorkstations: [],
    myProducts: [],
    pendingTasks: [],
    alerts: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Database is already initialized globally by App.tsx

      // Base statistics (available to all users)
      const totalProducts = (await db.queryAll('SELECT COUNT(*) as count FROM products'))[0]?.count || 0;
      const totalFamilies = (await db.queryAll('SELECT COUNT(*) as count FROM families'))[0]?.count || 0;
      const totalFeatures = (await db.queryAll('SELECT COUNT(*) as count FROM features'))[0]?.count || 0;
      const totalGammas = (await db.queryAll('SELECT COUNT(*) as count FROM gammas'))[0]?.count || 0;
      const totalMeasurements = (await db.queryAll('SELECT COUNT(*) as count FROM measurements'))[0]?.count || 0;

      // Role-based data loading
      let recentMeasurements: any[] = [];
      let outOfControlMeasurements: any[] = [];
      let myWorkshops: any[] = [];
      let myWorkstations: any[] = [];
      let myProducts: any[] = [];
      let pendingTasks: any[] = [];
      let alerts: any[] = [];

      if (currentUser) {
        // Load user-specific data based on role
        if (hasRole('admin')) {
          // Admin sees everything
          recentMeasurements = await db.queryAll(`
            SELECT 
              m.id, m.measured_value, m.operator_id, m.timestamp, m.notes,
              f.name as feature_name, p.name as product_name, ws.name as workshop_name,
              u.username as operator
            FROM measurements m
            LEFT JOIN features f ON m.feature_id = f.id
            LEFT JOIN products p ON f.product_id = p.id
            LEFT JOIN workshops ws ON p.workshop_id = ws.id
            LEFT JOIN users u ON m.operator_id = u.id
            ORDER BY m.timestamp DESC LIMIT 10
          `);

          myWorkshops = await db.queryAll(`
            SELECT ws.*, COUNT(DISTINCT w.id) as workstation_count, COUNT(DISTINCT p.id) as product_count
            FROM workshops ws
            LEFT JOIN workstations w ON w.workshop_id = ws.id
            LEFT JOIN products p ON p.workshop_id = ws.id
            GROUP BY ws.id ORDER BY ws.name
          `);

        } else if (hasRole('method')) {
          // Method users see their assigned workshops and related data
          myWorkshops = await db.queryAll(`
            SELECT ws.*, COUNT(DISTINCT w.id) as workstation_count, COUNT(DISTINCT p.id) as product_count
            FROM workshops ws
            LEFT JOIN workshop_methods wm ON wm.workshop_id = ws.id
            LEFT JOIN workstations w ON w.workshop_id = ws.id
            LEFT JOIN products p ON p.workshop_id = ws.id
            WHERE wm.user_id = ?
            GROUP BY ws.id ORDER BY ws.name
          `, [currentUser.id]);

          if (myWorkshops.length > 0) {
            const workshopIds = myWorkshops.map(ws => ws.id);
            const placeholders = workshopIds.map(() => '?').join(',');
            
            recentMeasurements = await db.queryAll(`
              SELECT 
                m.id, m.measured_value, m.operator_id, m.timestamp, m.notes,
                f.name as feature_name, p.name as product_name, ws.name as workshop_name,
                u.username as operator
              FROM measurements m
              LEFT JOIN features f ON m.feature_id = f.id
              LEFT JOIN products p ON f.product_id = p.id
              LEFT JOIN workshops ws ON p.workshop_id = ws.id
              LEFT JOIN users u ON m.operator_id = u.id
              WHERE p.workshop_id IN (${placeholders})
              ORDER BY m.timestamp DESC LIMIT 10
            `, workshopIds);

            myProducts = await db.queryAll(`
              SELECT p.*, f.name as family_name, ws.name as workshop_name
              FROM products p
              LEFT JOIN families f ON p.family_id = f.id
              LEFT JOIN workshops ws ON p.workshop_id = ws.id
              WHERE p.workshop_id IN (${placeholders})
              ORDER BY p.name
            `, workshopIds);
          }

        } else if (hasRole('controle')) {
          // Quality control users see measurements and quality issues
          recentMeasurements = await db.queryAll(`
            SELECT 
              m.id, m.measured_value, m.operator_id, m.timestamp, m.notes,
              f.name as feature_name, p.name as product_name, ws.name as workshop_name,
              u.username as operator
            FROM measurements m
            LEFT JOIN features f ON m.feature_id = f.id
            LEFT JOIN products p ON f.product_id = p.id
            LEFT JOIN workshops ws ON p.workshop_id = ws.id
            LEFT JOIN users u ON m.operator_id = u.id
            ORDER BY m.timestamp DESC LIMIT 10
          `);

          // Find out-of-control measurements (simplified logic)
          outOfControlMeasurements = await db.queryAll(`
            SELECT 
              m.id, m.measured_value, m.operator_id, m.timestamp, m.notes,
              f.name as feature_name, p.name as product_name, ws.name as workshop_name,
              f.target_value, 
              (f.target_value + f.tolerance_plus) as upper_limit,
              (f.target_value - f.tolerance_minus) as lower_limit,
              u.username as operator
            FROM measurements m
            LEFT JOIN features f ON m.feature_id = f.id
            LEFT JOIN products p ON f.product_id = p.id
            LEFT JOIN workshops ws ON p.workshop_id = ws.id
            LEFT JOIN users u ON m.operator_id = u.id
            WHERE m.measured_value > (f.target_value + f.tolerance_plus) 
               OR m.measured_value < (f.target_value - f.tolerance_minus)
            ORDER BY m.timestamp DESC LIMIT 5
          `);

        } else if (hasRole('prod')) {
          // Production users see their workstation and recent measurements
          myWorkstations = await db.queryAll(`
            SELECT w.*, ws.name as workshop_name
            FROM workstations w
            LEFT JOIN workshops ws ON w.workshop_id = ws.id
            WHERE w.id = ?
          `, [currentUser.id]);

          if (myWorkstations.length > 0) {
            recentMeasurements = await db.queryAll(`
              SELECT 
                m.id, m.measured_value, m.operator_id, m.timestamp, m.notes,
                f.name as feature_name, p.name as product_name,
                u.username as operator
              FROM measurements m
              LEFT JOIN features f ON m.feature_id = f.id
              LEFT JOIN products p ON f.product_id = p.id
              LEFT JOIN users u ON m.operator_id = u.id
              WHERE p.workstation_id = ? AND m.operator_id = ?
              ORDER BY m.timestamp DESC LIMIT 10
            `, [currentUser.id, currentUser.username]);
          }
        }
      } else {
        // Non-logged in users see basic recent measurements
        recentMeasurements = await db.queryAll(`
          SELECT 
            m.id, m.measured_value, m.operator_id, m.timestamp, m.notes,
            f.name as feature_name, p.name as product_name,
            u.username as operator
          FROM measurements m
          LEFT JOIN features f ON m.feature_id = f.id
          LEFT JOIN products p ON f.product_id = p.id
          LEFT JOIN users u ON m.operator_id = u.id
          ORDER BY m.timestamp DESC LIMIT 5
        `);
      }

      setStats({
        totalProducts,
        totalFamilies,
        totalFeatures,
        totalGammas,
        totalMeasurements,
        recentMeasurements: Array.isArray(recentMeasurements) ? recentMeasurements : [],
        outOfControlMeasurements: Array.isArray(outOfControlMeasurements) ? outOfControlMeasurements : [],
        myWorkshops: Array.isArray(myWorkshops) ? myWorkshops : [],
        myWorkstations: Array.isArray(myWorkstations) ? myWorkstations : [],
        myProducts: Array.isArray(myProducts) ? myProducts : [],
        pendingTasks: Array.isArray(pendingTasks) ? pendingTasks : [],
        alerts: Array.isArray(alerts) ? alerts : []
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  // Get user-specific welcome message and title
  const getWelcomeMessage = () => {
    if (!currentUser) {
      return {
        title: t('dashboard.welcome.guest'),
        subtitle: t('dashboard.welcome.guestSubtitle')
      };
    }
    
    switch (currentUser.role) {
      case 'admin':
        return {
          title: t('dashboard.welcome.admin', { username: currentUser.username }),
          subtitle: t('dashboard.welcome.adminSubtitle')
        };
      case 'method':
        return {
          title: t('dashboard.welcome.method', { username: currentUser.username }),
          subtitle: t('dashboard.welcome.methodSubtitle')
        };
      case 'controle':
        return {
          title: t('dashboard.welcome.controle', { username: currentUser.username }),
          subtitle: t('dashboard.welcome.controleSubtitle')
        };
      case 'prod':
        return {
          title: t('dashboard.welcome.prod', { username: currentUser.username }),
          subtitle: t('dashboard.welcome.prodSubtitle')
        };
      default:
        return {
          title: t('dashboard.welcome.default'),
          subtitle: t('dashboard.welcome.defaultSubtitle')
        };
    }
  };

  const welcome = getWelcomeMessage();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{welcome.title}</h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">{welcome.subtitle}</p>
            {currentUser && (
              <div className="mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {currentUser.role.toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <GlobalSearch onNavigate={onNavigate} />
        </div>
      </div>

      {/* Role-based Dashboard Content */}
      <div className="space-y-8">
        
        {/* Admin Dashboard */}
        {hasRole('admin') && (
          <>
            {/* Admin Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.totalWorkshops')}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.myWorkshops.length}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.totalProducts')}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalProducts}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.totalMeasurements')}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalMeasurements}</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.qualityFeatures')}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalFeatures}</p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Ateliers Overview */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Ateliers Overview</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">All workshops and their status</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stats.myWorkshops.map((workshop) => (
                    <div key={workshop.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <h3 className="font-medium text-gray-900 dark:text-white">{workshop.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{workshop.description}</p>
                      <div className="mt-3 flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">{workshop.workstation_count} workstations</span>
                        <span className="text-gray-500 dark:text-gray-400">{workshop.product_count} products</span>
                      </div>
                      <button 
                        onClick={() => onNavigate('sections')}
                        className="mt-3 w-full text-left text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                      >
                        View Details →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Method User Dashboard */}
        {hasRole('method') && (
          <>
            {/* My Ateliers */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">My Ateliers</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Workshops under your management</p>
              </div>
              <div className="p-6">
                {stats.myWorkshops.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">No workshops assigned to you</p>
                    <button 
                      onClick={() => onNavigate('users')}
                      className="mt-4 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Contact admin for assignment
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stats.myWorkshops.map((workshop) => (
                      <div key={workshop.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                           onClick={() => onNavigate('sections')}>
                        <h3 className="font-medium text-gray-900 dark:text-white">{workshop.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{workshop.description}</p>
                        <div className="mt-3 flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">{workshop.workstation_count} workstations</span>
                          <span className="text-gray-500 dark:text-gray-400">{workshop.product_count} products</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* My Products */}
            {stats.myProducts.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">My Products</h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">Products in your workshops</p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats.myProducts.slice(0, 8).map((product) => (
                      <div key={product.id} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                        <h4 className="font-medium text-gray-900 dark:text-white text-sm">{product.name}</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{product.family_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{product.workshop_name}</p>
                      </div>
                    ))}
                  </div>
                  {stats.myProducts.length > 8 && (
                    <div className="mt-4 text-center">
                      <button 
                        onClick={() => onNavigate('products')}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                      >
                        View all {stats.myProducts.length} products →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Quality Control Dashboard */}
        {hasRole('controle') && (
          <>
            {/* Out of Control Measurements */}
            {stats.outOfControlMeasurements.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <svg className="h-6 w-6 text-red-600 dark:text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <h2 className="text-xl font-semibold text-red-800 dark:text-red-200">Quality Alerts</h2>
                </div>
                <p className="text-red-700 dark:text-red-300 mb-4">{stats.outOfControlMeasurements.length} measurements are out of control</p>
                <div className="space-y-3">
                  {stats.outOfControlMeasurements.slice(0, 3).map((measurement) => (
                    <div key={measurement.id} className="bg-white dark:bg-gray-800 p-3 rounded border border-red-200 dark:border-red-700">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{measurement.product_name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{measurement.feature_name}</p>
                          <p className="text-sm text-red-600 dark:text-red-400">Value: {measurement.measured_value} (Target: {measurement.target_value})</p>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(measurement.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <button 
                    onClick={() => onNavigate('measurements')}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                  >
                    View all quality issues →
                  </button>
                </div>
              </div>
            )}

            {/* Recent Measurements */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Measurements</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Latest quality control data</p>
              </div>
              <div className="p-6">
                {stats.recentMeasurements.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">No measurements available</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Feature</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Value</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Operator</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {stats.recentMeasurements.slice(0, 5).map((measurement) => (
                          <tr key={measurement.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{measurement.product_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{measurement.feature_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{measurement.measured_value}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{measurement.operator}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(measurement.timestamp).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Production User Dashboard */}
        {hasRole('prod') && (
          <>
            {/* My Workstation */}
            {stats.myWorkstations.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">My Workstation</h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">Your assigned workstation</p>
                </div>
                <div className="p-6">
                  {stats.myWorkstations.map((workstation) => (
                    <div key={workstation.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <h3 className="font-medium text-gray-900 dark:text-white">{workstation.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{workstation.description}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Location: {workstation.location}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Workshop: {workstation.workshop_name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Common tasks for production</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button 
                    onClick={() => onNavigate('measurements')}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg text-left transition-colors"
                  >
                    <div className="flex items-center">
                      <svg className="h-6 w-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <div>
                        <h3 className="font-medium">Add Measurement</h3>
                        <p className="text-sm opacity-90">Record new quality measurements</p>
                      </div>
                    </div>
                  </button>
                  
                  <button 
                    onClick={() => onNavigate('products')}
                    className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg text-left transition-colors"
                  >
                    <div className="flex items-center">
                      <svg className="h-6 w-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <div>
                        <h3 className="font-medium">View Products</h3>
                        <p className="text-sm opacity-90">Browse available products</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Guest/Non-logged in Dashboard */}
        {!currentUser && (
          <>
            {/* Welcome Message */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <svg className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h2 className="text-xl font-semibold text-blue-800 dark:text-blue-200">{t('dashboard.welcome.guest')}</h2>
              </div>
              <p className="text-blue-700 dark:text-blue-300 mb-4">
                {t('dashboard.welcome.guestSubtitle')}
              </p>
              <div className="flex space-x-4">
                <button 
                  onClick={() => onNavigate('measurements')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
{t('dashboard.viewMeasurements')}
                </button>
                <button 
                  onClick={() => onNavigate('users')}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
{t('dashboard.manageUsers')}
                </button>
              </div>
            </div>

            {/* Basic Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.totalProducts')}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalProducts}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.totalMeasurements')}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalMeasurements}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.qualityFeatures')}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalFeatures}</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
