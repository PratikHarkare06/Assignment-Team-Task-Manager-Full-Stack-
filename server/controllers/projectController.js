const Project = require('../models/Project');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Create project
// @route   POST /api/projects
// @access  Private
const createProject = async (req, res) => {
  try {
    const { title, description, dueDate } = req.body;

    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });

    const project = await Project.create({
      title,
      description,
      dueDate,
      createdBy: req.user._id,
      members: [req.user._id],
      admins: [req.user._id],
    });

    await project.populate('createdBy', 'name email');

    // Notify ALL users in the system that a new project was created
    try {
      const users = await User.find({ _id: { $ne: req.user._id } }).select('_id');
      const io = req.app.get('io');
      
      const notifications = users.map(u => ({
        recipient: u._id,
        type: 'system',
        title: 'New Project Created',
        body: `A new project '${project.title}' was created by ${req.user.name}.`,
        relatedEntity: project._id,
        relatedModel: 'Project'
      }));
      
      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
        if (io) {
          users.forEach(u => io.to(u._id.toString()).emit('new_notification', {
            title: 'New Project Created',
            body: `A new project '${project.title}' was created by ${req.user.name}.`,
            type: 'system'
          }));
        }
      }
    } catch (notifErr) {
      console.error('Failed to broadcast project creation', notifErr);
    }

    res.status(201).json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all projects for current user
// @route   GET /api/projects
// @access  Private
const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [{ createdBy: req.user._id }, { members: req.user._id }],
    })
      .populate('createdBy', 'name email')
      .populate('members', 'name email role')
      .sort({ createdAt: -1 });

    const projectsWithProgress = await Promise.all(
      projects.map(async (p) => {
        const tasks = await Task.find({ projectId: p._id });
        const total = tasks.length;
        const completed = tasks.filter(t => t.status === 'completed').length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        return {
          ...p.toObject(),
          progress,
          totalTasks: total,
          completedTasks: completed,
        };
      })
    );

    res.json({ success: true, projects: projectsWithProgress });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
const getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('members', 'name email role')
      .populate('admins', 'name email');

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const isMember = project.members.some((m) => m._id.toString() === req.user._id.toString());
    if (!isMember && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to view this project' });
    }

    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const isAdmin = project.admins.some((a) => a.toString() === req.user._id.toString());
    if (!isAdmin && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can update this project' });
    }

    const { title, description, status, dueDate } = req.body;
    if (title) project.title = title;
    if (description !== undefined) project.description = description;
    if (status) project.status = status;
    if (dueDate !== undefined) project.dueDate = dueDate;

    await project.save();
    await project.populate('createdBy members admins', 'name email role');

    // Notify all members about project update
    try {
      const membersToNotify = project.members.filter(m => m._id.toString() !== req.user._id.toString());
      const io = req.app.get('io');
      
      const notifications = membersToNotify.map(m => ({
        recipient: m._id,
        type: 'system',
        title: 'Project Updated',
        body: `Project '${project.title}' was updated by ${req.user.name}.`,
        relatedEntity: project._id,
        relatedModel: 'Project'
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
        if (io) {
          membersToNotify.forEach(m => io.to(m._id.toString()).emit('new_notification', {
            title: 'Project Updated',
            body: `Project '${project.title}' was updated by ${req.user.name}.`,
            type: 'system'
          }));
        }
      }
    } catch (notifErr) {
      console.error('Failed to broadcast project update', notifErr);
    }

    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const isCreator = project.createdBy.toString() === req.user._id.toString();
    if (!isCreator && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the project creator can delete it' });
    }

    await Task.deleteMany({ projectId: project._id });
    await project.deleteOne();

    // Notify all members about project deletion
    try {
      const membersToNotify = project.members.filter(m => m.toString() !== req.user._id.toString());
      const io = req.app.get('io');
      
      const notifications = membersToNotify.map(m => ({
        recipient: m,
        type: 'system',
        title: 'Project Deleted',
        body: `Project '${project.title}' was deleted by ${req.user.name}.`
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
        if (io) {
          membersToNotify.forEach(m => io.to(m.toString()).emit('new_notification', {
            title: 'Project Deleted',
            body: `Project '${project.title}' was deleted by ${req.user.name}.`,
            type: 'system'
          }));
        }
      }
    } catch (notifErr) {
      console.error('Failed to broadcast project deletion', notifErr);
    }

    res.json({ success: true, message: 'Project and its tasks deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add member to project
// @route   POST /api/projects/:id/members
// @access  Private
const addMember = async (req, res) => {
  try {
    const { userId } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const isAdmin = project.admins.some((a) => a.toString() === req.user._id.toString());
    if (!isAdmin && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can add members' });
    }

    if (project.members.includes(userId)) {
      return res.status(400).json({ success: false, message: 'User is already a member' });
    }

    project.members.push(userId);
    await project.save();
    await project.populate('members', 'name email role');

    // Create Notification for the added user
    try {
      const io = req.app.get('io');
      const notification = await Notification.create({
        recipient: userId,
        type: 'system',
        title: 'Added to Project',
        body: `You were added to the project '${project.title}' by ${req.user.name || 'an admin'}.`,
        relatedEntity: project._id,
        relatedModel: 'Project'
      });
      if (io) {
        io.to(userId.toString()).emit('new_notification', notification);
      }
    } catch (notifErr) {
      console.error('Failed to send project invite notification', notifErr);
    }

    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove member from project
// @route   DELETE /api/projects/:id/members/:userId
// @access  Private
const removeMember = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    const isAdmin = project.admins.some((a) => a.toString() === req.user._id.toString());
    if (!isAdmin && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only admins can remove members' });
    }

    project.members = project.members.filter((m) => m.toString() !== req.params.userId);
    project.admins = project.admins.filter((a) => a.toString() !== req.params.userId);
    await project.save();

    // Notify removed user
    try {
      const io = req.app.get('io');
      const notification = await Notification.create({
        recipient: req.params.userId,
        type: 'system',
        title: 'Removed from Project',
        body: `You were removed from the project '${project.title}' by ${req.user.name || 'an admin'}.`,
        relatedEntity: project._id,
        relatedModel: 'Project'
      });
      if (io) io.to(req.params.userId).emit('new_notification', notification);
    } catch (notifErr) {
      console.error('Failed to send project removal notification', notifErr);
    }

    res.json({ success: true, message: 'Member removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createProject, getProjects, getProject, updateProject, deleteProject, addMember, removeMember };
