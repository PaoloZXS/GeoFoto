// ---- STATO ----
let cliente = '';
let stream = null;
let frontCamera = false;
let currentFile = null;

const API_URL = '/api/upload';

// ---- ELEMENTI DOM ----
const $ = id => document.getElementById(id);
const screenCliente = $('screen-cliente');
const screenCamera = $('screen-camera');
const screenPreview = $('screen-preview');
const inputCliente = $('inputCliente');
const btnAvvia = $('btnAvvia');
const video = $('video');
const canvas = $('canvas');
const btnScatta = $('btnScatta');
const btnChiudi = $('btnChiudi');
const btnFlip = $('btnFlip');
const btnRiscatta = $('btnRiscatta');
const btnConferma = $('btnConferma');
const previewImg = $('previewImg');
const uploadStatus = $('uploadStatus');
const progressFill = $('progressFill');
const statusText = $('statusText');
const clienteBadge = $('clienteBadge');
const msgOverlay = $('msgOverlay');
const msgIcon = $('msgIcon');
const msgTitle = $('msgTitle');
const msgText = $('msgText');
const msgBtn = $('msgBtn');
const suggestionList = $('suggestionList');
let clientiEsistenti = [];

// ---- CARICA CLIENTI ESISTENTI ----
fetch('/api/clienti').then(r => r.json()).then(lista => {
    clientiEsistenti = lista;
}).catch(() => {});

inputCliente.addEventListener('input', () => {
    const val = inputCliente.value.toLowerCase().trim();
    suggestionList.innerHTML = '';
    if (!val) { suggestionList.style.display = 'none'; return; }
    const match = clientiEsistenti.filter(c => c.toLowerCase().includes(val));
    if (match.length === 0) { suggestionList.style.display = 'none'; return; }
    suggestionList.style.display = 'block';
    match.forEach(c => {
        const div = document.createElement('div');
        div.className = 'suggestion-item';
        div.textContent = c;
        div.onclick = () => {
            inputCliente.value = c;
            suggestionList.style.display = 'none';
        };
        suggestionList.appendChild(div);
    });
});

inputCliente.addEventListener('blur', () => {
    setTimeout(() => suggestionList.style.display = 'none', 200);
});

inputCliente.addEventListener('focus', () => {
    if (inputCliente.value.trim()) {
        inputCliente.dispatchEvent(new Event('input'));
    }
});

function mostraMessaggio(icona, titolo, testo, callback) {
    msgIcon.textContent = icona;
    msgTitle.textContent = titolo;
    msgText.textContent = testo;
    msgOverlay.style.display = 'flex';
    msgBtn.onclick = () => {
        msgOverlay.style.display = 'none';
        if (callback) callback();
    };
}

// ---- NAVIGAZIONE ----
function mostraSchermo(screen) {
    [screenCliente, screenCamera, screenPreview].forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
}

// ---- CLIENTE ----
btnAvvia.addEventListener('click', async () => {
    cliente = inputCliente.value.trim();
    if (!cliente) return mostraMessaggio('ℹ️', 'Cliente', 'Inserisci il nome del cliente');
    clienteBadge.textContent = 'Cliente: ' + cliente;
    await avviaFotocamera();
});

// ---- FOTOCAMERA ----
async function avviaFotocamera() {
    try {
        if (stream) stream.getTracks().forEach(t => t.stop());
        const constraints = {
            video: { facingMode: frontCamera ? 'user' : 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
            audio: false
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        mostraSchermo(screenCamera);
    } catch (e) {
        mostraMessaggio('❌', 'Fotocamera', e.message);
    }
}

btnFlip.addEventListener('click', () => {
    frontCamera = !frontCamera;
    avviaFotocamera();
});

btnChiudi.addEventListener('click', fermaCamera);

function fermaCamera() {
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    mostraSchermo(screenCliente);
}

// ---- SCATTO ----
btnScatta.addEventListener('click', () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    previewImg.src = canvas.toDataURL('image/jpeg', 0.92);
    currentFile = null;
    mostraSchermo(screenPreview);
});

btnRiscatta.addEventListener('click', () => {
    mostraSchermo(screenCamera);
});

// ---- INVIO ----
btnConferma.addEventListener('click', async () => {
    const dataUrl = previewImg.src;
    if (!dataUrl || dataUrl === 'data:,') return;

    btnConferma.disabled = true;
    mostraStatus(true, 'Preparazione...');

    try {
        // Converti dataUrl in Blob
        const res = await fetch(dataUrl);
        const blob = await res.blob();

        const filename = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0,14) + '.jpg';

        const formData = new FormData();
        formData.append('foto', blob, filename);
        formData.append('cliente', cliente);

        mostraStatus(true, 'Caricamento in corso...');

        const xhr = new XMLHttpRequest();
        xhr.open('POST', API_URL);

        xhr.upload.onprogress = e => {
            if (e.lengthComputable) {
                const pct = Math.round(e.loaded / e.total * 100);
                progressFill.style.width = pct + '%';
                statusText.textContent = 'Caricamento ' + pct + '%';
            }
        };

        xhr.onload = () => {
            mostraStatus(false, '');
            if (xhr.status === 200) {
                mostraMessaggio('✅', 'Salvato!', 'Foto salvata sul server', () => {
                    mostraSchermo(screenCamera);
                });
            } else {
                mostraMessaggio('❌', 'Errore', xhr.responseText || 'Salvataggio fallito');
            }
            btnConferma.disabled = false;
        };

        xhr.onerror = () => {
            mostraStatus(false, '');
            mostraMessaggio('❌', 'Errore', 'Errore di connessione al server');
            btnConferma.disabled = false;
        };

        xhr.send(formData);

    } catch (e) {
        mostraStatus(false, '');
        mostraMessaggio('❌', 'Errore', e.message);
        btnConferma.disabled = false;
    }
});

function mostraStatus(visibile, testo) {
    uploadStatus.style.display = visibile ? 'block' : 'none';
    statusText.textContent = testo;
    progressFill.style.width = '0%';
}

// ---- REGISTRA SW ----
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}
