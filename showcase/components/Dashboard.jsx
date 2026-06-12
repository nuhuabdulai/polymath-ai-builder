import React from 'react';

function Dashboard() {
  return (
    <div className='p-4'>
      <h1 className='text-2xl font-bold mb-4'>Dashboard</h1>
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <div className='bg-white p-4 shadow rounded-lg'>
          <h2 className='text-lg font-bold mb-2'>Active Projects</h2>
          <p className='text-3xl font-bold text-blue-500'>12</p>
        </div>
        <div className='bg-white p-4 shadow rounded-lg'>
          <h2 className='text-lg font-bold mb-2'>Completed</h2>
          <p className='text-3xl font-bold text-green-500'>48</p>
        </div>
        <div className='bg-white p-4 shadow rounded-lg'>
          <h2 className='text-lg font-bold mb-2'>Team</h2>
          <p className='text-3xl font-bold text-blue-500'>8</p>
        </div>
        <div className='bg-white p-4 shadow rounded-lg'>
          <h2 className='text-lg font-bold mb-2'>Pending</h2>
          <p className='text-3xl font-bold text-red-500'>6</p>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
