import React from 'react';

function ProjectList() {
  const projects = [
    { id: 1, name: 'Project Alpha', status: 'active' },
    { id: 2, name: 'Project Beta', status: 'completed' },
    { id: 3, name: 'Project Gamma', status: 'pending' },
    { id: 4, name: 'Project Delta', status: 'active' },
    { id: 5, name: 'Project Epsilon', status: 'completed' },
  ];

  return (
    <div className='p-4'>
      <h1 className='text-2xl font-bold mb-4'>Projects</h1>
      <table className='w-full text-left bg-white shadow rounded-lg'>
        <thead>
          <tr className='border-b'>
            <th className='px-4 py-3'>Name</th>
            <th className='px-4 py-3'>Status</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.id} className='border-b hover:bg-gray-50'>
              <td className='px-4 py-3'>{project.name}</td>
              <td className='px-4 py-3'>
                {project.status === 'active' ? (
                  <span className='bg-blue-100 text-blue-600 py-1 px-3 rounded-full text-sm font-medium'>
                    Active
                  </span>
                ) : project.status === 'completed' ? (
                  <span className='bg-green-100 text-green-600 py-1 px-3 rounded-full text-sm font-medium'>
                    Completed
                  </span>
                ) : (
                  <span className='bg-yellow-100 text-yellow-600 py-1 px-3 rounded-full text-sm font-medium'>
                    Pending
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ProjectList;
