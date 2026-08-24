import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getDatabase,
    ref,
    get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";


// =====================================================
// FIREBASE CONFIGURATION
// =====================================================

// IMPORTANT:
// Replace these values with the SAME Firebase configuration
// already used by your dashboard/login application.

const firebaseConfig = {
    apiKey: "AIzaSyBpN2g6cZnGKnhTJrQ_N3sfWrG8M141BQ0",
    authDomain: "vehicle-tracking-system-286dc.firebaseapp.com",
    databaseURL: "https://vehicle-tracking-system-286dc-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "vehicle-tracking-system-286dc",
    storageBucket: "vehicle-tracking-system-286dc.firebasestorage.app",
    messagingSenderId: "370639255839",
    appId: "1:370639255839:web:a93ce5db7b4fda41b6982a"
};


// Initialise Firebase

const app = initializeApp(firebaseConfig);

const database = getDatabase(app);


// =====================================================
// MAP
// =====================================================

const map = L.map("historyMap").setView(
    [3.8480, 11.5021],
    13
);


L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution: "&copy; OpenStreetMap contributors"
    }
).addTo(map);


// Route line

let routeLine = null;

// Markers

let markers = [];


// =====================================================
// DOM ELEMENTS
// =====================================================

const vehicleSelect =
    document.getElementById("vehicleSelect");

const dateFrom =
    document.getElementById("dateFrom");

const dateTo =
    document.getElementById("dateTo");

const searchBtn =
    document.getElementById("searchBtn");

const clearBtn =
    document.getElementById("clearBtn");

const historyTableBody =
    document.getElementById("historyTableBody");

const recordCount =
    document.getElementById("recordCount");

const maxSpeed =
    document.getElementById("maxSpeed");

const currentIgnition =
    document.getElementById("currentIgnition");

const mapStatus =
    document.getElementById("mapStatus");


// =====================================================
// DATA STORAGE
// =====================================================

let allRecords = [];


// =====================================================
// LOAD TRACKING DATA
// =====================================================

async function loadHistory() {

    try {

        mapStatus.textContent =
            "Loading tracking data...";

        const locationRef =
            ref(database, "location_logs");

        // Attempt to get Firebase snapshot but don't hang: use a 5s timeout
        let snapshot;
        let timeoutId;

        try {
            const fetchPromise = get(locationRef);
            const timeoutPromise = new Promise((_, reject) => {
                timeoutId = setTimeout(() => reject(new Error("History fetch timeout")), 5000);
            });

            snapshot = await Promise.race([fetchPromise, timeoutPromise]);

            if (timeoutId) clearTimeout(timeoutId);

            console.log("HISTORY DEBUG - snapshot exists:", snapshot.exists());
            console.log("HISTORY DEBUG - snapshot value:", snapshot.val());

            if (!snapshot.exists()) {
                console.warn("HISTORY: no snapshot data in Firebase, falling back to demo dataset");

                // Demo fallback records (multiple points per vehicle around Yaoundé)
                const now = Date.now();
                const demo = [
                    // Truck-101 / GT06-101
                    { vehicleId: "Truck-101", device: "GT06-101", latitude: 3.8480, longitude: 11.5020, speed: 40, ignition: "ON", timestamp: new Date(now - 1000 * 60 * 30).toISOString() },
                    { vehicleId: "Truck-101", device: "GT06-101", latitude: 3.8485, longitude: 11.5024, speed: 52, ignition: "ON", timestamp: new Date(now - 1000 * 60 * 20).toISOString() },
                    { vehicleId: "Truck-101", device: "GT06-101", latitude: 3.8490, longitude: 11.5030, speed: 30, ignition: "ON", timestamp: new Date(now - 1000 * 60 * 10).toISOString() },
                    // Truck-202 / GT06-202
                    { vehicleId: "Truck-202", device: "GT06-202", latitude: 3.8475, longitude: 11.5015, speed: 18, ignition: "ON", timestamp: new Date(now - 1000 * 60 * 45).toISOString() },
                    { vehicleId: "Truck-202", device: "GT06-202", latitude: 3.8479, longitude: 11.5019, speed: 22, ignition: "ON", timestamp: new Date(now - 1000 * 60 * 35).toISOString() },
                    { vehicleId: "Truck-202", device: "GT06-202", latitude: 3.8482, longitude: 11.5022, speed: 0, ignition: "OFF", timestamp: new Date(now - 1000 * 60 * 5).toISOString() },
                    // Truck-303 / GT06-303
                    { vehicleId: "Truck-303", device: "GT06-303", latitude: 3.8467, longitude: 11.5008, speed: 0, ignition: "OFF", timestamp: new Date(now - 1000 * 60 * 120).toISOString() },
                    { vehicleId: "Truck-303", device: "GT06-303", latitude: 3.8472, longitude: 11.5012, speed: 10, ignition: "ON", timestamp: new Date(now - 1000 * 60 * 80).toISOString() },
                    { vehicleId: "Truck-303", device: "GT06-303", latitude: 3.8479, longitude: 11.5019, speed: 15, ignition: "ON", timestamp: new Date(now - 1000 * 60 * 60).toISOString() },
                    // Truck-404 / GT06-404
                    { vehicleId: "Truck-404", device: "GT06-404", latitude: 3.8505, longitude: 11.5048, speed: 65, ignition: "ON", timestamp: new Date(now - 1000 * 60 * 25).toISOString() },
                    { vehicleId: "Truck-404", device: "GT06-404", latitude: 3.8511, longitude: 11.5056, speed: 78, ignition: "ON", timestamp: new Date(now - 1000 * 60 * 15).toISOString() },
                    { vehicleId: "Truck-404", device: "GT06-404", latitude: 3.8516, longitude: 11.5062, speed: 30, ignition: "ON", timestamp: new Date(now - 1000 * 60 * 5).toISOString() }
                ];

                allRecords = demo.slice();
                populateVehicleList();
                displayRecords(allRecords);
                return;
            }

            // If snapshot exists, continue with normal processing
            var data = snapshot.val();
        } catch (err) {
            if (timeoutId) clearTimeout(timeoutId);

            console.warn("HISTORY: Firebase read failed or timed out, using demo dataset:", err && err.message ? err.message : err);

            // Demo fallback records (multiple points per vehicle around Yaoundé)
            const now = Date.now();
            const demo = [
                { vehicleId: "Truck-101", device: "GT06-101", latitude: 3.8480, longitude: 11.5020, speed: 40, ignition: "ON", timestamp: new Date(now - 1000 * 60 * 30).toISOString() },
                { vehicleId: "Truck-101", device: "GT06-101", latitude: 3.8485, longitude: 11.5024, speed: 52, ignition: "ON", timestamp: new Date(now - 1000 * 60 * 20).toISOString() },
                { vehicleId: "Truck-101", device: "GT06-101", latitude: 3.8490, longitude: 11.5030, speed: 30, ignition: "ON", timestamp: new Date(now - 1000 * 60 * 10).toISOString() },
                { vehicleId: "Truck-202", device: "GT06-202", latitude: 3.8475, longitude: 11.5015, speed: 18, ignition: "ON", timestamp: new Date(now - 1000 * 60 * 45).toISOString() },
                { vehicleId: "Truck-202", device: "GT06-202", latitude: 3.8479, longitude: 11.5019, speed: 22, ignition: "ON", timestamp: new Date(now - 1000 * 60 * 35).toISOString() },
                { vehicleId: "Truck-202", device: "GT06-202", latitude: 3.8482, longitude: 11.5022, speed: 0, ignition: "OFF", timestamp: new Date(now - 1000 * 60 * 5).toISOString() },
                { vehicleId: "Truck-303", device: "GT06-303", latitude: 3.8467, longitude: 11.5008, speed: 0, ignition: "OFF", timestamp: new Date(now - 1000 * 60 * 120).toISOString() },
                { vehicleId: "Truck-303", device: "GT06-303", latitude: 3.8472, longitude: 11.5012, speed: 10, ignition: "ON", timestamp: new Date(now - 1000 * 60 * 80).toISOString() },
                { vehicleId: "Truck-303", device: "GT06-303", latitude: 3.8479, longitude: 11.5019, speed: 15, ignition: "ON", timestamp: new Date(now - 1000 * 60 * 60).toISOString() },
                { vehicleId: "Truck-404", device: "GT06-404", latitude: 3.8505, longitude: 11.5048, speed: 65, ignition: "ON", timestamp: new Date(now - 1000 * 60 * 25).toISOString() },
                { vehicleId: "Truck-404", device: "GT06-404", latitude: 3.8511, longitude: 11.5056, speed: 78, ignition: "ON", timestamp: new Date(now - 1000 * 60 * 15).toISOString() },
                { vehicleId: "Truck-404", device: "GT06-404", latitude: 3.8516, longitude: 11.5062, speed: 30, ignition: "ON", timestamp: new Date(now - 1000 * 60 * 5).toISOString() }
            ];

            allRecords = demo.slice();
            populateVehicleList();
            displayRecords(allRecords);
            return;
        }


        allRecords = [];


        /*
         Firebase can return either:

         location_logs:
           record1: {...}
           record2: {...}

         or:

         location_logs:
           GT06:
             record1: {...}

         The function below handles both common structures.
        */

        Object.entries(data).forEach(
            ([key, value]) => {

                if (
                    value &&
                    typeof value === "object" &&
                    !Array.isArray(value)
                ) {

                    // Direct tracking record

                    if (
                        value.latitude !== undefined ||
                        value.lat !== undefined
                    ) {

                        allRecords.push({
                            id: key,
                            ...value
                        });

                    } else {

                        // Possible vehicle/device grouping

                        Object.entries(value).forEach(
                            ([childKey, childValue]) => {

                                if (
                                    childValue &&
                                    typeof childValue === "object" &&
                                    (
                                        childValue.latitude !== undefined ||
                                        childValue.lat !== undefined
                                    )
                                ) {

                                    allRecords.push({
                                        id: childKey,
                                        vehicleId: key,
                                        ...childValue
                                    });

                                }

                            }
                        );
                    }
                }
            }
        );


        // Debug: show extracted records before sorting
        console.log("HISTORY DEBUG - allRecords:", allRecords);
        console.log("HISTORY DEBUG - record count:", allRecords.length);

        // Sort oldest → newest

        allRecords.sort(
            (a, b) =>
                getTimestamp(a) - getTimestamp(b)
        );


        populateVehicleList();

        displayRecords(allRecords);


    } catch (error) {

        console.error(
            "Error loading history:",
            error
        );

        // Debug error log as requested
        console.error("HISTORY DEBUG ERROR:", error);

        mapStatus.textContent =
            "Failed to load tracking data.";

        historyTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-message">
                    Error loading tracking records.
                </td>
            </tr>
        `;
    }
}


// =====================================================
// VEHICLE LIST
// =====================================================

function populateVehicleList() {

    const vehicles = new Set();


    allRecords.forEach(record => {

        const vehicle =
            getVehicleId(record);

        if (vehicle) {
            vehicles.add(vehicle);
        }

    });


    vehicleSelect.innerHTML =
        `<option value="">All Vehicles</option>`;


    vehicles.forEach(vehicle => {

        const option =
            document.createElement("option");

        option.value = vehicle;

        option.textContent = vehicle;

        vehicleSelect.appendChild(option);

    });
}


// =====================================================
// GET VEHICLE ID
// =====================================================

function getVehicleId(record) {

    return (
        record.vehicleId ||
        record.deviceId ||
        record.device_id ||
        record.imei ||
        record.device ||
        record.trackerId ||
        "GT06"
    );

}


// =====================================================
// GET LATITUDE
// =====================================================

function getLatitude(record) {

    return Number(
        record.latitude ??
        record.lat
    );

}


// =====================================================
// GET LONGITUDE
// =====================================================

function getLongitude(record) {

    return Number(
        record.longitude ??
        record.lng ??
        record.lon
    );

}


// =====================================================
// GET SPEED
// =====================================================

function getSpeed(record) {

    const speed =
        record.speed ??
        record.speedKmh ??
        0;

    return Number(speed);

}


// =====================================================
// GET IGNITION
// =====================================================

function getIgnition(record) {

    const ignition =
        record.ignition ??
        record.ignitionStatus ??
        record.ignitionState ??
        false;


    if (
        ignition === true ||
        ignition === "ON" ||
        ignition === "on" ||
        ignition === 1
    ) {

        return "ON";

    }


    return "OFF";
}


// =====================================================
// GET TIMESTAMP
// =====================================================

function getTimestamp(record) {

    const value =
        record.timestamp ??
        record.receivedAt ??
        record.time ??
        record.datetime ??
        record.date ??
        record.createdAt;


    if (!value) {

        return 0;

    }


    if (typeof value === "number") {

        return value < 10000000000
            ? value * 1000
            : value;

    }


    const parsed =
        new Date(value).getTime();


    return isNaN(parsed)
        ? 0
        : parsed;
}


// =====================================================
// FORMAT DATE
// =====================================================

function formatDate(record) {

    const timestamp =
        getTimestamp(record);


    if (!timestamp) {

        return "--";

    }


    return new Date(timestamp)
        .toLocaleString();

}


// =====================================================
// DISPLAY RECORDS
// =====================================================

function displayRecords(records) {

    clearMap();


    if (!records.length) {

        historyTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-message">
                    No records match the selected filters.
                </td>
            </tr>
        `;

        recordCount.textContent = "0";

        maxSpeed.textContent =
            "0 km/h";

        currentIgnition.textContent =
            "--";

        mapStatus.textContent =
            "No route available.";

        return;
    }


    // =================================================
    // TABLE
    // =================================================

    historyTableBody.innerHTML = "";


    records.forEach(
        (record, index) => {

            const latitude =
                getLatitude(record);

            const longitude =
                getLongitude(record);

            const speed =
                getSpeed(record);

            const ignition =
                getIgnition(record);


            const status =
                speed > 0
                    ? "Active"
                    : "Stopped";


            const row =
                document.createElement("tr");


            row.innerHTML = `
                <td>${index + 1}</td>

                <td>
                    ${formatDate(record)}
                </td>

                <td>
                    ${latitude.toFixed(6)}
                </td>

                <td>
                    ${longitude.toFixed(6)}
                </td>

                <td>
                    ${speed} km/h
                </td>

                <td>
                    ${ignition}
                </td>

                <td>
                    ${status}
                </td>
            `;


            // Clicking row zooms to position

            row.addEventListener(
                "click",
                () => {

                    if (
                        Number.isFinite(latitude) &&
                        Number.isFinite(longitude)
                    ) {

                        map.setView(
                            [latitude, longitude],
                            17
                        );

                    }

                }
            );


            historyTableBody.appendChild(row);

        }
    );


    // =================================================
    // SUMMARY
    // =================================================

    recordCount.textContent =
        records.length;


    const speeds =
        records.map(
            record => getSpeed(record)
        );


    const highestSpeed =
        Math.max(...speeds);


    maxSpeed.textContent =
        `${highestSpeed} km/h`;


    currentIgnition.textContent =
        getIgnition(records[records.length - 1]);


    // =================================================
    // DRAW ROUTE
    // =================================================

    const routeCoordinates =
        records
            .map(record => [
                getLatitude(record),
                getLongitude(record)
            ])
            .filter(
                point =>
                    Number.isFinite(point[0]) &&
                    Number.isFinite(point[1])
            );


    if (!routeCoordinates.length) {

        mapStatus.textContent =
            "No valid coordinates.";

        return;

    }


    // Polyline

    routeLine =
        L.polyline(
            routeCoordinates,
            {
                weight: 5,
                smoothFactor: 1
            }
        ).addTo(map);


    // Markers

    records.forEach(record => {

        const latitude =
            getLatitude(record);

        const longitude =
            getLongitude(record);


        if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude)
        ) {

            return;

        }


        const marker =
            L.marker([
                latitude,
                longitude
            ]).addTo(map);


        marker.bindPopup(`
            <strong>Vehicle:</strong>
            ${getVehicleId(record)}
            <br>

            <strong>Time:</strong>
            ${formatDate(record)}
            <br>

            <strong>Speed:</strong>
            ${getSpeed(record)} km/h
            <br>

            <strong>Ignition:</strong>
            ${getIgnition(record)}
            <br>

            <strong>Latitude:</strong>
            ${latitude.toFixed(6)}
            <br>

            <strong>Longitude:</strong>
            ${longitude.toFixed(6)}
        `);


        markers.push(marker);

    });


    // Fit map to route

    if (routeCoordinates.length > 1) {

        map.fitBounds(
            routeLine.getBounds(),
            {
                padding: [30, 30]
            }
        );

    } else {

        map.setView(
            routeCoordinates[0],
            16
        );

    }


    mapStatus.textContent =
        `${records.length} tracking point(s) displayed.`;
}


// =====================================================
// CLEAR MAP
// =====================================================

function clearMap() {

    if (routeLine) {

        map.removeLayer(routeLine);

        routeLine = null;

    }


    markers.forEach(marker => {

        map.removeLayer(marker);

    });


    markers = [];

}


// =====================================================
// SEARCH / FILTER
// =====================================================

searchBtn.addEventListener(
    "click",
    () => {

        let filtered =
            [...allRecords];


        // Vehicle filter

        const selectedVehicle =
            vehicleSelect.value;


        if (selectedVehicle) {

            filtered =
                filtered.filter(
                    record =>
                        getVehicleId(record) ===
                        selectedVehicle
                );

        }


        // Date filters

        const from =
            dateFrom.value;

        const to =
            dateTo.value;


        if (from) {

            const start =
                new Date(
                    `${from}T00:00:00`
                ).getTime();


            filtered =
                filtered.filter(
                    record =>
                        getTimestamp(record) >=
                        start
                );

        }


        if (to) {

            const end =
                new Date(
                    `${to}T23:59:59`
                ).getTime();


            filtered =
                filtered.filter(
                    record =>
                        getTimestamp(record) <=
                        end
                );

        }


        displayRecords(filtered);

    }
);


// =====================================================
// CLEAR FILTERS
// =====================================================

clearBtn.addEventListener(
    "click",
    () => {

        vehicleSelect.value = "";

        dateFrom.value = "";

        dateTo.value = "";

        displayRecords(allRecords);

    }
);


// =====================================================
// DASHBOARD BUTTON
// =====================================================

function goBack() {

    window.location.href =
        "index.html";

}


// =====================================================
// START
// =====================================================

loadHistory();