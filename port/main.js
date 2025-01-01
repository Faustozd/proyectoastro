const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');


function ejecutarScriptCierrePuertos(target, ports, event) {
    const scriptPython = path.join(__dirname, 'back-end', 'port_closer.py');

    event.reply('scan-status', { status: 'Cerrando puertos...' });

    // Convertir los ports en una lista de argumentos para el script
    const portsArgs = ports.map(port => `-p "${port}"`).join(' ');

    exec(`python "${scriptPython}" -t ${target} ${portsArgs}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error cerrando puertos: ${error.message}`);
            event.reply('scan-status', { status: 'Error', message: `Error cerrando puertos: ${error.message}` });
            return;
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            event.reply('scan-status', { status: 'Error', message: `Error: ${stderr}` });
            return;
        }

        try {
            const results = JSON.parse(stdout);
            console.log('Resultados del cierre de puertos:', results);

            event.reply('ports-closed', results);
            event.reply('scan-status', { status: 'Completado' });
        } catch (parseError) {
            console.error("Error al parsear los resultados JSON:", parseError);
            event.reply('scan-status', { status: 'Error', message: 'Error al procesar los resultados' });
        }
    });
}

// Modificar la configuración de ipcMain
ipcMain.on('close-unnecessary-ports', (event, data) => {
    ejecutarScriptCierrePuertos(data.target, data.openPorts, event);
});



function ejecutarScriptPython(target, startPort, endPort, event) {
    const scriptPython = path.join(__dirname, 'back-end', 'port_scanner.py'); // Cambié el nombre a port_scanner.py

    // Notificar al frontend que el escaneo ha comenzado
    event.reply('scan-status', { status: 'Iniciado' });

    console.log(`Ejecutando el script Python en: ${scriptPython}`);

exec(`python "${scriptPython}" -t ${target} -s ${startPort} -e ${endPort}`, (error, stdout, stderr) => {
    if (error) {
        console.error(`Error ejecutando el script de Python: ${error.message}`);
        event.reply('scan-status', { status: 'Error', message: `Error ejecutando el script: ${error.message}` });
        return;
    }
    if (stderr) {
        console.error(`stderr: ${stderr}`);
        event.reply('scan-status', { status: 'Error', message: `stderr: ${stderr}` });
        return;
    }
    console.log(`stdout: ${stdout}`);

    try {
        // El stdout ya es JSON, por lo que se puede parsear directamente
        const results = JSON.parse(stdout);
        console.log('Resultados del escaneo:', results);

        event.reply('scan-results', results);
        event.reply('scan-status', { status: 'Completado' });  // Notificar que el escaneo ha finalizado
    } catch (parseError) {
        console.error("Error al parsear los resultados JSON:", parseError);
        event.reply('scan-status', { status: 'Error', message: 'Error al procesar los resultados' });
    }
});
}

function crearVentanaPrincipal() {
    const ventana = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    ventana.loadFile(path.join(__dirname, 'front-end', 'screens', 'login.html')).catch(err => {
        console.error('Error al cargar el archivo:', err);
    });

    // Escuchar el evento de login exitoso
    ipcMain.on('login-success', (event, credentials) => {
        // Si el login es exitoso, cargar la ventana principal y ejecutar el script de Python
        ventana.loadFile(path.join(__dirname, 'front-end', 'screens', 'principal_screen.html')).catch(err => {
            console.error('Error al cargar la ventana principal:', err);
        });

        // Ejecutar el escaneo de puertos con los datos del login
        ejecutarScriptPython(credentials.target, credentials.startPort, credentials.endPort, event);
    });
}

app.whenReady().then(() => {
    crearVentanaPrincipal();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        crearVentanaPrincipal();
    }
});

function ejecutarEscaneoArchivo(filePath, event) {
    const scriptPython = path.join(__dirname, 'back-end', 'virus_scanner.py');

    exec(`python "${scriptPython}" "${filePath}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error al escanear el archivo: ${error.message}`);
            event.reply('file-scan-result', { error: `Error: ${error.message}` });
            return;
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            event.reply('file-scan-result', { error: `Error: ${stderr}` });
            return;
        }

        try {
            const result = JSON.parse(stdout);
            event.reply('file-scan-result', { stats: result });
        } catch (parseError) {
            console.error("Error al parsear los resultados JSON:", parseError);
            event.reply('file-scan-result', { error: 'Error al procesar los resultados' });
        }
    });
}

// Manejar el evento para escanear archivos
ipcMain.on('scan-file', (event, filePath) => {
    ejecutarEscaneoArchivo(filePath, event);
});

//func de obtener consejos 
function obtenerConsejoCiberseguridad(event) {
    const scriptPython = path.join(__dirname, 'back-end', 'consejos_ciberseguridad.py');
    
    exec(`python "${scriptPython}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            event.reply('security-advice-response', { error: error.message });
            return;
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            event.reply('security-advice-response', { error: stderr });
            return;
        }
        
        try {
            const resultado = JSON.parse(stdout);
            event.reply('security-advice-response', resultado);
        } catch (parseError) {
            event.reply('security-advice-response', { error: 'Error al procesar el consejo' });
        }
    });
}

ipcMain.on('get-security-advice', (event) => {
    obtenerConsejoCiberseguridad(event);
});
//modificiacion de secreto