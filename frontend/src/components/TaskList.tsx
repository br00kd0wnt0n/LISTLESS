'use client';

import { useEffect, useState } from 'react';
import { Task, WorkbackStep } from '@/types/Task';
import { TaskManager } from '@/hooks/useTaskManager';
import { ConfirmModal } from './ConfirmModal';
import { DurationSelector } from './DurationSelector';
import { motion, AnimatePresence } from 'framer-motion';
import { LIFE_DOMAINS } from '@/lib/design-system';

interface TaskListProps {
  taskManager: TaskManager;
}

function formatDate(inputDateString: string): string {
  // Convert input date to NY timezone for consistent comparison
  const date = new Date(inputDateString);
  const dateNY = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  
  // Get current date in NY timezone
  const now = new Date();
  const nowNY = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  
  // Create tomorrow's date in NY timezone
  const tomorrowNY = new Date(nowNY);
  tomorrowNY.setDate(tomorrowNY.getDate() + 1);
  tomorrowNY.setHours(0, 0, 0, 0);
  
  // Create next week's date in NY timezone
  const nextWeekNY = new Date(nowNY);
  nextWeekNY.setDate(nextWeekNY.getDate() + 7);
  nextWeekNY.setHours(0, 0, 0, 0);

  // Check if the date has a specific time (not midnight)
  const hasSpecificTime = dateNY.getHours() !== 0 || dateNY.getMinutes() !== 0;
  const timeString = hasSpecificTime ? 
    dateNY.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }) : '';

  // If it's today (comparing full dates in NY timezone)
  if (dateNY.getFullYear() === nowNY.getFullYear() &&
      dateNY.getMonth() === nowNY.getMonth() &&
      dateNY.getDate() === nowNY.getDate()) {
    return hasSpecificTime ? `Today at ${timeString}` : 'Today';
  }
  
  // If it's tomorrow (comparing full dates in NY timezone)
  if (dateNY.getFullYear() === tomorrowNY.getFullYear() &&
      dateNY.getMonth() === tomorrowNY.getMonth() &&
      dateNY.getDate() === tomorrowNY.getDate()) {
    return hasSpecificTime ? `Tomorrow at ${timeString}` : 'Tomorrow';
  }
  
  // If it's within the next week
  if (dateNY < nextWeekNY) {
    const weekday = dateNY.toLocaleDateString('en-US', { 
      weekday: 'long',
      timeZone: 'America/New_York'
    }); // e.g., "Monday"
    return hasSpecificTime ? `${weekday} at ${timeString}` : weekday;
  }
  
  // For dates further in the future, show the full date
  const formattedDate = dateNY.toLocaleDateString('en-US', { 
    month: 'short',
    day: 'numeric',
    year: dateNY.getFullYear() !== nowNY.getFullYear() ? 'numeric' : undefined,
    timeZone: 'America/New_York'
  });
  
  return hasSpecificTime ? `${formattedDate} at ${timeString}` : formattedDate;
}

// Add helper functions for emotional indicators
type EmotionalProfile = NonNullable<Task['emotionalProfile']>;

const getStressLevelEmoji = (profile?: EmotionalProfile) => {
  if (!profile?.stressLevel) return '';
  switch (profile.stressLevel) {
    case 'low': return '😌';
    case 'medium': return '😐';
    case 'high': return '😰';
    case 'overwhelming': return '😱';
    default: return '';
  }
};

const getEmotionalImpactEmoji = (profile?: EmotionalProfile) => {
  if (!profile?.emotionalImpact) return '';
  switch (profile.emotionalImpact) {
    case 'positive': return '😊';
    case 'neutral': return '😐';
    case 'negative': return '😔';
    default: return '';
  }
};

const getEnergyLevelEmoji = (profile?: EmotionalProfile) => {
  if (!profile?.energyLevel) return '';
  switch (profile.energyLevel) {
    case 'low': return '😴';
    case 'medium': return '😌';
    case 'high': return '⚡';
    default: return '';
  }
};

const getMotivationLevelEmoji = (profile?: EmotionalProfile) => {
  if (!profile?.motivationLevel) return '';
  switch (profile.motivationLevel) {
    case 'low': return '😕';
    case 'medium': return '😐';
    case 'high': return '💪';
    default: return '';
  }
};

const getLifeDomainColor = (domain: Task['lifeDomain']) => {
  switch (domain) {
    case 'purple': return {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-900',
      badge: 'bg-purple-100 text-purple-800'
    };
    case 'blue': return {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-900',
      badge: 'bg-blue-100 text-blue-800'
    };
    case 'yellow': return {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-900',
      badge: 'bg-yellow-100 text-yellow-800'
    };
    case 'green': return {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-900',
      badge: 'bg-green-100 text-green-800'
    };
    case 'orange': return {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-900',
      badge: 'bg-orange-100 text-orange-800'
    };
    case 'red': return {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-900',
      badge: 'bg-red-100 text-red-800'
    };
    default: return {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-900',
      badge: 'bg-gray-100 text-gray-800'
    };
  }
};

// Add new helper functions for emotional visualization
const getEmotionalIntensityColor = (level: string, type: 'stress' | 'impact' | 'energy' | 'motivation'): string => {
  const colors = {
    stress: {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      overwhelming: 'bg-red-100 text-red-800'
    },
    impact: {
      positive: 'bg-green-100 text-green-800',
      neutral: 'bg-gray-100 text-gray-800',
      negative: 'bg-red-100 text-red-800'
    },
    energy: {
      low: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-green-100 text-green-800'
    },
    motivation: {
      low: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-green-100 text-green-800'
    }
  } as const;
  
  const typeColors = colors[type];
  return (typeColors && typeColors[level as keyof typeof typeColors]) || 'bg-gray-100 text-gray-800';
};

const getEmotionalProgressWidth = (level: string, type: 'stress' | 'impact' | 'energy' | 'motivation'): string => {
  const values = {
    stress: { low: '25%', medium: '50%', high: '75%', overwhelming: '100%' },
    impact: { positive: '100%', neutral: '50%', negative: '25%' },
    energy: { low: '25%', medium: '50%', high: '100%' },
    motivation: { low: '25%', medium: '50%', high: '100%' }
  } as const;
  
  const typeValues = values[type];
  return (typeValues && typeValues[level as keyof typeof typeValues]) || '0%';
};

// Helper functions
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

const formatWorkbackStep = (step: WorkbackStep) => {
  const date = formatDate(step.scheduledEnd);
  const duration = step.estimatedTime ? formatDuration(step.estimatedTime) : '';
  return `${step.title}${duration ? ` (${duration})` : ''} - Due ${date}`;
};

export function TaskList({ taskManager }: TaskListProps) {
  const { tasks, loading, error, completeTask, deleteTask, fetchTasks, updateTask } = taskManager;
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingDuration, setEditingDuration] = useState<number | null>(null);
  const [expandedWorkbackTasks, setExpandedWorkbackTasks] = useState<Set<string>>(() => {
    // Initialize with all task IDs to show workback details by default
    return new Set(tasks.map(task => task._id));
  });

  useEffect(() => {
    fetchTasks().catch(console.error);
  }, [fetchTasks]);

  // Update expandedWorkbackTasks when tasks change
  useEffect(() => {
    setExpandedWorkbackTasks(prev => {
      const next = new Set(prev);
      // Add any new task IDs while preserving existing ones
      tasks.forEach(task => {
        if (task._id) next.add(task._id);
      });
      return next;
    });
  }, [tasks]);

  const toggleWorkback = (taskId: string) => {
    setExpandedWorkbackTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

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

  const handleDurationChange = async (taskId: string, newDuration: number) => {
    try {
      await updateTask(taskId, { estimatedTime: newDuration });
      setEditingTaskId(null);
      setEditingDuration(null);
      await fetchTasks();
    } catch (error) {
      console.error('Failed to update task duration:', error);
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
    <div className="h-full w-full p-4">
      <div className="max-w-3xl mx-auto">
        <div className="grid gap-4">
          {tasks.map(task => {
            const colors = getLifeDomainColor(task.lifeDomain);
            const domainStyle = task.lifeDomain ? LIFE_DOMAINS[task.lifeDomain] : null;
            const isWorkbackExpanded = expandedWorkbackTasks.has(task._id);
            
            return (
              <motion.div
                key={task._id}
                className={`relative rounded-lg overflow-hidden backdrop-blur-sm
                  ${domainStyle ? 'bg-opacity-90' : 'bg-white/90'}
                  shadow-lg transition-all duration-300`}
                style={{
                  backgroundColor: domainStyle ? domainStyle.accentColor : 'white',
                  boxShadow: domainStyle ? 
                    `0 0 20px ${domainStyle.accentColor}40` : 
                    '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className={`text-lg font-semibold ${
                          domainStyle ? 'text-white' : colors.text
                        }`}>
                          {task.title}
                        </h3>
                        {task.lifeDomain && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            domainStyle ? 'bg-white/20 text-white' : colors.badge
                          }`}>
                            {LIFE_DOMAINS[task.lifeDomain].name}
                          </span>
                        )}
                      </div>
                      
                      {task.description && (
                        <p className={`mt-1 ${
                          domainStyle ? 'text-white/80' : colors.text + ' opacity-70'
                        }`}>
                          {task.description}
                        </p>
                      )}
                      
                      <div className={`flex flex-wrap gap-2 mt-3 ${
                        domainStyle ? 'text-white/90' : colors.text
                      }`}>
                        {task.emotionalProfile && (
                          <>
                            <span className={`px-2 py-1 rounded-full text-sm ${
                              domainStyle ? 'bg-white/20' : colors.badge
                            }`}>
                              {task.emotionalProfile.stressLevel} stress
                            </span>
                            {task.emotionalProfile.energyLevel && (
                              <span className={`px-2 py-1 rounded-full text-sm ${
                                domainStyle ? 'bg-white/20' : colors.badge
                              }`}>
                                {task.emotionalProfile.energyLevel} energy
                              </span>
                            )}
                          </>
                        )}
                        <span className={`px-2 py-1 rounded-full text-sm ${
                          domainStyle ? 'bg-white/20' : colors.badge
                        }`}>
                          {task.priority} priority
                        </span>
                        <span className={`px-2 py-1 rounded-full text-sm ${
                          domainStyle ? 'bg-white/20' : colors.badge
                        }`}>
                          {task.status}
                        </span>
                      </div>

                      {/* Workback Steps Section */}
                      {task.workback && task.workback.length > 0 && (
                        <div className="mt-3">
                          <button
                            onClick={() => toggleWorkback(task._id)}
                            className={`flex items-center gap-1 text-sm ${
                              domainStyle ? 'text-white/70 hover:text-white' : colors.text + ' opacity-70 hover:opacity-100'
                            }`}
                          >
                            <span>{isWorkbackExpanded ? '▼' : '▶'}</span>
                            <span>Workback Plan ({task.workback.length} steps)</span>
                          </button>
                          
                          <AnimatePresence>
                            {isWorkbackExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className={`mt-2 pl-4 border-l-2 ${
                                  domainStyle ? 'border-white/20' : colors.border
                                }`}>
                                  {task.workback.map((step, index) => (
                                    <div
                                      key={index}
                                      className={`py-1.5 text-sm ${
                                        domainStyle ? 'text-white/80' : colors.text + ' opacity-70'
                                      }`}
                                    >
                                      {formatWorkbackStep(step)}
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      <div className={`flex items-center space-x-4 mt-3 text-sm ${
                        domainStyle ? 'text-white/70' : colors.text + ' opacity-70'
                      }`}>
                        {editingTaskId === task._id ? (
                          <div className="flex items-center space-x-2">
                            <DurationSelector
                              value={editingDuration || task.estimatedTime}
                              onChange={(newDuration) => {
                                if (task._id) {
                                  handleDurationChange(task._id, newDuration);
                                }
                              }}
                              className={`w-32 ${
                                domainStyle ? 'bg-white/20 text-white' : 'bg-gray-100'
                              }`}
                            />
                            <button
                              onClick={() => {
                                setEditingTaskId(null);
                                setEditingDuration(null);
                              }}
                              className={domainStyle ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-gray-600'}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span>⏱️ {formatDuration(task.estimatedTime)}</span>
                            <button
                              onClick={() => startEditingDuration(task)}
                              className={domainStyle ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-gray-600'}
                              title="Edit duration"
                            >
                              ✎
                            </button>
                          </div>
                        )}
                        {task.scheduledEnd && (
                          <span>⏰ Due: {formatDate(task.scheduledEnd.toString())}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex space-x-2 ml-4">
                      {task.status !== 'completed' && task._id && (
                        <button
                          onClick={() => handleCompleteTask(task._id as string)}
                          className={`p-2 rounded-full ${
                            domainStyle ? 'text-white/70 hover:text-white' : colors.text + ' opacity-50 hover:opacity-100'
                          } transition-colors`}
                          title="Mark as complete"
                        >
                          ✅
                        </button>
                      )}
                      {task._id && (
                        <button
                          onClick={() => handleDeleteClick(task)}
                          className={`p-2 rounded-full ${
                            domainStyle ? 'text-white/70 hover:text-white' : colors.text + ' opacity-50 hover:opacity-100'
                          } transition-colors`}
                          title="Delete task"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
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