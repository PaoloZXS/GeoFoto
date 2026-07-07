const { generateToken, USERNAME, PASSWORD } = require('./_auth');

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { username, password } = req.body || {};

    if (username !== USERNAME || password !== PASSWORD) {
        return res.status(401).json({ error: 'Credenziali errate' });
    }

    const token = generateToken();
    res.status(200).json({ token, username: USERNAME });
};
