import { useState, useCallback } from 'react';
import { LifeDomain, ViewMode } from '@/lib/design-system';

interface ZoomState {
  viewMode: ViewMode;
  focusedDomain?: LifeDomain;
  zoomLevel: 'overview' | 'domain' | 'task';
  selectedTaskId?: string;
}

export const useZoomNavigation = () => {
  const [zoomState, setZoomState] = useState<ZoomState>({
    viewMode: 'day',
    zoomLevel: 'overview'
  });

  const zoomToDomain = useCallback((domain: LifeDomain) => {
    setZoomState(prev => ({
      ...prev,
      focusedDomain: domain,
      zoomLevel: 'domain'
    }));
  }, []);

  const zoomToTask = useCallback((taskId: string) => {
    setZoomState(prev => ({
      ...prev,
      selectedTaskId: taskId,
      zoomLevel: 'task'
    }));
  }, []);

  const zoomToOverview = useCallback(() => {
    setZoomState(prev => ({
      ...prev,
      focusedDomain: undefined,
      selectedTaskId: undefined,
      zoomLevel: 'overview'
    }));
  }, []);

  const changeViewMode = useCallback((mode: ViewMode) => {
    setZoomState(prev => ({
      ...prev,
      viewMode: mode,
      // Reset zoom when changing view mode
      zoomLevel: 'overview',
      focusedDomain: undefined,
      selectedTaskId: undefined
    }));
  }, []);

  return {
    ...zoomState,
    zoomToDomain,
    zoomToTask,
    zoomToOverview,
    changeViewMode
  };
};

export default useZoomNavigation; 