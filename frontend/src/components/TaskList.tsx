'use client';

import { useEffect } from 'react';
import { Task } from '@/lib/api';

interface TaskListProps {
  tasksState: {
    tasks: Task[];
    loading: boolean;
    error: string | null;
    fetchTasks: () => Promise<void>;
    completeTask: (id: string, actualTime: number) => Promise<Task>;
    deleteTask: (id: string) => Promise<void>;
  };
}

export function TaskList({ tasksState }: TaskListProps) {
  const { tasks, loading, error, completeTask, deleteTask, fetchTasks } = tasksState;

  useEffect(() => {
    fetchTasks().catch(console.error);
  }, [fetchTasks]);

  const handleCompleteTask = async (taskId: string) => {
    try {
      await completeTask(taskId, 0); // We'll add actual time tracking later
    } catch (error) {
      console.error('Failed to complete task:', error);
      alert('Failed to complete task. Please try again.');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await deleteTask(taskId);
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Failed to delete task. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading tasks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">
          Error loading tasks: {error}
        </p>
        <button
          onClick={fetchTasks}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">
          No tasks yet. Use the input above to create some tasks!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Your Tasks
        </h2>
        
        <div className="space-y-3">
          {tasks.map(task => (
            <div key={task._id} className="bg-white border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      task.category === 'household' ? 'bg-green-100 text-green-800' :
                      task.category === 'work' ? 'bg-blue-100 text-blue-800' :
                      task.category === 'personal' ? 'bg-purple-100 text-purple-800' :
                      task.category === 'health' ? 'bg-red-100 text-red-800' :
                      task.category === 'finance' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.category}
                    </span>
                    <span className="text-sm text-gray-500">
                      {task.priority === 'urgent' ? '🔴' :
                       task.priority === 'high' ? '🟠' :
                       task.priority === 'medium' ? '🟡' : '🟢'} {task.priority}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-medium text-gray-900">
                    {task.title}
                  </h3>
                  
                  {task.description && (
                    <p className="mt-1 text-sm text-gray-600">
                      {task.description}
                    </p>
                  )}
                  
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span>⏱️ {task.estimatedTime} min</span>
                    <span>📋 {task.status}</span>
                    <span>📅 {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'No date'}</span>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  {task.status !== 'completed' && task._id && (
                    <button
                      onClick={() => handleCompleteTask(task._id as string)}
                      className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                      title="Mark as complete"
                    >
                      ✅
                    </button>
                  )}
                  {task._id && (
                    <button
                      onClick={() => handleDeleteTask(task._id as string)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete task"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}