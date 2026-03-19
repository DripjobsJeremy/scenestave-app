/**
 * Simple authentication service for SceneStave (client-side stub)
 * NOTE: This runs entirely in the browser. For production, use a secure backend.
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'showsuite_current_user';

  const getCurrentUser = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // If parsed value is a plain string, it's a userId stored by usersService
        if (typeof parsed === 'string') {
          if (window.usersService) {
            return window.usersService.getUserById(parsed);
          }
          return null;
        }
        // Otherwise it's a full user object stored by authService.setCurrentUser
        return parsed;
      }
      // Default to admin for development
      return {
        id: 'user_admin',
        name: 'Admin User',
        email: 'admin@showsuite.com',
        role: 'admin'
      };
    } catch (error) {
      // JSON.parse failed — stored value is a raw (unquoted) user ID string
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && window.usersService) {
        return window.usersService.getUserById(stored);
      }
      console.error('authService: Error getting current user:', error);
      return null;
    }
  };

  const setCurrentUser = (user) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error setting current user:', error);
    }
  };

  const hasPermission = (permission) => {
    const user = getCurrentUser();
    if (!user) return false;

    const permissions = {
      admin: ['all'],
      board_member: ['view_financials', 'view_reports', 'view_donors'],
      financial_officer: ['view_financials', 'edit_financials', 'view_reports', 'manage_donations'],
      director: ['view_productions', 'manage_productions'],
      designer: ['view_productions']
    };

    const userPermissions = permissions[user.role] || [];
    return userPermissions.includes('all') || userPermissions.includes(permission);
  };

  global.authService = {
    getCurrentUser,
    setCurrentUser,
    hasPermission
  };
})(window);
