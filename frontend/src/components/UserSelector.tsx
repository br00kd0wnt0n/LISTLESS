import React from 'react';
import { useUser, User } from '@/contexts/UserContext';

export function UserSelector() {
  const { selectedUser, setSelectedUser } = useUser();

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="bg-white rounded-lg shadow p-4">
        <label htmlFor="user-select" className="block text-sm font-medium text-gray-700 mb-2">
          Select User
        </label>
        <select
          id="user-select"
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value as User)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="Hettie">Hettie</option>
          <option value="Brook">Brook</option>
        </select>
        <p className="mt-2 text-sm text-gray-500">
          Currently logged in as: <span className="font-medium">{selectedUser}</span>
        </p>
      </div>
    </div>
  );
} 