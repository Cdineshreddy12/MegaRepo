import express from 'express';
const router = express.Router();
import taskController from '../../controllers/taskController.js';
import auth from '../../middleware/auth.js';
const { createTask, getTasks, getTask, updateTask, deleteTask } = taskController;

router.post('/', auth, createTask);
router.get('/', auth, getTasks);
router.get('/:id', auth, getTask);
router.put('/:id', auth, updateTask);
router.delete('/:id', auth, deleteTask);

export default router;