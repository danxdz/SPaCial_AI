import { useEffect, useState } from 'react';
import { db } from '../../services/database';
import toast from 'react-hot-toast';
import { useNavigationHistory } from '../../services/navigationHistory';
import { navigationService } from '../../services/navigationService';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

interface Group {
  id: number;
  name: string;
  description: string;
  permissions_families: string;
  permissions_products: string;
  permissions_features: string;
  permissions_gammas: string;
  permissions_measurements: string;
  permissions_sections: string;
  permissions_users: string;
  permissions_database: string;
  permissions_storage: string;
  permissions_logs: string;
  user_count?: number;
}

const Groups = () => {
  const { canGoBack, goBack } = useNavigationHistory();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions_families: 'read',
    permissions_products: 'read',
    permissions_features: 'read',
    permissions_gammas: 'read',
    permissions_measurements: 'read',
    permissions_sections: 'read',
    permissions_users: 'none',
    permissions_database: 'none',
    permissions_storage: 'none',
    permissions_logs: 'none'
  });

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      // Database is initialized globally in App.tsx

      const groupsData = await db.queryAll(`
        SELECT g.*, COUNT(u.id) as user_count
        FROM groups g
        LEFT JOIN users u ON u.group_id = g.id
        GROUP BY g.id
        ORDER BY g.name
      `);
      setGroups(groupsData);
    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      permissions_families: 'read',
      permissions_products: 'read',
      permissions_features: 'read',
      permissions_gammas: 'read',
      permissions_measurements: 'read',
      permissions_sections: 'read',
      permissions_users: 'none',
      permissions_database: 'none',
      permissions_storage: 'none',
      permissions_logs: 'none'
    });
    setEditingGroup(null);
    setShowForm(false);
  };

  const handleEdit = (group: Group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description,
      permissions_families: group.permissions_families,
      permissions_products: group.permissions_products,
      permissions_features: group.permissions_features,
      permissions_gammas: group.permissions_gammas,
      permissions_measurements: group.permissions_measurements,
      permissions_sections: group.permissions_sections,
      permissions_users: group.permissions_users,
      permissions_database: group.permissions_database,
      permissions_storage: group.permissions_storage,
      permissions_logs: group.permissions_logs
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Group name is required');
      return;
    }

    try {
      if (editingGroup) {
        // Update existing group
        await db.execute(`
          UPDATE groups 
          SET name = ?, description = ?, permissions_families = ?, permissions_products = ?, 
              permissions_features = ?, permissions_gammas = ?, permissions_measurements = ?, 
              permissions_sections = ?, permissions_users = ?, permissions_database = ?, 
              permissions_storage = ?, permissions_logs = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [
          formData.name, formData.description, formData.permissions_families, formData.permissions_products,
          formData.permissions_features, formData.permissions_gammas, formData.permissions_measurements,
          formData.permissions_sections, formData.permissions_users, formData.permissions_database,
          formData.permissions_storage, formData.permissions_logs, editingGroup.id
        ]);
        toast.success('Group updated successfully');
      } else {
        // Create new group
        await db.execute(`
          INSERT INTO groups (name, description, permissions_families, permissions_products, 
                             permissions_features, permissions_gammas, permissions_measurements, 
                             permissions_sections, permissions_users, permissions_database, 
                             permissions_storage, permissions_logs)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          formData.name, formData.description, formData.permissions_families, formData.permissions_products,
          formData.permissions_features, formData.permissions_gammas, formData.permissions_measurements,
          formData.permissions_sections, formData.permissions_users, formData.permissions_database,
          formData.permissions_storage, formData.permissions_logs
        ]);
        toast.success('Group created successfully');
      }
      
      resetForm();
      loadGroups();
    } catch (error) {
      console.error('Error saving group:', error);
      toast.error('Failed to save group');
    }
  };

  const handleDelete = async (group: Group) => {
    if (!confirm(`Are you sure you want to delete the group "${group.name}"? This will affect all users in this group.`)) {
      return;
    }

    try {
      // First, remove group assignment from users
      await db.execute('UPDATE users SET group_id = NULL WHERE group_id = ?', [group.id]);
      
      // Then delete the group
      await db.execute('DELETE FROM groups WHERE id = ?', [group.id]);
      
      toast.success('Group deleted successfully');
      loadGroups();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Failed to delete group');
    }
  };

  const getPermissionBadgeColor = (permission: string) => {
    switch (permission) {
      case 'all': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'write': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'read': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'none': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Groupes d'Utilisateurs</h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Gestion des groupes et permissions
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary"
          >
            Nouveau Groupe
          </button>
        </div>
      </div>

      {/* Groups List */}
      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center space-x-4 mb-3">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{group.name}</h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {group.user_count || 0} utilisateur(s)
                  </span>
                </div>
                
                {group.description && (
                  <p className="text-gray-600 dark:text-gray-400 mb-4">{group.description}</p>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Familles</div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPermissionBadgeColor(group.permissions_families)}`}>
                      {group.permissions_families}
                    </span>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Produits</div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPermissionBadgeColor(group.permissions_products)}`}>
                      {group.permissions_products}
                    </span>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Caractéristiques</div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPermissionBadgeColor(group.permissions_features)}`}>
                      {group.permissions_features}
                    </span>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gammes</div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPermissionBadgeColor(group.permissions_gammas)}`}>
                      {group.permissions_gammas}
                    </span>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Mesures</div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPermissionBadgeColor(group.permissions_measurements)}`}>
                      {group.permissions_measurements}
                    </span>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sections</div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPermissionBadgeColor(group.permissions_sections)}`}>
                      {group.permissions_sections}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2 ml-4">
                <button
                  onClick={() => handleEdit(group)}
                  className="btn btn-secondary text-sm"
                >
                  Modifier
                </button>
                <button
                  onClick={() => handleDelete(group)}
                  className="btn btn-danger text-sm"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {groups.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 dark:text-gray-500 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Aucun groupe</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Commencez par créer votre premier groupe d'utilisateurs.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary"
          >
            Créer un Groupe
          </button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editingGroup ? 'Modifier le Groupe' : 'Nouveau Groupe'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label block mb-2">Nom du Groupe *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input w-full"
                  required
                />
              </div>

              <div>
                <label className="label block mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input w-full"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { key: 'permissions_families', label: 'Familles' },
                  { key: 'permissions_products', label: 'Produits' },
                  { key: 'permissions_features', label: 'Caractéristiques' },
                  { key: 'permissions_gammas', label: 'Gammes' },
                  { key: 'permissions_measurements', label: 'Mesures' },
                  { key: 'permissions_sections', label: 'Sections' },
                  { key: 'permissions_users', label: 'Utilisateurs' },
                  { key: 'permissions_database', label: 'Base de données' },
                  { key: 'permissions_storage', label: 'Stockage' },
                  { key: 'permissions_logs', label: 'Journaux' }
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="label block mb-2">{label}</label>
                    <select
                      value={formData[key as keyof typeof formData]}
                      onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                      className="input w-full"
                    >
                      <option value="none">Aucun</option>
                      <option value="read">Lecture</option>
                      <option value="write">Écriture</option>
                      <option value="all">Complet</option>
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-3">
                <button type="button" onClick={resetForm} className="btn btn-secondary">
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingGroup ? 'Mettre à jour' : 'Créer'} le Groupe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;
