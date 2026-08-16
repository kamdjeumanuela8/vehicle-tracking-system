const { initializeApp, cert } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");

const serviceAccount = require("./server/firebase-service-account.json");

initializeApp({
  credential: cert(serviceAccount),
  databaseURL:
    "https://vehicle-tracking-system-286dc-default-rtdb.europe-west1.firebasedatabase.app"
});

const db = getDatabase();

console.log("Firebase app initialized.");
console.log("Testing Firebase connection...");

db.ref("test_connection")
  .set({
    message: "Firebase test",
    time: new Date().toISOString()
  })
  .then(() => {
    console.log("SUCCESS: Firebase write completed.");
  })
  .catch((error) => {
    console.error("ERROR:", error);
  });