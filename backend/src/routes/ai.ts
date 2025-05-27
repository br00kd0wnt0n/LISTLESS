// ===== backend/src/routes/ai.ts =====
import express, { RequestHandler } from 'express';
import { body } from 'express-validator';
import { AIController } from '../controllers/aiController';

const router = express.Router();
const aiController = new AIController();

// Validation middleware
const taskInputValidation = [
  body('input').trim().isLength({ min: 1, max: 1000 }).withMessage('Input is required and must be less than 1000 characters'),
  body('userId').trim().isLength({ min: 1 }).withMessage('User ID is required')
];

const timeEstimationValidation = [
  body('taskTitle').trim().isLength({ min: 1 }).withMessage('Task title is required')
];

// Routes
router.post('/process-task', taskInputValidation, aiController.processTaskInput.bind(aiController));
router.post('/estimate-time', timeEstimationValidation, aiController.estimateTime.bind(aiController));

export default router;