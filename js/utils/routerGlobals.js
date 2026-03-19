// Expose React Router DOM v5 functions globally for non-module JSX components
(function(global) {
  'use strict';
  
  // Check if ReactRouterDOM is loaded
  if (typeof ReactRouterDOM === 'undefined') {
    console.error('ReactRouterDOM not loaded. Make sure react-router-dom script is included before this file.');
    return;
  }
  
  // Expose commonly used router components
  global.BrowserRouter = ReactRouterDOM.BrowserRouter;
  global.HashRouter = ReactRouterDOM.HashRouter;
  global.Switch = ReactRouterDOM.Switch;
  global.Route = ReactRouterDOM.Route;
  global.Link = ReactRouterDOM.Link;
  global.NavLink = ReactRouterDOM.NavLink;
  global.Redirect = ReactRouterDOM.Redirect;
  
  // Expose hooks (React Router v5 API)
  global.useHistory = ReactRouterDOM.useHistory;
  global.useParams = ReactRouterDOM.useParams;
  global.useLocation = ReactRouterDOM.useLocation;
  global.useRouteMatch = ReactRouterDOM.useRouteMatch;
  
  console.log('✅ React Router v5 globals initialized successfully');
  
})(window);
