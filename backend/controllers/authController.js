const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Expert = require('../models/Expert');
const sendError = require('../utils/sendError');
const { buildAddress } = require('../utils/address');

const createToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

const PUBLIC_ROLES = ['farmer', 'expert', 'organization_owner'];

// POST /api/auth/register
// To register a new user account
const register = async (req, res) => {
  try {
    const { name, email, password, role, phone, specialization } = req.body;
    const address = buildAddress(req.body);

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    if (role && !PUBLIC_ROLES.includes(role)) {
      return res.status(400).json({ message: 'Invalid role selection' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'farmer',
      phone,
      address,
    });

    if (user.role === 'expert') {
      await Expert.create({
        userId: user._id,
        fullName: name,
        phone,
        email,
        address,
        specialization,
      });
    }

    const token = createToken(user);
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    sendError(res, 500, 'Something went wrong', err);
  }
};

// POST /api/auth/login
// To log in an existing user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = createToken(user);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    sendError(res, 500, 'Something went wrong', err);
  }
};

module.exports = { register, login };
