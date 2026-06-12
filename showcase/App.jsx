import React from 'react';
import './index.css';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ProjectList from './components/ProjectList';

function App() {
  return (
    <div className='flex h-screen'>
      <Sidebar />
      <div className='flex-1'>
        <Dashboard />
        <ProjectList />
      </div>
    </div>
  );
}

export default App;
