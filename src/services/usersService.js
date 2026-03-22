/**
 * Users Service
 * Manages user accounts, seat licensing, and role-based permissions.
 */
const UsersService = (() => {
    const STORAGE_KEY = 'showsuite_users';
    const CURRENT_USER_KEY = 'showsuite_current_user';

    // Permission levels
    const PERMISSION_LEVELS = {
        venue_manager: {
            id: 'venue_manager',
            name: 'Venue Manager',
            description: 'Super Admin with full account control',
            permissions: {
                organizationSettings: true,
                dataImport: true,
                userPreferences: true,
                userManagement: true,
                financial: true,
                donors: true,
                productions: true,
                actors: true,
                volunteers: true,
                calendar: true,
                reports: true,
                allAccess: true
            }
        },
        board_member: {
            id: 'board_member',
            name: 'Board Member',
            description: 'Admin user with full control, excluding Organization Settings, Data Import, and User Preferences',
            permissions: {
                organizationSettings: false,
                dataImport: false,
                userPreferences: false,
                userManagement: false,
                financial: true,
                donors: true,
                productions: true,
                actors: true,
                volunteers: true,
                calendar: true,
                reports: true,
                allAccess: false
            }
        },
        accounting_manager: {
            id: 'accounting_manager',
            name: 'Accounting Manager',
            description: 'Read-only access to Financial and Donor information, with export capabilities',
            permissions: {
                organizationSettings: false,
                dataImport: false,
                userPreferences: false,
                userManagement: false,
                financial: 'read-only',
                donors: 'read-only',
                productions: false,
                actors: false,
                volunteers: false,
                calendar: false,
                reports: 'financial-only',
                allAccess: false
            }
        },
        client_admin: {
            id: 'client_admin',
            name: 'Client Admin',
            description: 'Admin for client organization — manages own productions and calendar only',
            permissions: {
                organizationSettings: false,
                dataImport: false,
                userPreferences: true,
                userManagement: false,
                financial: false,
                donors: false,
                productions: 'own-only',
                actors: 'own-only',
                volunteers: 'own-only',
                calendar: 'own-only',
                reports: 'own-only',
                allAccess: false,
                clientOrgId: null
            }
        }
    };

    const createDefaultAdmin = () => {
        const org = window.organizationService?.loadOrganization();
        return {
            id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            firstName: 'Primary',
            lastName: 'Admin',
            email: org?.emails?.[0]?.address || 'admin@showsuite.com',
            phone: org?.phones?.[0]?.number || '',
            address: {
                street1: '',
                street2: '',
                city: '',
                state: '',
                postalCode: '',
                country: 'US'
            },
            role: 'venue_manager',
            isPrimaryAdmin: true,
            status: 'active',
            invitedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };
    };

    const loadUsers = () => {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (!data) {
                const defaultAdmin = createDefaultAdmin();
                const users = [defaultAdmin];
                saveUsers(users);
                localStorage.setItem(CURRENT_USER_KEY, defaultAdmin.id);
                return users;
            }
            return JSON.parse(data);
        } catch (error) {
            console.error('UsersService: Error loading users:', error);
            return [createDefaultAdmin()];
        }
    };

    const saveUsers = (users) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
            return true;
        } catch (error) {
            console.error('UsersService: Error saving users:', error);
            return false;
        }
    };

    const createUser = (userData) => {
        const users = loadUsers();

        if (users.some(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
            throw new Error('A user with this email already exists');
        }

        const newUser = {
            id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            email: userData.email || '',
            phone: userData.phone || '',
            address: userData.address || {
                street1: '',
                street2: '',
                city: '',
                state: '',
                postalCode: '',
                country: 'US'
            },
            role: userData.role || 'board_member',
            assignedProductions: userData.assignedProductions || [],
            isPrimaryAdmin: false,
            status: 'invited',
            invitedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        saveUsers(users);
        return newUser;
    };

    const updateUser = (userId, updates) => {
        const users = loadUsers();
        const index = users.findIndex(u => u.id === userId);

        if (index === -1) {
            throw new Error('User not found');
        }

        // Prevent changing primary admin status or role
        if (users[index].isPrimaryAdmin) {
            delete updates.isPrimaryAdmin;
            delete updates.role;
        }

        users[index] = {
            ...users[index],
            ...updates,
            id: userId,
            updatedAt: new Date().toISOString()
        };

        saveUsers(users);
        return users[index];
    };

    const deleteUser = (userId) => {
        const users = loadUsers();
        const user = users.find(u => u.id === userId);

        if (user?.isPrimaryAdmin) {
            throw new Error('Cannot delete primary admin');
        }

        const filtered = users.filter(u => u.id !== userId);
        saveUsers(filtered);
        return true;
    };

    const getUserById = (userId) => {
        const users = loadUsers();
        return users.find(u => u.id === userId) || null;
    };

    const getCurrentUser = () => {
        const currentUserId = localStorage.getItem(CURRENT_USER_KEY);
        if (!currentUserId) {
            const users = loadUsers();
            return users.find(u => u.isPrimaryAdmin) || users[0];
        }
        return getUserById(currentUserId);
    };

    const setCurrentUser = (userId) => {
        localStorage.setItem(CURRENT_USER_KEY, userId);
    };

    const getUserPermissions = (userId) => {
        const user = getUserById(userId);
        if (!user) return null;
        return PERMISSION_LEVELS[user.role];
    };

    const hasPermission = (userId, permissionKey) => {
        const permissions = getUserPermissions(userId);
        if (!permissions) return false;
        return permissions.permissions[permissionKey] === true;
    };

    const getUsersByRole = (role) => {
        const users = loadUsers();
        return users.filter(u => u.role === role);
    };

    const getActiveUserCount = () => {
        const users = loadUsers();
        return users.filter(u => u.status === 'active').length;
    };

    const generateTempPassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        let password = '';
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    };

    const createClientAdminUser = (clientOrg) => {
        const users = loadUsers();

        // If email already exists, link existing user to this client org
        const existingUser = users.find(u => u.email.toLowerCase() === (clientOrg.email || '').toLowerCase());
        if (existingUser) {
            existingUser.role = 'client_admin';
            existingUser.clientOrgId = clientOrg.id;
            saveUsers(users);
            return existingUser;
        }

        const tempPassword = generateTempPassword();
        const nameParts = (clientOrg.contactName || '').split(' ');
        const newUser = {
            id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            firstName: nameParts[0] || 'Client',
            lastName: nameParts.slice(1).join(' ') || 'Admin',
            email: clientOrg.email || '',
            phone: clientOrg.phone || '',
            address: { street1: '', street2: '', city: '', state: '', postalCode: '', country: 'US' },
            role: 'client_admin',
            clientOrgId: clientOrg.id,
            isPrimaryAdmin: false,
            status: 'invited',
            tempPassword: tempPassword,
            passwordChangeRequired: true,
            invitedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        saveUsers(users);
        console.log('✅ Created Client Admin user:', newUser.email, 'Temp password:', tempPassword);
        return newUser;
    };

    const getUsersByClientOrg = (clientOrgId) => {
        const users = loadUsers();
        return users.filter(u => u.clientOrgId === clientOrgId);
    };

    const deleteClientAdminUser = (clientOrgId) => {
        const users = loadUsers();
        const filtered = users.filter(u => u.clientOrgId !== clientOrgId);
        saveUsers(filtered);
        return true;
    };

    return {
        loadUsers,
        createUser,
        updateUser,
        deleteUser,
        getUserById,
        getCurrentUser,
        setCurrentUser,
        getUserPermissions,
        hasPermission,
        getUsersByRole,
        getActiveUserCount,
        createClientAdminUser,
        getUsersByClientOrg,
        deleteClientAdminUser,
        PERMISSION_LEVELS
    };
})();

window.usersService = UsersService;

console.log('✅ Users Service loaded');
