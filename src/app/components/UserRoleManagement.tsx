import React, { useState } from 'react';
import { Panel } from '@/app/components/Panel';
import { FormField, TextInput } from '@/app/components/FormField';
import { DataTable, Column } from '@/app/components/DataTable';
import { Badge } from '@/app/components/Badge';
import {
  Shield,
  UserPlus,
  Search,
  Edit,
  Key,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lock,
  Unlock,
  Save,
  X,
  UserCog,
  MapPin,
  Calendar,
  Activity,
} from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

type UserRole = 'owner' | 'manager' | 'store-staff' | 'godown-staff' | 'accountant';

interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  locations: string[];
  isActive: boolean;
  createdDate: string;
  lastLogin: string;
  createdBy: string;
}

interface Location {
  id: string;
  name: string;
  type: 'store' | 'godown' | 'office';
}

const roleConfig: Record<UserRole, { label: string; color: string; permissions: string[] }> = {
  owner: {
    label: 'Owner',
    color: 'bg-purple-600',
    permissions: ['Full System Access', 'User Management', 'Financial Reports', 'System Settings'],
  },
  manager: {
    label: 'Manager',
    color: 'bg-blue-600',
    permissions: ['Multi-Location Access', 'Reports', 'Inventory Management', 'Staff Oversight'],
  },
  'store-staff': {
    label: 'Store Staff',
    color: 'bg-green-600',
    permissions: ['POS Billing', 'Exchange Processing', 'Stock Viewing', 'Customer Service'],
  },
  'godown-staff': {
    label: 'Godown Staff',
    color: 'bg-orange-600',
    permissions: ['Inward Entry', 'Outward Entry', 'Stock Transfer', 'Inventory Counting'],
  },
  accountant: {
    label: 'Accountant',
    color: 'bg-teal-600',
    permissions: ['Financial Reports', 'Payment Records', 'GST Filing', 'Ledger Management'],
  },
};

const mockLocations: Location[] = [
  { id: 'loc-1', name: 'Main Store - Pune', type: 'store' },
  { id: 'loc-2', name: 'Ahmedabad Branch', type: 'store' },
  { id: 'loc-3', name: 'Mumbai Showroom', type: 'store' },
  { id: 'loc-4', name: 'Central Godown', type: 'godown' },
  { id: 'loc-5', name: 'Head Office', type: 'office' },
];

const mockUsers: User[] = [
  {
    id: 'usr-1',
    username: 'raj.jariwala',
    fullName: 'Raj Jariwala',
    email: 'raj@retailpro.com',
    role: 'owner',
    locations: ['loc-1', 'loc-2', 'loc-3', 'loc-4', 'loc-5'],
    isActive: true,
    createdDate: '2024-01-15',
    lastLogin: '2026-01-30 09:45:23',
    createdBy: 'System',
  },
  {
    id: 'usr-2',
    username: 'priya.sharma',
    fullName: 'Priya Sharma',
    email: 'priya.sharma@retailpro.com',
    role: 'manager',
    locations: ['loc-1', 'loc-2', 'loc-4'],
    isActive: true,
    createdDate: '2024-03-20',
    lastLogin: '2026-01-30 08:30:15',
    createdBy: 'raj.jariwala',
  },
  {
    id: 'usr-3',
    username: 'amit.patel',
    fullName: 'Amit Patel',
    email: 'amit.patel@retailpro.com',
    role: 'store-staff',
    locations: ['loc-1'],
    isActive: true,
    createdDate: '2024-05-10',
    lastLogin: '2026-01-29 18:20:45',
    createdBy: 'priya.sharma',
  },
  {
    id: 'usr-4',
    username: 'vikram.singh',
    fullName: 'Vikram Singh',
    email: 'vikram.singh@retailpro.com',
    role: 'godown-staff',
    locations: ['loc-4'],
    isActive: true,
    createdDate: '2024-06-01',
    lastLogin: '2026-01-30 07:15:30',
    createdBy: 'priya.sharma',
  },
  {
    id: 'usr-5',
    username: 'neha.kulkarni',
    fullName: 'Neha Kulkarni',
    email: 'neha.kulkarni@retailpro.com',
    role: 'accountant',
    locations: ['loc-5'],
    isActive: true,
    createdDate: '2024-07-15',
    lastLogin: '2026-01-30 10:00:00',
    createdBy: 'raj.jariwala',
  },
  {
    id: 'usr-6',
    username: 'karan.mehta',
    fullName: 'Karan Mehta',
    email: 'karan.mehta@retailpro.com',
    role: 'store-staff',
    locations: ['loc-2'],
    isActive: true,
    createdDate: '2025-02-10',
    lastLogin: '2026-01-28 17:45:12',
    createdBy: 'priya.sharma',
  },
  {
    id: 'usr-7',
    username: 'sanjay.rao',
    fullName: 'Sanjay Rao',
    email: 'sanjay.rao@retailpro.com',
    role: 'store-staff',
    locations: ['loc-3'],
    isActive: false,
    createdDate: '2025-08-20',
    lastLogin: '2026-01-15 12:30:00',
    createdBy: 'priya.sharma',
  },
];

export function UserRoleManagement() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);

  // New/Edit user form state
  const [formUsername, setFormUsername] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('store-staff');
  const [formLocations, setFormLocations] = useState<string[]>([]);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formPassword, setFormPassword] = useState('');

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      searchTerm === '' ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && user.isActive) ||
      (statusFilter === 'inactive' && !user.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Start editing user
  const startEditUser = (user: User) => {
    setEditingUser(user);
    setFormUsername(user.username);
    setFormFullName(user.fullName);
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormLocations([...user.locations]);
    setFormIsActive(user.isActive);
    setFormPassword('');
    setIsAddingUser(false);
  };

  // Start adding user
  const startAddUser = () => {
    setEditingUser(null);
    setFormUsername('');
    setFormFullName('');
    setFormEmail('');
    setFormRole('store-staff');
    setFormLocations([]);
    setFormIsActive(true);
    setFormPassword('');
    setIsAddingUser(true);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingUser(null);
    setIsAddingUser(false);
  };

  // Save user
  const saveUser = () => {
    if (!formUsername || !formFullName || !formEmail || formLocations.length === 0) {
      alert('Please fill all required fields');
      return;
    }

    if (isAddingUser && !formPassword) {
      alert('Please set a password for the new user');
      return;
    }

    if (isAddingUser) {
      // Add new user
      const newUser: User = {
        id: `usr-${Date.now()}`,
        username: formUsername,
        fullName: formFullName,
        email: formEmail,
        role: formRole,
        locations: formLocations,
        isActive: formIsActive,
        createdDate: new Date().toISOString().split('T')[0],
        lastLogin: 'Never',
        createdBy: 'raj.jariwala', // Current user
      };
      setUsers([...users, newUser]);
      alert('User created successfully!');
    } else if (editingUser) {
      // Update existing user
      setUsers(
        users.map((user) =>
          user.id === editingUser.id
            ? {
                ...user,
                username: formUsername,
                fullName: formFullName,
                email: formEmail,
                role: formRole,
                locations: formLocations,
                isActive: formIsActive,
              }
            : user
        )
      );
      alert('User updated successfully!');
    }

    cancelEdit();
  };

  // Toggle user active status
  const toggleUserStatus = (userId: string) => {
    setUsers(
      users.map((user) =>
        user.id === userId ? { ...user, isActive: !user.isActive } : user
      )
    );
  };

  // Reset password
  const resetPassword = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (user && confirm(`Reset password for ${user.fullName}?`)) {
      alert(`Password reset email sent to ${user.email}`);
    }
  };

  // Toggle location access
  const toggleLocation = (locationId: string) => {
    if (formLocations.includes(locationId)) {
      setFormLocations(formLocations.filter((id) => id !== locationId));
    } else {
      setFormLocations([...formLocations, locationId]);
    }
  };

  // User table columns
  const userColumns: Column<User>[] = [
    {
      key: 'username',
      header: 'Username',
      width: '150px',
      render: (value, row) => (
        <div>
          <div className="font-mono font-medium text-[0.875rem]">{value}</div>
          <div className="text-[0.75rem] text-[var(--muted-foreground)]">{row.fullName}</div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (value) => <span className="text-[0.875rem]">{value}</span>,
    },
    {
      key: 'role',
      header: 'Role',
      width: '140px',
      render: (value) => (
        <Badge className={cn('text-white', roleConfig[value as UserRole].color)}>
          {roleConfig[value as UserRole].label}
        </Badge>
      ),
    },
    {
      key: 'locations',
      header: 'Locations',
      width: '200px',
      render: (value) => {
        const locationNames = mockLocations
          .filter((loc) => (value as string[]).includes(loc.id))
          .map((loc) => loc.name);
        return (
          <div className="text-[0.75rem]">
            {locationNames.length > 2 ? (
              <span className="text-[var(--muted-foreground)]">
                {locationNames[0]} +{locationNames.length - 1} more
              </span>
            ) : (
              locationNames.join(', ')
            )}
          </div>
        );
      },
    },
    {
      key: 'lastLogin',
      header: 'Last Login',
      width: '160px',
      render: (value) => (
        <span className="text-[0.75rem] text-[var(--muted-foreground)] font-mono">
          {value}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      width: '100px',
      render: (value) =>
        value ? (
          <Badge variant="success">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        ) : (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Disabled
          </Badge>
        ),
    },
    {
      key: 'id',
      header: 'Actions',
      width: '140px',
      render: (value, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => startEditUser(row)}
            className="w-8 h-8 flex items-center justify-center bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] rounded-[2px]"
            title="Edit User"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => toggleUserStatus(value)}
            className={cn(
              'w-8 h-8 flex items-center justify-center text-white hover:opacity-90 rounded-[2px]',
              row.isActive ? 'bg-orange-600' : 'bg-green-600'
            )}
            title={row.isActive ? 'Disable User' : 'Enable User'}
          >
            {row.isActive ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => resetPassword(value)}
            className="w-8 h-8 flex items-center justify-center bg-amber-600 text-white hover:opacity-90 rounded-[2px]"
            title="Reset Password"
          >
            <Key className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col">
      {/* Top Bar */}
      <div className="h-12 px-4 bg-white border-b border-[var(--border)] flex items-center justify-between [box-shadow:var(--shadow-sm)]">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-[var(--primary)]" />
          <h2 className="m-0">User & Role Management</h2>
          <Badge variant="warning">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Admin Access Required
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={startAddUser}
            className="h-9 px-4 rounded-[4px] bg-[var(--success)] text-white hover:opacity-90 text-[0.875rem] font-medium flex items-center gap-2 [box-shadow:var(--shadow-md)]"
          >
            <UserPlus className="w-4 h-4" />
            Add New User
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 bg-[var(--background)]">
        <div className="max-w-[1600px] mx-auto space-y-6">
          {/* Edit/Add User Panel */}
          {(editingUser || isAddingUser) && (
            <Panel
              title={isAddingUser ? 'Add New User' : `Edit User: ${editingUser?.fullName}`}
              glass
              className="border-2 border-[var(--primary)]"
            >
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-[var(--muted-foreground)] mb-3 font-semibold flex items-center gap-2">
                    <UserCog className="w-4 h-4" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Username" required>
                      <TextInput
                        value={formUsername}
                        onChange={(e) => setFormUsername(e.target.value.toLowerCase())}
                        placeholder="e.g., john.doe"
                        className="font-mono"
                        disabled={!isAddingUser}
                      />
                    </FormField>

                    <FormField label="Full Name" required>
                      <TextInput
                        value={formFullName}
                        onChange={(e) => setFormFullName(e.target.value)}
                        placeholder="e.g., John Doe"
                      />
                    </FormField>

                    <FormField label="Email Address" required>
                      <TextInput
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="e.g., john.doe@retailpro.com"
                      />
                    </FormField>

                    {isAddingUser && (
                      <FormField label="Password" required>
                        <TextInput
                          type="password"
                          value={formPassword}
                          onChange={(e) => setFormPassword(e.target.value)}
                          placeholder="Enter strong password"
                        />
                      </FormField>
                    )}
                  </div>
                </div>

                {/* Role Assignment */}
                <div>
                  <h3 className="text-[var(--muted-foreground)] mb-3 font-semibold flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Role Assignment
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="User Role" required>
                      <select
                        value={formRole}
                        onChange={(e) => setFormRole(e.target.value as UserRole)}
                        className="w-full h-10 px-3 bg-white border border-[var(--border)] rounded-[4px] text-[0.875rem] font-medium"
                      >
                        {Object.entries(roleConfig).map(([key, config]) => (
                          <option key={key} value={key}>
                            {config.label}
                          </option>
                        ))}
                      </select>
                    </FormField>

                    <FormField label="Account Status" required>
                      <div className="flex items-center gap-4 h-10">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={formIsActive}
                            onChange={() => setFormIsActive(true)}
                            className="w-4 h-4 accent-[var(--success)]"
                          />
                          <span className="text-[0.875rem] font-medium text-[var(--success)]">
                            Active
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={!formIsActive}
                            onChange={() => setFormIsActive(false)}
                            className="w-4 h-4 accent-[var(--destructive)]"
                          />
                          <span className="text-[0.875rem] font-medium text-[var(--destructive)]">
                            Disabled
                          </span>
                        </label>
                      </div>
                    </FormField>
                  </div>

                  {/* Role Permissions Display */}
                  <div className="mt-3 p-3 bg-[var(--muted)] rounded-[4px]">
                    <div className="text-[0.75rem] text-[var(--muted-foreground)] mb-2 font-medium">
                      Permissions for {roleConfig[formRole].label}:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {roleConfig[formRole].permissions.map((permission) => (
                        <Badge key={permission} variant="secondary" className="text-[0.75rem]">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Location Access */}
                <div>
                  <h3 className="text-[var(--muted-foreground)] mb-3 font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location Access <span className="text-red-600">*</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {mockLocations.map((location) => (
                      <label
                        key={location.id}
                        className={cn(
                          'flex items-center gap-3 p-3 border-2 rounded-[4px] cursor-pointer transition-colors',
                          formLocations.includes(location.id)
                            ? 'bg-[var(--primary)]/10 border-[var(--primary)]'
                            : 'bg-white border-[var(--border)] hover:border-[var(--primary)]/50'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={formLocations.includes(location.id)}
                          onChange={() => toggleLocation(location.id)}
                          className="w-5 h-5 accent-[var(--primary)]"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-[0.875rem]">{location.name}</div>
                          <div className="text-[0.75rem] text-[var(--muted-foreground)] capitalize">
                            {location.type}
                          </div>
                        </div>
                        {formLocations.includes(location.id) && (
                          <CheckCircle className="w-5 h-5 text-[var(--primary)]" />
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
                  <button
                    onClick={cancelEdit}
                    className="h-10 px-6 rounded-[4px] border border-[var(--border)] bg-white hover:bg-[var(--secondary)] text-[var(--foreground)] font-medium flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    onClick={saveUser}
                    className="h-10 px-8 rounded-[4px] bg-[var(--success)] text-white hover:opacity-90 font-semibold flex items-center gap-2 [box-shadow:var(--shadow-md)]"
                  >
                    <Save className="w-4 h-4" />
                    {isAddingUser ? 'Create User' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </Panel>
          )}

          {/* Filters Panel */}
          <Panel title="Filters" glass>
            <div className="flex items-center gap-4">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                  <TextInput
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by username, name, or email..."
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-[0.875rem] text-[var(--muted-foreground)]">Role:</label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
                  className="h-10 px-3 bg-white border border-[var(--border)] rounded-[4px] text-[0.875rem] min-w-[160px]"
                >
                  <option value="all">All Roles</option>
                  {Object.entries(roleConfig).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-[0.875rem] text-[var(--muted-foreground)]">Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                  className="h-10 px-3 bg-white border border-[var(--border)] rounded-[4px] text-[0.875rem] min-w-[140px]"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Disabled Only</option>
                </select>
              </div>
            </div>
          </Panel>

          {/* Statistics */}
          <div className="grid grid-cols-5 gap-4">
            <div className="p-4 bg-white border border-[var(--border)] rounded-[4px] [box-shadow:var(--shadow-sm)]">
              <div className="text-[0.75rem] text-[var(--muted-foreground)] mb-1">Total Users</div>
              <div className="text-2xl font-bold tabular-nums">{users.length}</div>
            </div>
            <div className="p-4 bg-green-50 border border-green-300 rounded-[4px]">
              <div className="text-[0.75rem] text-green-700 mb-1">Active Users</div>
              <div className="text-2xl font-bold text-green-700 tabular-nums">
                {users.filter((u) => u.isActive).length}
              </div>
            </div>
            <div className="p-4 bg-red-50 border border-red-300 rounded-[4px]">
              <div className="text-[0.75rem] text-red-700 mb-1">Disabled Users</div>
              <div className="text-2xl font-bold text-red-700 tabular-nums">
                {users.filter((u) => !u.isActive).length}
              </div>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-300 rounded-[4px]">
              <div className="text-[0.75rem] text-blue-700 mb-1">Locations</div>
              <div className="text-2xl font-bold text-blue-700 tabular-nums">
                {mockLocations.length}
              </div>
            </div>
            <div className="p-4 bg-purple-50 border border-purple-300 rounded-[4px]">
              <div className="text-[0.75rem] text-purple-700 mb-1">Roles</div>
              <div className="text-2xl font-bold text-purple-700 tabular-nums">
                {Object.keys(roleConfig).length}
              </div>
            </div>
          </div>

          {/* Users Table */}
          <Panel title={`User List (${filteredUsers.length})`} glass>
            <DataTable data={filteredUsers} columns={userColumns} zebra={true} hover={true} />
          </Panel>
        </div>
      </div>
    </div>
  );
}
