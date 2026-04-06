// src/routes/auth.js — Registration, login, profile
const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const db      = require('../models/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ── POST /api/auth/signup ─────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { first_name, last_name, email, password, company } = req.body;

    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ error: 'first_name, last_name, email, and password are required' });
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 12);
    const id = uuid();

    db.prepare(`
      INSERT INTO users (id, first_name, last_name, email, password, company)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, first_name, last_name, email, hashed, company || null);

    const token = jwt.sign(
      { id, email, first_name, last_name, company, role: 'hr_manager' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(201).json({
      message: 'Account created successfully',
      token,
      user: { id, first_name, last_name, email, company, role: 'hr_manager' }
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Server error during signup' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid email or password' });
    if (user.active === false) return res.status(403).json({ error: 'Account deactivated. Contact your admin.' });

    const token = jwt.sign(
      { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, company: user.company, role: user.role || 'viewer' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Update last_login
    const idx = db.data.users.findIndex(u => u.id === user.id);
    if (idx !== -1) { db.data.users[idx].last_login = new Date().toISOString(); db.write(); }

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        company: user.company,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login' });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, first_name, last_name, email, company, role, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json({ user });
});

// ── PUT /api/auth/profile ─────────────────────────────────────────────────────
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { first_name, last_name, company, password } = req.body;
    const updates = [];
    const params  = [];

    if (first_name) { updates.push('first_name = ?'); params.push(first_name); }
    if (last_name)  { updates.push('last_name = ?');  params.push(last_name);  }
    if (company)    { updates.push('company = ?');    params.push(company);    }
    if (password) {
      if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
      const hashed = await bcrypt.hash(password, 12);
      updates.push('password = ?');
      params.push(hashed);
    }

    if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });

    params.push(req.user.id);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    return res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Profile update error:', err);
    return res.status(500).json({ error: 'Server error updating profile' });
  }
});

module.exports = router;
