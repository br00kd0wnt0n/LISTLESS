// API client for frontend
import { API_URL } from '@/config';

if (!API_URL) {
  throw new Error('API_URL is not configured. Please set NEXT_PUBLIC_API_URL environment variable.');
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  category: string;
  priority: string;
  status: string;
  estimatedTime: number;
  actualTime?: number;
  scheduledEnd?: string;
  startBy?: string;
  startByAlert?: string;
  workback?: Array<{
    title: string;
    scheduledEnd: string;
    estimatedTime?: number;
  }>;
  tags?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  aiProcessed?: boolean;
  originalInput?: string;
  emotionalProfile?: {
    stressLevel: 'low' | 'medium' | 'high' | 'overwhelming';
    emotionalImpact: 'positive' | 'neutral' | 'negative';
    energyLevel: 'low' | 'medium' | 'high';
    motivationLevel: 'low' | 'medium' | 'high';
    emotionalTriggers?: string[];
    copingStrategies?: string[];
  };
  lifeDomain?: 'purple' | 'blue' | 'yellow' | 'green' | 'orange' | 'red';
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const data = await response.json();
  
  if (!response.ok) {
    // Handle validation errors specifically
    if (response.status === 400) {
      if (data.error?.details) {
        // Format validation errors
        const validationErrors = data.error.details
          .map((err: any) => `${err.param}: ${err.msg}`)
          .join(', ');
        throw new Error(`Validation failed: ${validationErrors}`);
      } else if (data.error?.message) {
        // Handle other error messages
        throw new Error(data.error.message);
      } else if (typeof data.error === 'string') {
        // Handle string error messages
        throw new Error(data.error);
      } else if (data.error) {
        // Handle error objects
        const errorMessage = typeof data.error === 'object' 
          ? JSON.stringify(data.error)
          : String(data.error);
        throw new Error(errorMessage);
      }
    }
    // Handle other errors
    const errorMessage = data.error?.message || data.error || 'Request failed';
    throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
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
  },

  async deleteAllTasks(userId: string): Promise<ApiResponse<void>> {
    const response = await fetch(`${API_URL}/api/tasks/all?userId=${userId}`, {
      method: 'DELETE'
    });
    return handleResponse<void>(response);
  }
}; 