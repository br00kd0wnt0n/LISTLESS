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
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Listless
          </h1>
          <p className="text-lg text-gray-600">
            Life management that actually understands your life
          </p>
        </div>
        
        <UserSelector />
        
        <TaskInput taskManager={taskManager} />
        
        <div className="mt-8 max-w-3xl mx-auto">
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