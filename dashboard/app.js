const firebaseDatabaseUrl = "https://vehicle-tracking-system-286dc-default-rtdb.europe-west1.firebasedatabase.app/location_logs.json";

const fallbackVehicles = [
    {
        vehicleName: "Truck-101",
        device: "GT06-101",
        latitude: 3.8492,
        longitude: 11.5031,
        speed: 52,
        receivedAt: new Date().toISOString(),
        ignition: "On"
    },
    {
        vehicleName: "Truck-202",
        device: "GT06-202",
        latitude: 3.8479,
        longitude: 11.5019,
        speed: 18,
        receivedAt: new Date(Date.now() - 2 * 60000).toISOString(),
        ignition: "On"
    },
    {
        vehicleName: "Truck-303",
        device: "GT06-303",
        latitude: 3.8467,
        longitude: 11.5008,
        speed: 0,
        receivedAt: new Date(Date.now() - 7 * 60000).toISOString(),
        ignition: "Off"
    },
    {
        vehicleName: "Truck-404",
        device: "GT06-404",
        latitude: 3.8511,
        longitude: 11.5056,
        speed: 78,
        receivedAt: new Date(Date.now() - 45 * 1000).toISOString(),
        ignition: "On"
    }
];

let map;
let markersLayer;

document.addEventListener("DOMContentLoaded", () => {
    initializeMap();
    loadVehicleData();
});

function initializeMap() {
    map = L.map("map").setView([3.8488, 11.5028], 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    markersLayer = L.layerGroup().addTo(map);
}

async function loadVehicleData() {
    try {
        // Try Firebase first, but don't hang forever — use a 5s timeout and fallback
        const controller = new AbortController();
        let timeoutId = null;

        try {
            timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(firebaseDatabaseUrl, { cache: "no-store", signal: controller.signal });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Firebase request failed with status ${response.status}`);
            }

            const rawData = await response.json();
            console.log("DASHBOARD: using Firebase data");
            const vehicles = normalizeVehicles(rawData);
            renderDashboard(vehicles);
            return;
        } finally {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn('DASHBOARD: Firebase request timed out (using fallback)');
        } else {
            console.warn("DASHBOARD: Firebase request failed, using fallback:", error.message);
        }

        console.log("DASHBOARD: using fallback data");
        renderDashboard(normalizeVehicles(fallbackVehicles));
    }
}

function normalizeVehicles(rawData) {
    const entries = Array.isArray(rawData)
        ? rawData
        : rawData && typeof rawData === "object"
            ? Object.values(rawData)
            : [];

    const latestByVehicle = new Map();

    entries.forEach((entry, index) => {
        if (!entry || typeof entry !== "object") {
            return;
        }

        const latitude = Number(entry.latitude ?? entry.lat ?? entry.location?.latitude);
        const longitude = Number(entry.longitude ?? entry.lng ?? entry.location?.longitude);
        const speed = Number(entry.speed ?? entry.velocity ?? 0);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return;
        }

        const vehicleKey = String(entry.device || entry.vehicleName || entry.vehicle || entry.name || `Vehicle-${index + 1}`);
        const normalized = {
            vehicleName: entry.vehicleName || entry.device || entry.vehicle || `Vehicle-${index + 1}`,
            device: entry.device || vehicleKey,
            latitude,
            longitude,
            speed: Number.isFinite(speed) ? speed : 0,
            receivedAt: entry.receivedAt || new Date().toISOString(),
            ignition: entry.ignition || (speed > 0 ? "On" : "Off")
        };

        const previous = latestByVehicle.get(vehicleKey);

        if (!previous || new Date(normalized.receivedAt) > new Date(previous.receivedAt)) {
            latestByVehicle.set(vehicleKey, normalized);
        }
    });

    return Array.from(latestByVehicle.values()).map((vehicle) => ({
        ...vehicle,
        status: getVehicleStatus(vehicle),
        ignition: vehicle.ignition || (vehicle.speed > 0 ? "On" : "Off")
    }));
}

function getVehicleStatus(vehicle) {
    const timestamp = new Date(vehicle.receivedAt || Date.now());
    const minutesSinceUpdate = (Date.now() - timestamp.getTime()) / 60000;

    if (Number.isNaN(minutesSinceUpdate) || minutesSinceUpdate > 5) {
        return "Offline";
    }

    return vehicle.speed > 0 ? "Active" : "Idle";
}

function renderDashboard(vehicles) {
    const totalVehicles = vehicles.length;
    const activeVehicles = vehicles.filter((vehicle) => vehicle.status === "Active").length;
    const offlineVehicles = vehicles.filter((vehicle) => vehicle.status === "Offline").length;
    const alertCount = vehicles.filter((vehicle) => vehicle.status === "Offline" || vehicle.speed >= 80).length;

    document.getElementById("totalVehicles").textContent = totalVehicles;
    document.getElementById("activeVehicles").textContent = activeVehicles;
    document.getElementById("offlineVehicles").textContent = offlineVehicles;
    document.getElementById("alertCount").textContent = alertCount;

    renderVehicleTable(vehicles);
    renderMap(vehicles);
}

function renderVehicleTable(vehicles) {
    const tableBody = document.getElementById("vehicleTableBody");

    if (!vehicles.length) {
        tableBody.innerHTML = '<tr><td colspan="6">No vehicle data available</td></tr>';
        return;
    }

    tableBody.innerHTML = vehicles
        .map((vehicle) => {
            const statusClass = vehicle.status.toLowerCase();
            return `
                <tr>
                    <td>${vehicle.vehicleName}</td>
                    <td>${Number(vehicle.latitude).toFixed(4)}</td>
                    <td>${Number(vehicle.longitude).toFixed(4)}</td>
                    <td>${vehicle.speed} km/h</td>
                    <td>${vehicle.ignition}</td>
                    <td><span class="status-badge ${statusClass}">${vehicle.status}</span></td>
                </tr>
            `;
        })
        .join("");
}

function renderMap(vehicles) {
    markersLayer.clearLayers();

    if (!vehicles.length) {
        return;
    }

    const bounds = [];

    vehicles.forEach((vehicle) => {
        const color = vehicle.status === "Offline" ? "#ef4444" : vehicle.status === "Active" ? "#22c55e" : "#f59e0b";

        const marker = L.circleMarker([vehicle.latitude, vehicle.longitude], {
            radius: 9,
            color,
            fillColor: color,
            fillOpacity: 0.9,
            weight: 2
        }).addTo(markersLayer);

        marker.bindPopup(`
            <strong>${vehicle.vehicleName}</strong><br>
            Speed: ${vehicle.speed} km/h<br>
            Latitude: ${vehicle.latitude}<br>
            Longitude: ${vehicle.longitude}<br>
            Status: ${vehicle.status}
        `);

        bounds.push([vehicle.latitude, vehicle.longitude]);
    });

    if (bounds.length === 1) {
        map.setView(bounds[0], 14);
        return;
    }

    map.fitBounds(bounds, { padding: [30, 30] });
}
