import { useEffect, useState } from 'react';
import { db } from '../../services/database';
import toast from 'react-hot-toast';
import { useI18nStore } from '../../stores/useI18nStore';
import { navigationService } from '../../services/navigationService';
import { useNavigationHistory } from '../../services/navigationHistory';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import EnhancedTableWithFilters from '../ui/EnhancedTableWithFilters';

interface Family {
  id: number;
  name: string;
  description: string;
  image_filename?: string;
  created_at: string;
  updated_at: string;
  product_count?: number;
  workshop_count?: number;
}

interface FamiliesProps {
  onNavigateToProducts?: (familyId: number) => void;
}

type ViewMode = 'list' | 'cards';

const Families = ({ onNavigateToProducts }: FamiliesProps) => {
  const { t } = useI18nStore();
  const { canGoBack, goBack } = useNavigationHistory();
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('families-view-mode');
    return (saved as ViewMode) || 'cards';
  });
  const [showForm, setShowForm] = useState(false);
  const [editingFamily, setEditingFamily] = useState<Family | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_filename: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [selectedWorkshopFilter, setSelectedWorkshopFilter] = useState<number | null>(null);
  const [selectedWorkshopName, setSelectedWorkshopName] = useState<string>('');

  // Helper function to get image from localStorage
  const getImageFromStorage = (filename: string): string | null => {
    return localStorage.getItem(`image_${filename}`);
  };

  useEffect(() => {
    loadFamilies();
    
    // Subscribe to navigation changes to apply filters
    const unsubscribe = navigationService.subscribe((state) => {
      // Check if we have a workshop filter
      const workshopFilter = state.filters.find(f => f.type === 'workshop');
      if (workshopFilter) {
        setSelectedWorkshopFilter(workshopFilter.id);
        setSelectedWorkshopName(workshopFilter.name || '');
        console.log('Applied workshop filter:', workshopFilter);
      } else {
        setSelectedWorkshopFilter(null);
        setSelectedWorkshopName('');
      }
    });
    
    // Apply initial filter if any
    const initialState = navigationService.getState();
    const initialWorkshopFilter = initialState.filters.find(f => f.type === 'workshop');
    if (initialWorkshopFilter) {
      setSelectedWorkshopFilter(initialWorkshopFilter.id);
    }
    
    return unsubscribe;
  }, []);

  // Reload families when workshop filter changes
  useEffect(() => {
    if (selectedWorkshopFilter !== null) {
      loadFamilies();
    }
  }, [selectedWorkshopFilter]);

  // Handle workshop filter from navigation
  useEffect(() => {
    const workshopFilter = sessionStorage.getItem('familiesWorkshopFilter');
    if (workshopFilter) {
      const workshopId = parseInt(workshopFilter);
      setSelectedWorkshopFilter(workshopId);
      // Clear the filter after applying
      sessionStorage.removeItem('familiesAtelierFilter');
    }
  }, []);

  const loadFamilies = async () => {
    try {
      // Database is initialized globally in App.tsx
      // Load families with product counts and workshop relationships
      let query = `
        SELECT f.*, 
               COUNT(DISTINCT p.id) as product_count,
               COUNT(DISTINCT fw.workshop_id) as workshop_count,
               GROUP_CONCAT(DISTINCT w.name) as workshop_names
        FROM families f
        LEFT JOIN products p ON p.family_id = f.id
        LEFT JOIN family_workshops fw ON fw.family_id = f.id
        LEFT JOIN workshops w ON w.id = fw.workshop_id
      `;
      
      // Add workshop filter if selected
      if (selectedWorkshopFilter) {
        query += ` WHERE fw.workshop_id = ?`;
      }
      
      query += ` GROUP BY f.id ORDER BY f.name`;
      
      const familiesData = selectedWorkshopFilter 
        ? await db.queryAll(query, [selectedWorkshopFilter])
        : await db.queryAll(query);
      
      console.log('Loaded families:', familiesData.length, 'with filter:', selectedWorkshopFilter);
      setFamilies(familiesData);
    } catch (error) {
      console.error('Error loading families:', error);
      toast.error('Failed to load families');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('families-view-mode', mode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Family name is required');
      return;
    }

    try {
      let imageFilename = formData.image_filename;
      
      // Save image file if uploaded
      if (imageFile) {
        const timestamp = Date.now();
        const extension = imageFile.name.split('.').pop() || 'jpg';
        imageFilename = `family_${timestamp}.${extension}`;
        
        // Convert to base64 and store in localStorage
        await new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64Data = e.target?.result as string;
            localStorage.setItem(`image_${imageFilename}`, base64Data);
            resolve();
          };
          reader.readAsDataURL(imageFile);
        });
      }

      if (editingFamily) {
        // Update existing family
        await db.execute(
          'UPDATE families SET name = ?, description = ?, image_filename = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [formData.name, formData.description, imageFilename, editingFamily.id]
        );
        toast.success('Family updated successfully');
      } else {
        // Create new family
        const result = await db.execute(
          'INSERT INTO families (name, description, image_filename) VALUES (?, ?, ?)',
          [formData.name, formData.description, imageFilename]
        );
        
        // Get the ID of the inserted family
        const familyId = result;
        
        // If workshop is selected, create the relationship
        if (selectedWorkshopFilter && familyId && typeof familyId === 'number' && typeof selectedWorkshopFilter === 'number') {
          await db.execute(
            'INSERT INTO family_workshops (family_id, workshop_id) VALUES (?, ?)',
            [familyId, selectedWorkshopFilter]
          );
        }
        
        toast.success('Family created successfully');
      }

      // Save to localStorage
      // Database automatically saved in Electron mode
      
      // Reset form and reload data
      resetForm();
      loadFamilies();
    } catch (error) {
      console.error('Error saving family:', error);
      toast.error('Failed to save family');
    }
  };

  const handleEdit = (family: Family) => {
    setEditingFamily(family);
    setFormData({
      name: family.name,
      description: family.description,
      image_filename: family.image_filename || ''
    });
    setImageFile(null);
    // Load image from localStorage if it exists
    const storedImage = family.image_filename ? getImageFromStorage(family.image_filename) : null;
    setImagePreview(storedImage || '');
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    try {
      // Check if family has products
      const products = await db.queryAll('SELECT COUNT(*) as count FROM products WHERE family_id = ?', [id]);
      if (products[0]?.count > 0) {
        toast.error('Cannot delete family with existing products. Please delete products first.');
        return;
      }

      // Get family info to clean up image
      const family = await db.queryAll('SELECT image_filename FROM families WHERE id = ?', [id]);
      if (family[0]?.image_filename) {
        localStorage.removeItem(`image_${family[0].image_filename}`);
      }

      await db.execute('DELETE FROM families WHERE id = ?', [id]);
      // Database automatically saved in Electron mode
      toast.success('Family deleted successfully!');
      loadFamilies();
    } catch (error) {
      console.error('Error deleting family:', error);
      toast.error('Failed to delete family');
    }
  };

  // Family-Workshop relationship management methods (for future UI)
  // const addFamilyToWorkshop = async (familyId: number, workshopId: number) => {
  //   try {
  //     await db.execute(
  //       'INSERT OR IGNORE INTO family_workshops (family_id, workshop_id) VALUES (?, ?)',
  //       [familyId, workshopId]
  //     );
  //     toast.success('Family added to workshop successfully');
  //     loadFamilies();
  //   } catch (error) {
  //     console.error('Error adding family to workshop:', error);
  //     toast.error('Failed to add family to workshop');
  //   }
  // };

  // const removeFamilyFromWorkshop = async (familyId: number, workshopId: number) => {
  //   try {
  //     await db.execute(
  //       'DELETE FROM family_workshops WHERE family_id = ? AND workshop_id = ?',
  //       [familyId, workshopId]
  //     );
  //     toast.success('Family removed from workshop successfully');
  //     loadFamilies();
  //   } catch (error) {
  //     console.error('Error removing family from workshop:', error);
  //     toast.error('Failed to remove family from workshop');
  //   }
  // };

  // const getFamilyWorkshops = async (familyId: number) => {
  //   try {
  //     const workshops = await db.queryAll(`
  //       SELECT w.* FROM workshops w
  //       INNER JOIN family_workshops fw ON fw.workshop_id = w.id
  //       WHERE fw.family_id = ?
  //       ORDER BY w.name
  //     `, [familyId]);
  //     return workshops;
  //   } catch (error) {
  //     console.error('Error getting family workshops:', error);
  //     return [];
  //   }
  // };

  const resetForm = () => {
    setFormData({ name: '', description: '', image_filename: '' });
    setImageFile(null);
    setImagePreview('');
    setEditingFamily(null);
    setShowForm(false);
  };

  // Enhanced table handlers
  const handleEditCell = async (rowIndex: number, columnKey: string, value: any) => {
    const family = families[rowIndex];
    try {
      if (columnKey === 'name') {
        await db.execute('UPDATE families SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [value, family.id]);
      } else if (columnKey === 'description') {
        await db.execute('UPDATE families SET description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [value, family.id]);
      }
      // Database automatically saved in Electron mode
      loadFamilies();
      toast.success(t('common.success'));
    } catch (error) {
      console.error('Error updating family:', error);
      toast.error(t('common.error'));
    }
  };

  const handleDeleteRow = async (rowIndex: number) => {
    const family = families[rowIndex];
    await handleDelete(family.id);
  };

  const tableColumns = [
    { key: 'name', label: t('families.familyName'), editable: true, required: true },
    { key: 'description', label: t('families.familyDescription'), editable: true, type: 'textarea' as const },
    { key: 'created_at', label: t('common.created'), editable: false, type: 'date' as const },
  ];


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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('families.title')}</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Manage product family categories</p>
          {selectedWorkshopFilter && (
            <div className="mt-2 flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                Filtered by workshop{selectedWorkshopName ? ` - ${selectedWorkshopName}` : ''}
              </span>
              <button
                onClick={() => {
                  setSelectedWorkshopFilter(null);
                  setSelectedWorkshopName('');
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="Clear filter"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {/* View Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => handleViewModeChange('cards')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => handleViewModeChange('list')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              List
            </button>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary"
          >
            {t('families.addFamily')}
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editingFamily ? 'Edit Family' : 'Add New Family'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label block mb-2">
                  Family Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input w-full"
                  placeholder="Enter family name"
                  required
                />
              </div>
              
              <div>
                <label className="label block mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input w-full h-20 resize-none"
                  placeholder="Enter family description"
                />
              </div>

              <div>
                <label className="label block mb-2">
                  Family Image
                </label>
                <div className="space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="input w-full"
                  />
                  
                  {(imagePreview || formData.image_filename) && (
                    <div className="mt-2">
                      <img 
                        src={imagePreview || (formData.image_filename ? getImageFromStorage(formData.image_filename) || undefined : undefined)} 
                        alt="Family preview" 
                        className="w-32 h-32 object-cover rounded-lg border"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Click "Choose File" to upload a new image
                      </p>
                    </div>
                  )}
                  
                  {!imagePreview && !formData.image_filename && (
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center">
                      <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No image selected
                      </p>
                    </div>
                  )}
                </div>
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
                  {editingFamily ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Content based on view mode */}
      {viewMode === 'cards' ? (
        /* Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {families.length === 0 ? (
            <div className="col-span-full bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-4">No families found</p>
              <button
                onClick={() => setShowForm(true)}
                className="btn btn-primary"
              >
                Add Your First Family
              </button>
            </div>
          ) : (
            families.map((family) => (
              <div 
                key={family.id} 
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onNavigateToProducts?.(family.id)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  handleEdit(family);
                }}
                title="Click to view products, double-click to edit"
              >
                {/* Family Image */}
                <div className="bg-gray-100 dark:bg-gray-700" style={{ aspectRatio: '16 / 9' }}>
                  {family.image_filename && getImageFromStorage(family.image_filename) ? (
                    <img
                      src={getImageFromStorage(family.image_filename) || undefined}
                      alt={family.name}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-48 flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 ${family.image_filename ? 'hidden' : ''}`}>
                    <svg className="w-24 h-24 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                </div>

                {/* Family Info */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {family.name}
                  </h3>
                  {family.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                      {family.description}
                    </p>
                  )}
                  
                  {/* Actions */}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(family.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(family);
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
                          handleDelete(family.id);
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
            ))
          )}
        </div>
      ) : (
        /* List View */
        <EnhancedTableWithFilters
          data={families}
          columns={tableColumns}
          onEdit={handleEditCell}
          onDelete={handleDeleteRow}
          onAdd={() => setShowForm(true)}
          onRowClick={(_, rowData) => onNavigateToProducts?.(rowData.id)}
          loading={loading}
          emptyMessage="No families found"
          className="table-zebra"
        />
      )}
    </div>
  );
};

export default Families;
