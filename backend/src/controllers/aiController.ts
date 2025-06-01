// ===== backend/src/controllers/aiController.ts =====
import { Request, Response } from 'express';
import OpenAI from 'openai';
import TaskModel, { ITask } from '../models/Task';
import { getOpenAIClient } from '../utils/openai';
import { getCurrentTimeInNY, getReferenceDate, getRelativeDate } from '../utils/dateUtils';
import { assignLifeDomain, isValidLifeDomain, calculateWorkbackTimes, WorkbackTime, roundToNearest5Minutes } from '../utils/taskUtils';

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

function createFallbackTask(input: string, userId: string) {
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
  task.lifeDomain = assignLifeDomain(task.category, task.priority);
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
        // Process workback items if they exist
        if (taskData.workback && Array.isArray(taskData.workback)) {
          const now = getReferenceDate();
          const nyNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
          
          // For tasks with deadlines, use the deadline to space workback items
          if (taskData.scheduledEnd) {
            const deadline = new Date(taskData.scheduledEnd);
            const deadlineNY = new Date(deadline.toLocaleString('en-US', { timeZone: 'America/New_York' }));
            const totalDuration = deadlineNY.getTime() - nyNow.getTime();
            
            // Calculate spacing between items, ensuring at least 15 minutes between steps
            const minSpacing = 15 * 60 * 1000; // 15 minutes in milliseconds
            const spacing = Math.max(minSpacing, Math.floor(totalDuration / (taskData.workback.length + 1)));
            
            taskData.workback = taskData.workback.map((item, index) => {
              const itemEndTime = new Date(nyNow.getTime() + (spacing * (index + 1)));
              // Ensure the item ends before the deadline
              if (itemEndTime > deadlineNY) {
                itemEndTime.setTime(deadlineNY.getTime() - minSpacing);
              }
              return {
                ...item,
                scheduledEnd: itemEndTime.toISOString(),
                estimatedTime: roundToNearest5Minutes(item.estimatedTime || 30)
              };
            });
          } else {
            // For tasks without deadlines, space items over a week
            const weekInMs = 7 * 24 * 60 * 60 * 1000;
            const spacing = Math.floor(weekInMs / (taskData.workback.length + 1));
            const startDate = new Date(nyNow);
            startDate.setDate(startDate.getDate() + 1);
            startDate.setHours(10, 0, 0, 0); // Start at 10 AM next day
            
            taskData.workback = taskData.workback.map((item, index) => {
              const itemEndTime = new Date(startDate.getTime() + (spacing * (index + 1)));
              return {
                ...item,
                scheduledEnd: itemEndTime.toISOString(),
                estimatedTime: roundToNearest5Minutes(item.estimatedTime || 30)
              };
            });
          }
        }
        
        // Assign life domain using utility function
        const lifeDomain = assignLifeDomain(
          taskData.category,
          taskData.priority,
          taskData.lifeDomain
        );
        
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
          lifeDomain
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