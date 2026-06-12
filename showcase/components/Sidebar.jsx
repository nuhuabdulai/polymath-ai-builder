import React from 'react';
import { Home, Briefcase, Checklist, Settings } from 'lucide-react';

function Sidebar() {
  return (
    <div className='w-64 bg-gray-100 p-4 h-screen flex flex-col justify-between'>
      <nav>
        <ul>
          <li>
            <a href='#' className='flex items-center py-2 hover:bg-gray-200'>
              <Home size={20} />
              <span className='ml-2'>Dashboard</span>
            </a>
          </li>
          <li>
            <a href='#' className='flex items-center py-2 hover:bg-gray-200'>
              <Briefcase size={20} />
              <span className='ml-2'>Projects</span>
            </a>
          </li>
          <li>
            <a href='#' className='flex items-center py-2 hover:bg-gray-200'>
              <Checklist size={20} />
              <span className='ml-2'>Tasks</span>
            </a>
          </li>
          <li>
            <a href='#' className='flex items-center py-2 hover:bg-gray-200'>
              <Settings size={20} />
              <span className='ml-2'>Settings</span>
            </a>
          </li>
        </ul>
      </nav>
    </div>
  );
}

export default Sidebar;
