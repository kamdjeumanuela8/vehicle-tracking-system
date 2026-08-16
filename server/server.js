const net = require("net");
const { initializeApp, cert } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");

const decodeGPSData = require("./gt06Decoder");

const serviceAccount = require("./firebase-service-account.json");

initializeApp({
  credential: cert(serviceAccount),
  databaseURL:
    "https://vehicle-tracking-system-286dc-default-rtdb.europe-west1.firebasedatabase.app"
});

const db = getDatabase();

const PORT = 5000;

const server = net.createServer((socket) => {
  console.log("Tracker connected");

  socket.on("data", (data) => {
    console.log("Raw data received:", data.toString());

    const gpsData = decodeGPSData(data);

    if (gpsData) {
      console.log("Decoded GPS data");
      console.log(gpsData);

      const locationData = {
        ...gpsData,
        receivedAt: new Date().toISOString()
      };

      console.log("Attempting to save GPS data to Firebase...");

db.ref("location_logs")
  .push(locationData)
  .then(() => {
    console.log("GPS data saved to Firebase");
  })
  .catch((error) => {
    console.error("Firebase error:", error);
  });
    }
  });

  socket.on("end", () => {
    console.log("Tracker disconnected.");
  });

  socket.on("error", (error) => {
    console.error("Socket error:", error.message);
  });
});

server.listen(PORT, () => {
  console.log(`GT06 TCP server is running on port ${PORT}`);
});