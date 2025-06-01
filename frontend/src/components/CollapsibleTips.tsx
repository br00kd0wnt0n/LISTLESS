'use client';

import { useState } from 'react';

interface CollapsibleTipsProps {
  title: string;
  icon: string;
  children: React.ReactNode;
}

export function CollapsibleTips({ title, icon, children }: CollapsibleTipsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between text-left"
      >
        <div className="flex items-center space-x-3">
          <span className="text-lg">{icon}</span>
          <span className="font-semibold text-gray-900">{title}</span>
        </div>
        <span className="text-gray-500 transform transition-transform duration-200">
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>
      
      <div
        className={`transition-all duration-200 ease-in-out overflow-hidden ${
          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 py-4 bg-white">
          {children}
        </div>
      </div>
    </div>
  );
} 