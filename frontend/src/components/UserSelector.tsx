import React from 'react';
import { useUser, User } from '@/contexts/UserContext';
import { useTaskManager } from '@/hooks/useTaskManager';

export function UserSelector() {
  const { selectedUser, setSelectedUser } = useUser();
  const taskManager = useTaskManager(selectedUser);

  const handleUserChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newUser = e.target.value as User;
    setSelectedUser(newUser);
    // Tasks will be automatically refetched because useTaskManager depends on selectedUser
  };

  return (
    <select
      id="user-select"
      value={selectedUser}
      onChange={handleUserChange}
      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
    >
      <option value="Hettie">Hettie</option>
      <option value="Brook">Brook</option>
    </select>
  );
} 