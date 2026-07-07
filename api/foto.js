const http = require('http');

module.exports = async (req, res) => {
    if (req.method !== 'GET') return res.status(405).send('Method not allowed');

    const { cliente, img } = req.query;

    try {
        let url = `http://62.110.25.18/condivisionedati/foto.aspx?cliente=${encodeURIComponent(cliente || '')}`;
        if (img) url += `&img=${encodeURIComponent(img)}`;

        const data = await new Promise((resolve, reject) => {
            http.get(url, r => {
                // Se è un'immagine, raccogli i buffer
                const contentType = r.headers['content-type'] || '';
                if (contentType.startsWith('image/')) {
                    const chunks = [];
                    r.on('data', c => chunks.push(c));
                    r.on('end', () => resolve({ type: 'image', data: Buffer.concat(chunks) }));
                } else {
                    let d = '';
                    r.on('data', c => d += c);
                    r.on('end', () => resolve({ type: 'json', data: d }));
                }
            }).on('error', reject);
        });

        if (data.type === 'image') {
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.status(200).send(data.data);
        } else {
            res.setHeader('Content-Type', 'application/json');
            res.status(200).send(data.data);
        }
    } catch {
        res.status(200).send('[]');
    }
};
