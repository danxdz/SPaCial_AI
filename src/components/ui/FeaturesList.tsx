import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { db } from '../../services/database';
import { PencilIcon, TrashIcon, PlusIcon, EyeIcon, Squares2X2Icon, ListBulletIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import FeatureModal from './FeatureModal';

interface Feature {
  id: number;
  name: string;
  description?: string;
  product_id: number;
  route_id?: number;
  specification_type?: string;
  target_value?: number;
  tolerance_plus?: number;
  tolerance_minus?: number;
  unit?: string;
  image_filename?: string;
  created_at: string;
  updated_at: string;
}

interface FeatureFormData {
  name: string;
  description?: string;
  product_id: number;
  route_id?: number;
  specification_type?: string;
  target_value?: number;
  tolerance_plus?: number;
  tolerance_minus?: number;
  unit?: string;
  image_filename?: string;
}

interface FeaturesListProps {
  productId: number;
  productName: string;
  onFeaturesChange?: () => void;
}

type ViewMode = 'list' | 'cards';

const FeaturesList: React.FC<FeaturesListProps> = ({
  productId,
  productName,
  onFeaturesChange
}) => {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadFeatures();
  }, [productId]);

  const loadFeatures = async () => {
    try {
      setLoading(true);
      const featuresData = await db.queryAll(
        'SELECT * FROM features WHERE product_id = ? ORDER BY name',
        [productId]
      );
      setFeatures(featuresData);
    } catch (error) {
      console.error('Error loading features:', error);
      toast.error('Failed to load features');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFeature = () => {
    setEditingFeature(null);
    setShowModal(true);
  };

  const handleEditFeature = (feature: Feature) => {
    setEditingFeature(feature);
    setShowModal(true);
  };

  const handleSaveFeature = async (featureData: FeatureFormData) => {
    try {
      if (editingFeature) {
        // Update existing feature
        await db.execute(
          `UPDATE features SET 
           name = ?, description = ?, specification_type = ?, 
           target_value = ?, tolerance_plus = ?, tolerance_minus = ?, 
           unit = ?, image_filename = ?, updated_at = CURRENT_TIMESTAMP 
           WHERE id = ?`,
          [
            featureData.name,
            featureData.description,
            featureData.specification_type,
            featureData.target_value,
            featureData.tolerance_plus,
            featureData.tolerance_minus,
            featureData.unit,
            featureData.image_filename,
            editingFeature.id
          ]
        );
        toast.success('Feature updated successfully');
      } else {
        // Create new feature
        await db.execute(
          `INSERT INTO features 
           (name, description, product_id, specification_type, target_value, 
            tolerance_plus, tolerance_minus, unit, image_filename) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            featureData.name,
            featureData.description,
            featureData.product_id,
            featureData.specification_type,
            featureData.target_value,
            featureData.tolerance_plus,
            featureData.tolerance_minus,
            featureData.unit,
            featureData.image_filename
          ]
        );
        toast.success('Feature added successfully');
      }

      await loadFeatures();
      onFeaturesChange?.();
    } catch (error) {
      console.error('Error saving feature:', error);
      toast.error('Failed to save feature');
    }
  };

  const handleDeleteFeature = async (featureId: number) => {
    if (!confirm('Are you sure you want to delete this feature?')) {
      return;
    }

    try {
      await db.execute('DELETE FROM features WHERE id = ?', [featureId]);
      toast.success('Feature deleted successfully');
      await loadFeatures();
      onFeaturesChange?.();
    } catch (error) {
      console.error('Error deleting feature:', error);
      toast.error('Failed to delete feature');
    }
  };

  const getImageFromStorage = (filename: string): string | null => {
    try {
      return localStorage.getItem(`image_${filename}`) || null;
    } catch (error) {
      console.error('Error loading image from storage:', error);
      return null;
    }
  };

  // Filter features based on search term
  const filteredFeatures = features.filter(feature =>
    feature.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (feature.description && feature.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Features ({filteredFeatures.length}{searchTerm ? ` of ${features.length}` : ''})
        </h3>
        <button
          type="button"
          onClick={handleAddFeature}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Feature
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between space-x-4">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search features..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">View:</span>
          <div className="flex rounded-md shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3 py-2 text-sm font-medium rounded-l-md border ${
                viewMode === 'cards'
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              <Squares2X2Icon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                viewMode === 'list'
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              <ListBulletIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Features Display */}
      {features.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <EyeIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No features defined for this product yet.</p>
          <p className="text-sm mt-1">Click "Add Feature" to get started.</p>
        </div>
      ) : filteredFeatures.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <MagnifyingGlassIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No features match your search criteria.</p>
          <p className="text-sm mt-1">Try adjusting your search terms.</p>
        </div>
      ) : viewMode === 'cards' ? (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFeatures.map((feature) => (
            <div
              key={feature.id}
              className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                {feature.image_filename && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 flex-shrink-0 mr-3">
                    <img
                      src={getImageFromStorage(feature.image_filename) || ''}
                      alt={feature.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    {feature.name}
                  </h4>
                  {feature.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                      {feature.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-1 ml-2">
                  <button
                    type="button"
                    onClick={() => handleEditFeature(feature)}
                    className="p-1 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                    title="Edit feature"
                  >
                    <PencilIcon className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteFeature(feature.id)}
                    className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Delete feature"
                  >
                    <TrashIcon className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                {feature.target_value !== undefined && (
                  <div>
                    Target: {feature.target_value}
                    {feature.unit && ` ${feature.unit}`}
                  </div>
                )}
                {(feature.tolerance_plus || feature.tolerance_minus) && (
                  <div>
                    Tolerance: {feature.tolerance_minus || 0} / +{feature.tolerance_plus || 0}
                    {feature.unit && ` ${feature.unit}`}
                  </div>
                )}
                {feature.specification_type && (
                  <div className="capitalize">
                    Type: {feature.specification_type}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="space-y-3">
          {filteredFeatures.map((feature) => (
            <div
              key={feature.id}
              className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    {feature.image_filename && (
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 flex-shrink-0">
                        <img
                          src={getImageFromStorage(feature.image_filename) || ''}
                          alt={feature.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {feature.name}
                      </h4>
                      {feature.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {feature.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {feature.target_value !== undefined && (
                          <span>
                            Target: {feature.target_value}
                            {feature.unit && ` ${feature.unit}`}
                          </span>
                        )}
                        {(feature.tolerance_plus || feature.tolerance_minus) && (
                          <span>
                            Tolerance: {feature.tolerance_minus || 0} / +{feature.tolerance_plus || 0}
                            {feature.unit && ` ${feature.unit}`}
                          </span>
                        )}
                        {feature.specification_type && (
                          <span className="capitalize">
                            Type: {feature.specification_type}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    type="button"
                    onClick={() => handleEditFeature(feature)}
                    className="p-2 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                    title="Edit feature"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteFeature(feature.id)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Delete feature"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Feature Modal */}
      <FeatureModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveFeature}
        feature={editingFeature}
        productId={productId}
        productName={productName}
      />
    </div>
  );
};

export default FeaturesList;
