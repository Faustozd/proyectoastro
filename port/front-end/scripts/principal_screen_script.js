const { ipcRenderer } = require('electron');

// Referencias
const startScanBtn = document.getElementById('startScanBtn');
const scanStatus = document.getElementById('scanStatus');
const scanLogs = document.getElementById('scanLogs');
const progressCircle = document.getElementById('progress');
const progressText = document.getElementById('progressText');
const totalLength = 283;

let progress = 0;
let interval;

startScanBtn.addEventListener('click', () => {
    clearInterval(interval);
    progress = 0;
    progressCircle.style.strokeDashoffset = totalLength;
    progressText.textContent = '0%';

    scanStatus.textContent = 'Escaneando...';
    scanLogs.textContent = '';

    ipcRenderer.send('login-success', { target: 'localhost', startPort: 1, endPort: 1000 });
    iniciarProgresoSimulado();
});

function iniciarProgresoSimulado() {
    const maxFakeProgress = 85;
    interval = setInterval(() => {
        const incremento = Math.floor(Math.random() * 5) + 1;
        progress += incremento;

        if (progress >= maxFakeProgress) {
            progress = maxFakeProgress;
        }

        actualizarProgresoVisual(progress);
    }, Math.floor(Math.random() * 500) + 200);
}

function actualizarProgresoVisual(progress) {
    const offset = totalLength - (totalLength * progress) / 100;
    progressCircle.style.strokeDashoffset = offset;
    progressText.textContent = `${progress}%`;
}

ipcRenderer.on('scan-results', (event, results) => {
    clearInterval(interval);
    progress = 100;
    actualizarProgresoVisual(progress);
    progressText.textContent = '100%';
    scanStatus.textContent = 'Completado';

    const logsText = [
        "Puertos Abiertos: " + results.puertosAbiertos.labels.join(', '),
        "\nLogs de Escaneo:",
        ...results.logs
    ].join('\n');

    scanLogs.textContent = logsText;
    window.openPorts = results.puertosAbiertos.labels;
});

// Modificar el evento para cerrar puertos
document.getElementById('closePortsBtn').addEventListener('click', () => {
    if (!window.openPorts || window.openPorts.length === 0) {
        document.getElementById('scanStatus').textContent = 'No hay puertos para cerrar';
        return;
    }

    document.getElementById('scanStatus').textContent = 'Cerrando puertos innecesarios...';
    
    ipcRenderer.send('close-unnecessary-ports', { 
        target: 'localhost', 
        openPorts: window.openPorts 
    });
});

// Escuchar evento de puertos cerrados
ipcRenderer.on('ports-closed', (event, results) => {
    if (results.puertosCerrados && results.puertosCerrados.labels.length > 0) {
        const closedPortsText = results.puertosCerrados.labels.join(', ');
        document.getElementById('scanLogs').textContent += 
            `\n\nPuertos Cerrados: ${closedPortsText}`;
    } else {
        document.getElementById('scanLogs').textContent += 
            '\n\nNo se encontraron puertos innecesarios para cerrar.';
    }
});

// Evento para escanear archivo
document.getElementById('scanFileBtn').addEventListener('click', () => {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file) {
        document.getElementById('fileScanResult').textContent = 'Por favor, seleccione un archivo.';
        return;
    }

    document.getElementById('fileScanResult').textContent = 'Escaneando archivo...';

    // Enviar el archivo al proceso principal para escanear
    ipcRenderer.send('scan-file', file.path);
});

// Escuchar el resultado del análisis del archivo
ipcRenderer.on('file-scan-result', (event, result) => {
    if (result.error) {
        document.getElementById('fileScanResult').textContent = `Error: ${result.error}`;
    } else {
        const stats = result.stats;
        document.getElementById('fileScanResult').textContent = 
            `Malware detectado: ${stats.malicious || 0}\n` + 
            `Limpio: ${stats.undetected || 0}`;
    }
});

floatingButton.addEventListener('click', () => {
    popup.style.display = 'block';
    aiAdvice.textContent = 'Obteniendo consejo...';
    
    ipcRenderer.send('get-security-advice');
});

ipcRenderer.on('security-advice-response', (event, data) => {
    if (data.error) {
        aiAdvice.textContent = 'Error al obtener el consejo. Por favor, intente nuevamente.';
    } else {
        aiAdvice.textContent = data.consejo;
    }
});