// ===== backend/src/controllers/taskController.ts =====

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import TaskModel, { ITask } from '../models/Task';
import { validationResult } from 'express-validator';
import { calculateWorkbackTimes, WorkbackTime, roundToNearest5Minutes } from './aiController';
import { assignLifeDomain, isValidLifeDomain } from '../utils/taskUtils';

// Extend Express Request type to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

// Add emotional profile interface
interface EmotionalProfile {
  stressLevel: 'low' | 'medium' | 'high' | 'overwhelming';
  emotionalImpact: 'positive' | 'neutral' | 'negative';
  energyLevel: 'low' | 'medium' | 'high';
  motivationLevel: 'low' | 'medium' | 'high';
  emotionalTriggers?: string[];
  copingStrategies?: string[];
}

// Extend task data interface
interface TaskData {
  title: string;
  description?: string;
  category: string;
  priority: string;
  estimatedTime: number;
  tags?: string[];
  scheduledEnd?: string;
  workback?: Array<{ 
    title: string; 
    scheduledEnd: string;
    estimatedTime: number;
  }>;
  startBy?: string;
  startByAlert?: string;
  emotionalProfile?: EmotionalProfile;
  lifeDomain?: 'purple' | 'blue' | 'yellow' | 'green' | 'orange' | 'red';
  [key: string]: any; // Allow other fields
}

export default class TaskController {
  constructor() {
    // Bind methods to ensure 'this' context is preserved
    this.getTasks = this.getTasks.bind(this);
    this.createTask = this.createTask.bind(this);
    this.updateTask = this.updateTask.bind(this);
    this.deleteTask = this.deleteTask.bind(this);
    this.completeTask = this.completeTask.bind(this);
  }

  // Get all tasks for a user
  async getTasks(req: Request, res: Response) {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      // Use a single query with proper sorting
      const tasks = await TaskModel.find({ 
        createdBy: userId
      }).sort({ 
        // First sort by status to group completed tasks
        status: 1,
        // Then by scheduledEnd for tasks with deadlines
        scheduledEnd: 1,
        // Finally by creation date for tasks without deadlines
        createdAt: -1
      }).lean();

      // Prevent caching of the task list
      res.setHeader('Cache-Control', 'no-store');

      res.json({
        success: true,
        data: tasks,
        meta: {
          count: tasks.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to fetch tasks' }
      });
    }
  }

  // Create a new task
  async createTask(req: Request, res: Response) {
    try {
      const userId = req.query.userId as string;
      const taskData = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: { message: 'User ID is required' }
        });
      }

      // Strip out _id field if it exists
      const { _id, ...taskDataWithoutId } = taskData;

      // Ensure emotional profile fields are properly typed
      const emotionalProfile = taskData.emotionalProfile ? {
        stressLevel: taskData.emotionalProfile.stressLevel,
        emotionalImpact: taskData.emotionalProfile.emotionalImpact,
        energyLevel: taskData.emotionalProfile.energyLevel,
        motivationLevel: taskData.emotionalProfile.motivationLevel,
        emotionalTriggers: taskData.emotionalProfile.emotionalTriggers || [],
        copingStrategies: taskData.emotionalProfile.copingStrategies || []
      } : undefined;

      // Assign life domain using utility function
      const lifeDomain = assignLifeDomain(
        taskData.category,
        taskData.priority,
        taskData.lifeDomain
      );

      // Create task with validated data
      const task = new TaskModel({
        ...taskDataWithoutId,
        emotionalProfile,
        lifeDomain,
        createdBy: userId,
        status: taskData.status || 'todo',
        aiProcessed: taskData.aiProcessed || false
      });

      // Validate before saving
      const validationError = task.validateSync();
      if (validationError) {
        console.error('Task validation failed:', validationError);
        return res.status(400).json({
          success: false,
          error: {
            message: 'Task validation failed',
            details: validationError.message
          }
        });
      }

      await task.save();

      res.status(201).json({
        success: true,
        data: task,
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create task',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  // Update a task
  async updateTask(req: Request, res: Response) {
    try {
      const { taskId } = req.params;
      const updates = req.body;
      const userId = req.query.userId as string;

      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      // Validate that we're not trying to update protected fields
      const protectedFields = ['_id', 'createdBy', 'createdAt'];
      const hasProtectedField = Object.keys(updates).some(field => protectedFields.includes(field));
      if (hasProtectedField) {
        return res.status(400).json({ message: 'Cannot update protected fields' });
      }

      // Validate task exists and belongs to user
      const task = await TaskModel.findOne({ _id: taskId, createdBy: userId });
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      // If estimatedTime is being updated and the task has a deadline and workback schedule,
      // recalculate the workback times
      if (updates.estimatedTime && task.scheduledEnd && Array.isArray(task.workback) && task.workback.length > 0) {
        const deadline = new Date(task.scheduledEnd);
        const workbackTimes = calculateWorkbackTimes(deadline, updates.estimatedTime);
        
        // Update workback items with new times while preserving titles
        updates.workback = workbackTimes.map((item: WorkbackTime, index: number) => ({
          ...task.workback![index], // Keep the original title and other properties
          scheduledEnd: item.scheduledEnd.toISOString(),
          estimatedTime: item.estimatedTime
        }));
      }

      // Update the task
      Object.assign(task, updates);
      task.updatedAt = new Date();
      await task.save();

      res.json({
        success: true,
        data: task,
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ 
        success: false,
        error: { message: 'Failed to update task' }
      });
    }
  }

  // Delete a task
  async deleteTask(req: Request, res: Response) {
    try {
      const { taskId } = req.params;
      const task = await TaskModel.findByIdAndDelete(taskId);

      if (!task) {
        return res.status(404).json({
          success: false,
          error: { message: 'Task not found' }
        });
      }

      res.json({
        success: true,
        data: { id: task._id },
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to delete task' }
      });
    }
  }

  // Mark task as completed
  async completeTask(req: Request, res: Response) {
    try {
      const { taskId } = req.params;
      const { actualTime } = req.body;

      const task = await TaskModel.findByIdAndUpdate(
        taskId,
        {
          status: 'completed',
          completedAt: new Date(),
          actualTime: actualTime || undefined,
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!task) {
        return res.status(404).json({
          success: false,
          error: { message: 'Task not found' }
        });
      }

      res.json({
        success: true,
        data: task,
        meta: {
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error completing task:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to complete task' }
      });
    }
  }
}