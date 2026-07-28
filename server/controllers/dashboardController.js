const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
const getStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const projects = await Project.find({
      $or: [{ createdBy: userId }, { members: userId }],
    });

    const projectIds = projects.map((p) => p._id);

    const totalProjects = projects.length;
    const activeProjects = projects.filter((p) => p.status === 'active').length;
    const completedProjects = projects.filter((p) => p.status === 'completed').length;

    const tasks = await Task.find({ projectId: { $in: projectIds } });

    const totalTasks = tasks.length;
    const todoTasks = tasks.filter((t) => t.status === 'todo').length;
    const inProgressTasks = tasks.filter((t) => t.status === 'in-progress').length;
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;
    const blockedTasks = tasks.filter((t) => t.status === 'blocked').length;

    const now = new Date();
    const overdueTasks = tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'completed'
    ).length;

    const myTasks = tasks.filter(
      (t) => t.assignedTo && t.assignedTo.toString() === userId.toString()
    ).length;

    res.json({
      success: true,
      stats: {
        projects: { total: totalProjects, active: activeProjects, completed: completedProjects },
        tasks: {
          total: totalTasks,
          todo: todoTasks,
          inProgress: inProgressTasks,
          completed: completedTasks,
          blocked: blockedTasks,
          overdue: overdueTasks,
          myTasks,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get overdue tasks
// @route   GET /api/dashboard/overdue
// @access  Private
const getOverdueTasks = async (req, res) => {
  try {
    const userId = req.user._id;

    const projects = await Project.find({
      $or: [{ createdBy: userId }, { members: userId }],
    });

    const projectIds = projects.map((p) => p._id);
    const now = new Date();

    const overdueTasks = await Task.find({
      projectId: { $in: projectIds },
      dueDate: { $lt: now },
      status: { $ne: 'completed' },
    })
      .populate('assignedTo', 'name email')
      .populate('projectId', 'title')
      .sort({ dueDate: 1 });

    res.json({ success: true, tasks: overdueTasks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get task distribution per project (for charts)
// @route   GET /api/dashboard/chart-data
// @access  Private
const getChartData = async (req, res) => {
  try {
    const userId = req.user._id;

    const projects = await Project.find({
      $or: [{ createdBy: userId }, { members: userId }],
    }).select('title');

    const chartData = await Promise.all(
      projects.map(async (project) => {
        const tasks = await Task.find({ projectId: project._id });
        return {
          name: project.title.length > 15 ? project.title.slice(0, 15) + '…' : project.title,
          todo: tasks.filter((t) => t.status === 'todo').length,
          inProgress: tasks.filter((t) => t.status === 'in-progress').length,
          completed: tasks.filter((t) => t.status === 'completed').length,
          blocked: tasks.filter((t) => t.status === 'blocked').length,
        };
      })
    );

    res.json({ success: true, chartData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get per-member task stats for Team Performance widget
// @route   GET /api/dashboard/member-stats
// @access  Private
const getMemberStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all projects the current user is part of
    const projects = await Project.find({
      $or: [{ createdBy: userId }, { members: userId }],
    }).populate('members', 'name email');

    const projectIds = projects.map((p) => p._id);

    // Collect unique members across all projects
    const memberMap = {};
    projects.forEach((p) => {
      (p.members || []).forEach((m) => {
        memberMap[m._id.toString()] = m;
      });
    });

    const memberIds = Object.keys(memberMap);
    if (memberIds.length === 0) return res.json({ success: true, members: [] });

    // For each member, count their tasks in these projects
    const memberStats = await Promise.all(
      memberIds.map(async (memberId) => {
        const member = memberMap[memberId];
        const allTasks = await Task.find({
          projectId: { $in: projectIds },
          assignedTo: memberId,
        });
        const completedCount = allTasks.filter((t) => t.status === 'completed').length;
        const total = allTasks.length;
        const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;
        return {
          _id: memberId,
          name: member.name,
          email: member.email,
          total,
          completed: completedCount,
          completionRate,
        };
      })
    );

    // Sort by completion rate descending
    memberStats.sort((a, b) => b.completionRate - a.completionRate);

    res.json({ success: true, members: memberStats.slice(0, 5) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getStats, getOverdueTasks, getChartData, getMemberStats };
