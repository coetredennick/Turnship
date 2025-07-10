import React from 'react';
import Dashboard from '../pages/Dashboard';

const Router = () => {
  // DEVELOPMENT MODE: Skip all auth, go straight to dashboard
  document.title = 'Dashboard | Turnship';
  return <Dashboard />;
};

export default Router;