import { useState, useEffect } from 'react';
import { registrationService } from '../../services/registrationService';
import { db } from '../../services/database';
import toast from 'react-hot-toast';

interface RegistrationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
}

const RegistrationForm = ({ onSuccess, onCancel, showCancel = false }: RegistrationFormProps) => {
  const [formData, setFormData] = useState({
    registrationCode: '',
    username: '',
    password: '',
    confirmPassword: '',
    selectedWorkshopId: '',
    selectedWorkstationId: '',
    selectedGroupId: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [codeValidation, setCodeValidation] = useState<{
    isValid: boolean;
    role?: string;
    workshopName?: string;
    workstationName?: string;
    groupName?: string;
  }>({ isValid: false });
  
  // Data for dropdowns
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [workstations, setWorkstations] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Load workshops and workstations on component mount
  useEffect(() => {
    loadWorkshopsAndWorkstations();
  }, []);

  // Load workstations when workshop changes
  useEffect(() => {
    if (formData.selectedWorkshopId) {
      loadWorkstationsForWorkshop(parseInt(formData.selectedWorkshopId));
    } else {
      setWorkstations([]);
      setFormData(prev => ({ ...prev, selectedWorkstationId: '' }));
    }
  }, [formData.selectedWorkshopId]);

  const loadWorkshopsAndWorkstations = async () => {
    try {
      setLoadingData(true);
      // Database is already initialized globally by App.tsx
      
      // Load workshops
      const workshopsData = await db.queryAll('SELECT * FROM workshops ORDER BY name');
      setWorkshops(workshopsData);
      
      // Load all workstations initially
      const workstationsData = await db.queryAll(`
        SELECT w.*, ws.name as workshop_name 
        FROM workstations w 
        LEFT JOIN workshops ws ON w.workshop_id = ws.id 
        ORDER BY ws.name, w.name
      `);
      setWorkstations(workstationsData);
      
      // Load groups
      const groupsData = await db.queryAll('SELECT * FROM groups ORDER BY name');
      setGroups(groupsData);
    } catch (error) {
      console.error('Error loading workshops, workstations, and groups:', error);
      toast.error('Failed to load workshops, workstations, and groups');
    } finally {
      setLoadingData(false);
    }
  };

  const loadWorkstationsForWorkshop = async (workshopId: number) => {
    try {
      const workstationsData = await db.queryAll(`
        SELECT w.*, ws.name as workshop_name 
        FROM workstations w 
        LEFT JOIN workshops ws ON w.workshop_id = ws.id 
        WHERE w.workshop_id = ?
        ORDER BY w.name
      `, [workshopId]);
      setWorkstations(workstationsData);
    } catch (error) {
      console.error('Error loading workstations for workshop:', error);
      toast.error('Failed to load workstations');
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.registrationCode.trim()) {
      newErrors.registrationCode = 'Registration code is required';
    } else if (!codeValidation.isValid) {
      newErrors.registrationCode = 'Invalid registration code';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters long';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Password validation based on role
    if (codeValidation.role === 'prod') {
      // Production users can have optional password
      if (formData.password && formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters long';
      }
    } else {
      // Other roles require password
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
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Workshop, workstation, and group validation
    if (!formData.selectedWorkshopId) {
      newErrors.selectedWorkshopId = 'Please select a workshop/section';
    }

    if (!formData.selectedWorkstationId) {
      newErrors.selectedWorkstationId = 'Please select a workstation';
    }

    if (!formData.selectedGroupId) {
      newErrors.selectedGroupId = 'Please select a group';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCodeChange = async (code: string) => {
    setFormData(prev => ({ ...prev, registrationCode: code }));
    
    // Clear previous validation
    setCodeValidation({ isValid: false });
    if (errors.registrationCode) {
      setErrors(prev => ({ ...prev, registrationCode: '' }));
    }

    // Validate code if it looks complete (2 letters + 6 numbers)
    if (code.length === 8 && /^[A-Z]{2}[0-9]{6}$/.test(code)) {
      try {
        const result = await registrationService.validateRegistrationCode(code);
        if (result.success && result.data) {
          setCodeValidation({
            isValid: true,
            role: result.data.role,
            workshopName: result.data.workshop_id ? 'Workshop ' + result.data.workshop_id : 'Any',
            workstationName: result.data.workstation_id ? 'Workstation ' + result.data.workstation_id : 'Any',
            groupName: result.data.group_id ? 'Group ' + result.data.group_id : 'Default'
          });
        } else {
          setCodeValidation({ isValid: false });
        }
      } catch (error) {
        console.error('Code validation error:', error);
        setCodeValidation({ isValid: false });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const result = await registrationService.submitRegistrationRequest({
        registrationCode: formData.registrationCode,
        username: formData.username,
        password: formData.password || undefined,
        requestedWorkshopId: parseInt(formData.selectedWorkshopId),
        requestedWorkstationId: parseInt(formData.selectedWorkstationId),
        requestedGroupId: parseInt(formData.selectedGroupId)
      });
      
      if (result.success) {
        toast.success('Registration request submitted successfully! Your request is pending approval from an admin or section method user.');
        onSuccess?.();
      } else {
        setErrors({ general: result.message });
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ general: 'An unexpected error occurred' });
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'registrationCode') {
      handleCodeChange(value.toUpperCase());
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Create Account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Register with your provided registration code
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
              <label htmlFor="registrationCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Registration Code
              </label>
              <input
                id="registrationCode"
                name="registrationCode"
                type="text"
                required
                value={formData.registrationCode}
                onChange={(e) => handleInputChange('registrationCode', e.target.value)}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors.registrationCode ? 'border-red-300 dark:border-red-600' : 
                  codeValidation.isValid ? 'border-green-300 dark:border-green-600' : 'border-gray-300 dark:border-gray-600'
                } placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm dark:bg-gray-700 uppercase`}
                placeholder="Enter registration code (e.g., AB123456)"
                maxLength={8}
              />
              {errors.registrationCode && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.registrationCode}</p>
              )}
              {codeValidation.isValid && (
                <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    <strong>Role:</strong> {codeValidation.role}
                    {codeValidation.workshopName && (
                      <><br /><strong>Workshop:</strong> {codeValidation.workshopName}</>
                    )}
                    {codeValidation.workstationName && (
                      <><br /><strong>Workstation:</strong> {codeValidation.workstationName}</>
                    )}
                    {codeValidation.groupName && (
                      <><br /><strong>Group:</strong> {codeValidation.groupName}</>
                    )}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Username
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
                placeholder="Choose a username"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.username}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password {codeValidation.role === 'prod' && <span className="text-gray-500">(Optional)</span>}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required={codeValidation.role !== 'prod'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                  errors.password ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                } placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm dark:bg-gray-700`}
                placeholder={codeValidation.role === 'prod' ? 'Optional password' : 'Enter password'}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>
              )}
              {codeValidation.role !== 'prod' && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Password must be at least 8 characters with uppercase, lowercase, and number
                </p>
              )}
            </div>

            {formData.password && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${
                    errors.confirmPassword ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                  } placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm dark:bg-gray-700`}
                  placeholder="Confirm your password"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confirmPassword}</p>
                )}
              </div>
            )}

            {/* Workshop Selection */}
            <div>
              <label htmlFor="selectedWorkshopId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Workshop/Section *
              </label>
              <select
                id="selectedWorkshopId"
                name="selectedWorkshopId"
                value={formData.selectedWorkshopId}
                onChange={(e) => handleInputChange('selectedWorkshopId', e.target.value)}
                className={`mt-1 block w-full px-3 py-2 border ${
                  errors.selectedWorkshopId ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm`}
                disabled={loadingData}
              >
                <option value="">Select a workshop/section</option>
                {workshops.map((workshop) => (
                  <option key={workshop.id} value={workshop.id}>
                    {workshop.name}
                  </option>
                ))}
              </select>
              {errors.selectedWorkshopId && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.selectedWorkshopId}</p>
              )}
            </div>

            {/* Workstation Selection */}
            <div>
              <label htmlFor="selectedWorkstationId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Workstation *
              </label>
              <select
                id="selectedWorkstationId"
                name="selectedWorkstationId"
                value={formData.selectedWorkstationId}
                onChange={(e) => handleInputChange('selectedWorkstationId', e.target.value)}
                className={`mt-1 block w-full px-3 py-2 border ${
                  errors.selectedWorkstationId ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm`}
                disabled={loadingData || !formData.selectedWorkshopId}
              >
                <option value="">Select a workstation</option>
                {workstations.map((workstation) => (
                  <option key={workstation.id} value={workstation.id}>
                    {workstation.name} {workstation.workshop_name && `(${workstation.workshop_name})`}
                  </option>
                ))}
              </select>
              {errors.selectedWorkstationId && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.selectedWorkstationId}</p>
              )}
              {!formData.selectedWorkshopId && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Please select a workshop first
                </p>
              )}
            </div>

            {/* Group Selection */}
            <div>
              <label htmlFor="selectedGroupId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Group *
              </label>
              <select
                id="selectedGroupId"
                name="selectedGroupId"
                value={formData.selectedGroupId}
                onChange={(e) => handleInputChange('selectedGroupId', e.target.value)}
                className={`mt-1 block w-full px-3 py-2 border ${
                  errors.selectedGroupId ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm`}
                disabled={loadingData}
              >
                <option value="">Select a group</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              {errors.selectedGroupId && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.selectedGroupId}</p>
              )}
            </div>
          </div>

          <div className="flex space-x-3">
            {showCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                Cancel
              </button>
            )}
            
            <button
              type="submit"
              disabled={loading || !codeValidation.isValid}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </div>
              ) : (
                'Submit Registration'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  // Switch to login form
                  window.location.href = '/login';
                }}
                className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
              >
                Sign in
              </button>
            </p>
          </div>
        </form>

        {/* Registration info */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
            Registration Process
          </h3>
          <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <p>1. Enter your registration code (format: AB123456)</p>
            <p>2. Choose a username and password</p>
            <p>3. Submit your registration request</p>
            <p>4. Wait for approval from administrators</p>
            <p>5. You'll be notified when your account is ready</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationForm;
