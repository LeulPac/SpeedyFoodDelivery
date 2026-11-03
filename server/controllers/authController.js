const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const db = require('../db');

let authSchemaEnsured = false;

const ensureAuthSchema = async () => {
  if (authSchemaEnsured) return;
  await db.query(`
    ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
  `);
  authSchemaEnsured = true;
};

const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role, business_id: user.business_id || null },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

const publicUser = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone || null,
  role: row.role,
  business_id: row.business_id || null,
});

const register = async (req, res) => {
  try {
    await ensureAuthSchema();
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    const trimmedName = String(name).trim();
    const trimmedEmail = String(email).trim().toLowerCase();
    const trimmedPassword = String(password).trim();

    if (!trimmedName) {
      return res.status(400).json({ error: 'Name cannot be empty.' });
    }
    if (!trimmedEmail) {
      return res.status(400).json({ error: 'Valid email is required.' });
    }
    if (trimmedPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [trimmedEmail]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(trimmedPassword, salt);
    const created = await db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, phone, role',
      [trimmedName, trimmedEmail, passwordHash, 'customer']
    );
    const user = created.rows[0];
    const token = signToken(user);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    console.error('Registration error:', err.message);
    res.status(500).json({ error: 'Server error creating account.' });
  }
};

const registerDriver = async (req, res) => {
  try {
    await ensureAuthSchema();
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    const trimmedEmail = String(email).trim().toLowerCase();
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [trimmedEmail]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists with this email.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const bizId = req.user?.business_id || null;
    const created = await db.query(
      'INSERT INTO users (name, email, password_hash, phone, role, business_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, phone, role, business_id',
      [String(name).trim(), trimmedEmail, passwordHash, phone ? String(phone).trim() : null, 'driver', bizId]
    );
    res.status(201).json(publicUser(created.rows[0]));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

const login = async (req, res) => {
  try {
    await ensureAuthSchema();
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    const userResult = await db.query('SELECT * FROM users WHERE email = $1', [trimmedEmail]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const user = userResult.rows[0];

    if (!user.password_hash) {
      return res.status(400).json({ error: 'This account uses Google sign-in. Please continue with Google.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    if (user.role === 'owner' && !user.business_id) {
      const bizRes = await db.query('SELECT id FROM businesses WHERE owner_id = $1 LIMIT 1', [user.id]);
      if (bizRes.rows.length > 0) {
        user.business_id = bizRes.rows[0].id;
        await db.query('UPDATE users SET business_id = $1 WHERE id = $2', [user.business_id, user.id]);
      }
    }

    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Server error logging in.' });
  }
};

const googleLogin = async (req, res) => {
  try {
    await ensureAuthSchema();
    const { credential, accessToken, access_token } = req.body;
    const tokenToUse = accessToken || access_token;

    if (!credential && !tokenToUse) {
      return res.status(400).json({ error: 'Google credential or access token is required.' });
    }

    let googleId;
    let email;
    let name;

    if (credential) {
      const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
      if (!clientId) {
        return res.status(503).json({
          error: 'Google sign-in is not configured on the server. Add GOOGLE_CLIENT_ID to server/.env and restart npm run dev.',
        });
      }

      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });
      const payload = ticket.getPayload();
      googleId = payload.sub;
      email = payload.email?.toLowerCase();
      name = payload.name || email?.split('@')[0] || 'Customer';
    } else {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenToUse}` },
      });
      if (!response.ok) {
        return res.status(401).json({ error: 'Failed to retrieve Google user profile.' });
      }
      const data = await response.json();
      googleId = data.sub;
      email = data.email?.toLowerCase();
      name = data.name || email?.split('@')[0] || 'Customer';
    }

    if (!email) {
      return res.status(400).json({ error: 'Google account must share an email address.' });
    }

    let userResult = await db.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
    if (userResult.rows.length === 0) {
      userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    }

    let user;
    if (userResult.rows.length > 0) {
      user = userResult.rows[0];
      if (user.role !== 'customer') {
        const hint =
          user.role === 'owner'
            ? 'Use the admin dashboard for owner accounts.'
            : 'Use the driver app for driver accounts.';
        return res.status(400).json({ error: hint });
      }
      if (!user.google_id) {
        const updated = await db.query(
          'UPDATE users SET google_id = $1, name = COALESCE(NULLIF(name, \'\'), $2) WHERE id = $3 RETURNING *',
          [googleId, name, user.id]
        );
        user = updated.rows[0];
      }
    } else {
      const created = await db.query(
        'INSERT INTO users (name, email, password_hash, role, google_id) VALUES ($1, $2, NULL, $3, $4) RETURNING *',
        [name, email, 'customer', googleId]
      );
      user = created.rows[0];
    }

    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error('Google login error:', err.message);
    res.status(401).json({ error: 'Google sign-in failed. Please try again.' });
  }
};

const updateDriver = async (req, res) => {
  try {
    await ensureAuthSchema();
    const { id } = req.params;
    const { name, email, password, phone } = req.body;

    const existingRes = await db.query("SELECT * FROM users WHERE id = $1 AND role = 'driver'", [id]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    const existing = existingRes.rows[0];

    const newName = name !== undefined ? String(name).trim() : existing.name;
    const newEmail = email !== undefined ? String(email).trim().toLowerCase() : existing.email;
    const newPhone = phone !== undefined ? (phone ? String(phone).trim() : null) : existing.phone;

    if (!newName) {
      return res.status(400).json({ error: 'Name cannot be empty' });
    }
    if (!newEmail) {
      return res.status(400).json({ error: 'Email cannot be empty' });
    }

    if (newEmail !== existing.email) {
      const conflict = await db.query('SELECT id FROM users WHERE email = $1 AND id != $2', [newEmail, id]);
      if (conflict.rows.length > 0) {
        return res.status(400).json({ error: 'Another user already exists with this email.' });
      }
    }

    let query = 'UPDATE users SET name = $1, email = $2, phone = $3 WHERE id = $4 RETURNING id, name, email, phone, role';
    let params = [newName, newEmail, newPhone, id];

    if (password && String(password).trim().length > 0) {
      if (String(password).trim().length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
      }
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(String(password).trim(), salt);
      query = 'UPDATE users SET name = $1, email = $2, phone = $3, password_hash = $4 WHERE id = $5 RETURNING id, name, email, phone, role';
      params = [newName, newEmail, newPhone, passwordHash, id];
    }

    const updated = await db.query(query, params);
    res.json(publicUser(updated.rows[0]));
  } catch (err) {
    console.error('updateDriver error:', err.message);
    res.status(500).json({ error: err.message || 'Server error updating driver' });
  }
};

const deleteDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const existingRes = await db.query("SELECT * FROM users WHERE id = $1 AND role = 'driver'", [id]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    // Check if driver is currently delivering an active order
    const activeOrders = await db.query(
      "SELECT id FROM orders WHERE driver_id = $1 AND status IN ('ready_for_pickup', 'delivering')",
      [id]
    );
    if (activeOrders.rows.length > 0) {
      return res.status(400).json({ error: 'Cannot delete driver while they have active deliveries assigned.' });
    }

    await db.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ success: true, message: 'Driver deleted successfully' });
  } catch (err) {
    console.error('deleteDriver error:', err.message);
    res.status(500).json({ error: err.message || 'Server error deleting driver' });
  }
};

const me = async (req, res) => {
  try {
    const userResult = await db.query('SELECT id, name, email, phone, role, business_id FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userResult.rows[0];
    if (user.role === 'owner' && !user.business_id) {
      const bizRes = await db.query('SELECT id FROM businesses WHERE owner_id = $1 LIMIT 1', [user.id]);
      if (bizRes.rows.length > 0) {
        user.business_id = bizRes.rows[0].id;
      }
    }
    res.json(publicUser(user));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

module.exports = { register, registerDriver, updateDriver, deleteDriver, login, googleLogin, me };

