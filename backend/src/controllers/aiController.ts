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
export function roundToNearest5Minutes(minutes: number): number {
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

// Add this helper function after getOpenAIClient
function createFallbackTask(input: string, userId: string) {
  // Create a basic task without AI processing
  const task: {
    title: string;
    description: string;
    category: string;
    priority: string;
    estimatedTime: number;
    status: string;
    createdBy: string;
    aiProcessed: boolean;
    workback: Array<{
      title: string;
      scheduledEnd: string;
      estimatedTime: number;
    }>;
    lifeDomain?: 'purple' | 'blue' | 'yellow' | 'green' | 'orange' | 'red';
  } = {
    title: input,
    description: `Task created from: "${input}"`,
    category: 'other',
    priority: 'medium',
    estimatedTime: 30,
    status: 'todo',
    createdBy: userId,
    aiProcessed: false,
    workback: [
      {
        title: 'Step 1: Initial planning',
        scheduledEnd: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        estimatedTime: 15
      },
      {
        title: 'Step 2: Execution',
        scheduledEnd: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
        estimatedTime: 15
      }
    ]
  };

  // Assign domain based on category
  task.lifeDomain = (() => {
    const category = task.category.toLowerCase();
    if (category === 'work') return 'purple';
    if (category === 'personal' || category === 'learning') return 'blue';
    if (category === 'family' || category === 'social') return 'yellow';
    if (category === 'health') return 'green';
    if (category === 'household' || category === 'maintenance' || category === 'finance') return 'orange';
    return 'orange'; // Default to life maintenance for unknown categories
  })();

  return task;
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

      let client: OpenAI;
      try {
        client = getOpenAIClient();
      } catch (error) {
        console.error('Failed to initialize OpenAI client:', error);
        // Create a fallback task without AI processing
        const fallbackTask = createFallbackTask(input, userId);
        return res.json({
          success: true,
          data: {
            tasks: [fallbackTask],
            clarifications: ['AI processing unavailable. Created basic task instead.'],
            originalInput: input
          },
          meta: {
            timestamp: new Date().toISOString(),
            aiModel: 'fallback'
          }
        });
      }

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
   - For tasks without deadlines, still provide realistic time estimates to help with planning

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

4. For tasks WITHOUT deadlines:
   - DO NOT set a scheduledEnd date
   - Instead, include a "suggestedStartBy" field (ISO 8601) based on:
     * Task priority and importance
     * Current workload and context
     * Task dependencies or prerequisites
     * Natural task urgency (e.g., health tasks should be scheduled sooner)
   - Include a "planningGuidance" field with healthy planning recommendations:
     * Break down large tasks into smaller, manageable steps
     * Suggest optimal times of day based on task type and energy requirements
     * Recommend buffer time between tasks
     * Consider task dependencies and prerequisites
     * Suggest realistic daily/weekly task limits
   - Set priority based on:
     * Task importance and impact
     * Natural urgency (health, safety, etc.)
     * Dependencies on other tasks
     * Current workload and context

5. For time-sensitive tasks, include a "startBy" field (ISO 8601) calculated as: scheduledEnd - estimatedTime

6. Include a "startByAlert" field with a friendly message:
   - For tasks with deadlines: "⏰ Start by [time] to finish on time!"
   - For tasks without deadlines: "💡 Consider starting by [suggested time] for optimal planning"

7. For workback schedules:
   - ALWAYS include a "workback" array for tasks that:
     * Have a deadline more than 24 hours away
     * Require multiple steps or preparation
     * Depend on other tasks or resources
     * Are time-sensitive (like reservations, appointments, etc.)
     * Are large or complex, even without deadlines
   - Each workback item MUST have:
     * A descriptive title
     * A scheduledEnd time in ISO 8601 format (e.g., "2024-03-20T15:00:00.000-04:00")
     * An estimatedTime in minutes (rounded to nearest 5 minutes)
     * A clear sequence (e.g., "Step 1: Research", "Step 2: Draft", etc.)
   - For tasks WITH deadlines:
     * Each workback item's scheduledEnd MUST be before the main task deadline
     * Space items evenly between now and the deadline
     * Include buffer time between steps
   - For tasks WITHOUT deadlines:
     * Use actual dates starting from tomorrow
     * Space items evenly over a reasonable timeframe (e.g., 1 week)
     * Each workback item MUST have a valid ISO 8601 date
     * Example for a task without deadline:
       {
         "workback": [
           {
             "title": "Step 1: Initial planning",
             "scheduledEnd": "${getRelativeDate(1, 10, 0)}", // Tomorrow at 10 AM
             "estimatedTime": 30
           },
           {
             "title": "Step 2: Research",
             "scheduledEnd": "${getRelativeDate(2, 14, 0)}", // Day after tomorrow at 2 PM
             "estimatedTime": 45
           }
         ]
       }

8. For emotional intelligence analysis, ALWAYS include an "emotionalProfile" object with:
   - "stressLevel": Assess the potential stress level of the task:
     * "low" for routine, simple tasks
     * "medium" for moderately challenging tasks
     * "high" for complex or time-sensitive tasks
     * "overwhelming" for tasks that might cause significant stress
   - "emotionalImpact": Evaluate how the task might affect emotions:
     * "positive" for tasks that bring joy or satisfaction
     * "neutral" for routine tasks
     * "negative" for tasks that might cause anxiety or stress
   - "energyLevel": Estimate the energy required:
     * "low" for simple, quick tasks
     * "medium" for standard tasks
     * "high" for demanding tasks
   - "motivationLevel": Assess the likely motivation level:
     * "low" for tasks that might be procrastinated
     * "medium" for standard tasks
     * "high" for engaging or rewarding tasks
   - "emotionalTriggers": Optional array of potential emotional triggers
   - "copingStrategies": Optional array of suggested coping strategies
   - For tasks without deadlines:
     * Consider the impact of open-ended nature on stress
     * Include strategies for maintaining motivation
     * Suggest ways to break down the task to reduce overwhelm
     * Recommend regular progress check-ins

9. For life domain color, assign ONE of these colors based on the task's primary life area:
   - "purple" for work and career (e.g., client presentations, work projects, professional development, work meetings)
   - "blue" for personal growth and learning (e.g., studying, skill development, personal projects, self-improvement)
   - "yellow" for people and relationships (e.g., family events, social gatherings, relationship maintenance, dinner reservations, social activities)
   - "green" for health and wellness (e.g., medical appointments, exercise, self-care, mental health)
   - "orange" for life maintenance (e.g., cleaning, chores, administrative tasks, household management, errands)
   - "red" ONLY for truly urgent or critical tasks (e.g., emergencies, immediate deadlines, critical issues)

CRITICAL DOMAIN MAPPING RULES:
1. ALL social activities (dinner reservations, gatherings, etc.) MUST be "yellow"
2. ALL cleaning, chores, and household tasks MUST be "orange"
3. ALL work-related tasks MUST be "purple"
4. ALL family and relationship activities MUST be "yellow"
5. ALL personal growth and learning activities MUST be "blue"
6. ALL health and wellness activities MUST be "green"
7. ONLY use "red" for truly urgent or critical tasks

Example domain assignments:
- "Make dinner reservation" -> "yellow" (social/relationship activity)
- "Clean the house" -> "orange" (life maintenance)
- "Study for exam" -> "blue" (personal growth)
- "Family game night" -> "yellow" (relationship activity)
- "Work presentation" -> "purple" (work)
- "Doctor appointment" -> "green" (health)
- "Emergency car repair" -> "red" (urgent)

Important rules:
1. All times must be in America/New_York timezone (-04:00)
2. For relative dates:
   - "tonight" or "today" with a specific time:
     * If the time has passed today in NY timezone, use tomorrow at that time
     * If the time hasn't passed today in NY timezone, use today at that time
   - "tomorrow" means TOMORROW (next day) with the specified time in NY timezone
   - If no specific time is mentioned, use end of day (11:59 PM) in NY timezone
   - CRITICAL: Always use the current year (${currentYear})
3. Always estimate task duration in minutes, rounded to nearest 5 minutes
4. For time-sensitive tasks:
   - Calculate startBy = scheduledEnd - estimatedTime
   - Include a friendly startByAlert with emoji
   - For reservations, use the reservation deadline (not event time) as the main deadline
5. For tasks without deadlines:
   - Focus on healthy planning principles
   - Suggest realistic timeframes based on task complexity
   - Include guidance for breaking down large tasks
   - Consider energy levels and task dependencies
   - Recommend buffer time between tasks
6. For emotional analysis:
   - Consider the task's complexity, deadline (or lack thereof), and personal impact
   - Assess potential stress and emotional impact realistically
   - Provide specific coping strategies for high-stress tasks
   - Choose the most relevant life domain color
   - For tasks without deadlines, include strategies for maintaining motivation

Example response for a task without deadline:
{
  "tasks": [
    {
      "title": "Prepare quarterly client presentation",
      "description": "Create and practice presentation for the quarterly review meeting",
      "category": "work",
      "priority": "high",
      "estimatedTime": 180,
      "emotionalProfile": {
        "stressLevel": "high",
        "emotionalImpact": "neutral",
        "energyLevel": "high",
        "motivationLevel": "medium",
        "emotionalTriggers": ["public speaking anxiety", "time pressure"],
        "copingStrategies": [
          "break into smaller tasks",
          "practice breathing exercises",
          "review key points"
        ]
      },
      "lifeDomain": "purple",  // Work tasks are now purple
      "workback": [
        {
          "title": "Step 1: Research and outline",
          "scheduledEnd": "${getRelativeDate(1, 10, 0)}",
          "estimatedTime": 60
        },
        {
          "title": "Step 2: Create slides",
          "scheduledEnd": "${getRelativeDate(2, 14, 0)}",
          "estimatedTime": 90
        },
        {
          "title": "Step 3: Practice presentation",
          "scheduledEnd": "${getRelativeDate(3, 15, 0)}",
          "estimatedTime": 30
        }
      ]
    }
  ]
}

Focus on extracting actionable tasks with realistic time estimates, appropriate workback schedules, and thoughtful emotional intelligence analysis. Consider both the practical and emotional aspects of each task, whether it has a deadline or not.
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

      // Update the task processing section
      const processedTasks = parsedResponse.tasks.map(taskData => {
        if (taskData.workback && taskData.workback.length > 0) {
          // For tasks with deadlines, use calculateWorkbackTimes
          if (taskData.scheduledEnd && taskData.estimatedTime) {
            const deadline = new Date(taskData.scheduledEnd);
            const workbackTimes = calculateWorkbackTimes(deadline, taskData.estimatedTime);
            
            taskData.estimatedTime = roundToNearest5Minutes(taskData.estimatedTime);
            
            taskData.workback = workbackTimes.map((item, index) => ({
              ...taskData.workback![index],
              scheduledEnd: item.scheduledEnd.toISOString(),
              estimatedTime: roundToNearest5Minutes(item.estimatedTime)
            }));
          } else {
            // For tasks without deadlines, ensure each workback item has a valid ISO date
            const now = getReferenceDate();
            const defaultSpacing = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
            
            taskData.workback = taskData.workback.map((item, index) => {
              // If the scheduledEnd is not a valid ISO date, calculate one
              let scheduledEnd: Date;
              try {
                scheduledEnd = new Date(item.scheduledEnd);
                if (isNaN(scheduledEnd.getTime())) {
                  throw new Error('Invalid date');
                }
              } catch {
                // Calculate a date based on index
                scheduledEnd = new Date(now.getTime() + (defaultSpacing * (index + 1)));
                // Set to 10 AM by default
                scheduledEnd.setHours(10, 0, 0, 0);
              }
              
              return {
                ...item,
                scheduledEnd: scheduledEnd.toISOString(),
                estimatedTime: roundToNearest5Minutes(item.estimatedTime || 30)
              };
            });
          }
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
          estimatedTime: roundToNearest5Minutes(taskData.estimatedTime || 30),
          emotionalProfile: taskData.emotionalProfile ? {
            stressLevel: taskData.emotionalProfile.stressLevel,
            emotionalImpact: taskData.emotionalProfile.emotionalImpact,
            energyLevel: taskData.emotionalProfile.energyLevel,
            motivationLevel: taskData.emotionalProfile.motivationLevel,
            emotionalTriggers: taskData.emotionalProfile.emotionalTriggers || [],
            copingStrategies: taskData.emotionalProfile.copingStrategies || []
          } : undefined,
          lifeDomain: taskData.lifeDomain
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
      
      // If it's a connection error, create a fallback task
      if (error instanceof Error && 
          (error.message.includes('Connection error') || 
           error.message.includes('ENOTFOUND') ||
           error.message.includes('getaddrinfo'))) {
        const fallbackTask = createFallbackTask(req.body.input, req.query.userId as string);
        return res.json({
          success: true,
          data: {
            tasks: [fallbackTask],
            clarifications: ['AI processing unavailable due to connection issues. Created basic task instead.'],
            originalInput: req.body.input
          },
          meta: {
            timestamp: new Date().toISOString(),
            aiModel: 'fallback'
          }
        });
      }

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