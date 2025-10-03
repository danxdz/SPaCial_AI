import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline';

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

interface FeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (feature: FeatureFormData) => void;
  feature?: Feature | null;
  productId: number;
  productName: string;
}

const FeatureModal: React.FC<FeatureModalProps> = ({
  isOpen,
  onClose,
  onSave,
  feature,
  productId,
  productName
}) => {
  const [formData, setFormData] = useState<FeatureFormData>({
    name: '',
    description: '',
    product_id: productId,
    specification_type: 'nominal',
    target_value: 0,
    tolerance_plus: 0,
    tolerance_minus: 0,
    unit: '',
    image_filename: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (feature) {
        setFormData({
          ...feature,
          product_id: productId
        });
        // Load existing image if available
        if (feature.image_filename) {
          const storedImage = getImageFromStorage(feature.image_filename);
          setImagePreview(storedImage || '');
        }
      } else {
        // Reset form for new feature
        setFormData({
          name: '',
          description: '',
          product_id: productId,
          specification_type: 'nominal',
          target_value: 0,
          tolerance_plus: 0,
          tolerance_minus: 0,
          unit: '',
          image_filename: ''
        });
        setImagePreview('');
      }
      setImageFile(null);
    }
  }, [isOpen, feature, productId]);

  const getImageFromStorage = (filename: string): string | null => {
    try {
      return localStorage.getItem(`image_${filename}`) || null;
    } catch (error) {
      console.error('Error loading image from storage:', error);
      return null;
    }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.name.trim()) {
        toast.error('Feature name is required');
        return;
      }

      let imageFilename = formData.image_filename;

      // Handle image upload
      if (imageFile) {
        imageFilename = `feature_${Date.now()}_${imageFile.name}`;
        
        // Store image in localStorage for Electron
        if (window.electronAPI) {
          const reader = new FileReader();
          reader.onload = async (e) => {
            const imageData = e.target?.result as string;
            localStorage.setItem(`image_${imageFilename}`, imageData);
          };
          reader.readAsDataURL(imageFile);
        }
      }

      const featureData = {
        ...formData,
        image_filename: imageFilename,
        target_value: formData.target_value || 0,
        tolerance_plus: formData.tolerance_plus || 0,
        tolerance_minus: formData.tolerance_minus || 0
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
      [name]: name.includes('value') || name.includes('tolerance') ? 
        (value === '' ? 0 : parseFloat(value)) : value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {feature ? 'Edit Feature' : 'Add New Feature'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Product: {productName}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                Specification Type
              </label>
              <select
                name="specification_type"
                value={formData.specification_type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="nominal">Nominal</option>
                <option value="minimum">Minimum</option>
                <option value="maximum">Maximum</option>
                <option value="range">Range</option>
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

          {/* Specifications */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Value
              </label>
              <input
                type="number"
                name="target_value"
                value={formData.target_value}
                onChange={handleInputChange}
                step="0.001"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="0.000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tolerance (+)
              </label>
              <input
                type="number"
                name="tolerance_plus"
                value={formData.tolerance_plus}
                onChange={handleInputChange}
                step="0.001"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="0.000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tolerance (-)
              </label>
              <input
                type="number"
                name="tolerance_minus"
                value={formData.tolerance_minus}
                onChange={handleInputChange}
                step="0.001"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="0.000"
              />
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
                placeholder="mm, kg, etc."
              />
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Feature Image
            </label>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="feature-image"
                />
                <label
                  htmlFor="feature-image"
                  className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  <PhotoIcon className="h-4 w-4 mr-2" />
                  Choose Image
                </label>
              </div>
              {imagePreview && (
                <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                  <img
                    src={imagePreview}
                    alt="Feature preview"
                    className="w-full h-full object-cover"
                  />
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

export default FeatureModal;
