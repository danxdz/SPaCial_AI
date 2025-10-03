import { useEffect, useState } from 'react';
import { registrationService } from '../../services/registrationService';
import { db } from '../../services/database';
import { useUserStore } from '../../stores/useUserStore';
import toast from 'react-hot-toast';

interface RegistrationCode {
  id: number;
  code: string;
  role: string;
  workshop_id?: number;
  workstation_id?: number;
  group_id?: number;
  created_by: number;
  expires_at?: string;
  used_at?: string;
  used_by?: number;
  created_at: string;
  workshop_name?: string;
  workstation_name?: string;
  group_name?: string;
  created_by_username?: string;
  used_by_username?: string;
}

interface Workshop {
  id: number;
  name: string;
}

interface Workstation {
  id: number;
  name: string;
  workshop_id: number;
}

interface Group {
  id: number;
  name: string;
}

const RegistrationCodes = () => {
  const { currentUser } = useUserStore();
  const [codes, setCodes] = useState<RegistrationCode[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [workstations, setWorkstations] = useState<Workstation[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    role: 'prod',
    workshopId: '',
    workstationId: '',
    groupId: '',
    expiresInHours: 24
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Database is initialized globally in App.tsx

      // Load registration codes
      const codesData = await db.queryAll(`
        SELECT rc.*,
               ws.name as workshop_name,
               w.name as workstation_name,
               g.name as group_name,
               creator.username as created_by_username,
               user.username as used_by_username
        FROM registration_codes rc
        LEFT JOIN workshops ws ON rc.workshop_id = ws.id
        LEFT JOIN workstations w ON rc.workstation_id = w.id
        LEFT JOIN groups g ON rc.group_id = g.id
        LEFT JOIN users creator ON rc.created_by = creator.id
        LEFT JOIN users user ON rc.used_by = user.id
        ORDER BY rc.created_at DESC
      `);
      setCodes(codesData);

      // Load workshops
      const workshopsData = await db.queryAll('SELECT id, name FROM workshops ORDER BY name');
      setWorkshops(workshopsData);

      // Load workstations
      const workstationsData = await db.queryAll(`
        SELECT w.id, w.name, w.workshop_id
        FROM workstations w
        ORDER BY w.name
      `);
      setWorkstations(workstationsData);

      // Load groups
      const groupsData = await db.queryAll('SELECT id, name FROM groups ORDER BY name');
      setGroups(groupsData);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCode = async () => {
    try {
      const result = await registrationService.createRegistrationCode(
        createForm.role,
        currentUser!.id,
        createForm.workshopId ? parseInt(createForm.workshopId) : undefined,
        createForm.workstationId ? parseInt(createForm.workstationId) : undefined,
        createForm.groupId ? parseInt(createForm.groupId) : undefined,
        createForm.expiresInHours
      );

      if (result.success) {
        toast.success(`Registration code created: ${result.code}`);
        setShowCreateModal(false);
        setCreateForm({
          role: 'prod',
          workshopId: '',
          workstationId: '',
          groupId: '',
          expiresInHours: 24
        });
        loadData();
      } else {
        toast.error(result.error || 'Failed to create registration code');
      }
    } catch (error) {
      console.error('Error creating code:', error);
      toast.error('Failed to create registration code');
    }
  };

  const getStatusBadge = (code: RegistrationCode) => {
    if (code.used_at) {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          Used
        </span>
      );
    }

    if (code.expires_at && new Date(code.expires_at) < new Date()) {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          Expired
        </span>
      );
    }

    return (
      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
        Active
      </span>
    );
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      controle: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      method: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      prod: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colors[role as keyof typeof colors] || 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-300'}`}>
        {role}
      </span>
    );
  };

  const filteredWorkstations = workstations.filter(w => 
    !createForm.workshopId || w.workshop_id === parseInt(createForm.workshopId)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Registration Codes
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage registration codes for new user accounts
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
        >
          Create Code
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Assignment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Expires
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Used By
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {codes.map((code) => (
                <tr key={code.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white font-mono">
                      {code.code}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      by {code.created_by_username}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleBadge(code.role)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {code.workshop_name && (
                        <div>Workshop: {code.workshop_name}</div>
                      )}
                      {code.workstation_name && (
                        <div>Workstation: {code.workstation_name}</div>
                      )}
                      {code.group_name && (
                        <div>Group: {code.group_name}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(code)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(code.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {code.expires_at ? new Date(code.expires_at).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {code.used_by_username || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Code Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Create Registration Code
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Role
                  </label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="prod">Production</option>
                    <option value="controle">Controle</option>
                    <option value="method">Method</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Atelier (Optional)
                  </label>
                  <select
                    value={createForm.workshopId}
                    onChange={(e) => setCreateForm(prev => ({ 
                      ...prev, 
                      workshopId: e.target.value,
                      workstationId: '' // Reset workstation when workshop changes
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select Workshop</option>
                    {workshops.map(workshop => (
                      <option key={workshop.id} value={workshop.id}>
                        {workshop.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Workstation (Optional)
                  </label>
                  <select
                    value={createForm.workstationId}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, workstationId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    disabled={!createForm.workshopId}
                  >
                    <option value="">Select Workstation</option>
                    {filteredWorkstations.map(workstation => (
                      <option key={workstation.id} value={workstation.id}>
                        {workstation.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Group (Optional)
                  </label>
                  <select
                    value={createForm.groupId}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, groupId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select Group</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Expires In (Hours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={createForm.expiresInHours}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, expiresInHours: parseInt(e.target.value) || 24 }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateForm({
                      role: 'prod',
                      workshopId: '',
                      workstationId: '',
                      groupId: '',
                      expiresInHours: 24
                    });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCode}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                >
                  Create Code
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistrationCodes;
