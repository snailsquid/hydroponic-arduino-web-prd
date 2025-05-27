// arduino-dummy-server/dummy_server.js

// Using a global variable to store the fetch function after dynamic import
let fetch;

// Define the endpoint on the main server where data should be sent
const MAIN_SERVER_DATA_ENDPOINT = 'http://localhost:3000/api/sensor-data'; // Main server's data reception endpoint

let currentDistance = 50; // Starting point for distance
let currentTDS = 200;     // Starting point for TDS

function generateDummySensorData() {
    // Simulate semi-fluctuating distance (e.g., 20-100 cm)
    currentDistance += (Math.random() * 10 - 5); // Add/subtract up to 5 cm
    if (currentDistance < 20) currentDistance = 20;
    if (currentDistance > 100) currentDistance = 100;
    currentDistance = parseFloat(currentDistance.toFixed(2)); // Keep two decimal places

    // Simulate semi-fluctuating TDS (e.g., 100-500 ppm)
    currentTDS += (Math.random() * 50 - 25); // Add/subtract up to 25 ppm
    if (currentTDS < 100) currentTDS = 100;
    if (currentTDS > 500) currentTDS = 500;
    currentTDS = parseFloat(currentTDS.toFixed(2)); // Keep two decimal places

    return {
        distance: currentDistance,
        tds: currentTDS
    };
}

// Function to send data to the main server (now async)
async function sendDataToMainServer() {
    // Dynamically import fetch if it hasn't been imported yet
    if (!fetch) {
        // We use a try-catch block here to handle potential import errors,
        // though typically it should succeed if node-fetch is installed.
        try {
            const nodeFetchModule = await import('node-fetch');
            fetch = nodeFetchModule.default; // node-fetch exports a default function
        } catch (e) {
            console.error("Failed to dynamically import node-fetch:", e);
            return; // Exit if fetch can't be loaded
        }
    }

    const sensorData = generateDummySensorData();
    sensorData.timestamp = new Date().toISOString(); // Add a timestamp

    console.log('Sending dummy data:', sensorData);

    try {
        const response = await fetch(MAIN_SERVER_DATA_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(sensorData)
        });

        if (response.ok) {
            console.log('Dummy data sent successfully to main server.');
        } else {
            const errorText = await response.text();
            console.error(`Failed to send dummy data. Status: ${response.status}, Error: ${errorText}`);
        }
    } catch (error) {
        console.error('Error sending dummy data to main server:', error.message);
    }
}

// Start sending data every 3 seconds
// We call sendDataToMainServer immediately, then schedule it with setInterval
sendDataToMainServer(); // Initial send
setInterval(sendDataToMainServer, 3000);

console.log('Dummy Arduino Server started. Sending data to', MAIN_SERVER_DATA_ENDPOINT, 'every 3 seconds.');
