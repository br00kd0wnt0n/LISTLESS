import { Request, Response } from 'express';
import mongoose, { SortOrder } from 'mongoose';
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
    emotionalProfile?: {
      stressLevel: 'low' | 'medium' | 'high' | 'overwhelming';
      emotionalImpact: 'positive' | 'neutral' | 'negative';
      energyLevel: 'low' | 'medium' | 'high';
      motivationLevel: 'low' | 'medium' | 'high';
      emotionalTriggers?: string[];
      copingStrategies?: string[];
    };
    lifeDomain?: 'purple' | 'blue' | 'yellow' | 'green' | 'orange' | 'red';
  }>;
  clarifications?: string[];
}

interface WorkbackTime {
  scheduledEnd: Date;
  estimatedTime: number;
  title: string;
}

// Update ProcessedTaskData interface to match ITask requirements
interface ProcessedTaskData {
  title: string;
  description?: string;
  category: ITask['category'];
  priority: ITask['priority'];
  estimatedTime: number;
  scheduledEnd?: string;
  workback?: Array<{
    title: string;
    scheduledEnd: string; // Required to match ITask
    estimatedTime: number; // Required to match ITask
  }>;
  emotionalProfile?: {
    stressLevel: 'low' | 'medium' | 'high' | 'overwhelming';
    emotionalImpact: 'positive' | 'neutral' | 'negative';
    energyLevel: 'low' | 'medium' | 'high';
    motivationLevel: 'low' | 'medium' | 'high';
    emotionalTriggers?: string[];
    copingStrategies?: string[];
  };
  lifeDomain?: 'purple' | 'blue' | 'yellow' | 'green' | 'orange' | 'red';
}

// Add type for MongoDB error
interface MongoError extends Error {
  code?: number;
}

// Add type guard for Date objects
function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

// Add type guard for task object
interface ITaskDocument {
  scheduledEnd?: Date | string;
  startBy?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  workback?: Array<{
    scheduledEnd?: Date | string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
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
  
  // Convert deadline to NY timezone for consistent calculations
  const deadlineNY = new Date(deadline.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const nowNY = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  
  // Calculate hours until deadline in NY timezone
  const hoursUntilDeadline = (deadlineNY.getTime() - nowNY.getTime()) / (1000 * 60 * 60);
  
  // Helper function to create NY timezone date string
  const createNYDateString = (date: Date) => {
    const nyDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    return nyDate.toISOString();
  };
  
  // Calculate number of workback items based on task duration and deadline
  const numSteps = Math.min(3, Math.max(2, Math.ceil(totalDuration / 120))); // One step per 2 hours, max 3 steps
  const stepDurations = Array(numSteps).fill(0).map((_, i) => {
    const baseDuration = Math.round(totalDuration / numSteps);
    return i === numSteps - 1 ? baseDuration + (totalDuration % numSteps) : baseDuration;
  });
  
  // Add buffer time between steps
  const bufferMinutes = 15;
  const totalBufferTime = bufferMinutes * (numSteps - 1);
  const adjustedTotalDuration = totalDuration - totalBufferTime;
  
  // Calculate step durations with buffer time
  const adjustedStepDurations = stepDurations.map((duration, i) => {
    const adjustedDuration = Math.round((duration / totalDuration) * adjustedTotalDuration);
    return Math.max(15, adjustedDuration); // Minimum 15 minutes per step
  });
  
  // Calculate end times for each step, working backwards from deadline
  let currentEnd = new Date(deadlineNY);
  for (let i = numSteps - 1; i >= 0; i--) {
    const stepStart = new Date(currentEnd.getTime() - (adjustedStepDurations[i] * 60 * 1000));
    
    workbackItems.unshift({
      scheduledEnd: new Date(createNYDateString(currentEnd)),
      estimatedTime: adjustedStepDurations[i],
      title: `Step ${i + 1}: ${i === 0 ? 'Initial preparation' : i === numSteps - 1 ? 'Final completion' : 'Progress check'}`
    });
    
    // Add buffer time before next step
    if (i > 0) {
      currentEnd = new Date(stepStart.getTime() - (bufferMinutes * 60 * 1000));
    }
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

// Add caching for duplicate task detection
const duplicateTaskCache = new Map<string, { task: ITask; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Helper function to check cache for duplicates
function checkDuplicateCache(userId: string, taskTitle: string): ITask | null {
  const cacheKey = `${userId}:${taskTitle}`;
  const cached = duplicateTaskCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.task;
  }
  
  duplicateTaskCache.delete(cacheKey);
  return null;
}

// Helper function to update duplicate cache
function updateDuplicateCache(userId: string, taskTitle: string, task: ITask) {
  const cacheKey = `${userId}:${taskTitle}`;
  duplicateTaskCache.set(cacheKey, { task, timestamp: Date.now() });
}

// Add helper function to check for duplicate tasks
async function findDuplicateTasks(userId: string, taskTitle: string): Promise<ITask | null> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return TaskModel.findOne({
    createdBy: userId,
    title: taskTitle,
    status: { $in: ['todo', 'in-progress'] },
    createdAt: { $gte: fiveMinutesAgo }
  }).sort({ createdAt: -1 });
}

// Add helper function to process AI response
function processAIResponse(response: string, userId: string, input: string): AITaskResponse {
  try {
    const parsedResponse = JSON.parse(response);
    if (!parsedResponse.tasks || !Array.isArray(parsedResponse.tasks)) {
      throw new Error('Invalid AI response format: missing tasks array');
    }
    return parsedResponse;
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    throw new Error('Invalid AI response format');
  }
}

// Optimize workback item processing
function processWorkbackItems(taskData: ProcessedTaskData, deadline?: Date): ProcessedTaskData {
  if (!taskData.workback || !Array.isArray(taskData.workback)) {
    return taskData;
  }

  const now = new Date();
  const nyNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  
  if (deadline && taskData.estimatedTime) {
    // For tasks with deadlines, calculate workback items based on deadline
    const deadlineNY = new Date(deadline.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const totalDuration = deadlineNY.getTime() - nyNow.getTime();
    const minSpacing = 15 * 60 * 1000; // 15 minutes in milliseconds
    
    // Calculate optimal number of steps based on total duration
    const numSteps = Math.min(3, Math.max(2, Math.ceil(taskData.estimatedTime / 120)));
    const spacing = Math.max(minSpacing, Math.floor(totalDuration / (numSteps + 1)));
    
    taskData.workback = taskData.workback.slice(0, numSteps).map((item, index) => {
      const itemEndTime = new Date(nyNow.getTime() + (spacing * (index + 1)));
      if (itemEndTime > deadlineNY) {
        itemEndTime.setTime(deadlineNY.getTime() - minSpacing);
      }
      return {
        title: item.title,
        scheduledEnd: itemEndTime.toISOString(),
        estimatedTime: Math.max(15, Math.round((item.estimatedTime || taskData.estimatedTime / numSteps) / 5) * 5)
      };
    });
  } else {
    // For tasks without deadlines, space items over a week
    const weekInMs = 7 * 24 * 60 * 60 * 1000;
    const startDate = new Date(nyNow);
    startDate.setDate(startDate.getDate() + 1);
    startDate.setHours(10, 0, 0, 0); // Start at 10 AM next day
    
    const spacing = Math.floor(weekInMs / (taskData.workback.length + 1));
    taskData.workback = taskData.workback.map((item, index) => {
      const itemEndTime = new Date(startDate.getTime() + (spacing * (index + 1)));
      return {
        title: item.title,
        scheduledEnd: itemEndTime.toISOString(),
        estimatedTime: Math.max(15, Math.round((item.estimatedTime || 30) / 5) * 5)
      };
    });
  }
  
  return taskData;
}

// Main Controller Class
export const TaskController = {
  constructor() {
    // Bind methods to ensure 'this' context is preserved
    this.getTasks = this.getTasks.bind(this);
    this.createTask = this.createTask.bind(this);
    this.updateTask = this.updateTask.bind(this);
    this.deleteTask = this.deleteTask.bind(this);
    this.completeTask = this.completeTask.bind(this);
    this.processTaskInput = this.processTaskInput.bind(this);
    this.estimateTime = this.estimateTime.bind(this);
  },

  // Task Management Methods
  async getTasks(req: Request, res: Response) {
    try {
      const { 
        status, 
        category, 
        priority, 
        sortBy = 'scheduledEnd', // Default sort field
        sortOrder = 'asc' // Default sort order
      } = req.query;

      // Build filter object
      const filter: any = {};
      if (status) filter.status = status;
      if (category) filter.category = category;
      if (priority) filter.priority = priority;

      // Validate sort parameters
      const allowedSortFields = ['scheduledEnd', 'startBy', 'createdAt', 'priority', 'title'] as const;
      const allowedSortOrders = ['asc', 'desc'] as const;
      
      type SortField = typeof allowedSortFields[number];
      type SortOrder = typeof allowedSortOrders[number];
      
      const finalSortBy = allowedSortFields.includes(sortBy as SortField) ? sortBy as SortField : 'scheduledEnd';
      const finalSortOrder = allowedSortOrders.includes(sortOrder as SortOrder) ? sortOrder as SortOrder : 'asc';

      // Create sort object
      const sort: Record<SortField, 1 | -1> = {
        [finalSortBy]: finalSortOrder === 'asc' ? 1 : -1
      } as Record<SortField, 1 | -1>;

      // Add secondary sort by createdAt for stability
      if (finalSortBy !== 'createdAt') {
        sort.createdAt = -1; // Most recent first as tiebreaker
      }

      const tasks = await TaskModel.find(filter)
        .sort(sort)
        .lean();

      // Transform dates to ISO strings for consistent JSON serialization
      const transformedTasks = tasks.map(task => {
        const transformed = { ...task } as ITaskDocument;
        
        // Handle date fields with type guards
        const dateFields = ['scheduledEnd', 'startBy', 'createdAt', 'updatedAt'] as const;
        dateFields.forEach(field => {
          const value = transformed[field];
          if (isDate(value)) {
            transformed[field] = value.toISOString();
          }
        });

        // Handle workback items
        if (Array.isArray(transformed.workback)) {
          transformed.workback = transformed.workback.map(item => {
            const workbackItem = { ...item };
            if (isDate(item.scheduledEnd)) {
              workbackItem.scheduledEnd = item.scheduledEnd.toISOString();
            }
            return workbackItem;
          });
        }

        return transformed;
      });

      res.json(transformedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ 
        error: 'Failed to fetch tasks',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  async createTask(req: Request, res: Response) {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ 
          success: false,
          error: { message: 'User ID is required' }
        });
      }

      let taskData = req.body;

      // Validate required fields
      const requiredFields = ['title', 'category', 'priority', 'estimatedTime'];
      const missingFields = requiredFields.filter(field => !taskData[field]);
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Missing required fields',
            details: missingFields.map(field => `${field} is required`)
          }
        });
      }

      // Validate field types and values
      const validationErrors: string[] = [];
      
      if (typeof taskData.title !== 'string' || taskData.title.length > 200) {
        validationErrors.push('Title must be a string with maximum length of 200 characters');
      }
      
      if (!['work', 'household', 'personal', 'family', 'health', 'finance', 'maintenance', 'social', 'other'].includes(taskData.category)) {
        validationErrors.push('Invalid category value');
      }
      
      if (!['low', 'medium', 'high', 'urgent'].includes(taskData.priority)) {
        validationErrors.push('Invalid priority value');
      }
      
      if (typeof taskData.estimatedTime !== 'number' || taskData.estimatedTime < 1) {
        validationErrors.push('Estimated time must be a positive number');
      }

      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            details: validationErrors
          }
        });
      }

      // Check cache for duplicates first
      const cachedTask = checkDuplicateCache(userId, taskData.title);
      if (cachedTask) {
        return res.status(200).json({
          success: true,
          data: cachedTask,
          meta: {
            timestamp: new Date().toISOString(),
            note: 'Duplicate task detected from cache'
          }
        });
      }

      // Check database for duplicates using a more efficient query
      const existingTask = await TaskModel.findOne({
        createdBy: userId,
        title: taskData.title,
        status: { $in: ['todo', 'in-progress'] },
        createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
      }).select('_id title status createdAt').lean();

      if (existingTask) {
        updateDuplicateCache(userId, taskData.title, existingTask);
        return res.status(200).json({
          success: true,
          data: existingTask,
          meta: {
            timestamp: new Date().toISOString(),
            note: 'Duplicate task detected from database'
          }
        });
      }

      // Process workback items if they exist
      if (taskData.workback && Array.isArray(taskData.workback)) {
        const deadline = taskData.scheduledEnd ? new Date(taskData.scheduledEnd) : undefined;
        taskData = processWorkbackItems(taskData, deadline);
      }

      // Create new task with proper defaults
      const task = new TaskModel({
        ...taskData,
        createdBy: userId,
        status: 'todo',
        createdAt: new Date(),
        updatedAt: new Date(),
        aiProcessed: false,
        emotionalProfile: taskData.emotionalProfile || undefined,
        lifeDomain: taskData.lifeDomain || undefined
      });

      // Validate before saving using Mongoose validation
      const validationError = task.validateSync();
      if (validationError) {
        const errorDetails = Object.values(validationError.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
        
        return res.status(400).json({
          success: false,
          error: {
            message: 'Task validation failed',
            details: errorDetails
          }
        });
      }

      // Save task with retry logic for concurrent operations
      let savedTask;
      try {
        savedTask = await task.save();
      } catch (saveError: unknown) {
        const mongoError = saveError as MongoError;
        if (mongoError.code === 11000) { // Duplicate key error
          // Retry with a slight delay
          await new Promise(resolve => setTimeout(resolve, 100));
          savedTask = await task.save();
        } else {
          throw saveError;
        }
      }

      // Update cache
      updateDuplicateCache(userId, taskData.title, savedTask);

      // Set cache headers
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('ETag', `"${savedTask._id}-${savedTask.updatedAt.getTime()}"`);

      res.status(201).json({
        success: true,
        data: savedTask,
        meta: {
          timestamp: new Date().toISOString(),
          created: true
        }
      });
    } catch (error: unknown) {
      console.error('Error creating task:', error);
      
      // Enhanced error handling with proper error classification
      let statusCode = 500;
      let errorMessage = 'Failed to create task';
      let errorDetails;

      if (error instanceof mongoose.Error.ValidationError) {
        statusCode = 400;
        errorMessage = 'Validation failed';
        errorDetails = Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }));
      } else if (error instanceof mongoose.Error.CastError) {
        statusCode = 400;
        errorMessage = 'Invalid data type';
        errorDetails = { field: error.path, message: error.message };
      } else if ((error as MongoError).code === 11000) {
        statusCode = 409;
        errorMessage = 'Duplicate task detected';
      }

      res.status(statusCode).json({
        success: false,
        error: {
          message: errorMessage,
          details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
        }
      });
    }
  },

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
  },

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
  },

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
  },

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

      // Check for duplicate tasks first
      const existingTask = await findDuplicateTasks(userId, input);
      if (existingTask) {
        console.log('Duplicate task detected:', {
          title: input,
          existingTask: {
            id: existingTask._id,
            createdAt: existingTask.createdAt,
            status: existingTask.status
          }
        });
        
        return res.status(200).json({
          success: true,
          data: {
            tasks: [existingTask],
            clarifications: [],
            originalInput: input
          },
          meta: {
            timestamp: new Date().toISOString(),
            note: 'Duplicate task detected, returning existing task'
          }
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

CRITICAL: Process this input independently. Do not carry over context from previous conversations.

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
   - CRITICAL: Workback items MUST be in chronological order:
     * Step 1 should be earlier than Step 2
     * Each step's scheduledEnd must be before the next step
     * All steps must be before the main task deadline
     * For tasks with deadlines, work backwards from the deadline
     * Example for a task due Friday at 11:59 PM:
       {
         "workback": [
           {
             "title": "Step 1: Initial preparation",
             "scheduledEnd": "2025-05-30T15:00:00.000-04:00", // Thursday afternoon
             "estimatedTime": 60
           },
           {
             "title": "Step 2: Final completion",
             "scheduledEnd": "2025-05-30T23:00:00.000-04:00", // Thursday evening
             "estimatedTime": 45
           }
         ]
       }

7. For emotional intelligence analysis, ALWAYS include an "emotionalProfile" object with:
   - "stressLevel": Assess the potential stress level of the task:
     * "low" for routine, simple tasks or tasks with positive emotional context
     * "medium" for moderately challenging tasks
     * "high" for complex or time-sensitive tasks
     * "overwhelming" for tasks that might cause significant stress
   - "emotionalImpact": Evaluate how the task might affect emotions:
     * "positive" for tasks that bring joy, satisfaction, or creative fulfillment
     * "neutral" for routine tasks
     * "negative" for tasks that might cause anxiety or stress
   - "energyLevel": Estimate the energy required:
     * "low" for simple, quick tasks
     * "medium" for standard tasks
     * "high" for demanding tasks or creative tasks requiring flow state
   - "motivationLevel": Assess the likely motivation level:
     * "low" for tasks that might be procrastinated
     * "medium" for standard tasks
     * "high" for engaging, creative, or rewarding tasks
   - "emotionalTriggers": Optional array of potential emotional triggers
   - "copingStrategies": Optional array of suggested coping strategies
   - Consider the user's overall emotional state when provided:
     * If user mentions mixed emotions (e.g., "overwhelmed but motivated")
     * If user expresses excitement about certain tasks
     * If user indicates anxiety about deadlines
     * Adjust support strategies accordingly

8. For life domain color, assign ONE of these colors based on the task's primary life area:
   - "purple" for work and career (e.g., client presentations, work projects, professional development)
   - "blue" for personal growth and learning (e.g., studying, skill development, personal projects)
   - "yellow" for people and relationships (e.g., family events, social gatherings, relationship maintenance)
   - "green" for health and wellness (e.g., medical appointments, exercise, self-care)
   - "orange" for life maintenance (e.g., taxes, bills, administrative tasks, household management)
   - "red" ONLY for truly urgent or critical tasks (e.g., emergencies, immediate deadlines, critical issues)

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
5. For emotional analysis:
   - Consider the task's complexity, deadline, and personal impact
   - Assess potential stress and emotional impact realistically
   - Provide specific coping strategies for high-stress tasks
   - Choose the most relevant life domain color

5. For life domain classification:
   - Use "yellow" for all relationship and social activities
   - Use "orange" for maintenance and administrative tasks
   - Reserve "red" ONLY for truly urgent or critical tasks
   - Consider the task's primary purpose, not just its deadline
   - Example: Taxes are "orange" (life maintenance) unless they have an immediate deadline

Example response with correct domain classification:
{
  "tasks": [
    {
      "title": "Plan family dinner with in-laws",
      "description": "Coordinate and plan activities for in-laws' visit",
      "category": "family",
      "priority": "high",
      "estimatedTime": 60,
      "emotionalProfile": {
        "stressLevel": "medium",
        "emotionalImpact": "positive",
        "energyLevel": "medium",
        "motivationLevel": "high",
        "emotionalTriggers": [],
        "copingStrategies": []
      },
      "lifeDomain": "yellow",  // Family activities are yellow domain
      "workback": [
        {
          "title": "Step 1: Research restaurant options",
          "scheduledEnd": "${getRelativeDate(1, 10, 0)}",
          "estimatedTime": 30
        },
        {
          "title": "Step 2: Make reservations",
          "scheduledEnd": "${getRelativeDate(1, 14, 0)}",
          "estimatedTime": 30
        }
      ]
    }
  ]
}

Focus on extracting actionable tasks with realistic time estimates, appropriate workback schedules, and thoughtful emotional intelligence analysis. Process each input independently and classify life domains according to the task's primary purpose.
`;

      const completion = await client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful task management assistant. Extract clear, actionable tasks from natural language input. Process each input independently - do not carry over context from previous conversations. Always respond with valid JSON.'
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

      const parsedResponse = processAIResponse(aiResponse, userId, input);

      const processedTasks = await Promise.all(parsedResponse.tasks.map(async taskData => {
        // Process workback items if needed
        if (taskData.scheduledEnd) {
          const deadline = new Date(taskData.scheduledEnd);
          taskData = processWorkbackItems(taskData, deadline);
        } else {
          taskData = processWorkbackItems(taskData);
        }
        
        // Ensure emotional profile is properly structured
        const emotionalProfile = taskData.emotionalProfile ? {
          stressLevel: taskData.emotionalProfile.stressLevel,
          emotionalImpact: taskData.emotionalProfile.emotionalImpact,
          energyLevel: taskData.emotionalProfile.energyLevel,
          motivationLevel: taskData.emotionalProfile.motivationLevel,
          emotionalTriggers: taskData.emotionalProfile.emotionalTriggers || [],
          copingStrategies: taskData.emotionalProfile.copingStrategies || []
        } : undefined;

        // Create the task
        const task = new TaskModel({
          ...taskData,
          createdBy: userId,
          originalInput: input,
          aiProcessed: true,
          status: 'todo',
          emotionalProfile,
          estimatedTime: roundToNearest5Minutes(taskData.estimatedTime || 30)
        });

        // Validate before saving
        const validationError = task.validateSync();
        if (validationError) {
          console.error('Task validation failed:', validationError);
          throw new Error(`Task validation failed: ${validationError.message}`);
        }

        await task.save();
        return task;
      }));

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
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('Task validation failed')) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Task validation failed',
              details: error.message
            }
          });
        }
        
        if (error.message.includes('Invalid AI response format')) {
          return res.status(500).json({
            success: false,
            error: {
              message: 'AI response format error',
              details: error.message
            }
          });
        }
        
        if (error.message.includes('No response from OpenAI')) {
          return res.status(503).json({
            success: false,
            error: {
              message: 'AI service unavailable',
              details: 'OpenAI did not return a valid response'
            }
          });
        }
      }
      
      // Generic error response
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to process task input',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  },

  // Update estimateTime method with proper types
  async estimateTime(req: Request, res: Response): Promise<void> {
    try {
      const { taskTitle, category, description } = req.body as {
        taskTitle: string;
        category?: string;
        description?: string;
      };

      if (!taskTitle) {
        res.status(400).json({
          success: false,
          error: { message: 'Task title is required' }
        });
        return;
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