function UsersSettings() {
    const [users, setUsers] = React.useState([]);
    const [showUserModal, setShowUserModal] = React.useState(false);
    const [editingUser, setEditingUser] = React.useState(null);

    React.useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = () => {
        const loaded = window.usersService.loadUsers();
        setUsers(loaded);
    };

    const handleSave = (userData) => {
        try {
            if (editingUser) {
                window.usersService.updateUser(editingUser.id, userData);
            } else {
                window.usersService.createUser(userData);
            }
            loadUsers();
            setShowUserModal(false);
            setEditingUser(null);

            if (window.showToast) {
                window.showToast(
                    editingUser ? '✅ User updated' : '✅ User invited',
                    'success'
                );
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    const handleDelete = (userId) => {
        try {
            if (!confirm('Remove this user? They will lose access to Banquo.')) return;

            window.usersService.deleteUser(userId);
            loadUsers();

            if (window.showToast) {
                window.showToast('✅ User removed', 'success');
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    const getPermissionLevel = (roleId) => {
        return window.usersService.PERMISSION_LEVELS[roleId];
    };

    const activeUsers = users.filter(u => u.status === 'active');
    const invitedUsers = users.filter(u => u.status === 'invited');
    const primaryAdmin = users.find(u => u.isPrimaryAdmin);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
                    <p className="text-gray-600 mt-1">Manage admin seats and user permissions</p>
                </div>
                <button
                    onClick={() => {
                        setEditingUser(null);
                        setShowUserModal(true);
                    }}
                    className="px-4 py-2 text-white rounded-lg transition-all hover:opacity-90 bg-brand-primary"
                >
                    + Add User
                </button>
            </div>

            {/* Seat Licensing Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium opacity-90">Total Users</h3>
                        <span className="text-3xl">👥</span>
                    </div>
                    <div className="text-3xl font-bold mb-1">{users.length}</div>
                    <p className="text-sm opacity-75">{activeUsers.length} active</p>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium opacity-90">Active Seats</h3>
                        <span className="text-3xl">✓</span>
                    </div>
                    <div className="text-3xl font-bold mb-1">{activeUsers.length}</div>
                    <p className="text-sm opacity-75">users with access</p>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg shadow-lg p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium opacity-90">Pending Invites</h3>
                        <span className="text-3xl">📧</span>
                    </div>
                    <div className="text-3xl font-bold mb-1">{invitedUsers.length}</div>
                    <p className="text-sm opacity-75">awaiting acceptance</p>
                </div>
            </div>

            {/* Primary Admin */}
            {primaryAdmin && (
                <div className="bg-white rounded-lg shadow-sm border-2 border-purple-300 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="text-3xl">👑</div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Primary Administrator</h3>
                            <p className="text-sm text-gray-600">Account owner with full control</p>
                        </div>
                    </div>

                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h4 className="text-xl font-semibold text-gray-900">
                                    {primaryAdmin.firstName} {primaryAdmin.lastName}
                                </h4>
                                <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                                    {getPermissionLevel(primaryAdmin.role)?.name}
                                </span>
                            </div>
                            <div className="space-y-1 text-sm text-gray-600">
                                <div>📧 {primaryAdmin.email}</div>
                                {primaryAdmin.phone && <div>📞 {primaryAdmin.phone}</div>}
                                <div className="text-xs text-gray-500 mt-2">
                                    Member since {new Date(primaryAdmin.createdAt).toLocaleDateString()}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                setEditingUser(primaryAdmin);
                                setShowUserModal(true);
                            }}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Edit Profile
                        </button>
                    </div>
                </div>
            )}

            {/* Active Users */}
            {activeUsers.filter(u => !u.isPrimaryAdmin).length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Users</h3>
                    <div className="space-y-3">
                        {activeUsers.filter(u => !u.isPrimaryAdmin).map(user => (
                            <div key={user.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                                            <h4 className="font-semibold text-gray-900">
                                                {user.firstName} {user.lastName}
                                            </h4>
                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                                {getPermissionLevel(user.role)?.name}
                                            </span>
                                            {user.assignedProductions?.length > 0 && (
                                                <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-xs rounded-full">
                                                    {user.assignedProductions.length} production{user.assignedProductions.length !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                        <div className="space-y-1 text-sm text-gray-600">
                                            <div>📧 {user.email}</div>
                                            {user.phone && <div>📞 {user.phone}</div>}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setEditingUser(user);
                                                setShowUserModal(true);
                                            }}
                                            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(user.id)}
                                            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Invited Users */}
            {invitedUsers.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Invitations</h3>
                    <div className="space-y-3">
                        {invitedUsers.map(user => (
                            <div key={user.id} className="border border-gray-200 rounded-lg p-4 bg-yellow-50">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h4 className="font-semibold text-gray-900">
                                                {user.firstName} {user.lastName}
                                            </h4>
                                            <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded">
                                                Invited
                                            </span>
                                        </div>
                                        <div className="space-y-1 text-sm text-gray-600">
                                            <div>📧 {user.email}</div>
                                            <div className="text-xs text-gray-500">
                                                Invited {new Date(user.invitedAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleDelete(user.id)}
                                            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                                        >
                                            Cancel Invite
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Client Admins */}
            {users.filter(u => u.role === 'client_admin').length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">Client Admins</h3>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                            Venue Operator Mode
                        </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                        Auto-created admin accounts for client organizations
                    </p>
                    <div className="space-y-3">
                        {users.filter(u => u.role === 'client_admin').map(user => {
                            const org = window.organizationService?.loadOrganization();
                            const clientOrg = (org?.clientOrganizations || []).find(c => c.id === user.clientOrgId);
                            return (
                                <div key={user.id} className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h4 className="font-semibold text-gray-900">
                                                    {user.firstName} {user.lastName}
                                                </h4>
                                                <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                                                    Client Admin
                                                </span>
                                            </div>
                                            <div className="space-y-1 text-sm text-gray-600">
                                                <div>🏢 {clientOrg?.name || 'Unknown Organization'}</div>
                                                <div>📧 {user.email}</div>
                                                {user.phone && <div>📞 {user.phone}</div>}
                                                {user.status === 'invited' && user.tempPassword && (
                                                    <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded">
                                                        <div className="text-xs font-semibold text-yellow-800">Temporary Password:</div>
                                                        <div className="font-mono text-sm text-yellow-900">{user.tempPassword}</div>
                                                        <div className="text-xs text-yellow-700 mt-1">User must change on first login</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setEditingUser(user);
                                                setShowUserModal(true);
                                            }}
                                            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                                        >
                                            Edit
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {activeUsers.filter(u => !u.isPrimaryAdmin).length === 0 && invitedUsers.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <div className="text-6xl mb-4">👥</div>
                    <p className="text-gray-500 text-lg">No additional users yet</p>
                    <p className="text-gray-400 text-sm mt-2">Click &quot;+ Add User&quot; to invite team members</p>
                </div>
            )}

            {/* User Modal */}
            {showUserModal && (
                <UserModal
                    user={editingUser}
                    onSave={handleSave}
                    onClose={() => {
                        setShowUserModal(false);
                        setEditingUser(null);
                    }}
                />
            )}
        </div>
    );
}

window.UsersSettings = UsersSettings;
console.log('✅ UsersSettings component loaded');

function UserModal({ user, onSave, onClose }) {
    const [formData, setFormData] = React.useState({
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        phone: user?.phone || '',
        role: user?.role || 'board_member',
        assignedProductions: user?.assignedProductions || [],
        address: user?.address || {
            street1: '',
            street2: '',
            city: '',
            state: '',
            postalCode: '',
            country: 'US'
        }
    });

    const productions = React.useMemo(
        () => window.productionsService?.getAll?.() || [],
        []
    );

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.firstName.trim() || !formData.lastName.trim()) {
            alert('First and last name are required');
            return;
        }

        if (!formData.email.trim()) {
            alert('Email is required');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            alert('Please enter a valid email address');
            return;
        }

        onSave(formData);
    };

    const permissionLevels = window.usersService.PERMISSION_LEVELS;
    const isPrimaryAdmin = user?.isPrimaryAdmin;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {user ? (isPrimaryAdmin ? 'Edit Profile' : 'Edit User') : 'Add New User'}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Basic Information</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    First Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    placeholder="John"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Last Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    placeholder="Doe"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Contact Information</h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    placeholder="john@example.com"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Phone
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                    placeholder="(555) 123-4567"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Address */}
                    <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Address</h4>
                        <div className="space-y-3">
                            <input
                                type="text"
                                value={formData.address.street1}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    address: { ...formData.address, street1: e.target.value }
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                placeholder="Street Address"
                            />
                            <input
                                type="text"
                                value={formData.address.street2}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    address: { ...formData.address, street2: e.target.value }
                                })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                placeholder="Apt, Suite (optional)"
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    value={formData.address.city}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        address: { ...formData.address, city: e.target.value }
                                    })}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                    placeholder="City"
                                />
                                <input
                                    type="text"
                                    value={formData.address.state}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        address: { ...formData.address, state: e.target.value }
                                    })}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                    placeholder="State/Province"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    value={formData.address.postalCode}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        address: { ...formData.address, postalCode: e.target.value }
                                    })}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                    placeholder="Postal Code"
                                />
                                <select
                                    value={formData.address.country}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        address: { ...formData.address, country: e.target.value }
                                    })}
                                    aria-label="Country"
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="US">United States</option>
                                    <option value="CA">Canada</option>
                                    <option value="GB">United Kingdom</option>
                                    <option value="AU">Australia</option>
                                    <option value="NZ">New Zealand</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Permission Level */}
                    {!isPrimaryAdmin && (
                        <div>
                            <h4 className="font-semibold text-gray-900 mb-3">Permission Level</h4>
                            <div className="space-y-3">
                                {Object.values(permissionLevels).map(level => (
                                    <label
                                        key={level.id}
                                        className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                                            formData.role === level.id
                                                ? 'border-purple-600 bg-purple-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="role"
                                            value={level.id}
                                            checked={formData.role === level.id}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            className="mt-1 w-4 h-4 text-purple-600"
                                        />
                                        <div className="ml-3 flex-1">
                                            <div className="font-semibold text-gray-900">{level.name}</div>
                                            <div className="text-sm text-gray-600 mt-1">{level.description}</div>

                                            {/* Permission badges */}
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {level.permissions.organizationSettings && (
                                                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                                                        Org Settings
                                                    </span>
                                                )}
                                                {level.permissions.financial === true && (
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                                        Financial (Full)
                                                    </span>
                                                )}
                                                {level.permissions.financial === 'read-only' && (
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                                        Financial (Read-Only)
                                                    </span>
                                                )}
                                                {level.permissions.donors === true && (
                                                    <span className="px-2 py-1 bg-pink-100 text-pink-700 text-xs rounded">
                                                        Donors (Full)
                                                    </span>
                                                )}
                                                {level.permissions.donors === 'read-only' && (
                                                    <span className="px-2 py-1 bg-pink-100 text-pink-700 text-xs rounded">
                                                        Donors (Read-Only)
                                                    </span>
                                                )}
                                                {level.permissions.productions && (
                                                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                                                        Productions
                                                    </span>
                                                )}
                                                {level.permissions.userManagement && (
                                                    <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                                                        User Management
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {isPrimaryAdmin && (
                        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                            <div className="flex items-center gap-2 text-purple-900">
                                <span className="text-xl">👑</span>
                                <span className="font-semibold">Primary Administrator</span>
                            </div>
                            <p className="text-sm text-purple-700 mt-1">
                                As the primary admin, you have full control over all account features. This role cannot be changed.
                            </p>
                        </div>
                    )}

                    {/* Assigned Productions */}
                    {!isPrimaryAdmin && (
                        <div>
                            <h4 className="font-semibold text-gray-900 mb-1">Assigned Productions</h4>
                            <p className="text-xs text-gray-500 mb-3">Controls which productions this user can access and see events for</p>
                            <div className="space-y-2 max-h-48 overflow-y-auto bg-gray-50 rounded-lg p-3 border border-gray-200">
                                {productions.length === 0 && (
                                    <p className="text-gray-400 text-sm italic">No productions found</p>
                                )}
                                {productions.map(prod => (
                                    <label key={prod.id} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={(formData.assignedProductions || []).includes(prod.id)}
                                            onChange={(e) => {
                                                const current = formData.assignedProductions || [];
                                                const updated = e.target.checked
                                                    ? [...current, prod.id]
                                                    : current.filter(id => id !== prod.id);
                                                setFormData({ ...formData, assignedProductions: updated });
                                            }}
                                            className="w-4 h-4 accent-violet-600"
                                        />
                                        <span className="text-sm text-gray-800">{prod.title}</span>
                                        {prod.status && (
                                            <span className="text-xs text-gray-400">({prod.status})</span>
                                        )}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            {user ? 'Save Changes' : 'Send Invitation'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

window.UserModal = UserModal;
