import { useEffect, useState } from 'react';
import { db } from '../../services/database';
import { encryption } from '../../services/encryption';
import toast from 'react-hot-toast';
import { useNavigationHistory } from '../../services/navigationHistory';
import { navigationService } from '../../services/navigationService';
import { useI18nStore } from '../../stores/useI18nStore';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import ScrollableSelect from '../ui/ScrollableSelect';

interface User {
  id: number;
  username: string;
  role: string;
  group_id: number;
  group_name?: string;
  workstation_id: number;
  workstation_name?: string;
  workshop_id: number;
  workshop_name?: string;
  created_at: string;
  updated_at: string;
}

const Users = () => {
  const { canGoBack, goBack } = useNavigationHistory();
  const { t } = useI18nStore();
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [passwordOptionalForProd, setPasswordOptionalForProd] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    group_id: ''
  });

  useEffect(() => {
    console.log('Users component mounted');
    loadUsers();
    loadGroups();
    loadSystemSettings();
  }, []);

  const loadUsers = async () => {
    try {
      // Database is initialized globally in App.tsx
      const usersData = await db.queryAll(`
        SELECT u.*, g.name as group_name, w.name as workstation_name, ws.name as workshop_name
        FROM users u
        LEFT JOIN groups g ON u.group_id = g.id
        LEFT JOIN workstations w ON u.workstation_id = w.id
        LEFT JOIN workshops ws ON u.workshop_id = ws.id
        ORDER BY u.username
      `);
      
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const groupsData = await db.queryAll('SELECT * FROM groups ORDER BY name');
      console.log('Groups loaded:', groupsData);
      console.log('Available groups:', groupsData.map(g => ({ id: g.id, name: g.name })));
      setGroups(groupsData);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const loadSystemSettings = async () => {
    try {
      const setting = await db.queryAll(
        "SELECT setting_value FROM system_settings WHERE setting_key = 'password_optional_for_production'"
      );
      const value = setting[0]?.setting_value === 'true';
      console.log('System settings loaded:', { setting, value });
      
      // If setting doesn't exist or is false, enable it for production users
      if (!value) {
        console.log('Enabling password optional for production users');
        await db.execute(
          "UPDATE system_settings SET setting_value = 'true' WHERE setting_key = 'password_optional_for_production'"
        );
        setPasswordOptionalForProd(true);
      } else {
        setPasswordOptionalForProd(value);
      }
    } catch (error) {
      console.error('Error loading system settings:', error);
    }
  };

  // Helper function to get role from group ID
  const getRoleFromGroupId = (groupId: string): string => {
    const groupIdNum = parseInt(groupId);
    switch (groupIdNum) {
      case 1: return 'admin';  // Administrators = Admin
      case 2: return 'controle'; // Quality Control = Quality Control
      case 3: return 'prod'; // Production = Production
      case 4: return 'method'; // Methods = Methods
      default: return 'user';
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted!', formData);
    
    if (!formData.username.trim()) {
      toast.error('Username is required');
      return;
    }

    if (!formData.group_id) {
      toast.error('Group selection is required');
      return;
    }

    // Check password requirement
    const role = getRoleFromGroupId(formData.group_id);
    const isProduction = role === 'prod';
    const passwordRequired = !editingUser && !(isProduction && passwordOptionalForProd);
    
    console.log('Form validation:', {
      groupId: formData.group_id,
      role,
      isProduction,
      passwordOptionalForProd,
      passwordRequired,
      passwordProvided: !!formData.password.trim()
    });
    
    if (passwordRequired && !formData.password.trim()) {
      toast.error('Password is required for this user type');
      return;
    }

    try {
      if (editingUser) {
        // Update existing user
        let sql = 'UPDATE users SET username = ?, role = ?, group_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        let params = [formData.username, role, formData.group_id, editingUser.id];
        
        // Only update password if provided
        if (formData.password.trim()) {
          const hashedPassword = await encryption.hashPassword(formData.password);
          sql = 'UPDATE users SET username = ?, password_hash = ?, role = ?, group_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
          params = [formData.username, hashedPassword, role, formData.group_id, editingUser.id];
        }
        
        await db.execute(sql, params);
        toast.success('User updated successfully');
      } else {
        // Create new user
        const hashedPassword = await encryption.hashPassword(formData.password);
        await db.execute(
          'INSERT INTO users (username, password_hash, role, group_id) VALUES (?, ?, ?, ?)',
          [formData.username, hashedPassword, role, formData.group_id]
        );
        toast.success('User created successfully');
      }

      // Save to localStorage
      // Database automatically saved in Electron mode
      
      // Reset form and reload data
      resetForm();
      loadUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error('Failed to save user');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      group_id: user.group_id?.toString() || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await db.execute('DELETE FROM users WHERE id = ?', [id]);
      // Database automatically saved in Electron mode
      toast.success('User deleted successfully');
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const resetForm = () => {
    setFormData({ username: '', password: '', group_id: '' });
    setEditingUser(null);
    setShowForm(false);
  };

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
        <div className="flex items-center">
          {canGoBack() && (
            <button
              onClick={() => {
                const previousModule = goBack();
                if (previousModule) {
                  navigationService.navigateTo(previousModule);
                }
              }}
              className="mr-4 p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              title="Go back"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('users.title')}</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage system users and permissions</p>
          </div>
        </div>
        <button
          onClick={() => {
            console.log('Add User button clicked');
            setShowForm(true);
          }}
          className="btn btn-primary"
        >
          {t('users.addUser')}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editingUser ? 'Edit User' : 'Add New User'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Groups - First field */}
              <div>
                <label className="label block mb-2">
                  Group *
                </label>
                <ScrollableSelect
                  value={formData.group_id}
                  onChange={(e) => {
                    const selectedGroupId = e.target.value;
                    const selectedGroup = groups.find(g => g.id.toString() === selectedGroupId);
                    const role = getRoleFromGroupId(selectedGroupId);
                    const isProduction = role === 'prod';
                    console.log('Group changed:', {
                      groupId: selectedGroupId,
                      groupName: selectedGroup?.name,
                      role,
                      isProduction,
                      passwordOptional: isProduction && passwordOptionalForProd
                    });
                    setFormData({ ...formData, group_id: selectedGroupId });
                  }}
                  className="input w-full"
                  placeholder="Select group"
                >
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </ScrollableSelect>
              </div>

              <div>
                <label className="label block mb-2">
                  Username *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="input w-full"
                  placeholder="Enter username"
                />
              </div>

              
              <div>
                <label className="label block mb-2">
                  Password {
                    editingUser 
                      ? '(leave blank to keep current)' 
                      : (getRoleFromGroupId(formData.group_id) === 'prod' && passwordOptionalForProd) 
                        ? '(optional for production users)' 
                        : '*'
                  }
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input w-full"
                  placeholder={
                    getRoleFromGroupId(formData.group_id) === 'prod' && passwordOptionalForProd 
                      ? "Enter password (optional)" 
                      : "Enter password"
                  }
                />
              </div>

              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  {editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
        {users.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 mb-4">No users found</p>
            <button
              onClick={() => setShowForm(true)}
              className="btn btn-primary"
            >
              Create First User
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {user.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        user.role === 'controle' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        user.role === 'method' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                        user.role === 'prod' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="text-red-600 hover:text-red-700 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Users;
