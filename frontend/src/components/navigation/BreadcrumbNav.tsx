import React from 'react';
import { motion } from 'framer-motion';
import { useNavigation } from '@/contexts/NavigationContext';
import { ViewToggle } from '@/components/dashboard/ViewToggle';
import { UserSelector } from '@/components/UserSelector';
import { ANIMATION } from '@/lib/design-system';

interface Breadcrumb {
  level: 'overview' | 'domain' | 'task';
  label: string;
  id?: string;
}

export const BreadcrumbNav: React.FC = () => {
  const { 
    state: { viewType, breadcrumbs },
    setViewType
  } = useNavigation();

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: ANIMATION.duration.normal }}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-6">
            <div className="flex flex-col">
              <motion.h1 
                className="text-xl font-bold text-gray-900 leading-none"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: ANIMATION.duration.normal }}
              >
                Listless
              </motion.h1>
              <motion.p 
                className="text-xs text-gray-600 leading-none mt-0.5"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: ANIMATION.duration.normal, delay: 0.1 }}
              >
                AI-Powered Life Management
              </motion.p>
            </div>

            <div className="h-6 w-px bg-gray-200" />

            <div className="flex items-center space-x-2">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.id || crumb.level}>
                  {index > 0 && (
                    <span className="text-gray-400 mx-2">/</span>
                  )}
                  <motion.span
                    className="text-sm font-medium text-gray-900"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: ANIMATION.duration.normal, delay: index * 0.1 }}
                  >
                    {crumb.label}
                  </motion.span>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="w-48">
              <UserSelector />
            </div>
            <ViewToggle currentView={viewType} onViewChange={setViewType} />
          </div>
        </div>
      </div>
    </motion.nav>
  );
}; 