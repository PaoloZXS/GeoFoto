const http = require('http');
const { requireAuth } = require('./_auth');

module.exports = async (req, res) => {
    if (req.method !== 'GET') return res.status(405).send('Method not allowed');
    if (!requireAuth(req, res)) return;
    try {
        const data = await new Promise((resolve, reject) => {
            http.get('http://62.110.25.18/condivisionedati/lista.aspx', r => {
                let d = '';
                r.on('data', c => d += c);
                r.on('end', () => resolve(d));
            }).on('error', reject);
        });
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(data);
    } catch {
        res.status(200).send('[]');
    }
};
