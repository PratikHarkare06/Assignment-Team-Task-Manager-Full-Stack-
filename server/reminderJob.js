// reminderJob.js — Hourly job that sends in-app notifications for tasks
// due within the next 24 hours (runs every 60 minutes via setInterval)

const Task = require('./models/Task');
const Notification = require('./models/Notification');

const INTERVAL_MS = 60 * 60 * 1000; // 1 hour

async function runReminderJob(io) {
  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find tasks due within next 24h that haven't sent a reminder yet
    const dueSoonTasks = await Task.find({
      dueDate: { $gte: now, $lte: in24h },
      status: { $nin: ['completed'] },
      reminderSent: false,
      assignedTo: { $ne: null },
    }).populate('assignedTo', 'name email').populate('projectId', 'title');

    if (dueSoonTasks.length === 0) return;

    const notifications = dueSoonTasks.map((task) => ({
      recipient: task.assignedTo._id,
      type: 'deadline',
      title: '⏰ Task Due Soon',
      body: `Your task "${task.title}" is due ${formatDueDate(task.dueDate)}. Don't forget to complete it!`,
      tag: `Project: ${task.projectId?.title || 'General'}`,
      relatedId: task._id,
    }));

    await Notification.insertMany(notifications);

    // Mark reminders as sent & emit real-time notifications
    for (const task of dueSoonTasks) {
      task.reminderSent = true;
      await task.save();

      if (io) {
        io.to(task.assignedTo._id.toString()).emit('new_notification', {
          title: '⏰ Task Due Soon',
          body: `Your task "${task.title}" is due ${formatDueDate(task.dueDate)}.`,
          type: 'deadline',
        });
      }
    }

    console.log(`⏰ Reminder job: sent ${dueSoonTasks.length} due-soon notification(s)`);
  } catch (err) {
    console.error('❌ Reminder job error:', err.message);
  }
}

function formatDueDate(date) {
  const d = new Date(date);
  const now = new Date();
  const diffMs = d - now;
  const diffH = Math.round(diffMs / (1000 * 60 * 60));
  if (diffH <= 1) return 'in less than 1 hour';
  if (diffH < 24) return `in ${diffH} hours`;
  return `on ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function startReminderJob(io) {
  console.log('⏰ Reminder job started — checking every hour for due-soon tasks');
  // Run once immediately on startup
  runReminderJob(io);
  // Then every hour
  setInterval(() => runReminderJob(io), INTERVAL_MS);
}

module.exports = { startReminderJob };
