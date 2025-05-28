'use client';

import { TaskInput } from '@/components/TaskInput';
import { TaskList } from '@/components/TaskList';
import { useTasks } from '@/hooks/useTasks';

export default function Home() {
  const tasksState = useTasks('default-user');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome to <span className="text-blue-600">Listless</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Tell me what you need to do in plain English, and I'll help you organize it all.
            </p>
          </header>

          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                What's on your mind?
              </h2>
              <TaskInput tasksState={tasksState} />
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <TaskList tasksState={tasksState} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}