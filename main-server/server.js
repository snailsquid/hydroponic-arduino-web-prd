// main-server/server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server }); // WebSocket server on the same port

const PORT_MAIN_SERVER = process.env.PORT_MAIN_SERVER || 3000; // Main server will run on port 3000
const DATA_FILE = path.join(__dirname, '../../data.json'); // Path to data.json (two levels up from server.js)

console.log('__dirname:', __dirname);
// Middleware to parse JSON bodies from incoming requests
app.use(express.json());

// Ensure data.json exists and is a valid JSON array
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]');
} else {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        JSON.parse(data); // Validate if it's valid JSON
    } catch (e) {
        console.error("data.json is corrupted. Reinitializing.");
        fs.writeFileSync(DATA_FILE, '[]');
    }
}

app.post('/api/clear-data', (req, res) => {
    // Overwrite data.json with an empty JSON array
    fs.writeFile(DATA_FILE, '[]', err => {
        if (err) {
            console.error('Error clearing data file:', err);
            return res.status(500).json({ error: 'Failed to clear data file' });
        }
        console.log('data.json cleared successfully.');
        res.status(200).json({ message: 'Historical data cleared' });

        // Optional: Notify all connected WebSocket clients that data has been cleared.
        // This is useful if multiple dashboards are open and one clears the data.
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                // Send a specific message type so frontend can react (e.g., re-initialize)
                client.send(JSON.stringify({ type: 'dataCleared', message: 'Historical data has been cleared.' }));
            }
        });
    });
});


// --- API Endpoint to Receive Sensor Data (from Dummy Arduino or real Arduino) ---
app.post('/api/sensor-data', (req, res) => {
    const sensorData = req.body; // Data sent from the Arduino/dummy server

    if (!sensorData || typeof sensorData.distance === 'undefined' || typeof sensorData.tds === 'undefined') {
        return res.status(400).json({ error: 'Invalid sensor data format' });
    }

    sensorData.timestamp = new Date().toISOString(); // Ensure timestamp is added/updated

    console.log('Received sensor data:', sensorData);

    // Append data to data.json
    fs.readFile(DATA_FILE, 'utf8', (err, fileData) => {
        if (err) {
            console.error('Error reading data file:', err);
            return res.status(500).json({ error: 'Failed to read data file' });
        }
        let existingData = [];
        try {
            existingData = JSON.parse(fileData);
        } catch (e) {
            console.error('Error parsing existing data:', e);
            existingData = []; // Reset if corrupted
        }

        existingData.push(sensorData); // Add the new data point

        // --- NEW: Sort the entire dataset before writing back to file ---
        existingData.sort((a, b) => {
            return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        });
        // -------------------------------------------------------------

        fs.writeFile(DATA_FILE, JSON.stringify(existingData, null, 2), err => {
            if (err) {
                console.error('Error writing data to file:', err);
                return res.status(500).json({ error: 'Failed to write data to file' });
            } else {
                console.log('Data saved to data.json (and sorted)');
                // Broadcast new data to all connected WebSocket clients
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify(sensorData));
                    }
                });
                res.status(200).json({ message: 'Data received and saved' });
            }
        });
    });
});

// --- API Endpoint to Get All Historical Data (for Frontend) ---
app.get('/api/data', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading data file:', err);
            return res.status(500).json({ error: 'Failed to read data' });
        }
        res.json(JSON.parse(data));
    });
});

// --- Serve Frontend Static Files ---
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Catch-all for single-page applications (ensures index.html is served for any direct path)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the main server
server.listen(PORT_MAIN_SERVER, () => {
    console.log(`Main Server (Backend + Frontend) listening on http://localhost:${PORT_MAIN_SERVER}`);
    console.log(`Open your browser at http://localhost:${PORT_MAIN_SERVER}`);
});
