import { LifeDomain } from '@/lib/design-system';

export interface EmotionalProfile {
  stressLevel: 'low' | 'medium' | 'high' | 'overwhelming';
  emotionalImpact: 'positive' | 'neutral' | 'negative';
  energyLevel: 'low' | 'medium' | 'high';
  motivationLevel: 'low' | 'medium' | 'high';
  emotionalTriggers?: string[];
  copingStrategies?: string[];
}

export interface WorkbackStep {
  title: string;
  scheduledEnd: string;
  estimatedTime?: number;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  category: string;
  priority: string;
  status: string;
  estimatedTime: number;
  actualTime?: number;
  scheduledEnd?: string;
  startBy?: string;
  startByAlert?: string;
  workback?: WorkbackStep[];
  tags?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  aiProcessed?: boolean;
  originalInput?: string;
  
  // Emotional Intelligence Layer (optional fields)
  emotionalProfile?: EmotionalProfile;
  lifeDomain?: LifeDomain;
}

// Type guard for Task
export const isTask = (value: unknown): value is Task => {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_id' in value &&
    'title' in value &&
    'status' in value
  );
}; 