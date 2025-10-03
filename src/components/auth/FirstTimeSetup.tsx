import { useState } from 'react';
import { db } from '../../services/database';
// import { encryption } from '../../services/encryption';
import { useUserStore } from '../../stores/useUserStore';
import toast from 'react-hot-toast';

const FirstTimeSetup = () => {
  const { setCurrentUser } = useUserStore();
  const [formData, setFormData] = useState({
    username: 'admin',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters long';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter';
    } else if (!/[a-z]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one lowercase letter';
    } else if (!/[0-9]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one number';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Database is initialized globally in App.tsx

      // Check if any users already exist
      const existingUsers = await db.queryAll('SELECT COUNT(*) as count FROM users');
      console.log('Existing users check:', existingUsers);
      if (existingUsers[0].count > 0) {
        setErrors({ general: 'Users already exist. This setup is only for first-time installation.' });
        setLoading(false);
        return;
      }

      // Create default groups first
      await db.execute(`
        INSERT OR IGNORE INTO groups (id, name, description, permissions_families, permissions_products, permissions_features, permissions_gammas, permissions_measurements, permissions_sections, permissions_users, permissions_database, permissions_storage, permissions_logs, created_at)
        VALUES 
        (1, 'Administrators', 'Full system access', 'admin', 'admin', 'admin', 'admin', 'admin', 'admin', 'admin', 'admin', 'admin', 'admin', CURRENT_TIMESTAMP),
        (2, 'Quality Control', 'Quality control and inspection', 'write', 'write', 'write', 'read', 'write', 'read', 'read', 'read', 'read', 'read', CURRENT_TIMESTAMP),
        (3, 'Production', 'Production operations', 'read', 'read', 'read', 'read', 'write', 'read', 'read', 'read', 'read', 'read', CURRENT_TIMESTAMP),
        (4, 'Methods', 'Manufacturing methods', 'write', 'write', 'write', 'write', 'read', 'write', 'read', 'read', 'read', 'read', CURRENT_TIMESTAMP)
      `);

      // Create the admin user
      console.log('Creating admin user:', formData.username);
      const insertResult = await db.createUser({
        username: formData.username,
        password: formData.password,
        role: 'admin',
        workstation_id: undefined,
        workshop_id: undefined,
        group_id: 1 // Assign to Administrators group
      });
      console.log('Admin user creation result:', insertResult);

      // Create default workshops and workstations
      await db.execute(`
        INSERT INTO workshops (name, description, created_at, updated_at)
        VALUES ('Assembly', 'Main assembly workshop', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      
      await db.execute(`
        INSERT INTO workshops (name, description, created_at, updated_at)
        VALUES ('Machining', 'Precision machining center', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);
      
      await db.execute(`
        INSERT INTO workshops (name, description, created_at, updated_at)
        VALUES ('Quality Control', 'Quality inspection area', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);

      // Get the actual workshop IDs that were created
      const workshops = await db.queryAll('SELECT id, name FROM workshops ORDER BY id');
      const assemblyWorkshop = workshops.find(w => w.name === 'Assembly');
      const machiningWorkshop = workshops.find(w => w.name === 'Machining');
      const qualityWorkshop = workshops.find(w => w.name === 'Quality Control');

      // Create workstations for each workshop
      if (assemblyWorkshop) {
        await db.execute(`
          INSERT INTO workstations (name, workshop_id, description, created_at, updated_at)
          VALUES 
          ('Assembly Station 1', ?, 'Primary assembly workstation', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
          ('Assembly Station 2', ?, 'Secondary assembly workstation', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [assemblyWorkshop.id, assemblyWorkshop.id]);
      }

      if (machiningWorkshop) {
        await db.execute(`
          INSERT INTO workstations (name, workshop_id, description, created_at, updated_at)
          VALUES 
          ('CNC Machine 1', ?, 'Computer numerical control machine', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
          ('CNC Machine 2', ?, 'Computer numerical control machine', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [machiningWorkshop.id, machiningWorkshop.id]);
      }

      if (qualityWorkshop) {
        await db.execute(`
          INSERT INTO workstations (name, workshop_id, description, created_at, updated_at)
          VALUES ('Inspection Station', ?, 'Quality inspection workstation', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [qualityWorkshop.id]);
      }

      // Get the first workstation for the admin user
      const workstations = await db.queryAll('SELECT id, name FROM workstations ORDER BY id LIMIT 1');
      const firstWorkstation = workstations[0];

      // Update the admin user with workshop and workstation assignment
      if (assemblyWorkshop && firstWorkstation) {
        await db.execute(`
          UPDATE users SET workshop_id = ?, workstation_id = ? WHERE username = ?
        `, [assemblyWorkshop.id, firstWorkstation.id, formData.username]);
      }

      // Database is automatically saved in Electron mode

      // Set the current user
      const newUser = {
        id: 1,
        username: formData.username,
        role: 'admin' as const,
        group_id: 1,
        group_name: 'Administrators',
        workstation_id: firstWorkstation?.id || null,
        workstation_name: firstWorkstation?.name || 'Assembly Station 1',
        workshop_id: assemblyWorkshop?.id || null,
        workshop_name: 'Assembly'
      };

      setCurrentUser(newUser);

      toast.success('Admin account created successfully! Welcome to SPC Dashboard.');
      
      // Verify the user was created
      const verifyUsers = await db.queryAll('SELECT COUNT(*) as count FROM users');
      console.log('Verification after admin creation:', verifyUsers);
      
      // Redirect to main app by triggering a custom event
      window.dispatchEvent(new CustomEvent('databaseUpdated'));
      // Also clear the hash to ensure clean state
      window.location.hash = '';

    } catch (error) {
      console.error('Setup error:', error);
      setErrors({ general: 'Failed to create admin account. Please try again.' });
      toast.error('Failed to create admin account');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 relative z-[9996]">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Welcome to SPC Dashboard
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Let's set up your admin account to get started
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {errors.general && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    {errors.general}
                  </h3>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Admin Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors.username ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                } placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm dark:bg-gray-700`}
                placeholder="Enter admin username"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.username}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Admin Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors.password ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                } placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm dark:bg-gray-700`}
                placeholder="Enter admin password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Password must be at least 8 characters with uppercase, lowercase, and number
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors.confirmPassword ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                } placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm dark:bg-gray-700`}
                placeholder="Confirm admin password"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Admin Account...
                </div>
              ) : (
                'Create Admin Account'
              )}
            </button>
          </div>
        </form>

        {/* Setup info */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
            First-Time Setup
          </h3>
          <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <p>• This setup creates your first admin account</p>
            <p>• You'll be able to create other users and registration codes</p>
            <p>• Default groups, workshops, and workstations will be created</p>
            <p>• You can customize everything after login</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FirstTimeSetup;
