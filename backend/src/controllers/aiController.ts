// ===== backend/src/controllers/aiController.ts =====
import { Request, Response } from 'express';
import OpenAI from 'openai';
import TaskModel, { ITask } from '../models/Task';

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

// Add this helper function at the top of the file after imports
function getReferenceDate(): Date {
  // Set reference date to May 27, 2025
  const referenceDate = new Date('2025-05-27T00:00:00.000-04:00');
  return referenceDate;
}

// Update getCurrentTimeInNY to use reference date
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

// Update getRelativeDate to use reference date
function getRelativeDate(daysFromNow: number, hour?: number, minute?: number): string {
  // Create date in NY timezone using reference date
  const now = getReferenceDate();
  const nyDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  nyDate.setDate(nyDate.getDate() + daysFromNow);
  
  // If specific time is provided, use it; otherwise use end of day
  if (hour !== undefined && minute !== undefined) {
    nyDate.setHours(hour, minute, 0, 0);
  } else {
    nyDate.setHours(23, 59, 59, 999);
  }
  
  // Format the date in NY timezone with explicit year
  const year = nyDate.getFullYear();
  const month = String(nyDate.getMonth() + 1).padStart(2, '0');
  const day = String(nyDate.getDate()).padStart(2, '0');
  const hours = String(nyDate.getHours()).padStart(2, '0');
  const minutes = String(nyDate.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:00.000-04:00`;
}

// Add this helper function after getRelativeDate
function roundToNearest5Minutes(minutes: number): number {
  return Math.round(minutes / 5) * 5;
}

// Update the calculateWorkbackTimes function to handle timezone correctly and ensure proper ordering
export interface WorkbackTime {
  scheduledEnd: Date;
  estimatedTime: number;
  title: string;
}

export function calculateWorkbackTimes(deadline: Date, totalDuration: number): WorkbackTime[] {
  const workbackItems: WorkbackTime[] = [];
  
  // Convert deadline to NY timezone for consistent calculations
  const deadlineNY = new Date(deadline.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const nowNY = getReferenceDate(); // Use reference date instead of current date
  
  // Calculate hours until deadline in NY timezone
  const hoursUntilDeadline = (deadlineNY.getTime() - nowNY.getTime()) / (1000 * 60 * 60);
  
  // Helper function to create NY timezone date string
  const createNYDateString = (date: Date) => {
    const nyDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const year = nyDate.getFullYear();
    const month = String(nyDate.getMonth() + 1).padStart(2, '0');
    const day = String(nyDate.getDate()).padStart(2, '0');
    const hours = String(nyDate.getHours()).padStart(2, '0');
    const minutes = String(nyDate.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:00.000-04:00`;
  };
  
  // Calculate workback item durations based on total duration
  let firstItemDuration, secondItemDuration;
  
  if (hoursUntilDeadline <= 2) {
    // For tasks due within 2 hours
    firstItemDuration = Math.floor(totalDuration * 0.25);
    secondItemDuration = Math.floor(totalDuration * 0.75);
  } else if (hoursUntilDeadline <= 4) {
    // For tasks due within 4 hours
    firstItemDuration = Math.floor(totalDuration * 0.3);
    secondItemDuration = Math.floor(totalDuration * 0.7);
  } else {
    // For tasks due in more than 4 hours
    firstItemDuration = Math.floor(totalDuration * 0.4);
    secondItemDuration = Math.floor(totalDuration * 0.6);
  }
  
  // Ensure minimum durations and round to nearest 5 minutes
  firstItemDuration = Math.max(15, Math.round(firstItemDuration / 5) * 5);
  secondItemDuration = Math.max(15, Math.round(secondItemDuration / 5) * 5);
  
  // Add a 15-minute buffer between items
  const bufferMinutes = 15;
  
  // Calculate end times for each item, working backwards from the deadline
  const secondItemEnd = new Date(deadlineNY);
  const secondItemStart = new Date(secondItemEnd.getTime() - (secondItemDuration * 60 * 1000));
  const firstItemEnd = new Date(secondItemStart.getTime() - (bufferMinutes * 60 * 1000));
  const firstItemStart = new Date(firstItemEnd.getTime() - (firstItemDuration * 60 * 1000));
  
  // Verify that items don't overlap and are in the future
  if (firstItemEnd <= firstItemStart || secondItemEnd <= secondItemStart || firstItemEnd >= secondItemStart) {
    // If there's an overlap, adjust the durations to fit within the available time
    const totalAvailableMinutes = (deadlineNY.getTime() - nowNY.getTime()) / (1000 * 60);
    const adjustedTotalDuration = Math.min(totalDuration, totalAvailableMinutes - bufferMinutes);
    
    // Recalculate durations proportionally
    firstItemDuration = Math.max(15, Math.round((adjustedTotalDuration * 0.4) / 5) * 5);
    secondItemDuration = Math.max(15, Math.round((adjustedTotalDuration * 0.6) / 5) * 5);
    
    // Recalculate times
    const newSecondItemEnd = new Date(deadlineNY);
    const newSecondItemStart = new Date(newSecondItemEnd.getTime() - (secondItemDuration * 60 * 1000));
    const newFirstItemEnd = new Date(newSecondItemStart.getTime() - (bufferMinutes * 60 * 1000));
    const newFirstItemStart = new Date(newFirstItemEnd.getTime() - (firstItemDuration * 60 * 1000));
    
    // Add items in chronological order (earliest first)
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
    // Add items in chronological order (earliest first)
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

export class AIController {
  // Process natural language input into tasks
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

      // Get OpenAI client (will throw if API key is not configured)
      const client = getOpenAIClient();
      const currentTimeNY = getCurrentTimeInNY();
      const currentDateISO = getReferenceDate().toISOString();
      const currentYear = getReferenceDate().getFullYear();

      // Update the prompt to emphasize correct date handling
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
   - CRITICAL: Always use the current year (${currentYear}) for all dates
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

Example response for a task with "tomorrow" deadline:
{
  "tasks": [
    {
      "title": "Clean the car",
      "description": "Clean the car before 10am tomorrow",
      "category": "household",
      "priority": "high",
      "estimatedTime": 60,
      "scheduledEnd": "${getRelativeDate(1, 10, 0)}", // Tomorrow at 10am
      "startBy": "${getRelativeDate(1, 9, 0)}", // Tomorrow at 9am
      "startByAlert": "⏰ Start by 9:00 AM tomorrow to finish on time!",
      "workback": [
        {
          "title": "Step 1: Gather cleaning supplies",
          "scheduledEnd": "${getRelativeDate(1, 9, 0)}", // Tomorrow at 9am
          "estimatedTime": 20
        },
        {
          "title": "Step 2: Start cleaning the car",
          "scheduledEnd": "${getRelativeDate(1, 9, 30)}", // Tomorrow at 9:30am
          "estimatedTime": 40
        }
      ],
      "tags": ["cleaning", "car"]
    }
  ]
}

Focus on extracting actionable tasks with realistic time estimates (rounded to 5 minutes) and appropriate workback schedules. If the input mentions specific times, use them; otherwise, make reasonable estimates based on typical task complexity. CRITICAL: Always use the current year (${currentYear}) for all dates.
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

      // Parse AI response
      let parsedResponse: AITaskResponse;
      try {
        parsedResponse = JSON.parse(aiResponse);
      } catch (parseError) {
        console.error('Failed to parse AI response:', aiResponse);
        throw new Error('Invalid AI response format');
      }

      // After parsing the AI response, adjust workback times if needed
      const processedTasks = parsedResponse.tasks.map(taskData => {
        if (taskData.scheduledEnd && taskData.workback && taskData.estimatedTime) {
          const deadline = new Date(taskData.scheduledEnd);
          const workbackTimes = calculateWorkbackTimes(deadline, taskData.estimatedTime);
          
          // Round the main task's estimated time
          taskData.estimatedTime = roundToNearest5Minutes(taskData.estimatedTime);
          
          // Update workback items with calculated times and rounded estimates, maintaining order
          taskData.workback = workbackTimes.map((item, index) => ({
            ...taskData.workback![index], // Keep the original title and other properties
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
          estimatedTime: roundToNearest5Minutes(taskData.estimatedTime || 30) // Default to 30 minutes if not provided
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

  // Get time estimation for a task
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