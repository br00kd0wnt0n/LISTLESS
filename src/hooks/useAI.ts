// ===== frontend/src/hooks/useAI.ts =====
import { useState } from 'react';
import { api, Task } from '@/lib/api';

export function useAI() {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processTaskInput = async (input: string, userId: string = 'default-user') => {
    try {
      setProcessing(true);
      setError(null);
      
      const response = await api.processTask(input, userId);
      
      if (response.success && response.data?.tasks) {
        return response.data.tasks;
      } else {
        throw new Error(response.error?.message || 'Failed to process input');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process task input';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const estimateTime = async (taskTitle: string, category?: string, description?: string) => {
    try {
      setError(null);
      const response = await api.estimateTime(taskTitle, category, description);
      
      if (response.success && response.data?.estimatedTime) {
        return response.data.estimatedTime;
      } else {
        throw new Error(response.error?.message || 'Failed to estimate time');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to estimate time';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  return {
    processTaskInput,
    estimateTime,
    processing,
    error
  };
}