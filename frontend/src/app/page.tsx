'use client';

import { TaskInput } from '@/components/TaskInput';
import { TaskList } from '@/components/TaskList';
import { UserSelector } from '@/components/UserSelector';
import { UserProvider } from '@/contexts/UserContext';
import { useTasks } from '@/hooks/useTasks';
import { useUser } from '@/contexts/UserContext';

function TaskApp() {
  const { selectedUser } = useUser();
  const tasksState = useTasks(selectedUser);

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">
          Listless
        </h1>
        
        <UserSelector />
        
        <TaskInput tasksState={tasksState} />
        
        <div className="mt-8">
          <TaskList tasksState={tasksState} />
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