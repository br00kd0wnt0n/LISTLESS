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
    scheduledEnd: string;
    estimatedTime?: number;
  }>;
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
  workback: [
    {
      title: { type: String, required: true },
      scheduledEnd: { type: String, required: true },
      estimatedTime: { type: Number }
    }
  ]
}, {
  timestamps: true
});

// Indexes for better query performance
TaskSchema.index({ createdBy: 1, status: 1 });
TaskSchema.index({ scheduledEnd: 1 });
TaskSchema.index({ category: 1, priority: 1 });

export default mongoose.model<ITask>('Task', TaskSchema);