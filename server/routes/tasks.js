const express = require('express');
const router = express.Router();
const {
  createTask, getTasks, getTask, updateTask, deleteTask,
  addComment, deleteComment,
  addAttachment, deleteAttachment,
} = require('../controllers/taskController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').post(createTask).get(getTasks);
router.route('/:id').get(getTask).put(updateTask).delete(deleteTask);

// Comment routes
router.post('/:id/comments', addComment);
router.delete('/:id/comments/:commentId', deleteComment);

// Attachment routes
router.post('/:id/attachments', addAttachment);
router.delete('/:id/attachments/:attachmentId', deleteAttachment);

module.exports = router;
