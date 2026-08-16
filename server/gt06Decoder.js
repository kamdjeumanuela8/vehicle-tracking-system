function decodeGPSData(data) {
    const parts = data.toString().trim().split(",");

    if (parts.length < 5) {
        console.log("Invalid GPS data received.");
        return null;
    }

    const device = parts[0];
    const latitude =
     parseFloat(parts[1]);
    const longitude = 
    parseFloat(parts[2]);
    const speed =
     parseFloat(parts[3]);
     const ignition = parts[4];

    if (isNaN(latitude) || isNaN(longitude) || isNaN(speed)) {
        console.log("Invalid GPS values received.");
        return null;
    }

    return {
        device,
        latitude,
        longitude,
        speed,
        timestamp: new Date()
    };
}

module.exports = decodeGPSData;

/*IN this part of the code we are  creating a gps decoder*/