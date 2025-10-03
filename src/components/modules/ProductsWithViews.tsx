import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useI18nStore } from '../../stores/useI18nStore';
import { useUserStore } from '../../stores/useUserStore';
import { db } from '../../services/database';
import { useNavigationHistory } from '../../services/navigationHistory';
import { navigationService } from '../../services/navigationService';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import EnhancedTableWithFilters from '../ui/EnhancedTableWithFilters';
import FeaturesList from '../ui/FeaturesList';

interface Product {
  id: number;
  name: string;
  family_id: number;
  description: string;
  image_url: string;
  image_filename?: string;
  workstation_id?: number;
  workshop_id?: number;
  created_at: string;
  updated_at: string;
  family_name?: string;
  workshop_name?: string;
  workstation_name?: string;
  feature_count?: number;
}

interface Family {
  id: number;
  name: string;
}

// interface Atelier {
//   id: number;
//   name: string;
// }

type ViewMode = 'list' | 'cards';

interface ProductsWithViewsProps {
  onNavigateToGammas?: (productId: number) => void;
}

const ProductsWithViews = ({ onNavigateToGammas }: ProductsWithViewsProps) => {
  const { t } = useI18nStore();
  const { currentUser } = useUserStore();
  const { canGoBack, goBack } = useNavigationHistory();
  const [products, setProducts] = useState<Product[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  // const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('products-view-mode');
    return (saved as ViewMode) || 'cards';
  });
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    family_id: '',
    description: '',
    image_filename: '',
    workshop_id: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [selectedFamilyFilter, setSelectedFamilyFilter] = useState<number | null>(null);
  const [selectedWorkshopFilter, setSelectedWorkshopFilter] = useState<number | null>(null);

  // Helper function to get image from localStorage
  const getImageFromStorage = (filename: string): string | null => {
    return localStorage.getItem(`image_${filename}`);
  };

  // Filter products based on selected family and workshop
  const filteredProducts = products.filter(product => {
    const familyMatch = !selectedFamilyFilter || product.family_id === selectedFamilyFilter;
    const workshopMatch = !selectedWorkshopFilter || product.workshop_id === selectedWorkshopFilter;
    return familyMatch && workshopMatch;
  });

  useEffect(() => {
    loadData();
  }, []);

  // Handle family filter from navigation
  useEffect(() => {
    const familyFilter = sessionStorage.getItem('productsFamilyFilter');
    if (familyFilter) {
      const familyId = parseInt(familyFilter);
      setSelectedFamilyFilter(familyId);
      // Clear the filter after applying
      sessionStorage.removeItem('productsFamilyFilter');
    }
  }, []);

  // Handle workshop filter from navigation
  useEffect(() => {
    const workshopFilter = sessionStorage.getItem('productsWorkshopFilter');
    if (workshopFilter) {
      const workshopId = parseInt(workshopFilter);
      setSelectedWorkshopFilter(workshopId);
      // Clear the filter after applying
      sessionStorage.removeItem('productsAtelierFilter');
    }
  }, []);

  const loadData = async () => {
    try {
      // Database is initialized globally in App.tsx
      
      // Load families for dropdown
      const familiesData = await db.queryAll('SELECT * FROM families ORDER BY name');
      setFamilies(familiesData);

      // Load workshops for dropdown
      // const workshopsData = await db.queryAll('SELECT * FROM workshops ORDER BY name');
      // setWorkshops(workshopsData);

      // Load products with family names, workshop info, and feature counts
      const productsData = await db.queryAll(`
        SELECT p.*, f.name as family_name, ws.name as workshop_name, w.name as workstation_name,
               COALESCE(feat_count.feature_count, 0) as feature_count
        FROM products p 
        LEFT JOIN families f ON p.family_id = f.id 
        LEFT JOIN workshops ws ON p.workshop_id = ws.id
        LEFT JOIN workstations w ON p.workstation_id = w.id
        LEFT JOIN (
          SELECT product_id, COUNT(*) as feature_count 
          FROM features 
          GROUP BY product_id
        ) feat_count ON p.id = feat_count.product_id
        ORDER BY p.name
      `);
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error(t('common.error'));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check permissions
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'controle' && currentUser.role !== 'method')) {
      toast.error('You do not have permission to save products');
      return;
    }
    
    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }

    try {
      let imageFilename = formData.image_filename;
      
      // Save image file if uploaded
      if (imageFile) {
        const timestamp = Date.now();
        const extension = imageFile.name.split('.').pop() || 'jpg';
        imageFilename = `product_${timestamp}.${extension}`;
        
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

      if (editingProduct) {
        // Update existing product
        await db.execute(
          'UPDATE products SET name = ?, family_id = ?, description = ?, image_filename = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [formData.name, parseInt(formData.family_id), formData.description, imageFilename, editingProduct.id]
        );
        toast.success(t('common.success'));
      } else {
        // Create new product
        await db.execute(
          'INSERT INTO products (name, family_id, description, image_filename) VALUES (?, ?, ?, ?)',
          [formData.name, parseInt(formData.family_id), formData.description, imageFilename]
        );
        toast.success(t('common.success'));
      }

      // Database automatically saved in Electron mode
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error(t('common.error'));
    }
  };

  const handleEdit = (product: Product) => {
    // Check permissions
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'controle' && currentUser.role !== 'method')) {
      toast.error('You do not have permission to edit products');
      return;
    }
    
    setFormData({
      name: product.name,
      family_id: product.family_id?.toString() || '',
      description: product.description || '',
      image_filename: product.image_filename || '',
      workshop_id: product.workshop_id?.toString() || ''
    });
    setImageFile(null);
    // Load image from localStorage if it exists
    const storedImage = product.image_filename ? getImageFromStorage(product.image_filename) : null;
    setImagePreview(storedImage || '');
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    // Check permissions
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'controle' && currentUser.role !== 'method')) {
      toast.error('You do not have permission to delete products');
      return;
    }
    
    try {
      // Check if product has features
      const features = await db.queryAll('SELECT COUNT(*) as count FROM features WHERE product_id = ?', [id]);
      if (features[0]?.count > 0) {
        toast.error('Cannot delete product with existing features. Please delete features first.');
        return;
      }

      // Get product info to clean up image
      const product = await db.queryAll('SELECT image_filename FROM products WHERE id = ?', [id]);
      if (product[0]?.image_filename) {
        localStorage.removeItem(`image_${product[0].image_filename}`);
      }

      await db.execute('DELETE FROM products WHERE id = ?', [id]);
      // Database automatically saved in Electron mode
      toast.success('Product deleted successfully!');
      loadData();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('products-view-mode', mode);
  };

  // Enhanced table handlers
  const handleEditCell = async (rowIndex: number, columnKey: string, value: any) => {
    // Check permissions
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'controle' && currentUser.role !== 'method')) {
      toast.error('You do not have permission to edit products');
      return;
    }
    
    const product = products[rowIndex];
    try {
      if (columnKey === 'name') {
        await db.execute('UPDATE products SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [value, product.id]);
      } else if (columnKey === 'description') {
        await db.execute('UPDATE products SET description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [value, product.id]);
      } else if (columnKey === 'image_url') {
        await db.execute('UPDATE products SET image_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [value, product.id]);
      }
      // Database automatically saved in Electron mode
      loadData();
      toast.success(t('common.success'));
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error(t('common.error'));
    }
  };

  const handleDeleteRow = async (rowIndex: number) => {
    const product = products[rowIndex];
    await handleDelete(product.id);
  };

  const resetForm = () => {
    setFormData({ name: '', family_id: '', description: '', image_filename: '', workshop_id: '' });
    setImageFile(null);
    setImagePreview('');
    setEditingProduct(null);
    setShowForm(false);
  };

  const tableColumns = [
    { key: 'name', label: t('products.productName'), editable: true, required: true },
    { key: 'family_name', label: t('products.productFamily'), editable: false },
    { key: 'description', label: t('products.productDescription'), editable: true, type: 'textarea' as const },
    { key: 'image_url', label: 'Image URL', editable: true },
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('products.title')}</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Manage products with photos and characteristics</p>
          {selectedFamilyFilter && (
            <div className="mt-2 flex items-center space-x-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                Filtered by: {families.find(f => f.id === selectedFamilyFilter)?.name || 'Unknown Family'}
              </span>
              <button
                onClick={() => setSelectedFamilyFilter(null)}
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
        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => handleViewModeChange('cards')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
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
              <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              List
            </button>
          </div>
          
          {currentUser && (currentUser.role === 'admin' || currentUser.role === 'controle' || currentUser.role === 'method') && (
            <button
              onClick={() => setShowForm(true)}
              className="btn btn-primary"
            >
              {t('products.addProduct')}
            </button>
          )}
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editingProduct ? t('products.editProduct') : t('products.addProduct')}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label block mb-2">
                    {t('products.productName')} *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input w-full"
                    placeholder="Enter product name"
                    required
                  />
                </div>
                
                <div>
                  <label className="label block mb-2">
                    {t('products.productFamily')}
                  </label>
                  <select
                    value={formData.family_id}
                    onChange={(e) => setFormData({ ...formData, family_id: e.target.value })}
                    className="input w-full"
                  >
                    <option value="">Select family</option>
                    {families.map((family) => (
                      <option key={family.id} value={family.id}>
                        {family.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="label block mb-2">
                  {t('products.productDescription')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input w-full h-20 resize-none"
                  placeholder="Enter product description"
                />
              </div>

              <div>
                <label className="label block mb-2">
                  Product Image
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
                        alt="Product preview" 
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

              {/* Features Management - Only show when editing an existing product */}
              {editingProduct && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <FeaturesList
                    productId={editingProduct.id}
                    productName={editingProduct.name}
                    onFeaturesChange={() => {
                      // Optionally refresh data or show updated count
                    }}
                  />
                </div>
              )}

              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn btn-secondary"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  {editingProduct ? t('common.save') : t('common.add')}
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
          {filteredProducts.length === 0 ? (
            <div className="col-span-full bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {selectedFamilyFilter ? 'No products found for this family' : 'No products found'}
              </p>
              {currentUser && (currentUser.role === 'admin' || currentUser.role === 'controle' || currentUser.role === 'method') && (
                <button
                  onClick={() => setShowForm(true)}
                  className="btn btn-primary"
                >
                  Add Your First Product
                </button>
              )}
            </div>
          ) : (
            filteredProducts.map((product) => (
              <div 
                key={product.id} 
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => onNavigateToGammas?.(product.id)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (currentUser && (currentUser.role === 'admin' || currentUser.role === 'controle' || currentUser.role === 'method')) {
                    handleEdit(product);
                  }
                }}
                title={currentUser && (currentUser.role === 'admin' || currentUser.role === 'controle' || currentUser.role === 'method') 
                  ? "Click to view features, double-click to edit" 
                  : "Click to view features"}
              >
                {/* Product Image */}
                <div className="bg-gray-100 dark:bg-gray-700" style={{ aspectRatio: '16 / 9' }}>
                  {product.image_filename && getImageFromStorage(product.image_filename) ? (
                    <img
                      src={getImageFromStorage(product.image_filename) || undefined}
                      alt={product.name}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-48 flex items-center justify-center bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 ${product.image_filename ? 'hidden' : ''}`}>
                    <svg className="w-24 h-24 text-purple-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {product.name}
                  </h3>
                  {product.family_name && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      {product.family_name}
                    </p>
                  )}
                  {product.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                      {product.description}
                    </p>
                  )}
                  
                  {/* Feature Count */}
                  <div className="flex items-center justify-center mb-3">
                    <div className="bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 px-3 py-1 rounded-full text-sm font-medium">
                      {product.feature_count || 0} features
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(product.created_at).toLocaleDateString()}
                    </span>
                    {currentUser && (currentUser.role === 'admin' || currentUser.role === 'controle' || currentUser.role === 'method') && (
                      <div className="flex space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(product);
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
                            handleDelete(product.id);
                          }}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* List View */
        <EnhancedTableWithFilters
          data={filteredProducts}
          columns={tableColumns}
          onEdit={handleEditCell}
          onDelete={handleDeleteRow}
          onAdd={() => setShowForm(true)}
          loading={loading}
          emptyMessage={selectedFamilyFilter ? "No products found for this family" : "No products found"}
          className="table-zebra"
        />
      )}
    </div>
  );
};

export default ProductsWithViews;
