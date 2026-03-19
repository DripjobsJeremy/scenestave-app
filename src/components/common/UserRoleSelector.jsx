const { useState, useEffect } = React;

// User roles available in the system
const USER_ROLES = [
  { id: 'admin', name: 'Admin', color: 'bg-red-100 text-red-800', departments: 'all' },
  { id: 'director', name: 'Director', color: 'bg-purple-100 text-purple-800', departments: 'all' },
  { id: 'stage_manager', name: 'Stage Manager', color: 'bg-blue-100 text-blue-800', departments: ['stage_manager'] },
  { id: 'lighting_designer', name: 'Lighting Designer', color: 'bg-yellow-100 text-yellow-800', departments: ['lighting'] },
  { id: 'sound_designer', name: 'Sound Designer', color: 'bg-green-100 text-green-800', departments: ['sound'] },
  { id: 'wardrobe_designer', name: 'Wardrobe Designer', color: 'bg-pink-100 text-pink-800', departments: ['wardrobe'] },
  { id: 'props_master', name: 'Props Master', color: 'bg-orange-100 text-orange-800', departments: ['props'] },
  { id: 'scenic_designer', name: 'Scenic Designer', color: 'bg-teal-100 text-teal-800', departments: ['set'] }
];

// Helper to get current role from localStorage
const getCurrentRole = () => {
  const stored = localStorage.getItem('showsuite_current_role');
  if (stored) {
    const role = USER_ROLES.find(r => r.id === stored);
    if (role) return role;
  }
  return USER_ROLES[0]; // Default to Admin
};

// Helper to check if user can access a department
const canAccessDepartment = (roleId, departmentId) => {
  const role = USER_ROLES.find(r => r.id === roleId);
  if (!role) return false;
  if (role.departments === 'all') return true;
  return role.departments.includes(departmentId);
};

// Helper to check if user can access all departments
const canAccessAllDepartments = (roleId) => {
  const role = USER_ROLES.find(r => r.id === roleId);
  return role?.departments === 'all';
};

function UserRoleSelector({ onRoleChange }) {
  const [currentRole, setCurrentRole] = useState(getCurrentRole());
  const [isOpen, setIsOpen] = useState(false);

  const handleRoleChange = (role) => {
    setCurrentRole(role);
    localStorage.setItem('showsuite_current_role', role.id);
    setIsOpen(false);
    onRoleChange?.(role);
  };

  return React.createElement(
    'div',
    { className: 'relative' },
    // Current role button
    React.createElement(
      'button',
      {
        onClick: () => setIsOpen(!isOpen),
        className: 'flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm'
      },
      React.createElement('span', { className: 'text-gray-500' }, '👤'),
      React.createElement(
        'span',
        { className: 'px-2 py-0.5 rounded-full text-xs font-medium ' + currentRole.color },
        currentRole.name
      ),
      React.createElement('span', { className: 'text-gray-400 text-xs' }, '▼')
    ),
    // Dropdown menu
    isOpen && React.createElement(
      'div',
      { className: 'absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50' },
      React.createElement(
        'div',
        { className: 'p-2 border-b border-gray-100' },
        React.createElement('span', { className: 'text-xs text-gray-500 uppercase tracking-wide' }, 'Impersonate Role')
      ),
      React.createElement(
        'div',
        { className: 'py-1' },
        USER_ROLES.map(role =>
          React.createElement(
            'button',
            {
              key: role.id,
              onClick: () => handleRoleChange(role),
              className: 'w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between ' +
                (currentRole.id === role.id ? 'bg-gray-50' : '')
            },
            React.createElement(
              'span',
              { className: 'px-2 py-0.5 rounded-full text-xs font-medium ' + role.color },
              role.name
            ),
            currentRole.id === role.id && React.createElement(
              'span',
              { className: 'text-violet-600' },
              '✓'
            )
          )
        )
      )
    ),
    // Click outside to close
    isOpen && React.createElement('div', {
      className: 'fixed inset-0 z-40',
      onClick: () => setIsOpen(false)
    })
  );
}

// Export globals
window.UserRoleSelector = UserRoleSelector;
window.USER_ROLES = USER_ROLES;
window.getCurrentRole = getCurrentRole;
window.canAccessDepartment = canAccessDepartment;
window.canAccessAllDepartments = canAccessAllDepartments;
