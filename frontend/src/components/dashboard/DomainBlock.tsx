'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LifeDomain, 
  DomainStyle, 
  LIFE_DOMAINS, 
  BlockSize, 
  GridPosition,
  ANIMATION,
  ViewMode,
  getEmotionalIntensity
} from '@/lib/design-system';
import { Task } from '@/types/Task';
import { useNavigation } from '@/contexts/NavigationContext';

interface DomainBlockProps {
  domain: LifeDomain;
  tasks: Task[];
  size: BlockSize;
  position: GridPosition;
  dimensions: {
    width: number;
    height: number;
  };
  onDomainClick: (domain: LifeDomain) => void;
  onTaskClick?: (task: Task) => void;
  isFocused?: boolean;
  viewMode: ViewMode;
  zoomLevel: 'overview' | 'domain' | 'task';
  style?: React.CSSProperties;
}

export const DomainBlock: React.FC<DomainBlockProps> = ({
  domain,
  tasks,
  size,
  position,
  dimensions,
  onDomainClick,
  onTaskClick,
  isFocused = false,
  viewMode,
  zoomLevel,
  style
}) => {
  const domainStyle = LIFE_DOMAINS[domain];
  
  // Calculate emotional metrics
  const emotionalMetrics = useMemo(() => {
    const stressLevels = tasks.map(task => 
      task.emotionalProfile?.stressLevel ? 
        getEmotionalIntensity(task.emotionalProfile.stressLevel) : 0.5
    );
    
    const avgStress = stressLevels.reduce((sum, val) => sum + val, 0) / tasks.length;
    const maxStress = Math.max(...stressLevels);
    const urgentCount = tasks.filter(task => 
      task.priority === 'high' || task.lifeDomain === 'red'
    ).length;
    
    // Calculate emotional complexity
    const uniqueStressLevels = new Set(stressLevels).size;
    const emotionalComplexity = Math.min(uniqueStressLevels / tasks.length, 1);
    
    // Calculate task density impact
    const taskDensity = tasks.length / (dimensions.width * dimensions.height);
    const densityImpact = Math.min(taskDensity * 2, 1);
    
    return {
      avgStress,
      maxStress,
      urgentCount,
      emotionalComplexity,
      densityImpact,
      visualIntensity: Math.min(
        (maxStress * 0.4) + // Base stress impact
        (emotionalComplexity * 0.3) + // Emotional variety impact
        (densityImpact * 0.3), // Task density impact
        1
      )
    };
  }, [tasks, dimensions]);

  // Calculate visual effects based on metrics
  const visualEffects = useMemo(() => {
    const { visualIntensity, urgentCount, emotionalComplexity } = emotionalMetrics;
    const urgencyFactor = Math.min(Math.max(urgentCount / tasks.length, 0), 1);
    
    // Calculate base opacity with enhanced emotional awareness
    const baseOpacity = 0.1;
    const intensityOpacity = Math.min(Math.max(visualIntensity * 0.25, 0), 0.25); // Increased from 0.2
    const complexityOpacity = Math.min(Math.max(emotionalComplexity * 0.15, 0), 0.15);
    const borderOpacity = Math.min(Math.max(baseOpacity + intensityOpacity + complexityOpacity, 0), 1);
    
    // Calculate glow effects with enhanced emotional awareness
    const baseGlowIntensity = Math.min(Math.max(urgencyFactor * 0.4, 0), 0.4);
    const emotionalGlowIntensity = Math.min(Math.max(visualIntensity * 0.3, 0), 0.3);
    const totalGlowIntensity = Math.min(baseGlowIntensity + emotionalGlowIntensity, 0.7);
    
    // Calculate shadow effects with enhanced depth
    const baseShadowIntensity = Math.min(Math.max(visualIntensity * 25, 0), 25);
    const urgencyShadowIntensity = Math.min(Math.max(urgencyFactor * 15, 0), 15);
    const totalShadowIntensity = Math.min(baseShadowIntensity + urgencyShadowIntensity, 40);
    
    return {
      shadowIntensity: totalShadowIntensity,
      borderWidth: isFocused ? 3 : Math.min(Math.max(visualIntensity * 2 + 1, 1), 2),
      borderColor: `rgba(255, 255, 255, ${borderOpacity})`,
      glowColor: domainStyle.accentColor,
      glowIntensity: totalGlowIntensity,
      // Add new visual properties
      hoverScale: 1.02 + (visualIntensity * 0.03), // Scale up more for high-intensity blocks
      transitionDuration: 0.3 + (visualIntensity * 0.2), // Slower transitions for high-intensity blocks
      blurAmount: Math.min(Math.max(visualIntensity * 2, 0), 2) // Subtle blur for high-intensity blocks
    };
  }, [emotionalMetrics, isFocused, domainStyle.accentColor, tasks.length]);

  // Determine what content to show based on zoom level
  const showContent = useMemo(() => {
    switch (zoomLevel) {
      case 'overview':
        return {
          showTaskList: false,
          showTaskDetails: false,
          showEmotionalProfile: false
        };
      case 'domain':
        return {
          showTaskList: true,
          showTaskDetails: false,
          showEmotionalProfile: true
        };
      case 'task':
        return {
          showTaskList: true,
          showTaskDetails: true,
          showEmotionalProfile: true
        };
      default:
        return {
          showTaskList: false,
          showTaskDetails: false,
          showEmotionalProfile: false
        };
    }
  }, [zoomLevel]);

  // Calculate block content based on zoom level and view mode
  const blockContent = useMemo(() => {
    const { showTaskList, showTaskDetails, showEmotionalProfile } = showContent;

    return (
      <div className="h-full w-full flex flex-col">
        {/* Domain Header */}
        <motion.div
          className="flex items-center justify-between p-2"
          initial={false}
          animate={{
            backgroundColor: isFocused ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
            color: 'white'
          }}
          transition={{ duration: ANIMATION.duration.normal }}
        >
          <h3 className="text-lg font-semibold">{domainStyle.name}</h3>
          {showEmotionalProfile && (
            <div className="flex items-center space-x-2">
              <span className="text-sm">
                {emotionalMetrics.urgentCount} urgent
              </span>
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: 'white',
                  opacity: emotionalMetrics.visualIntensity
                }}
              />
            </div>
          )}
        </motion.div>

        {/* Task List */}
        <AnimatePresence>
          {showTaskList && (
            <motion.div
              className="flex-1 overflow-y-auto p-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: ANIMATION.duration.normal }}
            >
              {tasks.map(task => (
                <motion.div
                  key={task._id}
                  className={`p-2 mb-2 rounded-md cursor-pointer transition-colors
                    ${task.priority === 'high' ? 'bg-white/20' : 'bg-white/10'}
                    hover:bg-white/30`}
                  onClick={() => onTaskClick?.(task)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{task.title}</span>
                    {showTaskDetails && (
                      <span className="text-sm text-white/80">
                        {task.estimatedTime}min
                      </span>
                    )}
                  </div>
                  {showTaskDetails && task.description && (
                    <p className="text-sm text-white/80 mt-1">
                      {task.description}
                    </p>
                  )}
                  {showEmotionalProfile && task.emotionalProfile && (
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-white/20">
                        {task.emotionalProfile.stressLevel}
                      </span>
                      {task.emotionalProfile.energyLevel && (
                        <span className="text-xs px-2 py-1 rounded-full bg-white/20">
                          {task.emotionalProfile.energyLevel}
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }, [showContent, tasks, domainStyle, isFocused, emotionalMetrics, onTaskClick]);

  return (
    <motion.div
      className={`relative rounded-lg overflow-hidden ${
        isFocused ? 'ring-2 ring-white/30' : ''
      }`}
      style={{
        ...style,
        backgroundColor: domainStyle.accentColor, // Remove transparency
        boxShadow: `0 0 ${visualEffects.shadowIntensity}px ${domainStyle.accentColor}40`,
        border: `${visualEffects.borderWidth}px solid ${visualEffects.borderColor}`,
        backdropFilter: `blur(${visualEffects.blurAmount}px)`,
        transition: `all ${visualEffects.transitionDuration}s ease-in-out`,
        color: 'white' // Ensure text is visible on solid background
      }}
      whileHover={{
        scale: visualEffects.hoverScale,
        boxShadow: `0 0 ${visualEffects.shadowIntensity * 1.2}px ${domainStyle.accentColor}60`
      }}
      onClick={() => onDomainClick(domain)}
    >
      {blockContent}
    </motion.div>
  );
}; 