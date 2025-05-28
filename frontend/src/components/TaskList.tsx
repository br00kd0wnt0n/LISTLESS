'use client';

import { useEffect, useState } from 'react';
import { Task, api } from '@/lib/api';
import { ConfirmModal } from './ConfirmModal';
import { DurationSelector } from './DurationSelector';

interface TaskListProps {
  tasksState: {
    tasks: Task[];
    loading: boolean;
    error: string | null;
    fetchTasks: () => Promise<void>;
    createTask: (task: Omit<Task, '_id' | 'createdAt' | 'updatedAt'>) => Promise<Task>;
    updateTask: (id: string, updates: Partial<Task>) => Promise<Task>;
    deleteTask: (id: string) => Promise<void>;
    completeTask: (id: string, actualTime: number) => Promise<Task>;
  };
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(0, 0, 0, 0);

  // Check if the date has a specific time (not midnight)
  const hasSpecificTime = date.getHours() !== 0 || date.getMinutes() !== 0;
  const timeString = hasSpecificTime ? 
    date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';

  // If it's today
  if (date.toDateString() === now.toDateString()) {
    return hasSpecificTime ? `Today at ${timeString}` : 'Today';
  }
  
  // If it's tomorrow
  if (date.toDateString() === tomorrow.toDateString()) {
    return hasSpecificTime ? `Tomorrow at ${timeString}` : 'Tomorrow';
  }
  
  // If it's within the next week
  if (date < nextWeek) {
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' }); // e.g., "Monday"
    return hasSpecificTime ? `${weekday} at ${timeString}` : weekday;
  }
  
  // For dates further in the future, show the full date
  const formattedDate = date.toLocaleDateString('en-US', { 
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  }); // e.g., "Mar 31" or "Mar 31, 2024"
  
  return hasSpecificTime ? `${formattedDate} at ${timeString}` : formattedDate;
}

export function TaskList({ tasksState }: TaskListProps) {
  const { tasks, loading, error, completeTask, deleteTask, fetchTasks, updateTask } = tasksState;
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingDuration, setEditingDuration] = useState<number | null>(null);

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

  const handleDeleteClick = (task: Task) => {
    setTaskToDelete(task);
  };

  const handleDeleteConfirm = async () => {
    if (!taskToDelete?._id) return;

    try {
      await deleteTask(taskToDelete._id);
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('Failed to delete task. Please try again.');
    } finally {
      setTaskToDelete(null);
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}m`;
  };

  const handleDurationChange = async (taskId: string, newDuration: number) => {
    try {
      // Use the updateTask function from tasksState
      await updateTask(taskId, { estimatedTime: newDuration });
      setEditingTaskId(null);
      setEditingDuration(null);
      // Refresh the task list to ensure we have the latest data
      await fetchTasks();
    } catch (error) {
      console.error('Failed to update task duration:', error);
      // Show a more specific error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to update task duration';
      alert(`Failed to update task duration: ${errorMessage}`);
    }
  };

  const startEditingDuration = (task: Task) => {
    if (!task._id) return;
    setEditingTaskId(task._id);
    setEditingDuration(task.estimatedTime);
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
                    {editingTaskId === task._id ? (
                      <div className="flex items-center space-x-2">
                        <DurationSelector
                          value={editingDuration || task.estimatedTime}
                          onChange={(newDuration) => {
                            if (task._id) {
                              handleDurationChange(task._id, newDuration);
                            }
                          }}
                          className="w-32"
                        />
                        <button
                          onClick={() => {
                            setEditingTaskId(null);
                            setEditingDuration(null);
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span>⏱️ {formatDuration(task.estimatedTime)}</span>
                        <button
                          onClick={() => startEditingDuration(task)}
                          className="text-gray-400 hover:text-gray-600"
                          title="Edit duration"
                        >
                          ✎
                        </button>
                      </div>
                    )}
                    <span>📋 {task.status}</span>
                    {task.scheduledEnd && (
                      <span>⏰ Due: {formatDate(task.scheduledEnd.toString())}</span>
                    )}
                  </div>

                  {task.workback && task.workback.length > 0 && (
                    <div className="mt-3 pl-4 border-l-2 border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Workback Schedule:</h4>
                      <ul className="space-y-2">
                        {task.workback.map((subtask, index) => (
                          <li key={index} className="text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">{subtask.title}</span>
                              <div className="flex items-center space-x-2">
                                <span className="text-gray-500">⏱️ {subtask.estimatedTime} min</span>
                                <span className="text-gray-500">⏰ {formatDate(subtask.scheduledEnd.toString())}</span>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
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
                      onClick={() => handleDeleteClick(task)}
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

      <ConfirmModal
        isOpen={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Task"
        message={`Are you sure you want to delete "${taskToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete Task"
        cancelText="Cancel"
      />
    </div>
  );
}