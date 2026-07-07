const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'geofoto-secret-dev-2026';
const USERNAME = process.env.LOGIN_USER || 'Codarini';
const PASSWORD = process.env.LOGIN_PASS || 'coda1970rini';

function generateToken() {
    return jwt.sign({ username: USERNAME }, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(req) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
}

function requireAuth(req, res) {
    const decoded = verifyToken(req);
    if (!decoded) {
        res.status(401).json({ error: 'Unauthorized' });
        return null;
    }
    return decoded;
}

module.exports = { generateToken, verifyToken, requireAuth, USERNAME, PASSWORD };
