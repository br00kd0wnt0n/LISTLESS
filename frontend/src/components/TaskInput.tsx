'use client';

import { useState } from 'react';
import { TaskManager } from '@/hooks/useTaskManager';
import { useUser } from '@/contexts/UserContext';

interface TaskInputProps {
  taskManager: TaskManager;
}

export function TaskInput({ taskManager }: TaskInputProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { selectedUser } = useUser();
  const { processTaskInput, processing, error: aiError, createTask, fetchTasks } = taskManager;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || processing) return;

    try {
      setError(null);
      
      // Process the input with AI using the selected user
      const processedTasks = await processTaskInput(input.trim());
      console.log('AI processed tasks:', processedTasks);
      
      // Create each task in the backend
      for (const task of processedTasks) {
        try {
          // Strip out _id field if it exists
          const { _id, ...taskWithoutId } = task;
          await createTask(taskWithoutId);
        } catch (taskError) {
          console.error('Failed to create task:', taskError);
          // Add the task title to the error message for context
          const taskTitle = task.title || 'Untitled task';
          const errorMessage = taskError instanceof Error ? taskError.message : 'Failed to create task';
          setError(`Failed to create task "${taskTitle}": ${errorMessage}`);
          // Don't continue creating other tasks if one fails
          break;
        }
      }
      
      // Only fetch tasks and clear input if all tasks were created successfully
      if (!error) {
        await fetchTasks();
        setInput('');
      }
      
    } catch (error) {
      console.error('Failed to process task:', error);
      setError(error instanceof Error ? error.message : 'Failed to process task');
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="task-input" className="block text-sm font-medium text-gray-700 mb-2">
            Tell me what you need to do
          </label>
          <textarea
            id="task-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g., 'I need to clean the house before guests arrive this weekend, do grocery shopping, and prepare for Monday's presentation'"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            rows={4}
            disabled={processing}
          />
          {(error || aiError) && (
            <p className="mt-2 text-sm text-red-600">
              {error || aiError}
            </p>
          )}
        </div>
        
        <button
          type="submit"
          disabled={!input.trim() || processing}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {processing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <span>🧠</span>
              <span>Create Tasks</span>
            </>
          )}
        </button>
      </form>
      
      <div className="mt-4 text-sm text-gray-600">
        <div className="mb-4">
          <p className="font-medium">💡 <strong>Try saying:</strong></p>
          <ul className="mt-2 space-y-1 text-gray-500">
            <li>• "Schedule a dentist appointment and pick up dry cleaning"</li>
            <li>• "Plan weekend meal prep and grocery shopping"</li>
            <li>• "Organize kids' school supplies before Monday"</li>
            <li>• "Prepare for next week's presentation by Friday, including research and slides"</li>
            <li>• "Plan the house renovation project to be completed by end of month"</li>
          </ul>
        </div>
        
        <div>
          <p className="font-medium">💡 <strong>Pro tip:</strong> Include deadlines in your input to get AI-powered workback scheduling. For example:</p>
          <ul className="mt-2 space-y-1 text-gray-500">
            <li>• "Need to complete the quarterly report by Friday"</li>
            <li>• "Plan the team building event for next month"</li>
            <li>• "Organize the conference by end of Q2"</li>
          </ul>
        </div>
      </div>
    </div>
  );
}