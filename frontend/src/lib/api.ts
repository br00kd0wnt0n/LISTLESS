// API client for frontend
import { API_URL } from '@/config';

if (!API_URL) {
  throw new Error('API_URL is not configured. Please set NEXT_PUBLIC_API_URL environment variable.');
}

export interface Task {
  _id?: string;
  title: string;
  description?: string;
  category: 'household' | 'work' | 'personal' | 'health' | 'finance';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: 'todo' | 'in-progress' | 'completed' | 'cancelled' | 'deferred';
  estimatedTime: number;
  actualTime?: number;
  createdAt?: Date;
  updatedAt?: Date;
  completedAt?: Date;
  createdBy: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'An error occurred');
  }
  return data;
}

export const api = {
  async processTask(input: string, userId: string): Promise<ApiResponse<{ tasks: Task[] }>> {
    const response = await fetch(`${API_URL}/api/ai/process-task?userId=${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input })
    });
    return handleResponse<{ tasks: Task[] }>(response);
  },

  async estimateTime(task: Task): Promise<ApiResponse<{ estimatedTime: number }>> {
    const response = await fetch(`${API_URL}/api/ai/estimate-time`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task })
    });
    return handleResponse<{ estimatedTime: number }>(response);
  },

  async getTasks(userId: string): Promise<ApiResponse<Task[]>> {
    const response = await fetch(`${API_URL}/api/tasks?userId=${userId}`);
    return handleResponse<Task[]>(response);
  },

  async createTask(task: Omit<Task, '_id'>, userId: string): Promise<ApiResponse<Task>> {
    const response = await fetch(`${API_URL}/api/tasks?userId=${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
    return handleResponse<Task>(response);
  },

  async updateTask(id: string, task: Partial<Task>, userId: string): Promise<ApiResponse<Task>> {
    const response = await fetch(`${API_URL}/api/tasks/${id}?userId=${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task)
    });
    return handleResponse<Task>(response);
  },

  async deleteTask(id: string, userId: string): Promise<ApiResponse<void>> {
    const response = await fetch(`${API_URL}/api/tasks/${id}?userId=${userId}`, {
      method: 'DELETE'
    });
    return handleResponse<void>(response);
  },

  async completeTask(id: string, actualTime: number, userId: string): Promise<ApiResponse<Task>> {
    const response = await fetch(`${API_URL}/api/tasks/${id}/complete?userId=${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actualTime })
    });
    return handleResponse<Task>(response);
  }
}; 