// ===== backend/src/routes/api.ts =====
import express, { RequestHandler } from 'express';
import { body, param } from 'express-validator';
import { TaskController } from '../controllers/main';

const router = express.Router();
const taskController = new TaskController();

// Validation middleware
const taskValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title is required and must be less than 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  body('category')
    .isIn(['work', 'household', 'personal', 'family', 'health', 'finance', 'maintenance', 'social', 'other'])
    .withMessage('Invalid category'),
  body('priority')
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority'),
  body('estimatedTime')
    .isInt({ min: 1 })
    .withMessage('Estimated time must be a positive number'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters')
];

const updateTaskValidation = [
  param('taskId')
    .isMongoId()
    .withMessage('Invalid task ID'),
  ...taskValidation.map(validation => validation.optional())
];

const completeTaskValidation = [
  param('taskId')
    .isMongoId()
    .withMessage('Invalid task ID'),
  body('actualTime')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Actual time must be a positive number')
];

const taskInputValidation = [
  body('input')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Input is required and must be less than 1000 characters'),
  body('userId')
    .trim()
    .isLength({ min: 1 })
    .withMessage('User ID is required')
];

const timeEstimationValidation = [
  body('taskTitle')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Task title is required')
];

// Route parameter validation
const taskIdParam = param('taskId')
  .isMongoId()
  .withMessage('Invalid task ID');

// Task Routes
/**
 * @route GET /api/tasks
 * @desc Get all tasks for a user
 * @access Private
 */
router.get('/tasks', taskController.getTasks as RequestHandler);

/**
 * @route POST /api/tasks
 * @desc Create a new task
 * @access Private
 */
router.post('/tasks', taskValidation, taskController.createTask as RequestHandler);

/**
 * @route PUT /api/tasks/:taskId
 * @desc Update a task
 * @access Private
 */
router.put('/tasks/:taskId', taskIdParam, updateTaskValidation, taskController.updateTask as RequestHandler);

/**
 * @route DELETE /api/tasks/:taskId
 * @desc Delete a task
 * @access Private
 */
router.delete('/tasks/:taskId', taskIdParam, taskController.deleteTask as RequestHandler);

/**
 * @route PATCH /api/tasks/:taskId/complete
 * @desc Mark a task as completed
 * @access Private
 */
router.patch('/tasks/:taskId/complete', taskIdParam, completeTaskValidation, taskController.completeTask as RequestHandler);

// AI Routes
/**
 * @route POST /api/ai/process-task
 * @desc Process natural language input into tasks
 * @access Private
 */
router.post('/ai/process-task', taskInputValidation, taskController.processTaskInput as RequestHandler);

/**
 * @route POST /api/ai/estimate-time
 * @desc Estimate time for a task
 * @access Private
 */
router.post('/ai/estimate-time', timeEstimationValidation, taskController.estimateTime as RequestHandler);

export default router; 