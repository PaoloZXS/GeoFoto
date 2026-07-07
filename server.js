const http = require('http');
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');
const ftp = require('basic-ftp');

const PORT = process.env.PORT || 3000;
const FTP_HOST = process.env.FTP_HOST || '62.110.25.18';
const FTP_PORT = parseInt(process.env.FTP_PORT || '21');
const FTP_USER = process.env.FTP_USER || 'CondivisioneFoto';
const FTP_PASS = process.env.FTP_PASS || '3621spectrum5152';
const FTP_ROOT = 'FotoLavori';

const MIME = {
    '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon', '.svg': 'image/svg+xml'
};

const server = http.createServer(async (req, res) => {
    // ===== API UPLOAD =====
    if (req.method === 'POST' && req.url === '/api/upload') {
        const form = formidable({});
        try {
            const [fields, files] = await form.parse(req);
            const cliente = fields.cliente?.[0] || 'Sconosciuto';
            const file = files.foto?.[0];

            if (!file) {
                res.writeHead(400); return res.end('Nessun file');
            }

            const remoteDir = `${FTP_ROOT}/${cliente}`;
            const remotePath = `${remoteDir}/${file.originalFilename}`;

            console.log(`Upload: ${remotePath}`);

            const client = new ftp.Client();
            await client.access({
                host: FTP_HOST, port: FTP_PORT,
                user: FTP_USER, password: FTP_PASS, secure: false
            });
            await client.ensureDir(remoteDir);
            await client.uploadFrom(file.filepath, remotePath);
            client.close();

            fs.unlink(file.filepath, () => {});
            res.writeHead(200); return res.end('OK');
        } catch (e) {
            console.error(e);
            res.writeHead(500); return res.end(e.message);
        }
    }

    // ===== STATIC FILES =====
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(__dirname, filePath);

    try {
        const data = await fs.promises.readFile(filePath);
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
    } catch {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  🚀 FotoLavori avviato sulla porta ${PORT}`);
});
