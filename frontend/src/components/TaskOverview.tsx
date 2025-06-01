import React, { useState } from 'react';
import { Task } from '@/types/Task';
import { LIFE_DOMAINS, LifeDomain } from '@/lib/design-system';
import { motion } from 'framer-motion';
import { ANIMATION } from '@/lib/design-system';
import { ConfirmModal } from './ConfirmModal';
import { TaskManager } from '@/hooks/useTaskManager';

interface TaskOverviewProps {
  tasks: Task[];
  taskManager: TaskManager;
}

export function TaskOverview({ tasks, taskManager }: TaskOverviewProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Calculate task statistics
  const stats = React.useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const pendingTasks = totalTasks - completedTasks;
    
    // Group by domain
    const domainGroups = tasks.reduce((acc, task) => {
      const domain = task.lifeDomain || 'undefined';
      if (!acc[domain]) acc[domain] = 0;
      acc[domain]++;
      return acc;
    }, {} as Record<string, number>);

    // Group by priority
    const priorityGroups = tasks.reduce((acc, task) => {
      if (!acc[task.priority]) acc[task.priority] = 0;
      acc[task.priority]++;
      return acc;
    }, {} as Record<string, number>);

    // Calculate emotional profile stats
    const emotionalStats = tasks.reduce((acc, task) => {
      if (task.emotionalProfile) {
        acc.totalWithEmotional++;
        if (task.emotionalProfile.stressLevel === 'high' || task.emotionalProfile.stressLevel === 'overwhelming') {
          acc.highStress++;
        }
      }
      return acc;
    }, { totalWithEmotional: 0, highStress: 0 });

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      completionRate: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0,
      domainGroups,
      priorityGroups,
      emotionalStats
    };
  }, [tasks]);

  return (
    <motion.div 
      className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6 relative"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: ANIMATION.duration.normal }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Task Completion Stats */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-500">Task Progress</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-gray-900">{stats.completionRate}%</span>
            <span className="text-sm text-gray-500">complete</span>
          </div>
          <div className="flex gap-2 text-sm text-gray-600">
            <span>{stats.completedTasks} done</span>
            <span>•</span>
            <span>{stats.pendingTasks} pending</span>
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-500">Priority Distribution</h3>
          <div className="space-y-1">
            {Object.entries(stats.priorityGroups).map(([priority, count]) => (
              <div key={priority} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">{priority}</span>
                <span className="text-sm font-medium text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Domain Distribution */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-500">Life Domains</h3>
          <div className="space-y-1">
            {Object.entries(stats.domainGroups)
              .filter(([domain]) => domain !== 'undefined')
              .map(([domain, count]) => {
                const domainStyle = LIFE_DOMAINS[domain as LifeDomain];
                return (
                  <div key={domain} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: domainStyle?.accentColor }}
                      />
                      <span className="text-sm text-gray-600">{domainStyle?.name}</span>
                    </span>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Emotional Profile Stats */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-500">Emotional Profile</h3>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Tasks with emotional data</span>
              <span className="text-sm font-medium text-gray-900">
                {stats.emotionalStats.totalWithEmotional}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">High stress tasks</span>
              <span className="text-sm font-medium text-gray-900">
                {stats.emotionalStats.highStress}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Delete All Tasks Button */}
      <div className="absolute bottom-4 right-4">
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 
            hover:bg-red-50 rounded-md transition-colors duration-200"
        >
          Delete All Tasks
        </button>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          try {
            await taskManager.deleteAllTasks();
            setShowDeleteConfirm(false);
          } catch (error) {
            console.error('Failed to delete all tasks:', error);
            alert('Failed to delete all tasks. Please try again.');
          }
        }}
        title="Delete All Tasks"
        message="Are you sure you want to delete all tasks? This action cannot be undone."
        confirmText="Delete All"
        cancelText="Cancel"
      />
    </motion.div>
  );
} 