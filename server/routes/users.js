const express = require('express');
const router = express.Router();
const { getUsers, inviteUser, updateProfile, updateUserRole } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// GET /api/users — returns all users for team management
router.get('/', protect, getUsers);
// POST /api/users/invite — invites a new member and emits websocket event
router.post('/invite', protect, inviteUser);
// PUT /api/users/profile — updates profile name, avatar, and role
router.put('/profile', protect, updateProfile);
// PUT /api/users/:id/role — updates a user's role
router.put('/:id/role', protect, updateUserRole);

module.exports = router;
