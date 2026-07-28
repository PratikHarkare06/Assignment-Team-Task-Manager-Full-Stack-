const Task    = require('../models/Task');
const Project = require('../models/Project');

// @desc    Global search across tasks and projects
// @route   GET /api/search?q=...
// @access  Private
const search = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) {
      return res.json({ success: true, tasks: [], projects: [] });
    }

    const userId = req.user._id;
    const regex  = new RegExp(q, 'i');

    // Only search within the user's projects for security
    const userProjects = await Project.find({
      $or: [{ createdBy: userId }, { members: userId }],
    }).select('_id title description status');

    const projectIds = userProjects.map(p => p._id);

    // Matching projects
    const matchingProjects = userProjects.filter(
      p => regex.test(p.title) || regex.test(p.description)
    ).slice(0, 5);

    // Matching tasks
    const matchingTasks = await Task.find({
      projectId: { $in: projectIds },
      $or: [{ title: regex }, { description: regex }],
    })
      .populate('assignedTo', 'name')
      .populate('projectId', 'title')
      .select('title status priority dueDate assignedTo projectId')
      .limit(5);

    res.json({
      success: true,
      tasks: matchingTasks,
      projects: matchingProjects,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { search };
