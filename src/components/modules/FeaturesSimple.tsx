import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
// import { useI18nStore } from '../../stores/useI18nStore';
import { db } from '../../services/database';
import EnhancedTableWithFilters from '../ui/EnhancedTableWithFilters';

interface Feature {
  id?: number;
  name: string;
  product_id: number;
  specification_type: string;
  target_value: number;
  tolerance_plus: number;
  tolerance_minus: number;
  unit: string;
  image_url: string;
  description: string;
}

interface Product {
  id: number;
  name: string;
}

interface FeaturesSimpleProps {
  onNavigateToGammas?: (productId: number) => void;
}

const FeaturesSimple = ({ onNavigateToGammas }: FeaturesSimpleProps) => {
  // const { t } = useI18nStore();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCreator, setShowCreator] = useState(false);
  const [newFeatures, setNewFeatures] = useState<Feature[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  // Separate effect to handle product filtering after products are loaded
  useEffect(() => {
    if (products.length > 0) {
      const productFilter = sessionStorage.getItem('featuresProductFilter');
      if (productFilter) {
        const productId = parseInt(productFilter);
        const product = products.find(p => p.id === productId);
        if (product) {
          setSelectedProduct(product);
        }
        // Clear the filter after applying
        sessionStorage.removeItem('featuresProductFilter');
      }
    }
  }, [products]);

  const loadData = async () => {
    try {
      // Database is initialized globally in App.tsx
      
      // Load products for dropdown
      const productsData = await db.queryAll('SELECT * FROM products ORDER BY name');
      setProducts(productsData);

      // Load features with product names
      const featuresData = await db.queryAll(`
        SELECT f.*, p.name as product_name 
        FROM features f 
        LEFT JOIN products p ON f.product_id = p.id 
        ORDER BY f.name
      `);
      setFeatures(featuresData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const addFeatureLine = () => {
    if (!selectedProduct) {
      toast.error('Please select a product first');
      return;
    }

    const newFeature: Feature = {
      name: '',
      product_id: selectedProduct.id,
      specification_type: 'nominal',
      target_value: 0,
      tolerance_plus: 0,
      tolerance_minus: 0,
      unit: '',
      image_url: '',
      description: ''
    };

    setNewFeatures([...newFeatures, newFeature]);
  };

  const removeFeatureLine = (index: number) => {
    setNewFeatures(newFeatures.filter((_, i) => i !== index));
  };

  const updateFeatureLine = (index: number, field: keyof Feature, value: any) => {
    const updatedFeatures = [...newFeatures];
    updatedFeatures[index] = { ...updatedFeatures[index], [field]: value };
    setNewFeatures(updatedFeatures);
  };

  const handleImageUpload = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        updateFeatureLine(index, 'image_url', e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveAllFeatures = async () => {
    if (!selectedProduct) {
      toast.error('Please select a product');
      return;
    }

    if (newFeatures.length === 0) {
      toast.error('Please add at least one feature');
      return;
    }

    try {
      let savedCount = 0;
      
      for (const feature of newFeatures) {
        if (feature.name.trim()) {
          await db.execute(
            'INSERT INTO features (name, product_id, specification_type, target_value, tolerance_plus, tolerance_minus, unit, image_url, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              feature.name,
              feature.product_id,
              feature.specification_type,
              feature.target_value,
              feature.tolerance_plus,
              feature.tolerance_minus,
              feature.unit,
              feature.image_url,
              feature.description
            ]
          );
          savedCount++;
        }
      }

      // Database automatically saved in Electron mode
      toast.success(`Successfully saved ${savedCount} features for ${selectedProduct.name}!`);
      
      // Reset and reload
      setNewFeatures([]);
      setShowCreator(false);
      loadData();
    } catch (error) {
      console.error('Error saving features:', error);
      toast.error('Failed to save features');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      // Check if feature has measurements
      const measurements = await db.queryAll('SELECT COUNT(*) as count FROM measurements WHERE feature_id = ?', [id]);
      if (measurements[0]?.count > 0) {
        toast.error('Cannot delete feature with existing measurements. Please delete measurements first.');
        return;
      }

      await db.execute('DELETE FROM features WHERE id = ?', [id]);
      // Database automatically saved in Electron mode
      toast.success('Feature deleted successfully!');
      loadData();
    } catch (error) {
      console.error('Error deleting feature:', error);
      toast.error('Failed to delete feature');
    }
  };

  const handleEditCell = async (rowIndex: number, columnKey: string, value: any) => {
    const feature = features[rowIndex];
    try {
      if (columnKey === 'name') {
        await db.execute('UPDATE features SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [value, feature.id]);
      } else if (columnKey === 'target_value') {
        await db.execute('UPDATE features SET target_value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [parseFloat(value) || 0, feature.id]);
      } else if (columnKey === 'tolerance_plus') {
        await db.execute('UPDATE features SET tolerance_plus = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [parseFloat(value) || 0, feature.id]);
      } else if (columnKey === 'tolerance_minus') {
        await db.execute('UPDATE features SET tolerance_minus = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [parseFloat(value) || 0, feature.id]);
      } else if (columnKey === 'unit') {
        await db.execute('UPDATE features SET unit = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [value, feature.id]);
      }
      // Database automatically saved in Electron mode
      loadData();
      toast.success('Updated successfully!');
    } catch (error) {
      console.error('Error updating feature:', error);
      toast.error('Failed to update');
    }
  };

  const handleDeleteRow = async (rowIndex: number) => {
    const feature = features[rowIndex];
    if (feature.id) {
      await handleDelete(feature.id);
    }
  };

  const tableColumns = [
    { key: 'name', label: 'Feature Name', editable: true, required: true },
    { 
      key: 'product_name', 
      label: 'Product', 
      editable: false, 
      filterType: 'select' as const,
      filterOptions: products.map(p => ({ value: p.name, label: p.name }))
    },
    { 
      key: 'specification_type', 
      label: 'Type', 
      editable: false,
      filterType: 'select' as const,
      filterOptions: [
        { value: 'nominal', label: 'Nominal' },
        { value: 'minimum', label: 'Minimum' },
        { value: 'maximum', label: 'Maximum' },
        { value: 'range', label: 'Range' }
      ]
    },
    { key: 'target_value', label: 'Target', editable: true, type: 'number' as const },
    { key: 'tolerance_plus', label: 'Tolerance +', editable: true, type: 'number' as const },
    { key: 'tolerance_minus', label: 'Tolerance -', editable: true, type: 'number' as const },
    { key: 'unit', label: 'Unit', editable: true },
    { key: 'created_at', label: 'Created', editable: false, type: 'date' as const },
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Quality Features</h1>
          <p className="text-gray-600 dark:text-gray-400">Define quality characteristics for products</p>
        </div>
        <button
          onClick={() => setShowCreator(true)}
          className="btn btn-primary"
        >
          Add Features
        </button>
      </div>

      {/* Feature Creator Modal */}
      {showCreator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Features</h3>
            
            {/* Product Selection */}
            <div className="mb-6">
              <label className="label block mb-2">Select Product *</label>
              <select
                value={selectedProduct?.id || ''}
                onChange={(e) => {
                  const product = products.find(p => p.id === parseInt(e.target.value));
                  setSelectedProduct(product || null);
                  if (product) {
                    setNewFeatures([]); // Clear features when changing product
                  }
                }}
                className="input w-full max-w-md"
              >
                <option value="">Choose a product...</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Features List */}
            {selectedProduct && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white">
                    Features for {selectedProduct.name}
                  </h4>
                  <button
                    onClick={addFeatureLine}
                    className="btn btn-primary text-sm"
                  >
                    + Add Feature Line
                  </button>
                </div>

                {newFeatures.length === 0 ? (
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">No features added yet</p>
                    <button
                      onClick={addFeatureLine}
                      className="btn btn-primary"
                    >
                      Add Your First Feature
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {newFeatures.map((feature, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div className="grid grid-cols-12 gap-4 items-center">
                          {/* Feature Name */}
                          <div className="col-span-3">
                            <input
                              type="text"
                              value={feature.name}
                              onChange={(e) => updateFeatureLine(index, 'name', e.target.value)}
                              className="input w-full text-sm"
                              placeholder="Feature name"
                            />
                          </div>

                          {/* Unit */}
                          <div className="col-span-1">
                            <input
                              type="text"
                              value={feature.unit}
                              onChange={(e) => updateFeatureLine(index, 'unit', e.target.value)}
                              className="input w-full text-sm"
                              placeholder="Unit"
                            />
                          </div>

                          {/* Target */}
                          <div className="col-span-1">
                            <input
                              type="number"
                              step="0.01"
                              value={feature.target_value}
                              onChange={(e) => updateFeatureLine(index, 'target_value', parseFloat(e.target.value) || 0)}
                              className="input w-full text-sm"
                              placeholder="Target"
                            />
                          </div>

                          {/* Tolerance + */}
                          <div className="col-span-1">
                            <input
                              type="number"
                              step="0.01"
                              value={feature.tolerance_plus}
                              onChange={(e) => updateFeatureLine(index, 'tolerance_plus', parseFloat(e.target.value) || 0)}
                              className="input w-full text-sm"
                              placeholder="Tol+"
                            />
                          </div>

                          {/* Tolerance - */}
                          <div className="col-span-1">
                            <input
                              type="number"
                              step="0.01"
                              value={feature.tolerance_minus}
                              onChange={(e) => updateFeatureLine(index, 'tolerance_minus', parseFloat(e.target.value) || 0)}
                              className="input w-full text-sm"
                              placeholder="Tol-"
                            />
                          </div>

                          {/* Type */}
                          <div className="col-span-1">
                            <select
                              value={feature.specification_type}
                              onChange={(e) => updateFeatureLine(index, 'specification_type', e.target.value)}
                              className="input w-full text-sm"
                            >
                              <option value="nominal">Nominal</option>
                              <option value="minimum">Min</option>
                              <option value="maximum">Max</option>
                              <option value="range">Range</option>
                            </select>
                          </div>

                          {/* Description */}
                          <div className="col-span-3">
                            <input
                              type="text"
                              value={feature.description}
                              onChange={(e) => updateFeatureLine(index, 'description', e.target.value)}
                              className="input w-full text-sm"
                              placeholder="Description"
                            />
                          </div>

                          {/* Photo Upload */}
                          <div className="col-span-1">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(index, e)}
                              className="hidden"
                              id={`photo-${index}`}
                            />
                            <label
                              htmlFor={`photo-${index}`}
                              className="btn btn-secondary text-xs w-full cursor-pointer"
                            >
                              📷 Photo
                            </label>
                          </div>

                          {/* Remove Button */}
                          <div className="col-span-1">
                            <button
                              onClick={() => removeFeatureLine(index)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreator(false);
                  setNewFeatures([]);
                  setSelectedProduct(null);
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={saveAllFeatures}
                className="btn btn-primary"
                disabled={!selectedProduct || newFeatures.length === 0}
              >
                Save All Features ({newFeatures.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Table with Filters */}
      <EnhancedTableWithFilters
        data={features}
        columns={tableColumns}
        onEdit={handleEditCell}
        onDelete={handleDeleteRow}
        onAdd={() => setShowCreator(true)}
        onRowClick={(_rowIndex, rowData) => onNavigateToGammas?.(rowData.product_id)}
        loading={loading}
        emptyMessage="No features found"
        className="table-zebra"
      />
    </div>
  );
};

export default FeaturesSimple;
