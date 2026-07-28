import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchTasks = createAsyncThunk('tasks/fetchAll', async (params = {}, { rejectWithValue }) => {
  try {
    const res = await api.get('/tasks', { params });
    return res.data.tasks;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch tasks');
  }
});

export const createTask = createAsyncThunk('tasks/create', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/tasks', data);
    return res.data.task;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create task');
  }
});

export const updateTask = createAsyncThunk('tasks/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/tasks/${id}`, data);
    return res.data.task;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update task');
  }
});

export const deleteTask = createAsyncThunk('tasks/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/tasks/${id}`);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete task');
  }
});

export const addComment = createAsyncThunk('tasks/addComment', async ({ taskId, body }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/tasks/${taskId}/comments`, { body });
    return { taskId, comment: res.data.comment };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to add comment');
  }
});

export const deleteComment = createAsyncThunk('tasks/deleteComment', async ({ taskId, commentId }, { rejectWithValue }) => {
  try {
    await api.delete(`/tasks/${taskId}/comments/${commentId}`);
    return { taskId, commentId };
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete comment');
  }
});

const tasksSlice = createSlice({
  name: 'tasks',
  initialState: { list: [], loading: false, error: null },
  reducers: {
    clearError(state) { state.error = null; },
    // Optimistic real-time comment push (from socket)
    pushComment(state, action) {
      const { taskId, comment } = action.payload;
      const task = state.list.find(t => t._id === taskId);
      if (task) {
        if (!task.comments) task.comments = [];
        const exists = task.comments.find(c => c._id === comment._id);
        if (!exists) task.comments.push(comment);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchTasks.fulfilled, (state, a) => { state.loading = false; state.list = a.payload; })
      .addCase(fetchTasks.rejected, (state, a) => { state.loading = false; state.error = a.payload; })

      .addCase(createTask.fulfilled, (state, a) => { state.list.unshift(a.payload); })

      .addCase(updateTask.fulfilled, (state, a) => {
        const idx = state.list.findIndex((t) => t._id === a.payload._id);
        if (idx >= 0) state.list[idx] = a.payload;
      })

      .addCase(deleteTask.fulfilled, (state, a) => {
        state.list = state.list.filter((t) => t._id !== a.payload);
      })

      .addCase(addComment.fulfilled, (state, a) => {
        const { taskId, comment } = a.payload;
        const task = state.list.find(t => t._id === taskId);
        if (task) {
          if (!task.comments) task.comments = [];
          task.comments.push(comment);
        }
      })

      .addCase(deleteComment.fulfilled, (state, a) => {
        const { taskId, commentId } = a.payload;
        const task = state.list.find(t => t._id === taskId);
        if (task && task.comments) {
          task.comments = task.comments.filter(c => c._id !== commentId);
        }
      });
  },
});

export const { clearError, pushComment } = tasksSlice.actions;
export default tasksSlice.reducer;
