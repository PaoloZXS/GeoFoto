import formidable from 'formidable';
import fs from 'fs';
import ftp from 'basic-ftp';
import path from 'path';

export const config = { api: { bodyParser: false } };

const FTP_HOST = process.env.FTP_HOST || '62.110.25.18';
const FTP_PORT = parseInt(process.env.FTP_PORT || '21');
const FTP_USER = process.env.FTP_USER || 'CondivisioneFoto';
const FTP_PASS = process.env.FTP_PASS || '3621spectrum5152';
const FTP_ROOT = 'FotoLavori';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method not allowed');

    try {
        // Leggi il form data
        const form = formidable({});
        const [fields, files] = await form.parse(req);
        const cliente = fields.cliente?.[0] || 'Sconosciuto';
        const file = files.foto?.[0];

        if (!file) return res.status(400).send('Nessun file ricevuto');

        const remoteDir = `${FTP_ROOT}/${cliente}`;
        const remotePath = `${remoteDir}/${file.originalFilename}`;

        // Upload FTP
        const client = new ftp.Client();
        client.ftp.verbose = false;

        await client.access({
            host: FTP_HOST,
            port: FTP_PORT,
            user: FTP_USER,
            password: FTP_PASS,
            secure: false
        });

        await client.ensureDir(remoteDir);
        await client.uploadFrom(file.filepath, remotePath);
        client.close();

        // Pulisci file temporaneo
        fs.unlink(file.filepath, () => {});

        res.status(200).send('OK');
    } catch (e) {
        console.error(e);
        res.status(500).send(e.message);
    }
}
