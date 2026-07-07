<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200); exit;
}

$cliente = $_POST['cliente'] ?? 'Sconosciuto';
$file = $_FILES['foto'] ?? null;

if (!$file || $file['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    die('Nessun file ricevuto');
}

$dir = "FotoLavori/" . preg_replace('/[^a-zA-Z0-9 ]/', '', $cliente);
if (!file_exists($dir)) {
    mkdir($dir, 0777, true);
}

$filename = date('dmYHis') . '.jpg';
$dest = "$dir/$filename";

if (move_uploaded_file($file['tmp_name'], $dest)) {
    echo 'OK';
} else {
    http_response_code(500);
    echo 'Errore salvataggio';
}
