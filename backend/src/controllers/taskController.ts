// ===== backend/src/controllers/taskController.ts =====

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import TaskModel, { ITask } from '../models/Task';
import { validationResult } from 'express-validator';

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

      const tasks = await TaskModel.find({ createdBy: userId })
        .sort({ createdAt: -1 });

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
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            details: errors.array()
          }
        });
      }

      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      const taskData = req.body;
      const task = new TaskModel({
        ...taskData,
        createdBy: userId
      });

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
        error: { message: 'Failed to create task' }
      });
    }
  }

  // Update a task
  async updateTask(req: Request, res: Response) {
    try {
      const { taskId } = req.params;
      const updates = req.body;

      const task = await TaskModel.findByIdAndUpdate(
        taskId,
        { ...updates, updatedAt: new Date() },
        { new: true, runValidators: true }
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