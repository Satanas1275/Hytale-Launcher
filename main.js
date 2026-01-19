const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');

let mainWindow;
let serverProcess;

// Chemin vers Python ou le serveur compilé
const isWindows = process.platform === 'win32';
const pythonExecutable = isWindows ? 'python' : 'python3'; // ou python si tu veux
const serverScript = path.join(__dirname, 'app.py'); // ou HytaleServer.exe si compilé

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1024,
        height: 768,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        show: false // on montre après ready
    });

    // Écran de chargement local
    mainWindow.loadFile(path.join(__dirname, 'loading.html'));
    mainWindow.show();

    // Lancer le serveur Flask ou exe
    if (serverScript.endsWith('.exe')) {
        serverProcess = spawn(serverScript, [], { shell: true });
    } else {
        serverProcess = spawn(pythonExecutable, [serverScript], { shell: false });
    }

    serverProcess.stdout.on('data', (data) => {
        console.log(`[SERVER]: ${data.toString()}`);
    });

    serverProcess.stderr.on('data', (data) => {
        console.error(`[SERVER ERROR]: ${data.toString()}`);
    });

    serverProcess.on('close', (code) => {
        console.log(`[SERVER] exited with code ${code}`);
    });

    // Polling pour vérifier si le serveur est ready
    const checkServer = async () => {
        try {
            await axios.get('http://127.0.0.1:8569/');
            // Serveur prêt → charger la page web
            mainWindow.loadURL('http://127.0.0.1:8569/');
        } catch (err) {
            setTimeout(checkServer, 500); // réessayer dans 0.5s
        }
    };

    checkServer();
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
    app.quit();
});

app.on('quit', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
});
