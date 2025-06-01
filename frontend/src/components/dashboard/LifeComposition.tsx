'use client';

import React, { useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task } from '@/types/Task';
import { DomainBlock } from './DomainBlock';
import { 
  LifeDomain, 
  LIFE_DOMAINS, 
  ViewMode,
  GridPosition,
  ANIMATION,
  GRID,
  BlockSize,
  getEmotionalIntensity,
  ModuleSizeFactors,
  calculateModuleSize,
  VIEW_CONFIGURATIONS
} from '@/lib/design-system';
import { useNavigation } from '@/contexts/NavigationContext';
import { BreadcrumbNav } from '@/components/navigation/BreadcrumbNav';

interface LifeCompositionProps {
  tasks: Task[];
  viewMode: ViewMode;
  onDomainClick: (domain: LifeDomain) => void;
  onTaskClick?: (task: Task) => void;
  focusedDomain?: LifeDomain;
  zoomLevel: 'overview' | 'domain' | 'task';
  selectedTaskId?: string;
}

interface DomainComposition {
  domain: LifeDomain;
  tasks: Task[];
  position: GridPosition;
  size: 'small' | 'medium' | 'large' | 'dominant';
}

interface DomainMetrics {
  domain: LifeDomain;
  tasks: Task[];
  factors: ModuleSizeFactors;
  position: GridPosition;
  size: BlockSize;
  dimensions: {
    width: number;
    height: number;
  };
}

interface GridCell {
  occupied: boolean;
  domain?: LifeDomain;
}

interface GridState {
  cells: GridCell[][];
  width: number;
  height: number;
}

// Add type definitions for domain configurations
type DomainSpacing = {
  minRowGap: number;
  minColGap: number;
};

type DomainDimensions = {
  maxWidth: number;
  maxHeight: number;
};

type DomainSpacingConfig = {
  [K in LifeDomain]?: DomainSpacing;
} & {
  default: DomainSpacing;
};

type DomainDimensionsConfig = {
  [K in LifeDomain]?: DomainDimensions;
} & {
  default: DomainDimensions;
};

type DomainOrderConfig = {
  [K in LifeDomain]?: number;
} & {
  default: number;
};

// Define domain groups type
type DomainGroup = 'workGroup' | 'peopleGroup';

const LifeComposition: React.FC<LifeCompositionProps> = ({
  tasks,
  viewMode,
  onDomainClick,
  onTaskClick,
  focusedDomain,
  zoomLevel,
  selectedTaskId
}) => {
  const { 
    state: { viewType },
    setViewMode, 
    selectDomain,
    selectTask
  } = useNavigation();

  // Update view mode when prop changes
  React.useEffect(() => {
    setViewMode(viewMode);
  }, [viewMode, setViewMode]);

  // Handle domain click with navigation
  const handleDomainClick = useCallback((domain: LifeDomain) => {
    selectDomain(domain, domain);
    onDomainClick(domain);
  }, [selectDomain, onDomainClick]);

  // Handle task click with navigation
  const handleTaskClick = useCallback((task: Task) => {
    if (onTaskClick) {
      selectTask(task._id, task.title);
      onTaskClick(task);
    }
  }, [selectTask, onTaskClick]);

  // Calculate grid dimensions based on view mode
  const gridDimensions = useMemo(() => {
    const config = VIEW_CONFIGURATIONS[viewMode];
    return { 
      columns: config.gridColumns, 
      rows: config.gridRows 
    };
  }, [viewMode]);

  // Update domain spacing rules with consistent padding
  const domainSpacing: DomainSpacingConfig = {
    default: { minRowGap: 2, minColGap: 2 }, // Consistent 2-cell gap
    purple: { minRowGap: 2, minColGap: 2 },  // Work tasks
    blue: { minRowGap: 2, minColGap: 2 },    // Learning
    yellow: { minRowGap: 2, minColGap: 2 },  // Relationships
    green: { minRowGap: 2, minColGap: 2 },   // Health
    orange: { minRowGap: 2, minColGap: 2 },  // Life maintenance
    red: { minRowGap: 2, minColGap: 2 }      // Urgent tasks
  };

  // Update domain dimensions to allow full canvas usage
  const domainDimensions: DomainDimensionsConfig = {
    default: { maxWidth: GRID.columns, maxHeight: GRID.rows }
  };

  // Filter tasks based on zoom level
  const filteredTasks = useMemo(() => {
    if (zoomLevel === 'overview') {
      return tasks;
    } else if (zoomLevel === 'domain' && focusedDomain) {
      return tasks.filter(task => task.lifeDomain === focusedDomain);
    } else if (zoomLevel === 'task' && selectedTaskId) {
      return tasks.filter(task => task._id === selectedTaskId);
    }
    return tasks;
  }, [tasks, zoomLevel, focusedDomain, selectedTaskId]);

  // Update domainGroups to use filtered tasks
  const domainGroups = useMemo(() => {
    const groups = new Map<LifeDomain, Task[]>();
    
    // Initialize all domains
    Object.keys(LIFE_DOMAINS).forEach((domain) => {
      groups.set(domain as LifeDomain, []);
    });
    
    // Group tasks by domain
    filteredTasks.forEach((task) => {
      if (task.lifeDomain) {
        const domainTasks = groups.get(task.lifeDomain) || [];
        domainTasks.push(task);
        groups.set(task.lifeDomain, domainTasks);
      }
    });
    
    return groups;
  }, [filteredTasks]);

  // Initialize grid state without z-index tracking
  const initializeGrid = (width: number, height: number): GridState => {
    const cells: GridCell[][] = Array(height).fill(null).map(() => 
      Array(width).fill(null).map(() => ({ occupied: false }))
    );
    return { cells, width, height };
  };

  // Place a block in the grid without z-index
  const placeBlock = (
    grid: GridState,
    domain: LifeDomain,
    startRow: number,
    startCol: number,
    width: number,
    height: number
  ): void => {
    for (let row = startRow; row < startRow + height; row++) {
      for (let col = startCol; col < startCol + width; col++) {
        grid.cells[row][col] = { 
          occupied: true, 
          domain
        };
      }
    }
  };

  // Helper function to check if a position has enough spacing
  const hasEnoughSpacing = (
    grid: GridState,
    row: number,
    col: number,
    width: number,
    height: number,
    domain: LifeDomain
  ): boolean => {
    const spacing = domainSpacing[domain] || domainSpacing.default;
    
    // Define domain groups that should not overlap
    const domainGroups: Record<string, LifeDomain[]> = {
      workGroup: ['purple'], // Work tasks
      peopleGroup: ['yellow'] // Relationships
    };
    
    // Get the group for the current domain
    const currentGroup = (Object.entries(domainGroups) as [DomainGroup, LifeDomain[]][])
      .find(([_, domains]) => domains.includes(domain as LifeDomain))?.[0];
    
    // Check all surrounding cells for any occupied space
    // Add extra padding around the block
    const padding = {
      top: spacing.minRowGap,
      bottom: spacing.minRowGap,
      left: spacing.minColGap,
      right: spacing.minColGap
    };

    // Check the entire area including padding
    for (let r = Math.max(0, row - padding.top); r <= Math.min(grid.height - 1, row + height + padding.bottom); r++) {
      for (let c = Math.max(0, col - padding.left); c <= Math.min(grid.width - 1, col + width + padding.right); c++) {
        if (r >= 0 && r < grid.height && c >= 0 && c < grid.width) {
          const occupiedCell = grid.cells[r][c];
          if (occupiedCell.occupied && occupiedCell.domain) {
            // Get the group for the occupied cell's domain
            const occupiedGroup = (Object.entries(domainGroups) as [DomainGroup, LifeDomain[]][])
              .find(([_, domains]) => domains.includes(occupiedCell.domain as LifeDomain))?.[0];
            
            // Calculate actual distance between blocks
            const rowDistance = Math.abs(r - row);
            const colDistance = Math.abs(c - col);
            
            // If it's the same domain or different group, enforce minimum spacing
            if (occupiedCell.domain === domain || (currentGroup && occupiedGroup && currentGroup !== occupiedGroup)) {
              // Check if we're too close in any direction
              if (rowDistance < spacing.minRowGap || colDistance < spacing.minColGap) {
                return false;
              }
            }
          }
        }
      }
    }
    
    return true;
  };

  // Find the next available position for a block with improved spacing
  const findNextPosition = (
    grid: GridState,
    width: number,
    height: number,
    domain: LifeDomain,
    startRow: number = 0
  ): { row: number; col: number } | null => {
    // Calculate grid quadrants based on actual grid dimensions
    const midRow = Math.floor(grid.height / 2);
    const midCol = Math.floor(grid.width / 2);
    
    // Define search patterns for different domains using relative positions
    const searchPatterns: Record<LifeDomain, { 
      startRow: number; 
      startCol: number; 
      direction: 'row' | 'col';
      maxAttempts: number;
    }> = {
      purple: { 
        startRow: 0, 
        startCol: 0, 
        direction: 'row',
        maxAttempts: Math.floor(grid.width * 0.4) // Try up to 40% of grid width
      },
      blue: { 
        startRow: 0, 
        startCol: midCol, 
        direction: 'row',
        maxAttempts: Math.floor(grid.width * 0.4)
      },
      yellow: { 
        startRow: midRow, 
        startCol: 0, 
        direction: 'row',
        maxAttempts: Math.floor(grid.width * 0.4)
      },
      green: { 
        startRow: midRow, 
        startCol: midCol, 
        direction: 'row',
        maxAttempts: Math.floor(grid.width * 0.4)
      },
      orange: { 
        startRow: 0, 
        startCol: 0, 
        direction: 'col',
        maxAttempts: Math.floor(grid.height * 0.4)
      },
      red: { 
        startRow: 0, 
        startCol: 0, 
        direction: 'row',
        maxAttempts: Math.floor(grid.width * 0.3)
      }
    };

    const pattern = searchPatterns[domain] || { 
      startRow: 0, 
      startCol: 0, 
      direction: 'row',
      maxAttempts: Math.floor(grid.width * 0.4)
    };
    
    // Search in the preferred pattern first
    if (pattern.direction === 'row') {
      // Search row by row with limited attempts
      for (let row = pattern.startRow; row <= Math.min(grid.height - height, pattern.startRow + pattern.maxAttempts); row++) {
        for (let col = pattern.startCol; col <= Math.min(grid.width - width, pattern.startCol + pattern.maxAttempts); col++) {
          if (canPlaceBlock(grid, row, col, width, height) && 
              hasEnoughSpacing(grid, row, col, width, height, domain)) {
            return { row, col };
          }
        }
      }
    } else {
      // Search column by column with limited attempts
      for (let col = pattern.startCol; col <= Math.min(grid.width - width, pattern.startCol + pattern.maxAttempts); col++) {
        for (let row = pattern.startRow; row <= Math.min(grid.height - height, pattern.startRow + pattern.maxAttempts); row++) {
          if (canPlaceBlock(grid, row, col, width, height) && 
              hasEnoughSpacing(grid, row, col, width, height, domain)) {
            return { row, col };
          }
        }
      }
    }

    // If no position found in preferred pattern, try anywhere in the grid
    // but prioritize the first half of the grid for better visibility
    const searchArea = {
      startRow: 0,
      endRow: Math.floor(grid.height * 0.7), // Search in top 70% of grid
      startCol: 0,
      endCol: Math.floor(grid.width * 0.7)   // Search in left 70% of grid
    };

    for (let row = searchArea.startRow; row <= searchArea.endRow - height; row++) {
      for (let col = searchArea.startCol; col <= searchArea.endCol - width; col++) {
        if (canPlaceBlock(grid, row, col, width, height) && 
            hasEnoughSpacing(grid, row, col, width, height, domain)) {
          return { row, col };
        }
      }
    }

    // If still no position found, try the entire grid as a last resort
    for (let row = 0; row <= grid.height - height; row++) {
      for (let col = 0; col <= grid.width - width; col++) {
        if (canPlaceBlock(grid, row, col, width, height) && 
            hasEnoughSpacing(grid, row, col, width, height, domain)) {
          return { row, col };
        }
      }
    }

    return null;
  };

  // Calculate empty space around a potential block position
  const calculateEmptySpace = (
    grid: GridState,
    startRow: number,
    startCol: number,
    width: number,
    height: number
  ): number => {
    let emptySpace = 0;
    
    // Check space above
    for (let col = startCol; col < startCol + width; col++) {
      for (let row = 0; row < startRow; row++) {
        if (!grid.cells[row][col].occupied) emptySpace++;
      }
    }
    
    // Check space below
    for (let col = startCol; col < startCol + width; col++) {
      for (let row = startRow + height; row < grid.height; row++) {
        if (!grid.cells[row][col].occupied) emptySpace++;
      }
    }
    
    // Check space to the left
    for (let row = startRow; row < startRow + height; row++) {
      for (let col = 0; col < startCol; col++) {
        if (!grid.cells[row][col].occupied) emptySpace++;
      }
    }
    
    // Check space to the right
    for (let row = startRow; row < startRow + height; row++) {
      for (let col = startCol + width; col < grid.width; col++) {
        if (!grid.cells[row][col].occupied) emptySpace++;
      }
    }
    
    return emptySpace;
  };

  // Check if a block can be placed at the given position
  const canPlaceBlock = (
    grid: GridState,
    startRow: number,
    startCol: number,
    width: number,
    height: number
  ): boolean => {
    if (startRow < 0 || startCol < 0 || 
        startRow + height > grid.height || 
        startCol + width > grid.width) {
      return false;
    }

    for (let row = startRow; row < startRow + height; row++) {
      for (let col = startCol; col < startCol + width; col++) {
        if (grid.cells[row][col].occupied) {
          return false;
        }
      }
    }
    return true;
  };

  // Calculate domain metrics and layout
  const composition = useMemo(() => {
    // Calculate metrics for each domain
    const domainMetrics = Array.from(domainGroups.entries())
      .filter(([_, tasks]) => tasks.length > 0)
      .map(([domain, domainTasks]): DomainMetrics => {
        // Calculate module size factors with improved weighting
        const factors: ModuleSizeFactors = {
          taskCount: domainTasks.length,
          totalEstimatedTime: domainTasks.reduce((sum, task) => sum + (task.estimatedTime || 0), 0),
          stressLevel: domainTasks.reduce((sum, task) => {
            const stressValue = task.emotionalProfile?.stressLevel ? 
              getEmotionalIntensity(task.emotionalProfile.stressLevel) : 0.5;
            return sum + stressValue;
          }, 0) / domainTasks.length,
          urgentTasks: domainTasks.filter(task => 
            task.priority === 'high' || task.lifeDomain === 'red'
          ).length,
          emotionalWeight: domainTasks.reduce((sum, task) => {
            const emotionalValue = task.emotionalProfile?.stressLevel ? 
              getEmotionalIntensity(task.emotionalProfile.stressLevel) : 0.5;
            return sum + emotionalValue;
          }, 0) / domainTasks.length
        };

        // Calculate normalized importance score (0-1)
        const maxPossibleScore = 100;
        const importanceScore = (
          (factors.taskCount / 10) * 0.25 +
          (factors.totalEstimatedTime / 480) * 0.25 +
          factors.stressLevel * 0.2 +
          (factors.urgentTasks / 5) * 0.2 +
          factors.emotionalWeight * 0.1
        ) * maxPossibleScore;

        // Calculate total available grid cells based on view mode
        const totalGridCells = gridDimensions.columns * gridDimensions.rows;
        const totalDomains = domainGroups.size;
        
        // Calculate proportional size based on importance
        const proportionalSize = importanceScore / maxPossibleScore;
        const targetCells = Math.floor(totalGridCells * proportionalSize);
        
        // Adjust dimensions based on domain importance and available space
        const domainImportance = {
          purple: 1.2, // Work tasks get more space
          blue: 1.1,   // Personal growth gets slightly more space
          yellow: 1.1, // Relationships get slightly more space
          green: 1.0,  // Health gets standard space
          orange: 0.9, // Life maintenance gets slightly less space
          red: 1.3     // Urgent tasks get the most space
        };

        const importanceMultiplier = domainImportance[domain] || 1.0;
        const adjustedTargetCells = Math.floor(targetCells * importanceMultiplier);
        
        // Calculate dimensions with adjusted target cells and view mode constraints
        const aspectRatio = 1.2; // Slightly wider than tall
        let width = Math.max(2, Math.min(gridDimensions.columns - 2,
          Math.floor(Math.sqrt(adjustedTargetCells * aspectRatio))));
        let height = Math.max(2, Math.min(gridDimensions.rows - 2,
          Math.floor(adjustedTargetCells / width)));

        // Ensure minimum size while respecting grid bounds
        while (width * height < 4 && width < gridDimensions.columns - 2 && height < gridDimensions.rows - 2) {
          if (width < height) width++;
          else height++;
        }

        return {
          domain,
          tasks: domainTasks,
          factors,
          size: 'medium', // Default size, actual size determined by dimensions
          dimensions: { width, height },
          position: { row: 1, column: 1, span: width }
        };
      });

    // Sort domains by importance and domain priority
    const domainPriority = {
      red: 1,    // Urgent tasks first
      purple: 2, // Work tasks second
      yellow: 3, // Relationships third
      blue: 4,   // Personal growth fourth
      green: 5,  // Health fifth
      orange: 6  // Life maintenance last
    };

    domainMetrics.sort((a, b) => {
      const aScore = (
        (a.factors.taskCount / 10) * 0.25 +
        (a.factors.totalEstimatedTime / 480) * 0.25 +
        a.factors.stressLevel * 0.2 +
        (a.factors.urgentTasks / 5) * 0.2 +
        a.factors.emotionalWeight * 0.1
      ) * 100;
      
      const bScore = (
        (b.factors.taskCount / 10) * 0.25 +
        (b.factors.totalEstimatedTime / 480) * 0.25 +
        b.factors.stressLevel * 0.2 +
        (b.factors.urgentTasks / 5) * 0.2 +
        b.factors.emotionalWeight * 0.1
      ) * 100;

      // First sort by domain priority
      const priorityDiff = (domainPriority[a.domain] || 999) - (domainPriority[b.domain] || 999);
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by calculated importance score
      return bScore - aScore;
    });

    // Initialize grid
    const grid = initializeGrid(GRID.columns, GRID.rows);
    const placedBlocks: DomainMetrics[] = [];
    let currentRow = 0;

    // Place blocks with minimal spacing
    for (const metrics of domainMetrics) {
      const { width, height } = metrics.dimensions;
      const position = findNextPosition(grid, width, height, metrics.domain, currentRow);
      
      if (position) {
        metrics.position = {
          row: position.row + 1,
          column: position.col + 1,
          span: width
        };
        
        placeBlock(
          grid,
          metrics.domain,
          position.row,
          position.col,
          width,
          height
        );
        
        currentRow = Math.max(currentRow, position.row + height + 1);
        placedBlocks.push(metrics);
      }
    }

    return placedBlocks;
  }, [domainGroups, viewMode]);

  return (
    <motion.div
      className="flex flex-col h-full overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: ANIMATION.duration.normal }}
    >
      {/* Breadcrumb Navigation */}
      <div className="flex-none h-8 mb-4">
        <BreadcrumbNav />
      </div>

      {/* Main Grid Container */}
      <div className="flex-1 min-h-0 relative">
        {/* Grid */}
        <div
          className="absolute inset-0 grid gap-4 bg-black/5 rounded-xl p-4 overflow-auto"
          style={{
            gridTemplateColumns: `repeat(${gridDimensions.columns}, 1fr)`,
            gridTemplateRows: `repeat(${gridDimensions.rows}, 1fr)`,
            marginTop: '0.5rem' // Add small top margin to prevent blocks from touching the nav
          }}
        >
          {composition.map((metrics) => (
            <DomainBlock
              key={metrics.domain}
              domain={metrics.domain}
              tasks={metrics.tasks}
              size={metrics.size}
              position={metrics.position}
              dimensions={metrics.dimensions}
              onDomainClick={handleDomainClick}
              onTaskClick={handleTaskClick}
              isFocused={focusedDomain === metrics.domain}
              viewMode={viewMode}
              zoomLevel={zoomLevel}
              style={{
                gridRow: `${metrics.position.row} / span ${metrics.dimensions.height}`,
                gridColumn: `${metrics.position.column} / span ${metrics.dimensions.width}`,
                minHeight: 0 // Ensure blocks don't expand beyond their grid area
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export { LifeComposition }; 