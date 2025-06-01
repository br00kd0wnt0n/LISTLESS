import { useState, useCallback } from 'react';
import { api, Task } from '@/lib/api';

// Define the input type for creating tasks
type CreateTaskInput = Omit<Task, '_id' | 'createdAt' | 'updatedAt'>;

interface TaskManagerState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  processing: boolean;
}

interface TaskManagerOperations {
  // Task Operations
  fetchTasks: () => Promise<void>;
  createTask: (task: CreateTaskInput) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  deleteAllTasks: () => Promise<void>;
  completeTask: (id: string, actualTime: number) => Promise<Task>;
  
  // AI Operations
  processTaskInput: (input: string) => Promise<Task[]>;
  estimateTime: (task: Task) => Promise<number>;
}

export type TaskManager = TaskManagerState & TaskManagerOperations;

export function useTaskManager(userId: string): TaskManager {
  // Combined state
  const [state, setState] = useState<TaskManagerState>({
    tasks: [],
    loading: false,
    error: null,
    processing: false
  });

  // Task Operations
  const fetchTasks = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const response = await api.getTasks(userId);
      
      if (response.success && response.data) {
        setState(prev => ({ ...prev, tasks: response.data || [] }));
      } else {
        throw new Error(response.error || 'Failed to fetch tasks');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tasks';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw err;
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [userId]);

  const createTask = useCallback(async (taskInput: CreateTaskInput) => {
    try {
      setState(prev => ({ ...prev, error: null }));
      // Convert CreateTaskInput to the API's expected type
      const task = {
        ...taskInput,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const response = await api.createTask(task, userId);
      
      if (response.success && response.data) {
        setState(prev => ({ ...prev, tasks: [...prev.tasks, response.data!] }));
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to create task');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create task';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw err;
    }
  }, [userId]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    try {
      setState(prev => ({ ...prev, error: null }));
      const response = await api.updateTask(id, updates, userId);
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          tasks: prev.tasks.map(task => task._id === id ? response.data! : task)
        }));
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to update task');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw err;
    }
  }, [userId]);

  const deleteTask = useCallback(async (id: string) => {
    try {
      setState(prev => ({ ...prev, error: null }));
      const response = await api.deleteTask(id, userId);
      
      if (response.success) {
        setState(prev => ({
          ...prev,
          tasks: prev.tasks.filter(task => task._id !== id)
        }));
      } else {
        throw new Error(response.error || 'Failed to delete task');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete task';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw err;
    }
  }, [userId]);

  const deleteAllTasks = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      const response = await api.deleteAllTasks(userId);
      
      if (response.success) {
        setState(prev => ({
          ...prev,
          tasks: []
        }));
      } else {
        throw new Error(response.error || 'Failed to delete all tasks');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete all tasks';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw err;
    }
  }, [userId]);

  const completeTask = useCallback(async (id: string, actualTime: number) => {
    try {
      setState(prev => ({ ...prev, error: null }));
      const response = await api.completeTask(id, actualTime, userId);
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          tasks: prev.tasks.map(task => task._id === id ? response.data! : task)
        }));
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to complete task');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete task';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw err;
    }
  }, [userId]);

  // AI Operations
  const processTaskInput = useCallback(async (input: string) => {
    try {
      setState(prev => ({ ...prev, processing: true, error: null }));
      const response = await api.processTask(input, userId);
      
      if (response.success && response.data?.tasks) {
        return response.data.tasks;
      } else {
        throw new Error(response.error || 'Failed to process input');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process task input';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw err;
    } finally {
      setState(prev => ({ ...prev, processing: false }));
    }
  }, [userId]);

  const estimateTime = useCallback(async (task: Task) => {
    try {
      setState(prev => ({ ...prev, error: null }));
      const response = await api.estimateTime(task);
      
      if (response.success && response.data?.estimatedTime) {
        return response.data.estimatedTime;
      } else {
        throw new Error(response.error || 'Failed to estimate time');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to estimate time';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw err;
    }
  }, []);

  return {
    ...state,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    deleteAllTasks,
    completeTask,
    processTaskInput,
    estimateTime
  };
} 