const http = require('http');
const querystring = require('querystring');

function checkAuth(req, res) {
    const auth = req.headers.authorization || '';
    if (auth !== 'Bearer geofoto-token-2026') {
        res.status(401).json({ error: 'Unauthorized' });
        return false;
    }
    return true;
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).send('Method not allowed');
    if (!checkAuth(req, res)) return;

    try {
        const body = await new Promise(resolve => {
            let d = '';
            req.on('data', c => d += c);
            req.on('end', () => resolve(d));
        });

        const params = querystring.parse(body);
        const cliente = params.cliente || '';

        const postData = querystring.stringify({ cliente });

        const data = await new Promise((resolve, reject) => {
            const req2 = http.request({
                hostname: '62.110.25.18',
                port: 80,
                path: '/condivisionedati/elimina.aspx',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData)
                }
            }, r => {
                let d = '';
                r.on('data', c => d += c);
                r.on('end', () => resolve({ status: r.statusCode, body: d }));
            });
            req2.on('error', reject);
            req2.write(postData);
            req2.end();
        });

        res.status(data.status || 500).send(data.body);
    } catch (e) {
        res.status(500).send(e.message);
    }
};
