import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { db } from '../../services/database';
import { XMarkIcon } from '@heroicons/react/24/outline';

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

interface RouteFeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (feature: FeatureFormData) => void;
  feature?: Feature | null;
  routeId: number;
  routeName: string;
}

const RouteFeatureModal: React.FC<RouteFeatureModalProps> = ({
  isOpen,
  onClose,
  onSave,
  feature,
  routeId,
  routeName
}) => {
  const [formData, setFormData] = useState<FeatureFormData>({
    name: '',
    description: '',
    product_id: 0,
    route_id: routeId,
    specification_type: '',
    target_value: undefined,
    tolerance_plus: undefined,
    tolerance_minus: undefined,
    unit: '',
    image_filename: ''
  });
  const [products, setProducts] = useState<Array<{id: number, name: string}>>([]);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadProducts();
      if (feature) {
        setFormData({
          ...feature,
          route_id: routeId
        });
        // Load image preview if exists
        if (feature.image_filename) {
          const imageData = localStorage.getItem(`image_${feature.image_filename}`);
          if (imageData) {
            setImagePreview(imageData);
          }
        }
      } else {
        // Reset form for new feature
        setFormData({
          name: '',
          description: '',
          product_id: 0,
          route_id: routeId,
          specification_type: '',
          target_value: undefined,
          tolerance_plus: undefined,
          tolerance_minus: undefined,
          unit: '',
          image_filename: ''
        });
        setImagePreview('');
        setImageFile(null);
      }
    }
  }, [isOpen, feature, routeId]);

  const loadProducts = async () => {
    try {
      const productsData = await db.queryAll('SELECT id, name FROM products ORDER BY name');
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.name.trim()) {
        toast.error('Feature name is required');
        return;
      }

      if (!formData.product_id) {
        toast.error('Product selection is required');
        return;
      }

      let imageFilename = formData.image_filename;

      // Handle image upload
      if (imageFile) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const imageData = e.target?.result as string;
          const filename = `feature_${Date.now()}_${imageFile.name}`;
          
          // Store image in localStorage
          localStorage.setItem(`image_${filename}`, imageData);
          imageFilename = filename;
          
          const featureData = {
            ...formData,
            product_id: formData.product_id,
            route_id: routeId,
            image_filename: imageFilename
          };

          onSave(featureData);
          onClose();
        };
        reader.readAsDataURL(imageFile);
        return;
      }

      const featureData = {
        ...formData,
        product_id: formData.product_id,
        route_id: routeId,
        image_filename: imageFilename
      };

      onSave(featureData);
      onClose();
    } catch (error) {
      console.error('Error saving feature:', error);
      toast.error('Failed to save feature');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? undefined : parseFloat(value)
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    setFormData(prev => ({ ...prev, image_filename: '' }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {feature ? 'Edit Feature' : 'Add New Feature'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Route: {routeName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Feature Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter feature name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Product *
              </label>
              <select
                name="product_id"
                value={formData.product_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value={0}>Select a product</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter feature description"
            />
          </div>

          {/* Specification Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Specification Type
              </label>
              <select
                name="specification_type"
                value={formData.specification_type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select type</option>
                <option value="dimensional">Dimensional</option>
                <option value="surface">Surface</option>
                <option value="material">Material</option>
                <option value="functional">Functional</option>
                <option value="appearance">Appearance</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Unit
              </label>
              <input
                type="text"
                name="unit"
                value={formData.unit}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., mm, μm, °C"
              />
            </div>
          </div>

          {/* Target Value and Tolerances */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Value
              </label>
              <input
                type="number"
                step="any"
                name="target_value"
                value={formData.target_value || ''}
                onChange={handleNumberChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="Target value"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tolerance (+)
              </label>
              <input
                type="number"
                step="any"
                name="tolerance_plus"
                value={formData.tolerance_plus || ''}
                onChange={handleNumberChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="+Tolerance"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tolerance (-)
              </label>
              <input
                type="number"
                step="any"
                name="tolerance_minus"
                value={formData.tolerance_minus || ''}
                onChange={handleNumberChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="-Tolerance"
              />
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Feature Image
            </label>
            <div className="space-y-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              />
              
              {imagePreview && (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Feature preview"
                    className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : (feature ? 'Update Feature' : 'Add Feature')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteFeatureModal;

