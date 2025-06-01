export type LifeDomain = 'purple' | 'blue' | 'yellow' | 'green' | 'orange' | 'red';

export interface ITask {
  title: string;
  description?: string;
  category: 'work' | 'household' | 'personal' | 'family' | 'health' | 'finance' | 'maintenance' | 'social' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in-progress' | 'completed' | 'cancelled' | 'deferred' | 'in_progress';
  estimatedTime: number;
  actualTime?: number;
  scheduledEnd?: string;
  startBy?: string;
  startByAlert?: string;
  completedAt?: Date;
  assignedTo?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  dependencies?: string[];
  isRecurring?: boolean;
  tags?: string[];
  originalInput?: string;
  aiProcessed?: boolean;
  workback?: Array<{
    title: string;
    scheduledEnd?: string;
    estimatedTime?: number;
  }>;
  emotionalProfile?: {
    stressLevel: 'low' | 'medium' | 'high' | 'overwhelming';
    emotionalImpact: 'positive' | 'neutral' | 'negative';
    energyLevel: 'low' | 'medium' | 'high';
    motivationLevel: 'low' | 'medium' | 'high';
    emotionalTriggers?: string[];
    copingStrategies?: string[];
    lastEmotionalCheck?: Date;
  };
  lifeDomain?: LifeDomain;
} 