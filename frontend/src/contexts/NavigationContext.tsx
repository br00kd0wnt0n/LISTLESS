import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { ViewMode } from '@/lib/design-system';

type ViewType = 'dashboard' | 'tasks';
type ZoomLevel = 'overview' | 'domain' | 'task';

interface Breadcrumb {
  level: ZoomLevel;
  label: string;
  id?: string;
}

interface NavigationState {
  zoomLevel: ZoomLevel;
  viewMode: ViewMode;
  viewType: ViewType;
  breadcrumbs: Breadcrumb[];
}

interface NavigationContextType {
  state: NavigationState;
  setZoomLevel: (level: ZoomLevel) => void;
  setViewMode: (mode: ViewMode) => void;
  setViewType: (type: ViewType) => void;
  selectDomain: (domainId: string, label: string) => void;
  selectTask: (taskId: string, label: string) => void;
  goBack: () => void;
  resetNavigation: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<NavigationState>({
    zoomLevel: 'overview',
    viewMode: 'day',
    viewType: 'tasks',
    breadcrumbs: [{ level: 'overview', label: 'Overview' }]
  });

  const setZoomLevel = useCallback((level: ZoomLevel) => {
    setState(prev => ({ ...prev, zoomLevel: level }));
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    setState(prev => ({ ...prev, viewMode: mode }));
  }, []);

  const setViewType = useCallback((type: ViewType) => {
    setState(prev => ({ ...prev, viewType: type }));
  }, []);

  const selectDomain = useCallback((domainId: string, label: string) => {
    setState(prev => ({
      ...prev,
      zoomLevel: 'domain',
      breadcrumbs: [
        { level: 'overview', label: 'Overview' },
        { level: 'domain', label, id: domainId }
      ]
    }));
  }, []);

  const selectTask = useCallback((taskId: string, label: string) => {
    setState(prev => ({
      ...prev,
      zoomLevel: 'task',
      breadcrumbs: [
        ...prev.breadcrumbs,
        { level: 'task', label, id: taskId }
      ]
    }));
  }, []);

  const goBack = useCallback(() => {
    setState(prev => {
      const newBreadcrumbs = prev.breadcrumbs.slice(0, -1);
      const lastCrumb = newBreadcrumbs[newBreadcrumbs.length - 1];
      return {
        ...prev,
        zoomLevel: lastCrumb.level,
        breadcrumbs: newBreadcrumbs
      };
    });
  }, []);

  const resetNavigation = useCallback(() => {
    setState({
      zoomLevel: 'overview',
      viewMode: 'day',
      viewType: 'dashboard',
      breadcrumbs: [{ level: 'overview', label: 'Overview' }]
    });
  }, []);

  return (
    <NavigationContext.Provider value={{
      state,
      setZoomLevel,
      setViewMode,
      setViewType,
      selectDomain,
      selectTask,
      goBack,
      resetNavigation
    }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}; 