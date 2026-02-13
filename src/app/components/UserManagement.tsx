/**
 * 👥 USER MANAGEMENT COMPONENT
 * 
 * Create, edit, and manage users from within the app.
 * Only accessible to OWNER role.
 */

import React, { useState, useEffect } from 'react';
import { Panel } from '@/app/components/Panel';
import { DataTable, Column } from '@/app/components/DataTable';
import { TextInput, SelectInput } from '@/app/components/FormField';
import { Badge } from '@/app/components/Badge';
import {
  UserPlus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Key,
  RefreshCw,
  X,
  Save,
  Users,
} from 'lucide-react';
import { cn } from '@/app/components/ui/utils';
import {
  getAllUsers,
  createUser,
  updateUser,
  activateUser,
  deactivateUser,
  resetUserPassword,
  type User,
  type CreateUserRequest,
} from '@/app/utils/user-management';

interface Location {
  id: string;
  location_name: string;
  location_type: string;
}

interface UserManagementProps {
  currentUserRole: string;
  locations: Location[];
}

export function UserManagement({ currentUserRole, locations }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Form state for create user
  const [newUser, setNewUser] = useState<CreateUserRequest>({
    email: '',
    password: '',
    username: '',
    full_name: '',
    role: 'STORE_STAFF',
    location_id: '',
    phone: '',
  });
  
  // Form state for edit user
  const [editedUser, setEditedUser] = useState<Partial<User>>({});
  
  // Password reset state
  const [newPassword, setNewPassword] = useState('');

  // Check if user is OWNER
  const isOwner = currentUserRole === 'OWNER';

  useEffect(() => {
    if (isOwner) {
      loadUsers();
    }
  }, [isOwner]);

  const loadUsers = async () => {
    setLoading(true);
    const userList = await getAllUsers();
    setUsers(userList);
    setLoading(false);
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.username || !newUser.full_name || !newUser.location_id) {
      alert('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    
    const result = await createUser(newUser);
    
    if ('error' in result) {
      alert(`Error: ${result.error}`);
      setLoading(false);
      return;
    }
    
    alert('User created successfully!');
    
    // Reset form
    setNewUser({
      email: '',
      password: '',
      username: '',
      full_name: '',
      role: 'STORE_STAFF',
      location_id: '',
      phone: '',
    });
    
    setShowCreateDialog(false);
    loadUsers();
    setLoading(false);
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;
    
    setLoading(true);
    
    const result = await updateUser({
      id: selectedUser.id,
      username: editedUser.username,
      full_name: editedUser.full_name,
      role: editedUser.role,
      location_id: editedUser.location_id,
      phone: editedUser.phone,
    });
    
    if (!result.success) {
      alert(`Error: ${result.error}`);
      setLoading(false);
      return;
    }
    
    alert('User updated successfully!');
    setShowEditDialog(false);
    setSelectedUser(null);
    loadUsers();
    setLoading(false);
  };

  const handleToggleActive = async (user: User) => {
    const confirmMsg = user.is_active 
      ? `Deactivate user ${user.username}?` 
      : `Activate user ${user.username}?`;
    
    if (!confirm(confirmMsg)) return;
    
    setLoading(true);
    
    const result = user.is_active 
      ? await deactivateUser(user.id)
      : await activateUser(user.id);
    
    if (!result.success) {
      alert('Failed to update user status');
    }
    
    loadUsers();
    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    
    const result = await resetUserPassword(selectedUser.id, newPassword);
    
    if (!result.success) {
      alert(`Error: ${result.error}`);
      setLoading(false);
      return;
    }
    
    alert('Password reset successfully!');
    setShowPasswordDialog(false);
    setSelectedUser(null);
    setNewPassword('');
    setLoading(false);
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditedUser({
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      location_id: user.location_id,
      phone: user.phone,
    });
    setShowEditDialog(true);
  };

  const openPasswordDialog = (user: User) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowPasswordDialog(true);
  };

  // User table columns
  const userColumns: Column<User>[] = [
    {
      key: 'username',
      header: 'Username',
      sortable: true,
    },
    {
      key: 'full_name',
      header: 'Full Name',
      sortable: true,
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      render: (value) => (
        <Badge variant={
          value === 'OWNER' ? 'primary' :
          value === 'MANAGER' ? 'success' :
          value === 'STORE_STAFF' ? 'info' :
          'default'
        }>
          {value.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'location_name',
      header: 'Location',
      sortable: true,
    },
    {
      key: 'phone',
      header: 'Phone',
      sortable: false,
    },
    {
      key: 'is_active',
      header: 'Status',
      sortable: true,
      render: (value) => (
        <Badge variant={value ? 'success' : 'destructive'}>
          {value ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'id',
      header: 'Actions',
      sortable: false,
      width: '200px',
      render: (value, row) => (
        <div className="flex gap-1">
          <button
            onClick={() => openEditDialog(row)}
            className="p-1.5 hover:bg-[var(--secondary)] rounded-[2px]"
            title="Edit user"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => openPasswordDialog(row)}
            className="p-1.5 hover:bg-[var(--secondary)] rounded-[2px]"
            title="Reset password"
          >
            <Key className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleToggleActive(row)}
            className={cn(
              'p-1.5 rounded-[2px]',
              row.is_active 
                ? 'text-[var(--destructive)] hover:bg-[var(--destructive)]/10'
                : 'text-[var(--success)] hover:bg-[var(--success)]/10'
            )}
            title={row.is_active ? 'Deactivate' : 'Activate'}
          >
            {row.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          </button>
        </div>
      ),
    },
  ];

  if (!isOwner) {
    return (
      <div className="p-8 text-center">
        <div className="text-[var(--muted-foreground)]">
          Only OWNER role can manage users.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-[var(--primary)]" />
          <div>
            <h2 className="text-2xl font-bold">User Management</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              Create and manage system users
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setShowCreateDialog(true)}
          disabled={loading}
          className="h-10 px-4 bg-[var(--primary)] text-white rounded-[4px] hover:bg-[var(--primary-hover)] flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create User</span>
        </button>
      </div>

      {/* Users Table */}
      <Panel title={`All Users (${users.length})`}>
        {loading && users.length === 0 ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-[var(--primary)]" />
            <div className="text-[var(--muted-foreground)]">Loading users...</div>
          </div>
        ) : (
          <DataTable
            data={users}
            columns={userColumns}
            emptyMessage="No users found"
          />
        )}
      </Panel>

      {/* Create User Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Create New User</h3>
              <button onClick={() => setShowCreateDialog(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold mb-1">Email *</label>
                <TextInput
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-1">Password *</label>
                <TextInput
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-1">Username *</label>
                <TextInput
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder="johndoe"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-1">Full Name *</label>
                <TextInput
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-1">Role *</label>
                <SelectInput
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                >
                  <option value="STORE_STAFF">Store Staff</option>
                  <option value="GODOWN_STAFF">Godown Staff</option>
                  <option value="MANAGER">Manager</option>
                  <option value="OWNER">Owner</option>
                </SelectInput>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-1">Location *</label>
                <SelectInput
                  value={newUser.location_id}
                  onChange={(e) => setNewUser({ ...newUser, location_id: e.target.value })}
                >
                  <option value="">Select location...</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.location_name} ({loc.location_type})
                    </option>
                  ))}
                </SelectInput>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-1">Phone</label>
                <TextInput
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowCreateDialog(false)}
                disabled={loading}
                className="flex-1 h-10 px-4 rounded-lg border border-[var(--border)] bg-white hover:bg-[var(--secondary)]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                disabled={loading}
                className="flex-1 h-10 px-4 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Create User</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Dialog */}
      {showEditDialog && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Edit User</h3>
              <button onClick={() => setShowEditDialog(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold mb-1">Email (read-only)</label>
                <TextInput
                  value={selectedUser.email}
                  disabled
                  className="bg-[var(--muted)]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-1">Username</label>
                <TextInput
                  value={editedUser.username || ''}
                  onChange={(e) => setEditedUser({ ...editedUser, username: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-1">Full Name</label>
                <TextInput
                  value={editedUser.full_name || ''}
                  onChange={(e) => setEditedUser({ ...editedUser, full_name: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-1">Role</label>
                <SelectInput
                  value={editedUser.role || 'STORE_STAFF'}
                  onChange={(e) => setEditedUser({ ...editedUser, role: e.target.value as any })}
                >
                  <option value="STORE_STAFF">Store Staff</option>
                  <option value="GODOWN_STAFF">Godown Staff</option>
                  <option value="MANAGER">Manager</option>
                  <option value="OWNER">Owner</option>
                </SelectInput>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-1">Location</label>
                <SelectInput
                  value={editedUser.location_id || ''}
                  onChange={(e) => setEditedUser({ ...editedUser, location_id: e.target.value })}
                >
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.location_name} ({loc.location_type})
                    </option>
                  ))}
                </SelectInput>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-1">Phone</label>
                <TextInput
                  value={editedUser.phone || ''}
                  onChange={(e) => setEditedUser({ ...editedUser, phone: e.target.value })}
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowEditDialog(false)}
                disabled={loading}
                className="flex-1 h-10 px-4 rounded-lg border border-[var(--border)] bg-white hover:bg-[var(--secondary)]"
              >
                Cancel
              </button>
              <button
                onClick={handleEditUser}
                disabled={loading}
                className="flex-1 h-10 px-4 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Dialog */}
      {showPasswordDialog && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Reset Password</h3>
              <button onClick={() => setShowPasswordDialog(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <div className="text-sm text-[var(--muted-foreground)] mb-4">
                Reset password for: <strong>{selectedUser.email}</strong>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-1">New Password</label>
                <TextInput
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowPasswordDialog(false)}
                disabled={loading}
                className="flex-1 h-10 px-4 rounded-lg border border-[var(--border)] bg-white hover:bg-[var(--secondary)]"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={loading}
                className="flex-1 h-10 px-4 rounded-lg bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4" />
                    <span>Reset Password</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
