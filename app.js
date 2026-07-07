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
    [screenCliente, screenCamera, screenPreview, screenArchivioClienti, screenCarosello].forEach(s => s.classList.remove('active'));
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
                mostraMessaggio('✅', 'Salvataggio eseguito !', '', () => {
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

// ---- ELEMENTI ARCHIVIO / CAROSELLO ----
const btnArchivio = $('btnArchivio');
const screenArchivioClienti = $('screen-archivio-clienti');
const screenCarosello = $('screen-carosello');
const btnArchivioIndietro = $('btnArchivioIndietro');
const listaClientiArchivio = $('listaClientiArchivio');
const btnCaroselloIndietro = $('btnCaroselloIndietro');
const btnCaroselloPrev = $('btnCaroselloPrev');
const btnCaroselloNext = $('btnCaroselloNext');
const caroselloImg = $('caroselloImg');
const caroselloCounter = $('caroselloCounter');
const caroselloTitolo = $('caroselloTitolo');
const caroselloVuoto = $('caroselloVuoto');

let fotoList = [];
let fotoIndex = 0;

// ---- ARCHIVIO: APRI SELEZIONE CLIENTE ----
btnArchivio.addEventListener('click', async () => {
    mostraSchermo(screenArchivioClienti);
    listaClientiArchivio.innerHTML = '<div style="text-align:center;color:#666;padding:20px">Caricamento...</div>';

    try {
        const res = await fetch('/api/clienti');
        const clienti = await res.json();
        renderListaClienti(clienti);
    } catch {
        listaClientiArchivio.innerHTML = '<div style="text-align:center;color:#f44;padding:20px">Errore caricamento clienti</div>';
    }
});

function renderListaClienti(clienti) {
    if (!clienti || clienti.length === 0) {
        listaClientiArchivio.innerHTML = '<div style="text-align:center;color:#888;padding:20px">Nessun cliente trovato</div>';
        return;
    }

    listaClientiArchivio.innerHTML = '';
    clienti.forEach(c => {
        const div = document.createElement('div');
        div.className = 'item-cliente-archivio';
        div.innerHTML = `<span class="icona">📁</span><span class="nome">${c}</span><span class="conta">→</span>`;
        div.addEventListener('click', () => apriCarosello(c));
        listaClientiArchivio.appendChild(div);
    });
}

// ---- ARCHIVIO: INDIETRO ----
btnArchivioIndietro.addEventListener('click', () => {
    fermaCamera();
    mostraSchermo(screenCliente);
});

// ---- CAROSELLO ----
async function apriCarosello(cliente) {
    mostraSchermo(screenCarosello);
    caroselloTitolo.textContent = cliente;
    caroselloImg.style.display = 'none';
    caroselloVuoto.style.display = 'none';
    caroselloCounter.textContent = '0 / 0';
    fotoList = [];
    fotoIndex = 0;

    try {
        const res = await fetch(`/api/foto?cliente=${encodeURIComponent(cliente)}`);
        const nomi = await res.json();

        if (!nomi || nomi.length === 0) {
            caroselloVuoto.style.display = 'block';
            return;
        }

        fotoList = nomi;
        fotoIndex = 0;
        mostraFoto();
    } catch {
        caroselloVuoto.style.display = 'block';
        caroselloVuoto.querySelector('p').textContent = 'Errore caricamento foto';
    }
}

function mostraFoto() {
    if (fotoList.length === 0) return;

    const nome = fotoList[fotoIndex];
    const cliente = caroselloTitolo.textContent;
    caroselloImg.style.display = 'block';
    caroselloImg.style.opacity = '0.3';
    caroselloImg.src = `/api/foto?cliente=${encodeURIComponent(cliente)}&img=${encodeURIComponent(nome)}`;
    caroselloImg.onload = () => { caroselloImg.style.opacity = '1'; };
    caroselloCounter.textContent = `${fotoIndex + 1} / ${fotoList.length}`;
    aggiornaBottoniNav();
}

function aggiornaBottoniNav() {
    btnCaroselloPrev.disabled = fotoIndex <= 0;
    btnCaroselloNext.disabled = fotoIndex >= fotoList.length - 1;
}

btnCaroselloPrev.addEventListener('click', () => {
    if (fotoIndex > 0) {
        fotoIndex--;
        mostraFoto();
    }
});

btnCaroselloNext.addEventListener('click', () => {
    if (fotoIndex < fotoList.length - 1) {
        fotoIndex++;
        mostraFoto();
    }
});

btnCaroselloIndietro.addEventListener('click', () => {
    mostraSchermo(screenArchivioClienti);
});

// ---- DISINSTALLA VECCHIO SW ----
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(r => r.forEach(r => r.unregister()));
}
