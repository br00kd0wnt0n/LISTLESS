import React from 'react';
import { motion } from 'framer-motion';
import { useNavigation } from '@/contexts/NavigationContext';
import { ANIMATION } from '@/lib/design-system';

type ViewType = 'dashboard' | 'tasks';

interface ViewToggleProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({ currentView, onViewChange }) => {
  return (
    <motion.div
      className="flex items-center space-x-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: ANIMATION.duration.normal }}
    >
      <motion.button
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors
          ${currentView === 'tasks' 
            ? 'bg-primary text-white' 
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        onClick={() => onViewChange('tasks')}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Tasks
      </motion.button>
      <motion.button
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors
          ${currentView === 'dashboard' 
            ? 'bg-primary text-white' 
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        onClick={() => onViewChange('dashboard')}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Dashboard
      </motion.button>
    </motion.div>
  );
}; 