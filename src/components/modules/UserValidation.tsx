import { useEffect, useState } from 'react';
import { registrationService } from '../../services/registrationService';
import { useUserStore } from '../../stores/useUserStore';
import toast from 'react-hot-toast';

interface ValidationRequest {
  id: number;
  registration_code: string;
  username: string;
  requested_role: string;
  requested_workshop_id?: number;
  requested_workstation_id?: number;
  requested_group_id?: number;
  status: 'pending' | 'approved' | 'rejected';
  validated_by?: number;
  validated_at?: string;
  rejection_reason?: string;
  created_at: string;
  workshop_name?: string;
  workstation_name?: string;
  group_name?: string;
  validated_by_username?: string;
}

const UserValidation = () => {
  const { currentUser } = useUserStore();
  const [requests, setRequests] = useState<ValidationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ValidationRequest | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [editingDetails, setEditingDetails] = useState({
    workshopId: '',
    workstationId: '',
    groupId: '',
    password: ''
  });
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [workstations, setWorkstations] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);

  useEffect(() => {
    loadValidationRequests();
    loadEditingData();
  }, []);

  const loadEditingData = async () => {
    try {
      const { db } = await import('../../services/database');
      // Database is already initialized globally by App.tsx
      
      // Load workshops
      const workshopsData = await db.queryAll('SELECT * FROM workshops ORDER BY name');
      setWorkshops(workshopsData);
      
      // Load workstations
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
      console.error('Error loading editing data:', error);
      toast.error('Failed to load editing data');
    }
  };

  const loadValidationRequests = async () => {
    try {
      setLoading(true);
      const requests = await registrationService.getPendingValidationRequests();
      setRequests(requests);
    } catch (error) {
      console.error('Error loading validation requests:', error);
      toast.error('Failed to load validation requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: ValidationRequest) => {
    setSelectedRequest(request);
    
    // Initialize editing details with current request data
    setEditingDetails({
      workshopId: request.requested_workshop_id?.toString() || '',
      workstationId: request.requested_workstation_id?.toString() || '',
      groupId: request.requested_group_id?.toString() || '',
      password: ''
    });
    
    setShowApprovalModal(true);
  };

  const approveRequest = async (requestId: number, details: {
    workshopId?: number;
    workstationId?: number;
    groupId?: number;
    password?: string;
  }) => {
    try {
      const result = await registrationService.approveRegistrationRequest(
        requestId,
        currentUser!.id,
        details.password,
        details.workshopId,
        details.workstationId,
        details.groupId
      );

      if (result.success) {
        toast.success('Registration request approved successfully');
        loadValidationRequests();
        setShowApprovalModal(false);
        setShowPasswordModal(false);
        setPassword('');
      } else {
        toast.error(result.error || 'Failed to approve request');
      }
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request');
    }
  };

  const handleReject = (request: ValidationRequest) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
  };

  const rejectRequest = async () => {
    if (!selectedRequest || !rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      const result = await registrationService.rejectRegistrationRequest(
        selectedRequest.id,
        currentUser!.id,
        rejectReason
      );

      if (result.success) {
        toast.success('Registration request rejected');
        loadValidationRequests();
        setShowRejectModal(false);
        setRejectReason('');
        setSelectedRequest(null);
      } else {
        toast.error(result.error || 'Failed to reject request');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    }
  };

  const canValidateRequest = (request: ValidationRequest): boolean => {
    if (!currentUser) return false;

    // Admins can validate all requests
    if (currentUser.role === 'admin') return true;

    // Method users can validate requests for their workshop
    if (currentUser.role === 'method' && request.requested_workshop_id === currentUser.workshop_id) {
      return true;
    }

    return false;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            Rejected
          </span>
        );
      default:
        return null;
    }
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
            User Validation Requests
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Review and approve new user registration requests
          </p>
        </div>
        <button
          onClick={loadValidationRequests}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
        >
          Refresh
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No pending requests</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            There are no pending user validation requests at this time.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    User
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
                    Requested
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {requests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {request.username}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Code: {request.registration_code}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(request.requested_role)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {request.workshop_name && (
                          <div>Workshop: {request.workshop_name}</div>
                        )}
                        {request.workstation_name && (
                          <div>Workstation: {request.workstation_name}</div>
                        )}
                        {request.group_name && (
                          <div>Group: {request.group_name}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(request.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {canValidateRequest(request) && request.status === 'pending' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleApprove(request)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(request)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Set Password for {selectedRequest.username}
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter password"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Password must be at least 8 characters with uppercase, lowercase, and number
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPassword('');
                    setSelectedRequest(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => approveRequest(selectedRequest.id, { password })}
                  disabled={password.length < 8}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Approve Registration Request - {selectedRequest.username}
              </h3>
              
              <div className="space-y-4">
                {/* Workshop Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Workshop/Section
                  </label>
                  <select
                    value={editingDetails.workshopId}
                    onChange={(e) => setEditingDetails(prev => ({ ...prev, workshopId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select workshop</option>
                    {workshops.map((workshop) => (
                      <option key={workshop.id} value={workshop.id}>
                        {workshop.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Workstation Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Workstation
                  </label>
                  <select
                    value={editingDetails.workstationId}
                    onChange={(e) => setEditingDetails(prev => ({ ...prev, workstationId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select workstation</option>
                    {workstations
                      .filter(ws => !editingDetails.workshopId || ws.workshop_id == editingDetails.workshopId)
                      .map((workstation) => (
                        <option key={workstation.id} value={workstation.id}>
                          {workstation.name} {workstation.workshop_name && `(${workstation.workshop_name})`}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Group Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Group
                  </label>
                  <select
                    value={editingDetails.groupId}
                    onChange={(e) => setEditingDetails(prev => ({ ...prev, groupId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select group</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Password (for non-prod users) */}
                {selectedRequest.requested_role !== 'prod' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Password (Required for {selectedRequest.requested_role} users)
                    </label>
                    <input
                      type="password"
                      value={editingDetails.password}
                      onChange={(e) => setEditingDetails(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Enter password"
                    />
                  </div>
                )}

                {/* Password (optional for prod users) */}
                {selectedRequest.requested_role === 'prod' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Password (Optional for production users)
                    </label>
                    <input
                      type="password"
                      value={editingDetails.password}
                      onChange={(e) => setEditingDetails(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Optional password (leave blank for auto-generated)"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setEditingDetails({ workshopId: '', workstationId: '', groupId: '', password: '' });
                    setSelectedRequest(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => approveRequest(selectedRequest.id, {
                    workshopId: editingDetails.workshopId ? parseInt(editingDetails.workshopId) : undefined,
                    workstationId: editingDetails.workstationId ? parseInt(editingDetails.workstationId) : undefined,
                    groupId: editingDetails.groupId ? parseInt(editingDetails.groupId) : undefined,
                    password: editingDetails.password || undefined
                  })}
                  disabled={selectedRequest.requested_role !== 'prod' && editingDetails.password.length < 8}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Reject Registration Request
              </h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason for Rejection
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                  rows={3}
                  placeholder="Please provide a reason for rejection..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                    setSelectedRequest(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={rejectRequest}
                  disabled={!rejectReason.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserValidation;
