// main-server/public/script.js
// This script runs in the user's web browser to display real-time sensor data.

// Get references to the HTML elements where current sensor readings will be displayed.
const currentDistanceElement = document.getElementById("currentDistance");
const currentTDSElement = document.getElementById("currentTDS");
const clearGraphsButton = document.getElementById("clearGraphsButton");

// Variables to hold the Chart.js chart instances.
let distanceChart;
let tdsChart;

// Define the maximum number of data points to display on the charts for performance.
const MAX_DATA_POINTS = 20;

// Define the URL for the main server's API and WebSocket endpoints.
const MAIN_SERVER_URL = "http://localhost:3000";
const WEBSOCKET_URL = "ws://localhost:3000";

/**
 * Initializes the Chart.js graphs with initial data.
 * This function is called once when the page loads, using historical data.
 * @param {Array<Object>} initialData - An array of sensor data objects.
 */
function initializeCharts(initialData = []) {
  //   Chart.helpers.canvas.clipArea = function () {};
  //   Chart.helpers.canvas.unclipArea = function () {};
  // --- ADDED: Destroy existing charts if they already exist ---
  if (distanceChart) {
    distanceChart.destroy();
  }
  if (tdsChart) {
    tdsChart.destroy();
  }
  // -----------------------------------------------------------

  const canvasDistance = document.getElementById("distanceChart");
  console.log(
    'Attempting to find canvas with ID "distanceChart":',
    canvasDistance
  );
  if (!canvasDistance) {
    console.error(
      "Critical: Canvas element 'distanceChart' not found! Chart cannot be initialized."
    );
    return; // Exit the function if canvas not found
  }
  const ctxDistance = canvasDistance.getContext("2d");
  console.log("Context for distanceChart:", ctxDistance);

  const canvasTDS = document.getElementById("tdsChart");
  console.log('Attempting to find canvas with ID "tdsChart":', canvasTDS);
  if (!canvasTDS) {
    console.error(
      "Critical: Canvas element 'tdsChart' not found! Chart cannot be initialized."
    );
    return; // Exit the function if canvas not found
  }
  const ctxTDS = canvasTDS.getContext("2d");
  console.log("Context for tdsChart:", ctxTDS);

  // --- ADDED: Safety check for contexts ---
  if (!ctxDistance || !ctxTDS) {
    console.error(
      "Could not get 2D context for one or both canvases. Charts cannot be initialized."
    );
    return;
  }
  // ------------------------------------

  // Prepare data for Chart.js: separate timestamps (labels) and values.
  const distanceLabels = initialData.map((d) => new Date(d.timestamp));
  const distanceValues = initialData.map((d) => d.distance);
  const tdsLabels = initialData.map((d) => new Date(d.timestamp));
  const tdsValues = initialData.map((d) => d.tds);

  // Create the Distance Chart
  distanceChart = new Chart(ctxDistance, {
    type: "line",
    data: {
      labels: distanceLabels,
      datasets: [
        {
          label: "Distance (cm)",
          data: distanceValues,
          borderColor: "rgb(75, 192, 192)",
          tension: 0.1,
          fill: false,
          pointRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: "time",
          time: {
            unit: "second",
            tooltipFormat: "HH:mm:ss",
            displayFormats: {
              second: "HH:mm:ss",
            },
          },
          title: {
            display: true,
            text: "Time",
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Distance (cm)",
          },
        },
      },
      animation: true,
    },
  });

  // Create the TDS Chart
  tdsChart = new Chart(ctxTDS, {
    type: "line",
    data: {
      labels: tdsLabels,
      datasets: [
        {
          label: "TDS (ppm)",
          data: tdsValues,
          borderColor: "rgb(255, 99, 132)",
          tension: 0.1,
          fill: false,
          pointRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: "time",
          time: {
            unit: "second",
            tooltipFormat: "HH:mm:ss",
            displayFormats: {
              second: "HH:mm:ss",
            },
          },
          title: {
            display: true,
            text: "Time",
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "TDS (ppm)",
          },
        },
      },
      animation: true,
    },
  });
}

/**
 * Adds new sensor data to the charts and updates the current readings display.
 * @param {Object} sensorData - A single sensor data object.
 */
function addDataToCharts(sensorData) {
  // --- ADDED: Check if charts are initialized before adding data ---
  if (!distanceChart || !tdsChart) {
    console.warn("Charts not initialized yet. Skipping data update.");
    return;
  }
  // ---------------------------------------------------------------

  const timestamp = new Date(sensorData.timestamp);

  currentDistanceElement.textContent = `${sensorData.distance} cm`;
  currentTDSElement.textContent = `${sensorData.tds} ppm`;

  distanceChart.data.labels.push(timestamp);
  distanceChart.data.datasets[0].data.push(sensorData.distance);

  tdsChart.data.labels.push(timestamp);
  tdsChart.data.datasets[0].data.push(sensorData.tds);

  // if (distanceChart.data.labels.length > MAX_DATA_POINTS) {
  //   distanceChart.data.labels.shift();
  //   distanceChart.data.datasets[0].data.shift();
  // }
  // if (tdsChart.data.labels.length > MAX_DATA_POINTS) {
  //   tdsChart.data.labels.shift();
  //   tdsChart.data.datasets[0].data.shift();
  // }

  distanceChart.update();
  tdsChart.update();
}

// --- Initial Data Fetch ---
fetch(`${MAIN_SERVER_URL}/api/data`)
  .then((response) => response.json())
  .then((data) => {
    console.log("Historical data loaded:", data);
    initializeCharts(data);

    if (data.length > 0) {
      const latest = data[data.length - 1];
      currentDistanceElement.textContent = `${latest.distance} cm`;
      currentTDSElement.textContent = `${latest.tds} ppm`;
    }
  })
  .catch((error) => {
    console.error("Error fetching historical data:", error);
    initializeCharts([]); // Initialize empty charts if fetching fails
  });

/**
 * Clears all data from the graphs on the frontend and sends a request
 * to the backend to clear the stored historical data.
 */
async function clearGraphsAndData() {
  // 1. Confirm with the user before performing a destructive action
  if (
    !confirm(
      "Are you sure you want to clear ALL historical data and reset the graphs? This action cannot be undone."
    )
  ) {
    return; // User cancelled the operation
  }

  try {
    // 2. Send a POST request to the backend to clear data.json
    const response = await fetch(`${MAIN_SERVER_URL}/api/clear-data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // No body needed for a simple clear command
    });

    if (!response.ok) {
      // If the server response status is not OK (e.g., 500 error)
      const errorText = await response.text();
      throw new Error(
        `Failed to clear data on server: ${response.status} - ${errorText}`
      );
    }

    console.log("Backend data cleared successfully.");

    // 3. Clear data from Chart.js instances on the frontend
    if (distanceChart) {
      distanceChart.data.labels = []; // Clear all labels (timestamps)
      distanceChart.data.datasets[0].data = []; // Clear all data points
      distanceChart.update(); // Update the chart to reflect the empty data
    }
    if (tdsChart) {
      tdsChart.data.labels = [];
      tdsChart.data.datasets[0].data = [];
      tdsChart.update();
    }
    console.log("Frontend graphs cleared.");

    // 4. Reset the current readings display to default
    currentDistanceElement.textContent = `N/A cm`;
    currentTDSElement.textContent = `N/A ppm`;

    alert("Graphs and all historical data have been cleared!"); // Inform the user
  } catch (error) {
    console.error("Error clearing graphs and data:", error);
    alert(`Failed to clear data: ${error.message}. Check console for details.`);
  }
}

// Add an event listener to the clear button (ensure button exists before adding listener)
if (clearGraphsButton) {
  clearGraphsButton.addEventListener("click", clearGraphsAndData);
} else {
  console.error(
    "Error: Clear Graphs button with ID 'clearGraphsButton' not found in HTML!"
  );
}

// --- Real-time Data with WebSockets ---
const ws = new WebSocket(WEBSOCKET_URL);

ws.onopen = () => {
  console.log("WebSocket connection established.");
};

ws.onmessage = (event) => {
  try {
    const sensorData = JSON.parse(event.data);
    console.log("Real-time data received:", sensorData);
    addDataToCharts(sensorData);
  } catch (e) {
    console.error("Error parsing real-time data:", e);
  }
};

ws.onclose = () => {
  console.log("WebSocket connection closed.");
};

ws.onerror = (error) => {
  console.error("WebSocket error:", error);
};
