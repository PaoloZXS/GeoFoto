const http = require('http');
const querystring = require('querystring');

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).send('Method not allowed');

    try {
        const body = await new Promise(resolve => {
            let d = '';
            req.on('data', c => d += c);
            req.on('end', () => resolve(d));
        });

        const params = querystring.parse(body);
        const cliente = params.cliente || '';
        const foto = params.foto || '';

        const postData = querystring.stringify({ cliente, foto });

        const data = await new Promise((resolve, reject) => {
            const req2 = http.request({
                hostname: '62.110.25.18',
                port: 80,
                path: '/condivisionedati/elimina-foto.aspx',
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
