'use client';

import { useState } from 'react';
import { useAI } from '@/hooks/useAI';
import { useTasks } from '@/hooks/useTasks';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function TaskInput() {
  const [input, setInput] = useState('');
  const { processTaskInput, processing, error: aiError } = useAI();
  const { createTask, fetchTasks } = useTasks('default-user');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || processing) return;

    try {
      setError(null);
      
      // Process the input with AI
      const processedTasks = await processTaskInput(input.trim(), 'default-user');
      console.log('AI processed tasks:', processedTasks);
      
      // Refresh the task list to show the new tasks
      await fetchTasks();
      
      // Clear input on success
      setInput('');
      
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
        <p>💡 <strong>Try saying:</strong></p>
        <ul className="mt-2 space-y-1 text-gray-500">
          <li>• "Schedule a dentist appointment and pick up dry cleaning"</li>
          <li>• "Plan weekend meal prep and grocery shopping"</li>
          <li>• "Organize kids' school supplies before Monday"</li>
        </ul>
      </div>
    </div>
  );
}