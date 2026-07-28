const Task = require('../models/Task');
const Project = require('../models/Project');
const Notification = require('../models/Notification');

// @desc    Create task
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res) => {
  try {
    let { title, description, assignedTo, projectId, priority, dueDate, status } = req.body;
    
    if (priority) priority = priority.toLowerCase();
    if (status) status = status.toLowerCase().replace(' ', '-');

    if (!title || !projectId) {
      return res.status(400).json({ success: false, message: 'Title and projectId are required' });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const task = await Task.create({
      title, description, assignedTo, projectId,
      status: status || 'todo',
      priority: priority || 'medium',
      dueDate,
      createdBy: req.user._id,
    });

    await task.populate('assignedTo createdBy', 'name email');
    
    // Broadcast notification to all project members
    try {
      const membersToNotify = project.members.filter(m => m.toString() !== req.user._id.toString());
      const io = req.app.get('io');
      
      const notifications = membersToNotify.map(m => ({
        recipient: m,
        type: 'task',
        title: 'New Task Created',
        body: `A new task '${task.title}' was added to project '${project.title}' by ${req.user.name}.`,
        tag: `Project: ${project.title}`,
        relatedId: task._id
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
        if (io) {
          membersToNotify.forEach(m => io.to(m.toString()).emit('new_notification', {
            title: 'New Task Created',
            body: `A new task '${task.title}' was added to project '${project.title}' by ${req.user.name}.`,
            type: 'task'
          }));
        }
      }
    } catch (notifErr) {
      console.error('Failed to broadcast task creation', notifErr);
    }

    res.status(201).json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get tasks (optionally by project)
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res) => {
  try {
    const { projectId, status, priority, assignedTo } = req.query;
    const query = {};

    if (projectId) query.projectId = projectId;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('projectId', 'title')
      .sort({ createdAt: -1 });

    res.json({ success: true, tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single task (with comments populated)
// @route   GET /api/tasks/:id
// @access  Private
const getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('projectId', 'title')
      .populate('comments.author', 'name email');

    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const oldStatus = task.status;
    let { title, description, assignedTo, status, priority, dueDate } = req.body;
    if (status) status = status.toLowerCase().replace(' ', '-');
    if (priority) priority = priority.toLowerCase();
    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (assignedTo !== undefined) task.assignedTo = assignedTo;
    if (status) task.status = status;
    if (priority) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate;

    await task.save();
    await task.populate('assignedTo createdBy', 'name email');
    await task.populate('projectId', 'title members');

    // Broadcast notification to all project members on update
    try {
      const project = task.projectId;
      const membersToNotify = (project.members || []).filter(m => m.toString() !== req.user._id.toString());
      const io = req.app.get('io');

      const notifications = membersToNotify.map(m => ({
        recipient: m,
        type: 'task',
        title: 'Task Updated',
        body: `Task '${task.title}' was updated by ${req.user.name}.`,
        tag: `Project: ${project.title || 'General'}`,
        relatedId: task._id
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
        if (io) {
          membersToNotify.forEach(m => io.to(m.toString()).emit('new_notification', {
            title: 'Task Updated',
            body: `Task '${task.title}' was updated by ${req.user.name}.`,
            type: 'task'
          }));
        }
      }
    } catch (notifErr) {
      console.error('Failed to broadcast task update', notifErr);
    }

    res.json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('projectId', 'title members');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const isCreator = task.createdBy.toString() === req.user._id.toString();
    if (!isCreator && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this task' });
    }

    const project = task.projectId;
    await task.deleteOne();

    // Broadcast deletion to all project members
    try {
      if (project && project.members) {
        const membersToNotify = project.members.filter(m => m.toString() !== req.user._id.toString());
        const io = req.app.get('io');

        const notifications = membersToNotify.map(m => ({
          recipient: m,
          type: 'task',
          title: 'Task Deleted',
          body: `Task '${task.title}' was deleted by ${req.user.name}.`,
          tag: `Project: ${project.title}`
        }));

        if (notifications.length > 0) {
          await Notification.insertMany(notifications);
          if (io) {
            membersToNotify.forEach(m => io.to(m.toString()).emit('new_notification', {
              title: 'Task Deleted',
              body: `Task '${task.title}' was deleted by ${req.user.name}.`,
              type: 'task'
            }));
          }
        }
      }
    } catch (notifErr) {
      console.error('Failed to broadcast task deletion', notifErr);
    }

    res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add comment to task
// @route   POST /api/tasks/:id/comments
// @access  Private
const addComment = async (req, res) => {
  try {
    const { body } = req.body;
    if (!body || !body.trim()) {
      return res.status(400).json({ success: false, message: 'Comment body is required' });
    }

    const task = await Task.findById(req.params.id).populate('projectId', 'title members');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const comment = { author: req.user._id, body: body.trim() };
    task.comments.push(comment);
    await task.save();

    // Populate the new comment's author
    await task.populate('comments.author', 'name email');
    const newComment = task.comments[task.comments.length - 1];

    // Emit real-time comment to project members
    try {
      const io = req.app.get('io');
      const project = task.projectId;
      if (io && project) {
        const membersToNotify = (project.members || []).filter(
          m => m.toString() !== req.user._id.toString()
        );
        io.emit(`task_comment_${task._id}`, newComment);

        // Notify assignee if different from commenter
        if (task.assignedTo && task.assignedTo.toString() !== req.user._id.toString()) {
          const notif = await Notification.create({
            recipient: task.assignedTo,
            type: 'mention',
            title: 'New comment on your task',
            body: `${req.user.name} commented on '${task.title}': "${body.slice(0, 80)}${body.length > 80 ? '…' : ''}"`,
            tag: `Task: ${task.title}`,
            relatedId: task._id,
          });
          io.to(task.assignedTo.toString()).emit('new_notification', {
            title: notif.title,
            body: notif.body,
            type: 'mention',
          });
        }
      }
    } catch (emitErr) {
      console.error('Failed to emit comment', emitErr);
    }

    res.status(201).json({ success: true, comment: newComment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete comment from task
// @route   DELETE /api/tasks/:id/comments/:commentId
// @access  Private
const deleteComment = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const comment = task.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });

    const isAuthor = comment.author.toString() === req.user._id.toString();
    if (!isAuthor && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this comment' });
    }

    comment.deleteOne();
    await task.save();

    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createTask, getTasks, getTask, updateTask, deleteTask, addComment, deleteComment };
