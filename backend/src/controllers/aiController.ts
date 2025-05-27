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

      // Create prompt for OpenAI
      const prompt = `
Extract task information from this natural language input: "${input}"

Please respond with a JSON object containing a "tasks" array (and an optional "clarifications" array). For example:
{
  "tasks": [
    {
      "title": "clear, actionable task title",
      "description": "optional detailed description",
      "category": "work|household|personal|family|health|finance|maintenance|social",
      "priority": "low|medium|high|urgent",
      "estimatedTime": 30,
      "tags": ["optional", "tags"]
    }
  ],
  "clarifications": ["any questions if input is unclear"]
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

      // Create tasks in database
      const createdTasks: ITask[] = [];
      if (parsedResponse.tasks && Array.isArray(parsedResponse.tasks)) {
        for (const taskData of parsedResponse.tasks) {
          const task = new TaskModel({
            ...taskData,
            createdBy: userId,
            originalInput: input,
            aiProcessed: true,
            status: 'todo'
          });

          await task.save();
          createdTasks.push(task);
        }
      }

      res.json({
        success: true,
        data: {
          tasks: createdTasks,
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