const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon',
};

// Dati di esempio per il test
const clientiTest = ['Mario Rossi', 'Laura Bianchi', 'Giuseppe Verdi', 'Anna Neri', 'Marco Gialli'];

const fotoTest = {
    'Mario Rossi': ['01072025093000.jpg', '01072025101500.jpg', '01072025112000.jpg', '02072025080000.jpg', '02072025094500.jpg'],
    'Laura Bianchi': ['03072025140000.jpg', '03072025143000.jpg'],
    'Giuseppe Verdi': ['04072025100000.jpg', '04072025103000.jpg', '04072025110000.jpg', '04072025113000.jpg', '04072025120000.jpg', '04072025123000.jpg'],
    'Anna Neri': [],
    'Marco Gialli': ['05072025160000.jpg'],
};

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // API mock /api/clienti
    if (pathname === '/api/clienti') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(clientiTest));
        return;
    }

    // API mock /api/elimina-foto
    if (pathname === '/api/elimina-foto' && req.method === 'POST') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            const params = new URLSearchParams(body);
            const cliente = params.get('cliente');
            const foto = params.get('foto');
            if (fotoTest[cliente]) {
                fotoTest[cliente] = fotoTest[cliente].filter(f => f !== foto);
            }
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('OK');
        });
        return;
    }

    // API mock /api/elimina-cliente
    if (pathname === '/api/elimina-cliente' && req.method === 'POST') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            const params = new URLSearchParams(body);
            const cliente = params.get('cliente');
            delete fotoTest[cliente];
            // Rimuovi anche dalla lista clienti
            const idx = clientiTest.indexOf(cliente);
            if (idx !== -1) clientiTest.splice(idx, 1);
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('OK');
        });
        return;
    }

    // API mock /api/foto
    if (pathname === '/api/foto') {
        const cliente = url.searchParams.get('cliente');
        const img = url.searchParams.get('img');

        if (img) {
            // Restituisci un'immagine placeholder
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
                <rect width="800" height="600" fill="#1a1a2e"/>
                <text x="400" y="280" text-anchor="middle" fill="#4fc3f7" font-size="48">📷</text>
                <text x="400" y="340" text-anchor="middle" fill="#888" font-size="18">${cliente}</text>
                <text x="400" y="370" text-anchor="middle" fill="#666" font-size="14">${img}</text>
            </svg>`;
            res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
            res.end(svg);
            return;
        }

        const foto = fotoTest[cliente] || [];
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(foto));
        return;
    }

    // API mock /api/upload
    if (pathname === '/api/upload' && req.method === 'POST') {
        let body = '';
        req.on('data', c => body += c);
        req.on('end', () => {
            // Estrai cliente dal body multipart
            const clienteMatch = body.match(/name="cliente"\r\n\r\n([^\r\n]+)/);
            const cliente = clienteMatch ? clienteMatch[1] : 'Sconosciuto';

            // Genera nome file fittizio come farebbe l'app
            const now = new Date();
            const filename = now.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14) + '.jpg';

            // Aggiungi la foto al cliente (crea array se non esiste)
            if (!fotoTest[cliente]) fotoTest[cliente] = [];
            fotoTest[cliente].push(filename);

            // Se il cliente non era nella lista, aggiungilo
            if (!clientiTest.includes(cliente)) {
                clientiTest.push(cliente);
                clientiTest.sort((a, b) => a.localeCompare(b));
            }

            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('OK');
        });
        return;
    }

    // File statici
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
    const ext = path.extname(filePath);

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`🚀 Test server attivo su http://localhost:${PORT}`);
});
