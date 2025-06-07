// main-server/server.js
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");
const { SerialPort } = require("serialport"); // Import SerialPort
const { ReadlineParser } = require("@serialport/parser-readline"); // Import ReadlineParser

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server }); // WebSocket server on the same port

const PORT_MAIN_SERVER = process.env.PORT_MAIN_SERVER || 3000; // Main server will run on port 3000
const DATA_FILE = path.join(__dirname, "../data.json"); // Path to data.json (two levels up from server.js)

console.log("__dirname:", __dirname);
// Middleware to parse JSON bodies from incoming requests
app.use(express.json());

// Ensure data.json exists and is a valid JSON array
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, "[]");
} else {
  try {
    const data = fs.readFileSync(DATA_FILE, "utf8");
    JSON.parse(data); // Validate if it's valid JSON
  } catch (e) {
    console.error("data.json is corrupted. Reinitializing.");
    fs.writeFileSync(DATA_FILE, "[]");
  }
}

app.post("/api/clear-data", (req, res) => {
  // Overwrite data.json with an empty JSON array
  fs.writeFile(DATA_FILE, "[]", (err) => {
    if (err) {
      console.error("Error clearing data file:", err);
      return res.status(500).json({ error: "Failed to clear data file" });
    }
    console.log("data.json cleared successfully.");
    res.status(200).json({ message: "Historical data cleared" });

    // Optional: Notify all connected WebSocket clients that data has been cleared.
    // This is useful if multiple dashboards are open and one clears the data.
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        // Send a specific message type so frontend can react (e.g., re-initialize)
        client.send(
          JSON.stringify({
            type: "dataCleared",
            message: "Historical data has been cleared.",
          })
        );
      }
    });
  });
});

// --- Serial Port Configuration and Data Reading ---
// IMPORTANT: Change '/dev/ttyUSB0' to your Arduino's serial port path.
// On Windows, it might be 'COM1', 'COM2', etc.
// On macOS/Linux, it might be '/dev/ttyUSB0', '/dev/ttyACM0', etc.
const serialPortPath = process.env.SERIAL_PORT_PATH || "COM15";
const baudRate = 9600;

const port = new SerialPort({ path: serialPortPath, baudRate: baudRate });
// Use ReadlineParser to parse data line by line, assuming each sensor reading ends with a newline.
const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

// Event listener for when the serial port opens
port.on("open", () => {
  console.log(`Serial Port ${serialPortPath} Open at ${baudRate} baud`);
});

// Event listener for serial port errors
port.on("error", (err) => {
  console.error("Serial Port Error:", err.message);
  // Attempt to reopen the port after a delay if an error occurs
  setTimeout(() => {
    console.log("Attempting to reopen serial port...");
    port.open((err) => {
      if (err) {
        console.error("Failed to reopen serial port:", err.message);
      }
    });
  }, 5000); // Try again after 5 seconds
});

// Event listener for incoming data from the serial port
parser.on("data", (line) => {
  console.log("Received serial data line:", line.trim()); // Trim to remove any extra whitespace

  let sensorData = {};
  try {
    // Assuming data format: "distance:X,tds:Y"
    const parts = line.trim().split(",");
    let distance = null;
    let tds = null;

    parts.forEach((part) => {
      if (part.startsWith("distance:")) {
        distance = parseFloat(part.split(":")[1]);
      } else if (part.startsWith("tds:")) {
        tds = parseFloat(part.split(":")[1]);
      }
    });

    if (distance !== null && tds !== null && !isNaN(distance) && !isNaN(tds)) {
      sensorData = { distance, tds, timestamp: new Date().toISOString() };
      console.log("Parsed sensor data:", sensorData);

      // Append data to data.json
      fs.readFile(DATA_FILE, "utf8", (err, fileData) => {
        if (err) {
          console.error("Error reading data file:", err);
          return; // Don't return res.status here as it's not an HTTP request
        }
        let existingData = [];
        try {
          existingData = JSON.parse(fileData);
        } catch (e) {
          console.error("Error parsing existing data:", e);
          existingData = []; // Reset if corrupted
        }

        existingData.push(sensorData); // Add the new data point

        // Sort the entire dataset before writing back to file
        existingData.sort((a, b) => {
          return (
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        });

        fs.writeFile(
          DATA_FILE,
          JSON.stringify(existingData, null, 2),
          (err) => {
            if (err) {
              console.error("Error writing data to file:", err);
            } else {
              console.log("Data saved to data.json (and sorted)");
              // Broadcast new data to all connected WebSocket clients
              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify(sensorData));
                }
              });
            }
          }
        );
      });
    } else {
      console.warn(
        "Incomplete or invalid sensor data format from serial:",
        line.trim()
      );
    }
  } catch (e) {
    console.error("Error processing serial data line:", line.trim(), e);
  }
});

// --- API Endpoint to Get All Historical Data (for Frontend) ---
app.get("/api/data", (req, res) => {
  fs.readFile(DATA_FILE, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading data file:", err);
      return res.status(500).json({ error: "Failed to read data" });
    }
    res.json(JSON.parse(data));
  });
});

// --- Serve Frontend Static Files ---
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// Catch-all for single-page applications (ensures index.html is served for any direct path)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start the main server
server.listen(PORT_MAIN_SERVER, () => {
  console.log(
    `Main Server (Backend + Frontend) listening on http://localhost:${PORT_MAIN_SERVER}`
  );
  console.log(`Open your browser at http://localhost:${PORT_MAIN_SERVER}`);
});
