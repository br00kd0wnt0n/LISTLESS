'use client';

import React, { useEffect } from 'react';
import { TaskInput } from '@/components/TaskInput';
import { TaskList } from '@/components/TaskList';
import { LifeComposition } from '@/components/dashboard/LifeComposition';
import { UserSelector } from '@/components/UserSelector';
import { UserProvider, useUser } from '@/contexts/UserContext';
import { NavigationProvider, useNavigation } from '@/contexts/NavigationContext';
import { useTaskManager } from '@/hooks/useTaskManager';
import { LifeDomain, ViewMode } from '@/lib/design-system';
import { DataDebugger } from '@/components/debug/DataDebugger';
import { BreadcrumbNav } from '@/components/navigation/BreadcrumbNav';
import { TaskOverview } from '@/components/TaskOverview';

function TaskApp() {
  const { selectedUser } = useUser();
  const taskManager = useTaskManager(selectedUser);
  const { 
    state: { viewType, viewMode, zoomLevel, breadcrumbs },
    setViewMode,
    setZoomLevel,
    selectDomain,
    selectTask
  } = useNavigation();

  // Refetch tasks when user changes, but not when taskManager changes
  useEffect(() => {
    if (selectedUser) {
      taskManager.fetchTasks().catch(console.error);
    }
  }, [selectedUser]); // Remove taskManager from dependencies

  const handleDomainClick = (domain: LifeDomain) => {
    selectDomain(domain, domain);
  };

  const handleTaskClick = (task: any) => {
    selectTask(task._id, task.title);
  };

  // Get the current domain and task from breadcrumbs
  const currentDomain = breadcrumbs.find(crumb => crumb.level === 'domain')?.id as LifeDomain | undefined;
  const currentTask = breadcrumbs.find(crumb => crumb.level === 'task')?.id;

  return (
    <div className="container mx-auto px-4 py-8">
      {viewType === 'dashboard' ? (
        // Dashboard view - only show LifeComposition
        <div className="h-[calc(100vh-12rem)]">
          <LifeComposition
            tasks={taskManager.tasks}
            viewMode={viewMode}
            onDomainClick={handleDomainClick}
            onTaskClick={handleTaskClick}
            focusedDomain={currentDomain}
            zoomLevel={zoomLevel}
            selectedTaskId={currentTask}
          />
        </div>
      ) : (
        // Tasks view - show overview, task input, and list
        <div className="space-y-8">
          {/* Task Overview - Full Width */}
          <div className="w-full">
            <TaskOverview tasks={taskManager.tasks} taskManager={taskManager} />
          </div>
          
          {/* Task Input - Centered */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg p-6">
              <TaskInput taskManager={taskManager} />
            </div>
          </div>

          {/* Task List */}
          <div className="mt-8">
            <TaskList taskManager={taskManager} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <UserProvider>
      <NavigationProvider>
        <div className="min-h-screen bg-gray-50">
          <BreadcrumbNav />
          <div className="mt-16">
            <TaskApp />
          </div>
        </div>
      </NavigationProvider>
    </UserProvider>
  );
}