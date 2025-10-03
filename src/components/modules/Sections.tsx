import React, { useState, useEffect } from 'react';
import { db } from '../../services/database';
import toast from 'react-hot-toast';
// import { useI18nStore } from '../../stores/useI18nStore';
import { useUserStore } from '../../stores/useUserStore';
import { useNavigationHistory } from '../../services/navigationHistory';
import { navigationService } from '../../services/navigationService';
import { 
  FolderIcon,
  PlusIcon,
  // PencilIcon,
  // TrashIcon,
  UserGroupIcon,
  CogIcon,
  BuildingOfficeIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Workshop {
  id: number;
  name: string;
  description: string;
  image_filename?: string;
  workstation_count?: number;
  user_count?: number;
  product_count?: number;
  methods?: Array<{
    id: number;
    username: string;
    role: string;
  }>;
}

interface Workstation {
  id: number;
  name: string;
  workshop_id: number;
  description: string;
  location: string;
  workshop_name?: string;
  user_count?: number;
}

interface SectionsProps {
  onNavigateToFamilies?: (workshopId: number) => void;
}

// Sortable Workshop Card Component
interface SortableWorkshopCardProps {
  workshop: Workshop;
  onNavigateToFamilies?: (workshopId: number) => void;
  onEdit: (workshop: Workshop) => void;
  onDelete: (workshop: Workshop) => void;
  canEdit: boolean;
}

const SortableWorkshopCard: React.FC<SortableWorkshopCardProps> = ({
  workshop,
  onNavigateToFamilies,
  onEdit,
  onDelete,
  canEdit
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: workshop.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Helper function to get image from localStorage
  const getImageFromStorage = (filename: string): string | null => {
    return localStorage.getItem(`image_${filename}`);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onNavigateToFamilies?.(workshop.id)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (canEdit) onEdit(workshop);
      }}
      title="Click to view families, double-click to edit"
    >
      {/* Atelier Image */}
      <div className="bg-gray-100 dark:bg-gray-700" style={{ aspectRatio: '16 / 9' }}>
        {workshop.image_filename && getImageFromStorage(workshop.image_filename) ? (
          <img
            src={getImageFromStorage(workshop.image_filename) || undefined}
            alt={workshop.name}
            className="w-full h-48 object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={`w-full h-48 flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 ${workshop.image_filename ? 'hidden' : ''}`}>
          <svg className="w-24 h-24 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>
      </div>

      {/* Atelier Info */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center">
            <div 
              {...attributes} 
              {...listeners}
              className={`mr-3 ${canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
            >
              <FolderIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {workshop.name}
            </h3>
          </div>
          {canEdit && (
            <div className="flex space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(workshop);
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
                  onDelete(workshop);
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
        
        {workshop.description && (
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
            {workshop.description}
          </p>
        )}
        
        {/* Stats */}
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center">
              <BuildingOfficeIcon className="h-3 w-3 mr-1" />
              <span>{workshop.workstation_count || 0}</span>
            </div>
            <div className="flex items-center">
              <UserGroupIcon className="h-3 w-3 mr-1" />
              <span>{workshop.user_count || 0}</span>
            </div>
            <div className="flex items-center">
              <CogIcon className="h-3 w-3 mr-1" />
              <span>{workshop.product_count || 0}</span>
            </div>
          </div>
        </div>
        
        {workshop.methods && workshop.methods.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Methods:</div>
            <div className="flex flex-wrap gap-1">
              {workshop.methods.map((method) => (
                <span
                  key={method.id}
                  className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full"
                >
                  {method.username}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Sections: React.FC<SectionsProps> = ({ onNavigateToFamilies }) => {
  // const { t } = useI18nStore();
  const { hasRole } = useUserStore();
  const { canGoBack, goBack } = useNavigationHistory();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [workstations, setWorkstations] = useState<Workstation[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'workshops' | 'workstations'>('workshops');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Workshop | Workstation | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    workshop_id: '',
    manager_user_id: '',
    image_filename: ''
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const isAdmin = hasRole('admin');
  const isMethod = hasRole('method');

  // Handle drag end for workshops
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setWorkshops((items) => {
        const oldIndex = items.findIndex((item: any) => item.id === active.id);
        const newIndex = items.findIndex((item: any) => item.id === over?.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load workshops with counts and methods
      const workshopsData = await db.queryAll(`
        SELECT a.*, 
               COUNT(DISTINCT w.id) as workstation_count,
               COUNT(DISTINCT u2.id) as user_count,
               COUNT(DISTINCT p.id) as product_count
        FROM workshops a
        LEFT JOIN workstations w ON w.workshop_id = a.id
        LEFT JOIN users u2 ON u2.workshop_id = a.id
        LEFT JOIN products p ON p.workshop_id = a.id
        GROUP BY a.id
        ORDER BY a.name
      `);

      // Load methods for each workshop
      const workshopsWithMethods = await Promise.all(
        workshopsData.map(async (workshop) => {
          const methods = await db.queryAll(`
            SELECT u.id, u.username, u.role
            FROM workshop_methods am
            JOIN users u ON am.user_id = u.id
            WHERE am.workshop_id = ?
            ORDER BY u.username
          `, [workshop.id]);
          
          return {
            ...workshop,
            methods: methods
          };
        })
      );
      
      setWorkshops(workshopsWithMethods);

      // Load workstations with workshop info and user counts
      const workstationsData = await db.queryAll(`
        SELECT w.*, 
               a.name as workshop_name,
               COUNT(DISTINCT u.id) as user_count
        FROM workstations w
        LEFT JOIN workshops a ON w.workshop_id = a.id
        LEFT JOIN users u ON u.workstation_id = w.id
        GROUP BY w.id
        ORDER BY a.name, w.name
      `);
      setWorkstations(workstationsData);

      // Load users for manager selection
      const usersData = await db.queryAll(`
        SELECT id, username, role 
        FROM users 
        WHERE role IN ('admin', 'method', 'controle')
        ORDER BY username
      `);
      setUsers(usersData);

    } catch (error) {
      console.error('Error loading sections data:', error);
      toast.error('Failed to load sections data');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      location: '',
      workshop_id: '',
      manager_user_id: '',
      image_filename: ''
    });
    setImagePreview(null);
    setEditingItem(null);
    setShowForm(false);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image file is too large. Maximum size is 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        
        // Generate unique filename
        const timestamp = Date.now();
        const extension = file.name.split('.').pop() || 'jpg';
        const filename = `workshop-${timestamp}.${extension}`;
        
        try {
          // Store image using the new database system
          const success = await db.saveImageToStorage(filename, result);
          if (success) {
            setFormData(prev => ({ ...prev, image_filename: filename }));
            toast.success('Image uploaded successfully');
          } else {
            toast.error('Failed to save image');
          }
        } catch (error) {
          console.error('Error saving image:', error);
          toast.error('Failed to save image');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = async (item: Workshop | Workstation) => {
    setEditingItem(item);
    if ('workshop_id' in item) {
      // Workstation
      setFormData({
        name: item.name,
        description: item.description,
        location: item.location,
        workshop_id: item.workshop_id.toString(),
        manager_user_id: '',
        image_filename: ''
      });
    } else {
      // Atelier
      setFormData({
        name: item.name,
        description: item.description,
        location: '',
        workshop_id: '',
        manager_user_id: '', // item.manager_user_id?.toString() || '',
        image_filename: item.image_filename || ''
      });
      // Set image preview if editing workshop with image
      if (item.image_filename) {
        const imageData = await db.getImageFromStorage(item.image_filename);
        if (imageData) {
          setImagePreview(imageData);
        }
      }
    }
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    try {
      if (activeTab === 'workshops') {
        if (editingItem) {
          // Update workshop
          await db.execute(
            'UPDATE workshops SET name = ?, description = ?, manager_user_id = ?, image_filename = ? WHERE id = ?',
            [formData.name, formData.description, formData.manager_user_id || null, formData.image_filename || null, editingItem.id]
          );
          toast.success('Workshop updated successfully');
        } else {
          // Create workshop
          await db.execute(
            'INSERT INTO workshops (name, description, manager_user_id, image_filename) VALUES (?, ?, ?, ?)',
            [formData.name, formData.description, formData.manager_user_id || null, formData.image_filename || null]
          );
          toast.success('Workshop created successfully');
        }
      } else {
        if (!formData.workshop_id) {
          toast.error('Please select an workshop');
          return;
        }
        
        if (editingItem) {
          // Update workstation
          await db.execute(
            'UPDATE workstations SET name = ?, workshop_id = ?, description = ?, location = ? WHERE id = ?',
            [formData.name, parseInt(formData.workshop_id), formData.description, formData.location, editingItem.id]
          );
          toast.success('Workstation updated successfully');
        } else {
          // Create workstation
          await db.execute(
            'INSERT INTO workstations (name, workshop_id, description, location) VALUES (?, ?, ?, ?)',
            [formData.name, parseInt(formData.workshop_id), formData.description, formData.location]
          );
          toast.success('Workstation created successfully');
        }
      }

      // Database automatically saved in Electron mode
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving section:', error);
      toast.error('Failed to save section');
    }
  };

  const handleDelete = async (item: Workshop | Workstation) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) {
      return;
    }

    try {
      if ('workshop_id' in item) {
        // Delete workstation - check for dependencies first
        const userCount = await db.queryOne('SELECT COUNT(*) as count FROM users WHERE workstation_id = ?', [item.id]);
        const productCount = await db.queryOne('SELECT COUNT(*) as count FROM products WHERE workstation_id = ?', [item.id]);
        const measurementCount = await db.queryOne('SELECT COUNT(*) as count FROM measurements WHERE workstation_id = ?', [item.id]);
        
        const totalDependencies = (userCount?.count || 0) + (productCount?.count || 0) + (measurementCount?.count || 0);
        
        if (totalDependencies > 0) {
          toast.error(`Cannot delete workstation. It has ${totalDependencies} dependent records. Please reassign or delete them first.`);
          return;
        }
        
        await db.execute('DELETE FROM workstations WHERE id = ?', [item.id]);
        toast.success('Workstation deleted successfully');
      } else {
        // Delete workshop - check for dependencies first
        const workstationCount = await db.queryOne('SELECT COUNT(*) as count FROM workstations WHERE workshop_id = ?', [item.id]);
        const userCount = await db.queryOne('SELECT COUNT(*) as count FROM users WHERE workshop_id = ?', [item.id]);
        const productCount = await db.queryOne('SELECT COUNT(*) as count FROM products WHERE workshop_id = ?', [item.id]);
        const routeCount = await db.queryOne('SELECT COUNT(*) as count FROM routes WHERE workshop_id = ?', [item.id]);
        const measurementCount = await db.queryOne('SELECT COUNT(*) as count FROM measurements WHERE workshop_id = ?', [item.id]);
        const registrationCount = await db.queryOne('SELECT COUNT(*) as count FROM registration_codes WHERE workshop_id = ?', [item.id]);
        
        const totalDependencies = (workstationCount?.count || 0) + (userCount?.count || 0) + (productCount?.count || 0) + 
                                 (routeCount?.count || 0) + (measurementCount?.count || 0) + (registrationCount?.count || 0);
        
        if (totalDependencies > 0) {
          toast.error(`Cannot delete workshop. It has ${totalDependencies} dependent records. Please reassign or delete them first.`);
          return;
        }
        
        await db.execute('DELETE FROM workshops WHERE id = ?', [item.id]);
        toast.success('Workshop deleted successfully');
      }

      // Database automatically saved in Electron mode
      loadData();
    } catch (error) {
      console.error('Error deleting section:', error);
      toast.error('Failed to delete section');
    }
  };

  if (!isAdmin && !isMethod) {
    return (
      <div className="p-8">
        <div className="text-center">
          <BuildingOfficeIcon className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You need administrator or method privileges to access sections management.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-2">
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
            <BuildingOfficeIcon className="h-8 w-8 text-blue-600 dark:text-blue-400 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Sections Management
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Manage workshops (workshops) and workstations for production organization.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('workshops')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'workshops'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <FolderIcon className="h-5 w-5 inline mr-2" />
                Workshops ({workshops.length})
              </button>
              <button
                onClick={() => setActiveTab('workstations')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'workstations'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <CogIcon className="h-5 w-5 inline mr-2" />
                Workstations ({workstations.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Action Bar */}
        <div className="mb-6 flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {activeTab === 'workshops' 
              ? 'Workshops are sections that group related workstations and are managed by method users.'
              : 'Workstations are specific production stations within workshops where operators work.'
            }
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary flex items-center"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add {activeTab === 'workshops' ? 'Workshop' : 'Workstation'}
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {activeTab === 'workshops' ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={workshops.map(workshop => workshop.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {workshops.length === 0 ? (
                    <div className="col-span-full bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
                      <p className="text-gray-500 dark:text-gray-400 mb-4">No workshops found</p>
                      {(isAdmin || isMethod) && (
                        <button
                          onClick={() => setShowForm(true)}
                          className="btn btn-primary"
                        >
                          Add Your First Workshop
                        </button>
                      )}
                    </div>
                  ) : (
                    workshops.map((workshop) => (
                      <SortableWorkshopCard
                        key={workshop.id}
                        workshop={workshop}
                        onNavigateToFamilies={onNavigateToFamilies}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        canEdit={isAdmin || isMethod}
                      />
                    ))
                  )}
                </SortableContext>
              </DndContext>
            ) : (
              workstations.length === 0 ? (
                <div className="col-span-full bg-gray-50 dark:bg-gray-700 rounded-lg p-8 text-center">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">No workstations found</p>
                  {(isAdmin || isMethod) && (
                    <button
                      onClick={() => setShowForm(true)}
                      className="btn btn-primary"
                    >
                      Add Your First Workstation
                    </button>
                  )}
                </div>
              ) : (
                workstations.map((workstation) => (
                  <div 
                    key={workstation.id} 
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => onNavigateToFamilies?.(workstation.workshop_id)}
                    title="Click to view families for this workstation's workshop"
                  >
                    <div className="bg-gray-100 dark:bg-gray-700" style={{ aspectRatio: '16 / 9' }}>
                      <div className="w-full h-48 flex items-center justify-center">
                        <svg className="w-16 h-16 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center">
                          <CogIcon className="h-5 w-5 text-green-600 dark:text-green-400 mr-3" />
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {workstation.name}
                          </h3>
                        </div>
                        {(isAdmin || isMethod) && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEdit(workstation)}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(workstation)}
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
                      
                      {workstation.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">
                          {workstation.description}
                        </p>
                      )}
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center">
                            <FolderIcon className="h-3 w-3 mr-1" />
                            <span>{workstation.workshop_name}</span>
                          </div>
                          <div className="flex items-center">
                            <BuildingOfficeIcon className="h-3 w-3 mr-1" />
                            <span>{workstation.location}</span>
                          </div>
                          <div className="flex items-center">
                            <UserGroupIcon className="h-3 w-3 mr-1" />
                            <span>{workstation.user_count || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {editingItem ? 'Edit' : 'Add'} {activeTab === 'workshops' ? 'Workshop' : 'Workstation'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label block mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input w-full"
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
                    className="input w-full"
                    rows={3}
                  />
                </div>

                {activeTab === 'workshops' && (
                  <div>
                    <label className="label block mb-2">
                      Workshop Image
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
                            src={imagePreview || undefined} 
                            alt="Workshop preview" 
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
                          <p className="text-gray-500 dark:text-gray-400 text-sm">
                            No image selected
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'workshops' && (
                  <div>
                    <label className="label block mb-2">
                      Manager
                    </label>
                    <select
                      value={formData.manager_user_id}
                      onChange={(e) => setFormData({ ...formData, manager_user_id: e.target.value })}
                      className="input w-full"
                    >
                      <option value="">No manager assigned</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.username} ({user.role})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {activeTab === 'workstations' && (
                  <>
                    <div>
                      <label className="label block mb-2">
                        Atelier *
                      </label>
                      <select
                        value={formData.workshop_id}
                        onChange={(e) => setFormData({ ...formData, workshop_id: e.target.value })}
                        className="input w-full"
                        required
                      >
                        <option value="">Select a workshop</option>
                        {workshops.map((workshop) => (
                          <option key={workshop.id} value={workshop.id}>
                            {workshop.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label block mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className="input w-full"
                        placeholder="Building A - Floor 1"
                      />
                    </div>
                  </>
                )}

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="btn btn-primary flex-1"
                  >
                    {editingItem ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="btn btn-outline flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sections;
