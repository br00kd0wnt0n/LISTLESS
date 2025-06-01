import React from 'react';
import { Task } from '@/types/Task';
import { LifeDomain } from '@/lib/design-system';

interface DataDebuggerProps {
  tasks: Task[];
}

export const DataDebugger: React.FC<DataDebuggerProps> = ({ tasks }) => {
  const domainGroups = tasks.reduce((acc, task) => {
    const domain = task.lifeDomain || 'undefined';
    if (!acc[domain]) acc[domain] = [];
    acc[domain].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  const totalTasks = tasks.length;
  const tasksWithDomains = tasks.filter(t => t.lifeDomain).length;
  const tasksWithEmotionalProfile = tasks.filter(t => t.emotionalProfile).length;

  return (
    <div className="fixed bottom-4 right-4 bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-lg max-w-md z-50 text-sm">
      <h3 className="font-bold mb-2 text-gray-900">Debug Info:</h3>
      <div className="space-y-2 text-gray-700">
        <div className="grid grid-cols-2 gap-x-4">
          <span>Total tasks:</span>
          <span className="font-medium">{totalTasks}</span>
          <span>With domains:</span>
          <span className="font-medium">{tasksWithDomains} ({Math.round(tasksWithDomains/totalTasks*100)}%)</span>
          <span>With emotional data:</span>
          <span className="font-medium">{tasksWithEmotionalProfile} ({Math.round(tasksWithEmotionalProfile/totalTasks*100)}%)</span>
        </div>
        
        <div className="mt-3 pt-2 border-t border-gray-200">
          <h4 className="font-medium mb-1">Tasks by Domain:</h4>
          {Object.entries(domainGroups).map(([domain, domainTasks]) => (
            <div key={domain} className="flex justify-between items-center">
              <span className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full bg-${domain}-500`}></span>
                {domain}:
              </span>
              <span className="font-medium">{domainTasks.length} tasks</span>
            </div>
          ))}
        </div>

        {tasks.length > 0 && !tasks[0].lifeDomain && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
            ⚠️ Tasks are missing life domains. Add domains to see them in the dashboard.
          </div>
        )}
      </div>
    </div>
  );
}; 