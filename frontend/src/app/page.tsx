'use client';

import { TaskInput } from '@/components/TaskInput';
import { TaskList } from '@/components/TaskList';
import { UserSelector } from '@/components/UserSelector';
import { UserProvider } from '@/contexts/UserContext';
import { useTaskManager } from '@/hooks/useTaskManager';
import { useUser } from '@/contexts/UserContext';

function TaskApp() {
  const { selectedUser } = useUser();
  const taskManager = useTaskManager(selectedUser);

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
          Listless
        </h1>
        
        <UserSelector />
        
        <TaskInput taskManager={taskManager} />
        
        <div className="mt-8">
          <TaskList taskManager={taskManager} />
        </div>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <UserProvider>
      <TaskApp />
    </UserProvider>
  );
}