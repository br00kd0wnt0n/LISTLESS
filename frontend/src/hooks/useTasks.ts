// ===== frontend/src/hooks/useTasks.ts =====
import { useState, useCallback } from 'react';
import { api, Task } from '@/lib/api';
import { User } from '@/contexts/UserContext';

type CreateTaskInput = Omit<Task, '_id'>;

export function useTasks(userId: User) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getTasks(userId);
      
      if (response.success && response.data) {
        setTasks(response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch tasks');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tasks';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const createTask = useCallback(async (task: CreateTaskInput) => {
    try {
      setError(null);
      const taskWithPossibleId = task as CreateTaskInput & { _id?: string };
      console.log('Creating task with data:', {
        task,
        hasId: '_id' in taskWithPossibleId,
        idValue: taskWithPossibleId._id,
        keys: Object.keys(taskWithPossibleId)
      });
      
      // Remove _id if it exists
      const { _id, ...taskWithoutId } = taskWithPossibleId;
      console.log('Task data after removing _id:', taskWithoutId);
      
      const response = await api.createTask(taskWithoutId, userId);
      
      if (response.success && response.data) {
        // Don't update state here - let fetchTasks handle it
        return response.data;
      } else {
        console.error('Task creation failed:', response.error);
        throw new Error(response.error || 'Failed to create task');
      }
    } catch (err) {
      console.error('Task creation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create task';
      setError(errorMessage);
      throw err;
    }
  }, [userId]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    try {
      setError(null);
      const response = await api.updateTask(id, updates, userId);
      
      if (response.success && response.data) {
        setTasks(prev => prev.map(task => task._id === id ? response.data! : task));
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to update task');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task';
      setError(errorMessage);
      throw err;
    }
  }, [userId]);

  const deleteTask = useCallback(async (id: string) => {
    try {
      setError(null);
      const response = await api.deleteTask(id, userId);
      
      if (response.success) {
        setTasks(prev => prev.filter(task => task._id !== id));
      } else {
        throw new Error(response.error || 'Failed to delete task');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete task';
      setError(errorMessage);
      throw err;
    }
  }, [userId]);

  const completeTask = useCallback(async (id: string, actualTime: number) => {
    try {
      setError(null);
      const response = await api.completeTask(id, actualTime, userId);
      
      if (response.success && response.data) {
        setTasks(prev => prev.map(task => task._id === id ? response.data! : task));
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to complete task');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete task';
      setError(errorMessage);
      throw err;
    }
  }, [userId]);

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
  };
}