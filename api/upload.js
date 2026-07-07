const { formidable } = require('formidable');
const fs = require('fs');
const http = require('http');

async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method not allowed');

    try {
        const form = formidable({});
        const [fields, files] = await form.parse(req);
        const cliente = fields.cliente?.[0] || 'Sconosciuto';
        const file = files.foto?.[0];

        if (!file) return res.status(400).send('Nessun file ricevuto');

        // Inoltra al PHP sul server web
        const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
        let body = '';
        body += `--${boundary}\r\n`;
        body += `Content-Disposition: form-data; name="cliente"\r\n\r\n`;
        body += `${cliente}\r\n`;
        body += `--${boundary}\r\n`;
        body += `Content-Disposition: form-data; name="foto"; filename="${file.originalFilename}"\r\n`;
        body += `Content-Type: image/jpeg\r\n\r\n`;

        const fileData = fs.readFileSync(file.filepath);
        const footer = `\r\n--${boundary}--\r\n`;

        const bodyBuffer = Buffer.concat([
            Buffer.from(body, 'utf-8'),
            fileData,
            Buffer.from(footer, 'utf-8')
        ]);

        const options = {
            hostname: '62.110.25.18',
            port: 80,
            path: '/upload.php',
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': bodyBuffer.length
            }
        };

        const phpRes = await new Promise((resolve, reject) => {
            const req2 = http.request(options, resolve);
            req2.on('error', reject);
            req2.write(bodyBuffer);
            req2.end();
        });

        let responseText = '';
        phpRes.on('data', chunk => responseText += chunk);

        await new Promise(resolve => phpRes.on('end', resolve));

        fs.unlink(file.filepath, () => {});

        if (phpRes.statusCode === 200) {
            res.status(200).send('OK');
        } else {
            res.status(500).send(responseText || 'Errore PHP');
        }
    } catch (e) {
        console.error(e);
        res.status(500).send(e.message);
    }
}

module.exports = handler;
module.exports.config = { api: { bodyParser: false } };
