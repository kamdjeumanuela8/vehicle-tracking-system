const net = require("net");

const client = new net.Socket();

client.connect(5000, "127.0.0.1", () => {
    console.log("Test tracker connected to the server.");

    sendGPSData();

    setInterval(sendGPSData, 5000);
});

function sendGPSData() {
    const latitude = (3.8480 + Math.random() * 0.001).toFixed(4);
    const longitude = (11.5021 + Math.random() * 0.001).toFixed(4);
    const speed = Math.floor(30 + Math.random() * 30);
    const ignition = "ON";

    const gpsData = `GT06,${latitude},${longitude},${speed},${ignition}`;

    client.write(gpsData);

    console.log("GPS data sent:", gpsData);
}

client.on("data", (data) => {
    console.log("Server response:", data.toString());
});

client.on("close", () => {
    console.log("Connection closed.");
});

client.on("error", (error) => {
    console.error("Connection error:", error.message);
});