import { Request, Response } from 'express';
import mongoose from 'mongoose';
import OpenAI from 'openai';
import TaskModel, { ITask } from '../models/Task';
import { validationResult } from 'express-validator';

// Types and Interfaces
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

interface AITaskResponse {
  tasks: Array<{
    title: string;
    description?: string;
    category: ITask['category'];
    priority: ITask['priority'];
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
  }>;
  clarifications?: string[];
}

interface WorkbackTime {
  scheduledEnd: Date;
  estimatedTime: number;
  title: string;
}

// Helper Functions
function getReferenceDate(): Date {
  // Set reference date to May 27, 2025
  const referenceDate = new Date('2025-05-27T00:00:00.000-04:00');
  return referenceDate;
}

function getCurrentTimeInNY(): string {
  const now = getReferenceDate();
  return now.toLocaleString('en-US', { 
    timeZone: 'America/New_York',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
}

function getRelativeDate(daysFromNow: number, hour?: number, minute?: number): string {
  const now = getReferenceDate();
  const nyDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  nyDate.setDate(nyDate.getDate() + daysFromNow);
  
  if (hour !== undefined && minute !== undefined) {
    nyDate.setHours(hour, minute, 0, 0);
  } else {
    nyDate.setHours(23, 59, 59, 999);
  }
  
  const year = nyDate.getFullYear();
  const month = String(nyDate.getMonth() + 1).padStart(2, '0');
  const day = String(nyDate.getDate()).padStart(2, '0');
  const hours = String(nyDate.getHours()).padStart(2, '0');
  const minutes = String(nyDate.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:00.000-04:00`;
}

function roundToNearest5Minutes(minutes: number): number {
  return Math.round(minutes / 5) * 5;
}

function calculateWorkbackTimes(deadline: Date, totalDuration: number): WorkbackTime[] {
  const workbackItems: WorkbackTime[] = [];
  
  const deadlineNY = new Date(deadline.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const nowNY = getReferenceDate();
  
  const hoursUntilDeadline = (deadlineNY.getTime() - nowNY.getTime()) / (1000 * 60 * 60);
  
  const createNYDateString = (date: Date) => {
    const nyDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const year = nyDate.getFullYear();
    const month = String(nyDate.getMonth() + 1).padStart(2, '0');
    const day = String(nyDate.getDate()).padStart(2, '0');
    const hours = String(nyDate.getHours()).padStart(2, '0');
    const minutes = String(nyDate.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:00.000-04:00`;
  };
  
  let firstItemDuration, secondItemDuration;
  
  if (hoursUntilDeadline <= 2) {
    firstItemDuration = Math.floor(totalDuration * 0.25);
    secondItemDuration = Math.floor(totalDuration * 0.75);
  } else if (hoursUntilDeadline <= 4) {
    firstItemDuration = Math.floor(totalDuration * 0.3);
    secondItemDuration = Math.floor(totalDuration * 0.7);
  } else {
    firstItemDuration = Math.floor(totalDuration * 0.4);
    secondItemDuration = Math.floor(totalDuration * 0.6);
  }
  
  firstItemDuration = Math.max(15, Math.round(firstItemDuration / 5) * 5);
  secondItemDuration = Math.max(15, Math.round(secondItemDuration / 5) * 5);
  
  const bufferMinutes = 15;
  
  const secondItemEnd = new Date(deadlineNY);
  const secondItemStart = new Date(secondItemEnd.getTime() - (secondItemDuration * 60 * 1000));
  const firstItemEnd = new Date(secondItemStart.getTime() - (bufferMinutes * 60 * 1000));
  const firstItemStart = new Date(firstItemEnd.getTime() - (firstItemDuration * 60 * 1000));
  
  if (firstItemEnd <= firstItemStart || secondItemEnd <= secondItemStart || firstItemEnd >= secondItemStart) {
    const totalAvailableMinutes = (deadlineNY.getTime() - nowNY.getTime()) / (1000 * 60);
    const adjustedTotalDuration = Math.min(totalDuration, totalAvailableMinutes - bufferMinutes);
    
    firstItemDuration = Math.max(15, Math.round((adjustedTotalDuration * 0.4) / 5) * 5);
    secondItemDuration = Math.max(15, Math.round((adjustedTotalDuration * 0.6) / 5) * 5);
    
    const newSecondItemEnd = new Date(deadlineNY);
    const newSecondItemStart = new Date(newSecondItemEnd.getTime() - (secondItemDuration * 60 * 1000));
    const newFirstItemEnd = new Date(newSecondItemStart.getTime() - (bufferMinutes * 60 * 1000));
    const newFirstItemStart = new Date(newFirstItemEnd.getTime() - (firstItemDuration * 60 * 1000));
    
    workbackItems.push({
      scheduledEnd: new Date(createNYDateString(newFirstItemEnd)),
      estimatedTime: firstItemDuration,
      title: 'Step 1: Initial preparation'
    });
    
    workbackItems.push({
      scheduledEnd: new Date(createNYDateString(newSecondItemEnd)),
      estimatedTime: secondItemDuration,
      title: 'Step 2: Final completion'
    });
  } else {
    workbackItems.push({
      scheduledEnd: new Date(createNYDateString(firstItemEnd)),
      estimatedTime: firstItemDuration,
      title: 'Step 1: Initial preparation'
    });
    
    workbackItems.push({
      scheduledEnd: new Date(createNYDateString(secondItemEnd)),
      estimatedTime: secondItemDuration,
      title: 'Step 2: Final completion'
    });
  }
  
  return workbackItems;
}

// Initialize OpenAI client lazily
let openai: OpenAI | null = null;

function getOpenAIClient() {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
}

// Main Controller Class
export class TaskController {
  constructor() {
    // Bind methods to ensure 'this' context is preserved
    this.getTasks = this.getTasks.bind(this);
    this.createTask = this.createTask.bind(this);
    this.updateTask = this.updateTask.bind(this);
    this.deleteTask = this.deleteTask.bind(this);
    this.completeTask = this.completeTask.bind(this);
    this.processTaskInput = this.processTaskInput.bind(this);
    this.estimateTime = this.estimateTime.bind(this);
  }

  // Task Management Methods
  async getTasks(req: Request, res: Response) {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      const tasksWithDeadlines = await TaskModel.find({ 
        createdBy: userId,
        scheduledEnd: { $exists: true, $ne: null }
      }).sort({ scheduledEnd: 1 });

      const tasksWithoutDeadlines = await TaskModel.find({ 
        createdBy: userId,
        scheduledEnd: { $exists: false }
      }).sort({ createdAt: -1 });

      const tasks = [...tasksWithDeadlines, ...tasksWithoutDeadlines];

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

  async createTask(req: Request, res: Response) {
    try {
      console.log('Task creation request body:', JSON.stringify(req.body, null, 2));
      console.log('Task creation query params:', JSON.stringify(req.query, null, 2));
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('Task validation errors:', {
          errors: errors.array(),
          requestBody: req.body,
          validationRules: {
            title: { required: true, minLength: 1, maxLength: 200 },
            category: { required: true, validValues: ['work', 'household', 'personal', 'family', 'health', 'finance', 'maintenance', 'social', 'other'] },
            priority: { required: true, validValues: ['low', 'medium', 'high', 'urgent'] },
            estimatedTime: { required: true, type: 'number', min: 1 }
          }
        });
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
        console.error('Missing userId in query params');
        return res.status(400).json({ message: 'User ID is required' });
      }

      const taskData = req.body;
      const { _id, ...taskDataWithoutId } = taskData;
      
      const task = new TaskModel({
        ...taskDataWithoutId,
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
        error: { 
          message: 'Failed to create task',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  async updateTask(req: Request, res: Response) {
    try {
      const { taskId } = req.params;
      const updates = req.body;
      const userId = req.query.userId as string;

      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      const protectedFields = ['_id', 'createdBy', 'createdAt'];
      const hasProtectedField = Object.keys(updates).some(field => protectedFields.includes(field));
      if (hasProtectedField) {
        return res.status(400).json({ message: 'Cannot update protected fields' });
      }

      const task = await TaskModel.findOne({ _id: taskId, createdBy: userId });
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      if (updates.estimatedTime && task.scheduledEnd && Array.isArray(task.workback) && task.workback.length > 0) {
        const deadline = new Date(task.scheduledEnd);
        const workbackTimes = calculateWorkbackTimes(deadline, updates.estimatedTime);
        
        updates.workback = workbackTimes.map((item: WorkbackTime, index: number) => ({
          ...task.workback![index],
          scheduledEnd: item.scheduledEnd.toISOString(),
          estimatedTime: item.estimatedTime
        }));
      }

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

  // AI Processing Methods
  async processTaskInput(req: Request, res: Response) {
    try {
      const { input } = req.body;
      const userId = req.query.userId as string;

      if (!input || !userId) {
        return res.status(400).json({
          success: false,
          error: { message: 'Input text and user ID are required' }
        });
      }

      const client = getOpenAIClient();
      const currentTimeNY = getCurrentTimeInNY();
      const currentDateISO = getReferenceDate().toISOString();
      const currentYear = getReferenceDate().getFullYear();

      const prompt = `
Extract task information from this natural language input: "${input}"

Current date and time in New York: ${currentTimeNY}
Current date and time (ISO): ${currentDateISO}
Current year: ${currentYear}

Please respond with a JSON object containing a "tasks" array. For each task:
1. ALWAYS include an "estimatedTime" field (in minutes) based on typical task complexity:
   - Round all time estimates to the nearest 5 minutes (e.g., 15, 20, 25, 30, etc.)
   - For tasks under 15 minutes, use 15 minutes as the minimum
   - For tasks over 2 hours, round to the nearest 15 minutes
2. For task categories, use ONLY these valid values:
   - "work" for work-related tasks
   - "household" for home maintenance and chores
   - "personal" for self-care, pet care, and individual activities
   - "family" for family-related activities
   - "health" for health and wellness
   - "finance" for financial tasks
   - "maintenance" for maintenance tasks
   - "social" for social activities
   - "other" for anything else
   CRITICAL: Map pet care tasks to "personal" category
3. For tasks with deadlines:
   - CRITICAL: Always use the current year (${currentYear})
   - If a task mentions "tonight" or "today" with a specific time:
     * Use the specified time in America/New_York timezone for TODAY (${currentTimeNY.split(',')[0]})
     * If the time has already passed today, use tomorrow at the same time
     * If the time hasn't passed today, use today at that time
   - If a task mentions "tomorrow", use TOMORROW (next day) with the specified time in America/New_York timezone
   - If a specific time is mentioned (e.g., "10am"), use that time on the appropriate day in America/New_York timezone
   - For tasks with "before X time", use that time as the deadline in America/New_York timezone
   - For tasks with "by X time", use that time as the deadline in America/New_York timezone
   - For reservations, use the reservation deadline (not the event time) as "scheduledEnd"
4. For time-sensitive tasks, include a "startBy" field (ISO 8601) calculated as: scheduledEnd - estimatedTime
5. Include a "startByAlert" field with a friendly message (e.g., "⏰ Start by 9:00 AM tomorrow to finish on time!")
6. For workback schedules:
   - ALWAYS include a "workback" array for tasks that:
     * Have a deadline more than 24 hours away
     * Require multiple steps or preparation
     * Depend on other tasks or resources
     * Are time-sensitive (like reservations, appointments, etc.)
   - Each workback item must have:
     * A descriptive title
     * A scheduledEnd time (MUST be before the main task deadline)
     * An estimatedTime in minutes (rounded to nearest 5 minutes)
     * A clear sequence (e.g., "Step 1: Research", "Step 2: Draft", etc.)
   - Workback schedule rules:
     * For tasks due within 2 hours:
       - First workback item should be due 25% of total time before the deadline
       - Second workback item should be due 75% of total time before the deadline
       - Total workback time should equal the main task's estimatedTime
     * For tasks due within 4 hours:
       - First workback item should be due 30% of total time before the deadline
       - Second workback item should be due 70% of total time before the deadline
       - Total workback time should equal the main task's estimatedTime
     * For tasks due in more than 4 hours:
       - First workback item should be due 40% of total time before the deadline
       - Second workback item should be due 60% of total time before the deadline
       - Total workback time should equal the main task's estimatedTime
     * Each workback item should be spaced at least 15 minutes apart
     * The first workback item should start at least 30 minutes before the last workback item
     * CRITICAL: All workback times must use the current year (${currentYear})

Important rules:
1. All times must be in America/New_York timezone (-04:00)
2. For relative dates:
   - "tonight" or "today" with a specific time:
     * If the time has passed today in NY timezone, use tomorrow at that time
     * If the time hasn't passed today in NY timezone, use today at that time
   - "tomorrow" means TOMORROW (next day) with the specified time in NY timezone
   - If no specific time is mentioned, use end of day (11:59 PM) in NY timezone
   - CRITICAL: Always use the current year (${currentYear}) for all dates
3. Always estimate task duration in minutes, rounded to nearest 5 minutes
4. For time-sensitive tasks:
   - Calculate startBy = scheduledEnd - estimatedTime
   - Include a friendly startByAlert with emoji
   - For reservations, use the reservation deadline (not event time) as the main deadline
      `;

      const completion = await client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful task management assistant. Extract clear, actionable tasks from natural language input. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      const aiResponse = completion.choices[0]?.message?.content;
      if (!aiResponse) {
        throw new Error('No response from OpenAI');
      }

      let parsedResponse: AITaskResponse;
      try {
        parsedResponse = JSON.parse(aiResponse);
      } catch (parseError) {
        console.error('Failed to parse AI response:', aiResponse);
        throw new Error('Invalid AI response format');
      }

      const processedTasks = parsedResponse.tasks.map(taskData => {
        if (taskData.scheduledEnd && taskData.workback && taskData.estimatedTime) {
          const deadline = new Date(taskData.scheduledEnd);
          const workbackTimes = calculateWorkbackTimes(deadline, taskData.estimatedTime);
          
          taskData.estimatedTime = roundToNearest5Minutes(taskData.estimatedTime);
          
          taskData.workback = workbackTimes.map((item, index) => ({
            ...taskData.workback![index],
            scheduledEnd: item.scheduledEnd.toISOString(),
            estimatedTime: roundToNearest5Minutes(item.estimatedTime)
          }));
        }
        
        return {
          ...taskData,
          createdBy: userId,
          originalInput: input,
          aiProcessed: true,
          status: 'todo',
          scheduledEnd: taskData.scheduledEnd,
          startBy: taskData.startBy,
          startByAlert: taskData.startByAlert,
          workback: taskData.workback,
          estimatedTime: roundToNearest5Minutes(taskData.estimatedTime || 30)
        };
      });

      res.json({
        success: true,
        data: {
          tasks: processedTasks,
          clarifications: parsedResponse.clarifications || [],
          originalInput: input
        },
        meta: {
          timestamp: new Date().toISOString(),
          aiModel: 'gpt-4'
        }
      });

    } catch (error) {
      console.error('Error processing AI task input:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to process task input',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }

  async estimateTime(req: Request, res: Response) {
    try {
      const { taskTitle, category, description } = req.body;

      if (!taskTitle) {
        return res.status(400).json({
          success: false,
          error: { message: 'Task title is required' }
        });
      }

      const prompt = `
Estimate how long this task should take to complete (in minutes):
Title: ${taskTitle}
Category: ${category || 'unknown'}
Description: ${description || 'none provided'}

Respond with a single number (as a string) representing the estimated minutes.
Consider typical time requirements for similar tasks.
      `;

      const client = getOpenAIClient();

      const completion = await client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a time estimation expert. Provide realistic time estimates for tasks in minutes.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 50
      });

      const response = completion.choices[0]?.message?.content?.trim();
      const estimatedMinutes = parseInt(response || '30');

      res.json({
        success: true,
        data: {
          estimatedTime: estimatedMinutes,
          taskTitle,
          category
        },
        meta: {
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error estimating time:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to estimate time' }
      });
    }
  }
} 