const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Notification = require('../models/Notification');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// ─── Firebase Auth Exchange ─────────────────────────────────────────────────
// @desc    Verify Firebase token, find/create user, return app JWT
// @route   POST /api/auth/firebase
// @access  Public
const firebaseAuth = async (req, res) => {
  try {
    const { firebaseToken, name, role } = req.body;

    if (!firebaseToken) {
      return res.status(400).json({ success: false, message: 'Firebase token required' });
    }

    // Dynamically import firebase-admin (only if installed)
    let decodedFirebase;
    try {
      const admin = require('../config/firebase');
      decodedFirebase = await admin.auth().verifyIdToken(firebaseToken);
    } catch (adminErr) {
      // firebase-admin not set up yet — fallback: decode token payload manually for dev
      // (NOT secure for production — set up firebase-admin for production)
      const payload = JSON.parse(Buffer.from(firebaseToken.split('.')[1], 'base64').toString());
      decodedFirebase = { uid: payload.user_id || payload.sub, email: payload.email, name: payload.name };
    }

    const email = decodedFirebase.email;
    if (!email) {
      return res.status(400).json({ success: false, message: 'No email in Firebase token' });
    }

    // Find existing user or create new one
    let user = await User.findOne({ email });

    if (!user) {
      const userName = name || decodedFirebase.name || email.split('@')[0];
      const validRole = role === 'admin' ? 'admin' : 'member';
      user = await User.create({
        name: userName,
        email,
        password: `firebase_${Math.random().toString(36).slice(2)}`, // placeholder - never used
        role: validRole,
        firebaseUid: decodedFirebase.uid,
      });
    } else if (!user.firebaseUid) {
      // Link existing account to Firebase
      user.firebaseUid = decodedFirebase.uid;
      await user.save();
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Firebase authentication failed: ' + error.message });
  }
};

// ─── Legacy Auth (kept for compatibility) ──────────────────────────────────
const signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password, role: role || 'member' });
    const token = generateToken(user._id);

    res.status(201).json({
      success: true, token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);
    res.json({
      success: true, token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('name email role createdAt');
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const inviteUser = async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    let user = await User.findOne({ email: cleanEmail });
    if (user) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const userName = cleanEmail.split('@')[0];
    const validRole = role === 'admin' ? 'admin' : 'member';
    const tempPassword = `Invite_${Math.random().toString(36).slice(2, 10)}!`;
    
    user = await User.create({
      name: userName.charAt(0).toUpperCase() + userName.slice(1),
      email: cleanEmail,
      password: tempPassword,
      role: validRole,
    });

    const userObj = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      tempPassword,
    };

    // Create notifications for all other existing users
    try {
      const existingUsers = await User.find({ _id: { $ne: user._id } }).select('_id');
      const notifDocs = existingUsers.map(u => ({
        recipient: u._id,
        type: 'system',
        title: '🎉 New Team Member Joined',
        body: `${user.name} (${user.email}) was invited to the workspace as ${validRole.toUpperCase()}.`,
      }));
      if (notifDocs.length > 0) {
        await Notification.insertMany(notifDocs);
      }
    } catch (notifErr) {
      console.error('Failed to create invite notifications', notifErr);
    }

    // Real-time WebSocket emission
    const io = req.app.get('io');
    if (io) {
      io.emit('member_added', userObj);
      io.emit('notification', {
        title: '🎉 New Team Member Invited',
        body: `${user.name} (${user.email}) was invited to the workspace.`,
      });
    }

    const clientOrigin = req.get('origin') || 'http://localhost:5173';
    const inviteLink = `${clientOrigin}/login?email=${encodeURIComponent(cleanEmail)}`;

    res.status(201).json({
      success: true,
      message: 'Invitation generated successfully',
      user: userObj,
      inviteLink,
      tempPassword,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, avatar, role } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (name) user.name = name.trim();
    if (avatar !== undefined) user.avatar = avatar;
    if (role && ['admin', 'member'].includes(role)) user.role = role;

    await user.save();

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.role = role;
    await user.save();

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { signup, login, getMe, getUsers, firebaseAuth, inviteUser, updateProfile, updateUserRole };


