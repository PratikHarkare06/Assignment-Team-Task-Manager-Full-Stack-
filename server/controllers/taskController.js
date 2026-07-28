const Task = require('../models/Task');
const Project = require('../models/Project');
const Notification = require('../models/Notification');

// ── Helper: push activity log entry ──────────────────────────────────────────
async function logActivity(task, actor, action, field = '', from = '', to = '') {
  task.activityLog.push({ actor, action, field, from, to });
}

// @desc    Create task
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res) => {
  try {
    let { title, description, assignedTo, projectId, priority, dueDate, status, estimatedHours, loggedHours } = req.body;
    if (priority) priority = priority.toLowerCase();
    if (status)   status   = status.toLowerCase().replace(' ', '-');

    if (!title || !projectId) {
      return res.status(400).json({ success: false, message: 'Title and projectId are required' });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const task = await Task.create({
      title, description, assignedTo, projectId,
      status:   status   || 'todo',
      priority: priority || 'medium',
      dueDate,
      estimatedHours: Number(estimatedHours) || 0,
      loggedHours:    Number(loggedHours) || 0,
      createdBy: req.user._id,
      activityLog: [{ actor: req.user._id, action: 'created this task', field: '', from: '', to: '' }],
    });

    await task.populate('assignedTo createdBy', 'name email');

    // Broadcast notification to all project members
    try {
      const membersToNotify = project.members.filter(m => m.toString() !== req.user._id.toString());
      const io = req.app.get('io');
      const notifications = membersToNotify.map(m => ({
        recipient: m, type: 'task',
        title: 'New Task Created',
        body: `A new task '${task.title}' was added to project '${project.title}' by ${req.user.name}.`,
        tag: `Project: ${project.title}`, relatedId: task._id,
      }));
      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
        if (io) membersToNotify.forEach(m => io.to(m.toString()).emit('new_notification', {
          title: 'New Task Created',
          body: `A new task '${task.title}' was added to project '${project.title}' by ${req.user.name}.`,
          type: 'task',
        }));
      }
    } catch (notifErr) { console.error('Notification error', notifErr); }

    res.status(201).json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get tasks (paginated, filterable)
// @route   GET /api/tasks?page=1&limit=20&projectId=...&status=...&priority=...
// @access  Private
const getTasks = async (req, res) => {
  try {
    const { projectId, status, priority, assignedTo } = req.query;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const query = {};
    if (projectId)  query.projectId  = projectId;
    if (status)     query.status     = status;
    if (priority)   query.priority   = priority;
    if (assignedTo) query.assignedTo = assignedTo;

    const [tasks, total] = await Promise.all([
      Task.find(query)
        .populate('assignedTo', 'name email')
        .populate('createdBy',  'name email')
        .populate('projectId',  'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Task.countDocuments(query),
    ]);

    res.json({
      success: true,
      tasks,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single task (with comments + attachments + activityLog populated)
// @route   GET /api/tasks/:id
// @access  Private
const getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo',        'name email')
      .populate('createdBy',         'name email')
      .populate('projectId',         'title')
      .populate('comments.author',   'name email')
      .populate('activityLog.actor', 'name email')
      .populate('attachments.uploadedBy', 'name email');

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

    let { title, description, assignedTo, status, priority, dueDate, estimatedHours, loggedHours } = req.body;
    if (status)   status   = status.toLowerCase().replace(' ', '-');
    if (priority) priority = priority.toLowerCase();

    // Track what changed for activity log
    if (title && title !== task.title) {
      logActivity(task, req.user._id, `renamed task`, 'title', task.title, title);
      task.title = title;
    }
    if (description !== undefined && description !== task.description) {
      logActivity(task, req.user._id, 'updated description', 'description', '', '');
      task.description = description;
    }
    if (status && status !== task.status) {
      logActivity(task, req.user._id, `changed status`, 'status', task.status, status);
      task.status = status;
    }
    if (priority && priority !== task.priority) {
      logActivity(task, req.user._id, `changed priority`, 'priority', task.priority, priority);
      task.priority = priority;
    }
    if (assignedTo !== undefined) {
      logActivity(task, req.user._id, `changed assignee`, 'assignedTo', String(task.assignedTo || '—'), String(assignedTo || '—'));
      task.assignedTo = assignedTo;
    }
    if (dueDate !== undefined) {
      logActivity(task, req.user._id, `changed due date`, 'dueDate', task.dueDate ? new Date(task.dueDate).toDateString() : '—', dueDate ? new Date(dueDate).toDateString() : '—');
      task.dueDate = dueDate;
    }
    if (estimatedHours !== undefined && Number(estimatedHours) !== task.estimatedHours) {
      logActivity(task, req.user._id, `updated estimated hours to ${estimatedHours}h`, 'estimatedHours', `${task.estimatedHours}h`, `${estimatedHours}h`);
      task.estimatedHours = Number(estimatedHours) || 0;
    }
    if (loggedHours !== undefined && Number(loggedHours) !== task.loggedHours) {
      logActivity(task, req.user._id, `logged ${Number(loggedHours) - task.loggedHours}h`, 'loggedHours', `${task.loggedHours}h`, `${loggedHours}h`);
      task.loggedHours = Number(loggedHours) || 0;
    }

    await task.save();
    await task.populate('assignedTo createdBy', 'name email');
    await task.populate('projectId', 'title members');

    // Broadcast notification
    try {
      const project = task.projectId;
      const membersToNotify = (project.members || []).filter(m => m.toString() !== req.user._id.toString());
      const io = req.app.get('io');
      const notifications = membersToNotify.map(m => ({
        recipient: m, type: 'task',
        title: 'Task Updated',
        body: `Task '${task.title}' was updated by ${req.user.name}.`,
        tag: `Project: ${project.title || 'General'}`, relatedId: task._id,
      }));
      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
        if (io) membersToNotify.forEach(m => io.to(m.toString()).emit('new_notification', {
          title: 'Task Updated',
          body: `Task '${task.title}' was updated by ${req.user.name}.`,
          type: 'task',
        }));
      }
    } catch (notifErr) { console.error('Notification error', notifErr); }

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

    try {
      if (project && project.members) {
        const membersToNotify = project.members.filter(m => m.toString() !== req.user._id.toString());
        const io = req.app.get('io');
        const notifications = membersToNotify.map(m => ({
          recipient: m, type: 'task',
          title: 'Task Deleted',
          body: `Task '${task.title}' was deleted by ${req.user.name}.`,
          tag: `Project: ${project.title}`,
        }));
        if (notifications.length > 0) {
          await Notification.insertMany(notifications);
          if (io) membersToNotify.forEach(m => io.to(m.toString()).emit('new_notification', {
            title: 'Task Deleted',
            body: `Task '${task.title}' was deleted by ${req.user.name}.`,
            type: 'task',
          }));
        }
      }
    } catch (notifErr) { console.error('Notification error', notifErr); }

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

    task.comments.push({ author: req.user._id, body: body.trim() });
    logActivity(task, req.user._id, 'added a comment', 'comments', '', '');
    await task.save();

    await task.populate('comments.author', 'name email');
    const newComment = task.comments[task.comments.length - 1];

    try {
      const io = req.app.get('io');
      const project = task.projectId;
      if (io) {
        io.emit(`task_comment_${task._id}`, newComment);
        if (task.assignedTo && task.assignedTo.toString() !== req.user._id.toString()) {
          const notif = await Notification.create({
            recipient: task.assignedTo, type: 'mention',
            title: 'New comment on your task',
            body: `${req.user.name} commented on '${task.title}': "${body.slice(0, 80)}${body.length > 80 ? '…' : ''}"`,
            tag: `Task: ${task.title}`, relatedId: task._id,
          });
          io.to(task.assignedTo.toString()).emit('new_notification', {
            title: notif.title, body: notif.body, type: 'mention',
          });
        }
      }
    } catch (emitErr) { console.error('Socket emit error', emitErr); }

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
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    comment.deleteOne();
    logActivity(task, req.user._id, 'deleted a comment', 'comments', '', '');
    await task.save();

    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add attachment to task (base64, max 2MB)
// @route   POST /api/tasks/:id/attachments
// @access  Private
const addAttachment = async (req, res) => {
  try {
    const { name, size, mimeType, data } = req.body;

    if (!name || !size || !mimeType || !data) {
      return res.status(400).json({ success: false, message: 'name, size, mimeType, and data are required' });
    }
    if (size > 2 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: 'File too large. Max 2MB.' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    task.attachments.push({ name, size, mimeType, data, uploadedBy: req.user._id });
    logActivity(task, req.user._id, `attached file "${name}"`, 'attachments', '', name);
    await task.save();

    await task.populate('attachments.uploadedBy', 'name email');
    const newAttachment = task.attachments[task.attachments.length - 1];

    // Don't include base64 data in response (it's large)
    const { data: _omit, ...attachmentMeta } = newAttachment.toObject();

    res.status(201).json({ success: true, attachment: { ...attachmentMeta, data } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete attachment from task
// @route   DELETE /api/tasks/:id/attachments/:attachmentId
// @access  Private
const deleteAttachment = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const attachment = task.attachments.id(req.params.attachmentId);
    if (!attachment) return res.status(404).json({ success: false, message: 'Attachment not found' });

    const isUploader = attachment.uploadedBy.toString() === req.user._id.toString();
    if (!isUploader && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const attachName = attachment.name;
    attachment.deleteOne();
    logActivity(task, req.user._id, `removed attachment "${attachName}"`, 'attachments', attachName, '');
    await task.save();

    res.json({ success: true, message: 'Attachment deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createTask, getTasks, getTask, updateTask, deleteTask,
  addComment, deleteComment,
  addAttachment, deleteAttachment,
};
