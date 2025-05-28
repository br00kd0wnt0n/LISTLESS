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
    workback?: Array<{ title: string; scheduledEnd: string; }>;
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

// Add this helper function after the getOpenAIClient function
function getRelativeDate(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(23, 59, 59, 999); // Set to end of day
  return date.toISOString();
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

      // Create prompt for OpenAI with current date context
      const currentDate = new Date().toISOString();
      const prompt = `
Extract task information from this natural language input: "${input}"

Current date and time: ${currentDate}

Please respond with a JSON object containing a "tasks" array (and an optional "clarifications" array). For each task, if a deadline (or due date) is mentioned (or can be inferred), include a "scheduledEnd" field (in ISO 8601 format). If a workback plan is needed (e.g. "finish project by Friday" → break down subtasks with deadlines), include a "workback" array (each subtask with a "title" and "scheduledEnd").

Important date handling rules:
1. Use relative dates based on the current date (${currentDate})
2. For "today", use end of current day
3. For "tomorrow", use end of next day
4. For "this week", use end of current week (Sunday)
5. For "next week", use end of next week
6. For "this month", use end of current month
7. For "next month", use end of next month
8. For specific days (e.g., "Friday"), use the next occurrence of that day
9. For "end of month/quarter/year", use the actual end date
10. For workback deadlines (e.g., "must be done by Thursday 6pm"), create a workback item with that deadline
11. The main task's scheduledEnd should be the final deadline (e.g., the reservation time)
12. Workback items should have earlier deadlines than the main task
13. Always include specific times (e.g., "6pm") in the scheduledEnd when mentioned
14. For reservations or time-sensitive tasks:
    - The main task's scheduledEnd should be the actual event time (e.g., dinner at 8pm)
    - The workback deadline should be the latest time to complete the action (e.g., make reservation by 6pm)
    - Workback deadlines must be BEFORE the main task deadline
15. All times should be in the local timezone (America/New_York)
16. When a specific time is mentioned (e.g., "8pm"), use that exact time
17. For reservation tasks:
    - The main task deadline is when the reservation is for (e.g., Friday 8pm)
    - The workback deadline is when the reservation must be made by (e.g., Thursday 6pm)
    - The workback title should clearly indicate it's about making the reservation

Example for a reservation task:
Input: "Make a dinner reservation at LUPO. Reservation for 7 people on Friday at 8pm. Reservation must be made by 6pm on Thursday"
Response:
{
  "tasks": [
    {
      "title": "Dinner reservation at LUPO for 7 people",
      "description": "Reservation for 7 people on Friday at 8pm",
      "category": "personal",
      "priority": "high",
      "estimatedTime": 15,
      "tags": ["dining", "reservation"],
      "scheduledEnd": "2024-03-22T20:00:00-04:00", // Friday 8pm ET
      "workback": [
        {
          "title": "Make reservation at LUPO by deadline",
          "scheduledEnd": "2024-03-21T18:00:00-04:00" // Thursday 6pm ET
        }
      ]
    }
  ]
}

Focus on extracting actionable tasks. If the input mentions time estimates, use them; otherwise, make reasonable estimates based on typical task complexity.
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

      // Instead of creating tasks, just return the processed tasks
      const processedTasks = parsedResponse.tasks.map(taskData => ({
        ...taskData,
        createdBy: userId,
        originalInput: input,
        aiProcessed: true,
        status: 'todo',
        scheduledEnd: taskData.scheduledEnd,
        workback: taskData.workback
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