// ===== backend/src/models/Task.ts =====
import mongoose, { Schema, Document } from 'mongoose';

export interface ITask extends Document {
  title: string;
  description?: string;
  category: 'work' | 'household' | 'personal' | 'family' | 'health' | 'finance' | 'maintenance' | 'social' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in-progress' | 'completed' | 'cancelled' | 'deferred' | 'in_progress';
  estimatedTime: number; // Duration in minutes
  actualTime?: number; // Actual time taken in minutes
  scheduledEnd?: string; // ISO date string
  startBy?: string; // ISO date string for when to start
  startByAlert?: string; // Friendly message with emoji
  completedAt?: Date;
  assignedTo?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  dependencies?: string[];
  isRecurring?: boolean;
  tags?: string[];
  originalInput?: string; // Store the original AI input
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
  lifeDomain?: 'purple' | 'blue' | 'yellow' | 'green' | 'orange' | 'red';
}

const TaskSchema: Schema = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  category: {
    type: String,
    required: true,
    enum: ['work', 'household', 'personal', 'family', 'health', 'finance', 'maintenance', 'social', 'other'],
    default: 'other'
  },
  priority: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    required: true,
    enum: ['todo', 'in-progress', 'completed', 'cancelled', 'deferred', 'in_progress'],
    default: 'todo'
  },
  estimatedTime: { type: Number, required: true, min: 1 },
  actualTime: { type: Number, min: 0 },
  scheduledEnd: { type: String },
  startBy: { type: String },
  startByAlert: { type: String },
  completedAt: { type: Date },
  assignedTo: { type: String },
  createdBy: { type: String, required: true },
  dependencies: [{ type: String }],
  isRecurring: { type: Boolean, default: false },
  tags: [{ type: String, trim: true }],
  originalInput: { type: String },
  aiProcessed: { type: Boolean, default: false },
  workback: [{
    title: { type: String, required: true },
    scheduledEnd: { 
      type: String, 
      required: false,
      validate: {
        validator: function(value: any) {
          if (!value) return true; // Optional field
          try {
            const date = new Date(value);
            return !isNaN(date.getTime());
          } catch {
            return false;
          }
        },
        message: 'Invalid scheduledEnd date format'
      }
    },
    estimatedTime: { 
      type: Number, 
      min: 1, 
      default: 30,
      get: (v: number) => Math.round(v / 5) * 5
    }
  }],
  emotionalProfile: {
    stressLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'overwhelming'],
      required: false,
      validate: {
        validator: function(value: any) {
          if (!value) return true; // Optional field
          return ['low', 'medium', 'high', 'overwhelming'].includes(value);
        },
        message: 'Invalid stress level value'
      }
    },
    emotionalImpact: {
      type: String,
      enum: ['positive', 'neutral', 'negative'],
      required: false,
      validate: {
        validator: function(value: any) {
          if (!value) return true; // Optional field
          return ['positive', 'neutral', 'negative'].includes(value);
        },
        message: 'Invalid emotional impact value'
      }
    },
    energyLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: false,
      validate: {
        validator: function(value: any) {
          if (!value) return true; // Optional field
          return ['low', 'medium', 'high'].includes(value);
        },
        message: 'Invalid energy level value'
      }
    },
    motivationLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: false,
      validate: {
        validator: function(value: any) {
          if (!value) return true; // Optional field
          return ['low', 'medium', 'high'].includes(value);
        },
        message: 'Invalid motivation level value'
      }
    },
    emotionalTriggers: [{ type: String, trim: true }],
    copingStrategies: [{ type: String, trim: true }],
    lastEmotionalCheck: { type: Date }
  },
  lifeDomain: {
    type: String,
    enum: ['purple', 'blue', 'yellow', 'green', 'orange', 'red'],
    required: false,
    validate: {
      validator: function(value: any) {
        if (!value) return true; // Optional field
        return ['purple', 'blue', 'yellow', 'green', 'orange', 'red'].includes(value);
      },
      message: 'Invalid life domain value'
    }
  }
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Indexes for better query performance
TaskSchema.index({ scheduledEnd: 1 });
TaskSchema.index({ category: 1, priority: 1 });

// Add index for emotional profile queries
TaskSchema.index({ 'emotionalProfile.stressLevel': 1 });
TaskSchema.index({ lifeDomain: 1 });

// Add indexes for commonly queried fields
TaskSchema.index({ createdBy: 1, scheduledEnd: 1 });
TaskSchema.index({ createdBy: 1, category: 1 });
TaskSchema.index({ createdBy: 1, createdAt: -1 });
TaskSchema.index({ createdBy: 1, priority: 1 });

// Add compound index for task list queries
TaskSchema.index({ 
  createdBy: 1, 
  scheduledEnd: 1, 
  status: 1, 
  priority: 1 
});

// Update pre-save middleware to handle workback items more robustly
TaskSchema.pre('save', function(this: ITask, next) {
  // Update lastEmotionalCheck if emotional profile changed
  if (this.isModified('emotionalProfile') && this.emotionalProfile) {
    this.emotionalProfile.lastEmotionalCheck = new Date();
  }

  // Process workback items if they exist and have been modified
  if (this.isModified('workback') && Array.isArray(this.workback) && this.workback.length > 0) {
    const now = new Date();
    const nyNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    
    // For tasks with deadlines, use the deadline to space workback items
    if (this.scheduledEnd) {
      const deadline = new Date(this.scheduledEnd);
      const deadlineNY = new Date(deadline.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const totalDuration = deadlineNY.getTime() - nyNow.getTime();
      
      // Calculate spacing between items, ensuring at least 15 minutes between steps
      const minSpacing = 15 * 60 * 1000; // 15 minutes in milliseconds
      const spacing = Math.max(minSpacing, Math.floor(totalDuration / (this.workback.length + 1)));
      
      this.workback = this.workback.map((item, index) => {
        const itemEndTime = new Date(nyNow.getTime() + (spacing * (index + 1)));
        // Ensure the item ends before the deadline
        if (itemEndTime > deadlineNY) {
          itemEndTime.setTime(deadlineNY.getTime() - minSpacing);
        }
        return {
          ...item,
          scheduledEnd: itemEndTime.toISOString(),
          estimatedTime: Math.max(15, Math.round((item.estimatedTime || 30) / 5) * 5)
        };
      });
    } else {
      // For tasks without deadlines, space items over a week
      const weekInMs = 7 * 24 * 60 * 60 * 1000;
      const spacing = Math.floor(weekInMs / (this.workback.length + 1));
      const startDate = new Date(nyNow);
      startDate.setDate(startDate.getDate() + 1);
      startDate.setHours(10, 0, 0, 0); // Start at 10 AM next day
      
      this.workback = this.workback.map((item, index) => {
        const itemEndTime = new Date(startDate.getTime() + (spacing * (index + 1)));
        return {
          ...item,
          scheduledEnd: itemEndTime.toISOString(),
          estimatedTime: Math.max(15, Math.round((item.estimatedTime || 30) / 5) * 5)
        };
      });
    }
  }
  
  next();
});

export default mongoose.model<ITask>('Task', TaskSchema);