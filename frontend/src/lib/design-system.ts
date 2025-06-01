// Design System for Listless Visual Journey Dashboard
// Inspired by Dropbox's design system with emotional intelligence integration

export type LifeDomain = 'purple' | 'blue' | 'yellow' | 'green' | 'orange' | 'red';

export type BlockSize = 'small' | 'medium' | 'large' | 'dominant';
export type EmotionalEnergy = 'focused' | 'expanding' | 'connecting' | 'sustaining' | 'maintaining' | 'intense';
export type ViewMode = 'day' | 'week' | 'month';

export interface DomainStyle {
  name: string;
  color: string;
  accentColor: string;
  textColor: string;
  icon: string;
  description: string;
}

export interface GridPosition {
  row: number;
  column: number;
  span: number;
}

export const LIFE_DOMAINS: Record<LifeDomain, DomainStyle> = {
  purple: {
    name: 'Work & Projects',
    color: 'purple',
    accentColor: '#8B5CF6',
    textColor: '#4C1D95',
    icon: '💼',
    description: 'Professional and project-related tasks'
  },
  blue: {
    name: 'Learning & Creating',
    color: 'blue',
    accentColor: '#3B82F6',
    textColor: '#1E40AF',
    icon: '🎓',
    description: 'Personal growth and creative pursuits'
  },
  yellow: {
    name: 'People & Relationships',
    color: 'yellow',
    accentColor: '#EAB308',
    textColor: '#854D0E',
    icon: '👥',
    description: 'Social connections and relationship building'
  },
  green: {
    name: 'Health & Energy',
    color: 'green',
    accentColor: '#22C55E',
    textColor: '#166534',
    icon: '🌱',
    description: 'Physical and mental wellbeing'
  },
  orange: {
    name: 'Life Maintenance',
    color: 'orange',
    accentColor: '#F97316',
    textColor: '#9A3412',
    icon: '🏠',
    description: 'Daily life and maintenance tasks'
  },
  red: {
    name: 'Time-Sensitive',
    color: 'red',
    accentColor: '#EF4444',
    textColor: '#991B1B',
    icon: '⏰',
    description: 'Urgent and time-critical tasks'
  }
};

// Visual intensity levels for emotional states
export const EMOTIONAL_INTENSITY = {
  low: 0.3,
  medium: 0.6,
  high: 0.8,
  overwhelming: 1.0
} as const;

// Animation timing and easing
export const ANIMATION = {
  duration: {
    fast: 0.15,
    normal: 0.3,
    slow: 0.5
  },
  easing: {
    default: [0.4, 0, 0.2, 1],
    bounce: [0.68, -0.55, 0.265, 1.55],
    smooth: [0.4, 0, 0.2, 1]
  }
} as const;

// Grid system for composition
export const GRID = {
  columns: 24,
  rows: 24,
  gap: {
    small: '0.25rem',
    medium: '0.5rem',
    large: '1rem'
  },
  padding: {
    small: '0.25rem',
    medium: '0.5rem',
    large: '1rem'
  }
} as const;

// Mondrian-inspired block sizing system
export const BLOCK_SIZES = {
  small: {
    minWidth: 2,
    maxWidth: 4,
    minHeight: 2,
    maxHeight: 4,
    baseScale: 1,
    taskCapacity: 3
  },
  medium: {
    minWidth: 4,
    maxWidth: 8,
    minHeight: 4,
    maxHeight: 8,
    baseScale: 1.5,
    taskCapacity: 6
  },
  large: {
    minWidth: 8,
    maxWidth: 12,
    minHeight: 8,
    maxHeight: 12,
    baseScale: 2,
    taskCapacity: 12
  },
  dominant: {
    minWidth: 12,
    maxWidth: 24,
    minHeight: 12,
    maxHeight: 24,
    baseScale: 3,
    taskCapacity: 20
  }
} as const;

// Enhanced module sizing factors
export interface ModuleSizeFactors {
  taskCount: number;
  totalEstimatedTime: number;
  stressLevel: number;
  urgentTasks: number;
  emotionalWeight: number;
}

// Enhanced Mondrian composition rules
export const MONDRIAN_RULES = {
  // Golden ratio for block proportions
  goldenRatio: 1.618,
  
  // Minimum block size (in grid units)
  minBlockSize: 2,
  
  // Maximum block size (in grid units)
  maxBlockSize: 24,
  
  // Preferred block aspect ratios
  aspectRatios: [1, 1.618, 2, 2.618, 3],
  
  // Composition weights for different block sizes
  compositionWeights: {
    small: 0.2,
    medium: 0.3,
    large: 0.3,
    dominant: 0.2
  },

  // New composition rules
  moduleSizing: {
    taskCountWeight: 0.3,
    timeWeight: 0.002,
    stressWeight: 0.4,
    urgencyWeight: 0.5,
    emotionalWeight: 0.3,
    baseSize: 100, // Base size in grid units
    minSize: 2,    // Minimum size in grid units
    maxSize: 24    // Maximum size in grid units
  },

  // Composition balance rules
  balance: {
    maxWidthRatio: 0.7,    // Maximum width as ratio of total width
    maxHeightRatio: 0.7,   // Maximum height as ratio of total height
    minAspectRatio: 0.5,   // Minimum width/height ratio
    maxAspectRatio: 2.0,   // Maximum width/height ratio
    preferredRatios: [1, 1.618, 2, 2.618, 3]
  },

  // Visual hierarchy rules
  hierarchy: {
    dominantWeight: 0.4,   // Weight for dominant blocks
    largeWeight: 0.3,      // Weight for large blocks
    mediumWeight: 0.2,     // Weight for medium blocks
    smallWeight: 0.1       // Weight for small blocks
  }
} as const;

// Helper function to calculate Mondrian-style block dimensions
export const calculateMondrianBlock = (
  taskCount: number,
  emotionalWeight: number,
  size: BlockSize,
  viewMode: ViewMode = 'day',
  availableSpace: { width: number; height: number }
): { width: number; height: number } => {
  const baseSize = BLOCK_SIZES[size];
  
  // Calculate base dimensions using golden ratio
  let width = Math.min(
    availableSpace.width,
    Math.max(
      baseSize.minWidth,
      Math.min(baseSize.maxWidth, availableSpace.width * MONDRIAN_RULES.compositionWeights[size])
    )
  );
  
  // Adjust height based on emotional weight and task count
  const emotionalMultiplier = 1 + (emotionalWeight * 0.5);
  const taskMultiplier = Math.min(1 + (taskCount * 0.1), 2);
  
  // Choose an aspect ratio based on emotional weight
  const aspectRatioIndex = Math.floor(emotionalWeight * (MONDRIAN_RULES.aspectRatios.length - 1));
  const aspectRatio = MONDRIAN_RULES.aspectRatios[aspectRatioIndex];
  
  let height = width * aspectRatio * emotionalMultiplier * taskMultiplier;
  
  // Ensure height stays within bounds
  height = Math.min(
    availableSpace.height,
    Math.max(
      baseSize.minHeight,
      Math.min(baseSize.maxHeight, height)
    )
  );
  
  // Round to grid units
  return {
    width: Math.round(width / GRID.columns) * GRID.columns,
    height: Math.round(height / GRID.rows) * GRID.rows
  };
};

// Emotional intensity mapping
export const getEmotionalIntensity = (stressLevel: string): number => {
  switch (stressLevel) {
    case 'overwhelming': return 1.0;
    case 'high': return 0.8;
    case 'medium': return 0.5;
    case 'low': return 0.2;
    default: return 0.5;
  }
};

// Type guard for life domains
export const isLifeDomain = (value: string): value is LifeDomain => {
  return Object.keys(LIFE_DOMAINS).includes(value);
};

// Enhanced block calculation function
export const calculateModuleSize = (
  factors: ModuleSizeFactors,
  viewMode: ViewMode,
  availableSpace: { width: number; height: number }
): { width: number; height: number } => {
  const { moduleSizing, balance } = MONDRIAN_RULES;
  
  // Calculate base importance score
  const importanceScore = (
    factors.taskCount * moduleSizing.taskCountWeight +
    factors.totalEstimatedTime * moduleSizing.timeWeight +
    factors.stressLevel * moduleSizing.stressWeight +
    factors.urgentTasks * moduleSizing.urgencyWeight +
    factors.emotionalWeight * moduleSizing.emotionalWeight
  ) * moduleSizing.baseSize;

  // Determine block size category
  let size: BlockSize = 'small';
  if (importanceScore > 80) size = 'dominant';
  else if (importanceScore > 60) size = 'large';
  else if (importanceScore > 40) size = 'medium';

  // Calculate base dimensions
  const maxWidth = Math.floor(availableSpace.width * balance.maxWidthRatio);
  const maxHeight = Math.floor(availableSpace.height * balance.maxHeightRatio);

  // Calculate width based on importance and available space
  let width = Math.min(
    maxWidth,
    Math.max(
      moduleSizing.minSize,
      Math.floor(importanceScore * (maxWidth / 100))
    )
  );

  // Choose aspect ratio based on emotional weight
  const ratioIndex = Math.floor(factors.emotionalWeight * (balance.preferredRatios.length - 1));
  const aspectRatio = balance.preferredRatios[ratioIndex];

  // Calculate height maintaining aspect ratio constraints
  let height = Math.min(
    maxHeight,
    Math.max(
      moduleSizing.minSize,
      Math.floor(width * aspectRatio)
    )
  );

  // Ensure aspect ratio stays within bounds
  const currentRatio = width / height;
  if (currentRatio < balance.minAspectRatio) {
    height = Math.floor(width / balance.minAspectRatio);
  } else if (currentRatio > balance.maxAspectRatio) {
    width = Math.floor(height * balance.maxAspectRatio);
  }

  // Round to grid units
  return {
    width: Math.round(width / GRID.columns) * GRID.columns,
    height: Math.round(height / GRID.rows) * GRID.rows
  };
};

// Add new types
export type ZoomLevel = 'overview' | 'domain' | 'task';
export type DetailLevel = 'minimal' | 'compact' | 'detailed';

// Add new interfaces
export interface ViewConfiguration {
  gridColumns: number;
  gridRows: number;
  minBlockSize: number;
  maxBlockSizeRatio: number;
  spacingMultiplier: number;
  taskPreviewCount: number;
  detailLevel: DetailLevel;
  gridGap: string;
  containerPadding: string;
}

// Add view configurations
export const VIEW_CONFIGURATIONS: Record<ViewMode, ViewConfiguration> = {
  day: {
    gridColumns: 16,
    gridRows: 12,
    minBlockSize: 3,
    maxBlockSizeRatio: 0.5,
    spacingMultiplier: 1.5,
    taskPreviewCount: 8,
    detailLevel: 'detailed',
    gridGap: '0.75rem',
    containerPadding: '1rem'
  },
  week: {
    gridColumns: 20,
    gridRows: 16,
    minBlockSize: 2,
    maxBlockSizeRatio: 0.4,
    spacingMultiplier: 1.2,
    taskPreviewCount: 5,
    detailLevel: 'compact',
    gridGap: '0.5rem',
    containerPadding: '0.75rem'
  },
  month: {
    gridColumns: 24,
    gridRows: 20,
    minBlockSize: 2,
    maxBlockSizeRatio: 0.3,
    spacingMultiplier: 1.0,
    taskPreviewCount: 3,
    detailLevel: 'minimal',
    gridGap: '0.25rem',
    containerPadding: '0.5rem'
  }
};

// Add zoom configurations
export const ZOOM_CONFIGURATIONS: Record<ZoomLevel, {
  allowedActions: string[];
  navigationHint: string;
  detailLevel: DetailLevel;
}> = {
  overview: {
    allowedActions: ['domain_click', 'task_preview'],
    navigationHint: 'Click domains to explore',
    detailLevel: 'minimal'
  },
  domain: {
    allowedActions: ['task_click', 'domain_back', 'task_detail'],
    navigationHint: 'Click tasks for details',
    detailLevel: 'compact'
  },
  task: {
    allowedActions: ['task_edit', 'task_complete', 'back_to_domain'],
    navigationHint: 'Full task details',
    detailLevel: 'detailed'
  }
};

// Add task display configurations
export const TASK_DISPLAY_CONFIG: Record<ZoomLevel, {
  showDescription: boolean;
  showProgress: boolean;
  showMetadata: boolean;
  showTags: boolean;
  showEmotionalProfile: boolean;
  maxTitleLength: number;
}> = {
  overview: {
    showDescription: false,
    showProgress: false,
    showMetadata: false,
    showTags: false,
    showEmotionalProfile: false,
    maxTitleLength: 30
  },
  domain: {
    showDescription: false,
    showProgress: true,
    showMetadata: true,
    showTags: false,
    showEmotionalProfile: true,
    maxTitleLength: 50
  },
  task: {
    showDescription: true,
    showProgress: true,
    showMetadata: true,
    showTags: true,
    showEmotionalProfile: true,
    maxTitleLength: 100
  }
};

// Add new helper functions
export const getViewConfiguration = (viewMode: ViewMode): ViewConfiguration => {
  return VIEW_CONFIGURATIONS[viewMode];
};

export const getZoomConfiguration = (zoomLevel: ZoomLevel) => {
  return ZOOM_CONFIGURATIONS[zoomLevel];
};

export const getTasksForViewMode = (tasks: any[], viewMode: ViewMode): any[] => {
  const now = new Date();
  
  switch (viewMode) {
    case 'day':
      const today = now.toISOString().split('T')[0];
      return tasks.filter(task => 
        task.scheduledEnd?.startsWith(today) || 
        task.priority === 'high' ||
        task.lifeDomain === 'red'
      );
      
    case 'week':
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      
      return tasks.filter(task => {
        if (!task.scheduledEnd) return task.priority === 'high';
        const taskDate = new Date(task.scheduledEnd);
        return taskDate >= weekStart && taskDate <= weekEnd;
      });
      
    case 'month':
    default:
      return tasks;
  }
};

// Add color and styling helpers
export const getDomainColors = (domain: LifeDomain, intensity: number = 1) => {
  const domainStyle = LIFE_DOMAINS[domain];
  
  return {
    primary: domainStyle.color,
    accent: domainStyle.accentColor,
    text: domainStyle.textColor,
    gradient: domainStyle.gradient,
    glowColor: `${domainStyle.accentColor}${Math.floor(intensity * 255).toString(16).padStart(2, '0')}`,
    borderColor: `rgba(255, 255, 255, ${0.1 + (intensity * 0.3)})`
  };
};

export const getEmotionalColorGradient = (stressLevel: string) => {
  const intensity = getEmotionalIntensity(stressLevel);
  
  if (intensity < 0.3) return 'from-green-400 to-green-500';
  if (intensity < 0.6) return 'from-yellow-400 to-orange-400';
  if (intensity < 0.8) return 'from-orange-400 to-red-400';
  return 'from-red-400 to-red-600';
};

// Add task urgency calculation
export const calculateTaskUrgency = (task: any): number => {
  let urgency = 0;
  
  // Base priority
  if (task.priority === 'high') urgency += 0.4;
  else if (task.priority === 'medium') urgency += 0.2;
  
  // Time sensitivity
  if (task.scheduledEnd) {
    const now = new Date();
    const deadline = new Date(task.scheduledEnd);
    const timeDiff = deadline.getTime() - now.getTime();
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    
    if (daysDiff < 0) urgency += 0.5; // Overdue
    else if (daysDiff < 1) urgency += 0.4; // Due today
    else if (daysDiff < 3) urgency += 0.3; // Due soon
    else if (daysDiff < 7) urgency += 0.2; // Due this week
  }
  
  // Emotional stress
  if (task.emotionalProfile?.stressLevel) {
    urgency += getEmotionalIntensity(task.emotionalProfile.stressLevel) * 0.3;
  }
  
  // Domain urgency
  if (task.lifeDomain === 'red') urgency += 0.3;
  
  return Math.min(urgency, 1.0);
};

// Remove any references to the old domain types
export const getDomainStyle = (domain: LifeDomain): DomainStyle => {
  return LIFE_DOMAINS[domain] || LIFE_DOMAINS.orange; // Default to orange if domain not found
}; 