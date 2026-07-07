// ---- STATO ----
let cliente = '';
let stream = null;
let frontCamera = false;
let currentFile = null;
let filePickerFromScarta = false; // true se il file picker è stato aperto da "Scarta", false se da "Avvia Fotocamera"

// Endpoint per upload foto
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
const btnPreviewIndietro = $('btnPreviewIndietro');
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
const fileInput = $('fileInput');
const multiFileBadge = $('multiFileBadge');

// ---- RILEVA SE È DESKTOP ----
function isMobile() {
    return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(navigator.userAgent);
}

// Adatta etichetta pulsante in base al device
if (!isMobile()) {
    btnAvvia.textContent = 'Carica File';
}
let clientiEsistenti = [];
let pendingFiles = []; // Coda file multipli (desktop)
let filesTotal = 0;    // Numero totale file selezionati

// ---- CARICA CLIENTI ESISTENTI ----
fetch('/api/clienti').then(r => r.json()).then(lista => {
    clientiEsistenti = Array.isArray(lista) ? lista.sort((a, b) => a.localeCompare(b)) : [];
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
    [screenCliente, screenCamera, screenPreview, screenArchivioClienti, screenGriglia, screenCarosello].forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
}

// ---- CLIENTE ----
btnAvvia.addEventListener('click', async () => {
    cliente = inputCliente.value.trim();
    if (!cliente) return mostraMessaggio('ℹ️', 'Cliente', 'Inserisci il nome del cliente');
    clienteBadge.textContent = 'Cliente: ' + cliente;
    inputCliente.value = '';

    if (!isMobile()) {
        // Desktop: apri file picker invece della fotocamera
        filePickerFromScarta = false;
        fileInput.click();
        return;
    }

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

btnPreviewIndietro.addEventListener('click', () => {
    pendingFiles = [];
    filesTotal = 0;
    multiFileBadge.style.display = 'none';
    fermaCamera();
});

btnRiscatta.addEventListener('click', () => {
    if (!isMobile()) {
        // Desktop: riapri file picker
        pendingFiles = [];
        filesTotal = 0;
        multiFileBadge.style.display = 'none';
        filePickerFromScarta = true;
        fileInput.click();
        return;
    }
    mostraSchermo(screenCamera);
});

// ---- FILE PICKER (DESKTOP) ----
fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) {
        // Annullato: se era da Avvia Fotocamera → torna alla home
        if (!filePickerFromScarta) fermaCamera();
        return;
    }

    pendingFiles = files;
    filesTotal = files.length;

    if (files.length > 1) {
        // Multi-file: upload automatico in sequenza
        mostraStatus(true, `Caricamento 1 di ${filesTotal}...`);
        uploadFileMulti(0);
    } else {
        // Singolo file: mostra anteprima come prima
        mostraFileInAnteprima(0);
    }
    fileInput.value = '';
});

function mostraFileInAnteprima(index) {
    const file = pendingFiles[index];
    if (!file) return;
    currentFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => {
        previewImg.src = ev.target.result;
        const fileNum = filesTotal - pendingFiles.length + index + 1;
        multiFileBadge.textContent = `${fileNum} / ${filesTotal}`;
        multiFileBadge.style.display = 'block';
        mostraSchermo(screenPreview);
    };
    reader.readAsDataURL(file);
}

async function uploadFileMulti(index) {
    const file = pendingFiles[index];
    if (!file) return;

    const fileNum = filesTotal - pendingFiles.length + index + 1;
    mostraStatus(true, `Caricamento ${fileNum} di ${filesTotal}...`);

    try {
        // Leggi il file come data URL
        const dataUrl = await new Promise(resolve => {
            const r = new FileReader();
            r.onload = e => resolve(e.target.result);
            r.readAsDataURL(file);
        });

        const res = await fetch(dataUrl);
        const blob = await res.blob();

        const filename = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0,14) + '.jpg';

        const formData = new FormData();
        formData.append('foto', blob, filename);
        formData.append('cliente', cliente);

        const uploaded = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', API_URL);

            xhr.upload.onprogress = e => {
                if (e.lengthComputable) {
                    const pct = Math.round(e.loaded / e.total * 100);
                    progressFill.style.width = pct + '%';
                    statusText.textContent = `File ${fileNum}/${filesTotal} ${pct}%`;
                }
            };

            xhr.onload = () => resolve(xhr.status === 200);
            xhr.onerror = () => resolve(false);
            xhr.send(formData);
        });

        if (!uploaded) {
            mostraStatus(false, '');
            mostraMessaggio('❌', 'Errore', `Caricamento file ${fileNum} fallito`);
            pendingFiles = [];
            filesTotal = 0;
            return;
        }

        // Passa al prossimo file
        if (index + 1 < pendingFiles.length) {
            uploadFileMulti(index + 1);
        } else {
            // Tutti caricati!
            pendingFiles = [];
            filesTotal = 0;
            mostraStatus(false, '');
            mostraMessaggio('✅', 'Salvataggio eseguito !', '', () => {
                if (isMobile()) {
                    mostraSchermo(screenCamera);
                } else {
                    previewImg.src = 'data:,';
                    currentFile = null;
                    filePickerFromScarta = false;
                    fileInput.click();
                }
            });
        }
    } catch (e) {
        mostraStatus(false, '');
        mostraMessaggio('❌', 'Errore', e.message);
        pendingFiles = [];
        filesTotal = 0;
    }
}

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
                    if (isMobile()) {
                        mostraSchermo(screenCamera);
                    } else {
                        // Desktop: pulisci anteprima e riapri subito il file picker
                        previewImg.src = 'data:,';
                        currentFile = null;
                        filePickerFromScarta = false;
                        fileInput.click();
                    }
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

// ---- ELEMENTI ARCHIVIO / GRIGLIA / CAROSELLO ----
const btnArchivio = $('btnArchivio');
const screenArchivioClienti = $('screen-archivio-clienti');
const screenGriglia = $('screen-griglia');
const screenCarosello = $('screen-carosello');
const btnArchivioIndietro = $('btnArchivioIndietro');
const listaClientiArchivio = $('listaClientiArchivio');
const btnGrigliaIndietro = $('btnGrigliaIndietro');
const grigliaTitolo = $('grigliaTitolo');
const grigliaConta = $('grigliaConta');
const grigliaFoto = $('grigliaFoto');
const grigliaVuoto = $('grigliaVuoto');
const btnCaroselloIndietro = $('btnCaroselloIndietro');
const btnCaroselloPrev = $('btnCaroselloPrev');
const btnCaroselloNext = $('btnCaroselloNext');
const caroselloImg = $('caroselloImg');
const caroselloCounter = $('caroselloCounter');
const caroselloTitolo = $('caroselloTitolo');
const caroselloVuoto = $('caroselloVuoto');

let fotoList = [];
let fotoIndex = 0;
let clienteCorrente = '';

// ---- ARCHIVIO: APRI SELEZIONE CLIENTE ----
btnArchivio.addEventListener('click', async () => {
    mostraSchermo(screenArchivioClienti);
    listaClientiArchivio.innerHTML = '<div style="text-align:center;color:#666;padding:20px">Caricamento...</div>';

    try {
        const res = await fetch('/api/clienti');
        let clienti = await res.json();
        if (Array.isArray(clienti)) clienti.sort((a, b) => a.localeCompare(b));
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
        div.innerHTML = `<span class="icona">📁</span><span class="nome">${c}</span>
            <span class="elimina-cliente" data-cliente="${c}">🗑️</span>`;
        div.addEventListener('click', e => {
            if (e.target.classList.contains('elimina-cliente')) return;
            apriGriglia(c);
        });
        listaClientiArchivio.appendChild(div);
    });

    document.querySelectorAll('.elimina-cliente').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            mostraConfermaElimina(btn.dataset.cliente);
        });
    });
}

// ---- CONFERMA ELIMINAZIONE (cliente o singola foto) ----
const confirmOverlay = $('confirmOverlay');
const confirmTitle = $('confirmTitle');
const confirmText = $('confirmText');
const confirmConferma = $('confirmConferma');
const confirmAnnulla = $('confirmAnnulla');
let confermaTarget = null; // { tipo: 'cliente', cliente: '...' } oppure { tipo: 'foto', cliente: '...', foto: '...' }

function mostraConfermaElimina(cliente) {
    confermaTarget = { tipo: 'cliente', cliente };
    confirmTitle.textContent = `Eliminare ${cliente}?`;
    confirmText.textContent = 'Tutte le foto di questo cliente verranno cancellate definitivamente.';
    confirmOverlay.style.display = 'flex';
}

function mostraConfermaEliminaFoto(cliente, foto) {
    confermaTarget = { tipo: 'foto', cliente, foto };
    confirmTitle.textContent = 'Eliminare questa foto?';
    confirmText.textContent = 'La foto verrà cancellata definitivamente.';
    confirmOverlay.style.display = 'flex';
}

confirmAnnulla.addEventListener('click', () => {
    confirmOverlay.style.display = 'none';
    confermaTarget = null;
});

confirmConferma.addEventListener('click', async () => {
    const target = confermaTarget;
    confirmOverlay.style.display = 'none';
    confermaTarget = null;
    if (!target) return;

    if (target.tipo === 'cliente') {
        try {
            const res = await fetch('/api/elimina-cliente', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `cliente=${encodeURIComponent(target.cliente)}`
            });
            if (res.ok) {
                mostraMessaggio('✅', 'Eliminato!', `Cartella "${target.cliente}" eliminata`, () => btnArchivio.click());
            } else {
                const txt = await res.text();
                mostraMessaggio('❌', 'Errore', txt || 'Eliminazione fallita');
            }
        } catch (e) {
            mostraMessaggio('❌', 'Errore', e.message);
        }
    } else if (target.tipo === 'foto') {
        try {
            const res = await fetch('/api/elimina-foto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `cliente=${encodeURIComponent(target.cliente)}&foto=${encodeURIComponent(target.foto)}`
            });
            if (res.ok) {
                mostraMessaggio('✅', 'Foto eliminata!', '', () => apriGriglia(target.cliente));
            } else {
                const txt = await res.text();
                mostraMessaggio('❌', 'Errore', txt || 'Eliminazione fallita');
            }
        } catch (e) {
            mostraMessaggio('❌', 'Errore', e.message);
        }
    }
});

// ---- ARCHIVIO: INDIETRO ----
btnArchivioIndietro.addEventListener('click', () => {
    fermaCamera();
    inputCliente.value = '';
    mostraSchermo(screenCliente);
});

// ---- GRIGLIA FOTO ----
async function apriGriglia(cliente) {
    clienteCorrente = cliente;
    mostraSchermo(screenGriglia);
    grigliaTitolo.textContent = cliente;
    grigliaConta.textContent = '';
    grigliaFoto.innerHTML = '';
    grigliaVuoto.style.display = 'none';

    try {
        const res = await fetch(`/api/foto?cliente=${encodeURIComponent(cliente)}`);
        const nomi = await res.json();

        if (!nomi || nomi.length === 0) {
            grigliaVuoto.style.display = 'flex';
            return;
        }

        grigliaConta.textContent = `${nomi.length} foto`;
        renderGriglia(cliente, nomi);
    } catch {
        grigliaVuoto.style.display = 'flex';
        grigliaVuoto.querySelector('p').textContent = 'Errore caricamento foto';
    }
}

function renderGriglia(cliente, fotoNomi) {
    grigliaFoto.innerHTML = '';
    fotoNomi.forEach(nome => {
        const item = document.createElement('div');
        item.className = 'griglia-item';

        const img = document.createElement('img');
        img.loading = 'lazy';
        img.src = `/api/foto?cliente=${encodeURIComponent(cliente)}&img=${encodeURIComponent(nome)}`;
        img.alt = nome;

        const btnDel = document.createElement('button');
        btnDel.className = 'griglia-item-delete';
        btnDel.textContent = '✕';
        btnDel.addEventListener('click', e => {
            e.stopPropagation();
            mostraConfermaEliminaFoto(cliente, nome);
        });

        item.appendChild(img);
        item.appendChild(btnDel);
        item.addEventListener('click', () => apriCarosello(cliente, fotoNomi, nome));
        grigliaFoto.appendChild(item);
    });
}

btnGrigliaIndietro.addEventListener('click', () => {
    mostraSchermo(screenArchivioClienti);
});

// ---- CAROSELLO ----
async function apriCarosello(cliente, listaNomi, fotoAvvio) {
    mostraSchermo(screenCarosello);
    caroselloTitolo.textContent = cliente;
    caroselloImg.style.display = 'none';
    caroselloVuoto.style.display = 'none';
    caroselloCounter.textContent = '0 / 0';
    fotoList = listaNomi || [];
    fotoIndex = fotoAvvio ? listaNomi.indexOf(fotoAvvio) : 0;
    if (fotoIndex < 0) fotoIndex = 0;

    if (fotoList.length === 0) {
        caroselloVuoto.style.display = 'block';
        return;
    }

    mostraFoto();
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
    if (fotoIndex > 0) { fotoIndex--; mostraFoto(); }
});

btnCaroselloNext.addEventListener('click', () => {
    if (fotoIndex < fotoList.length - 1) { fotoIndex++; mostraFoto(); }
});

btnCaroselloIndietro.addEventListener('click', () => {
    if (clienteCorrente) apriGriglia(clienteCorrente);
    else mostraSchermo(screenArchivioClienti);
});

// ---- SERVIZI OFF LINE ----
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}
