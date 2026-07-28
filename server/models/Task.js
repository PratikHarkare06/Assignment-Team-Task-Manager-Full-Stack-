const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, maxlength: [2000, 'Comment cannot exceed 2000 characters'] },
  },
  { timestamps: true }
);

const attachmentSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    size:        { type: Number, required: true },          // bytes
    mimeType:    { type: String, required: true },
    data:        { type: String, required: true },          // base64 encoded file data
    uploadedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const activityLogSchema = new mongoose.Schema(
  {
    actor:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action:  { type: String, required: true, trim: true },   // e.g. "changed status to In Progress"
    field:   { type: String, default: '' },                  // field that changed
    from:    { type: String, default: '' },
    to:      { type: String, default: '' },
  },
  { timestamps: true }
);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String, required: [true, 'Task title is required'],
      trim: true, maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String, trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    assignedTo:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    projectId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    status: {
      type: String, enum: ['todo', 'in-progress', 'completed', 'blocked'], default: 'todo',
    },
    priority: {
      type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium',
    },
    dueDate:     { type: Date, default: null },
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    comments:    [commentSchema],
    attachments: [attachmentSchema],
    activityLog: [activityLogSchema],
    reminderSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Task', taskSchema);
