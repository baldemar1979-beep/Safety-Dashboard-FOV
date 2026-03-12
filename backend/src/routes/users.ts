import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../database';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, (_req: AuthRequest, res: Response) => {
  const users = db.prepare('SELECT id, username, name, email, role, driver_name, created_at FROM users ORDER BY name').all();
  res.json(users);
});

// Create user (admin only)
router.post('/', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  const { username, password, name, email, role, driver_name } = req.body;

  if (!username || !password || !name || !role) {
    res.status(400).json({ error: 'username, password, name, and role are required' });
    return;
  }

  if (!['admin', 'employee'].includes(role)) {
    res.status(400).json({ error: 'Role must be admin or employee' });
    return;
  }

  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existingUser) {
    res.status(409).json({ error: 'Username already exists' });
    return;
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (username, password_hash, name, email, role, driver_name)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(username, passwordHash, name, email || null, role, driver_name || null);

  const newUser = db.prepare('SELECT id, username, name, email, role, driver_name, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(newUser);
});

// Update user (admin only)
router.put('/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, email, role, driver_name, password } = req.body;

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (password) {
    const passwordHash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET name = ?, email = ?, role = ?, driver_name = ?, password_hash = ? WHERE id = ?')
      .run(name, email || null, role, driver_name || null, passwordHash, id);
  } else {
    db.prepare('UPDATE users SET name = ?, email = ?, role = ?, driver_name = ? WHERE id = ?')
      .run(name, email || null, role, driver_name || null, id);
  }

  const updatedUser = db.prepare('SELECT id, username, name, email, role, driver_name, created_at FROM users WHERE id = ?').get(id);
  res.json(updatedUser);
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Prevent deleting own account
  if (Number(id) === req.user!.id) {
    res.status(400).json({ error: 'Cannot delete your own account' });
    return;
  }

  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ message: 'User deleted successfully' });
});

// Get list of unique driver names from events (for admin to assign to users)
router.get('/drivers/list', authenticateToken, requireAdmin, (_req: AuthRequest, res: Response) => {
  const drivers = db.prepare('SELECT DISTINCT driver FROM fov_events WHERE driver IS NOT NULL ORDER BY driver').all();
  res.json(drivers.map((d: { driver: string }) => d.driver));
});

export default router;
