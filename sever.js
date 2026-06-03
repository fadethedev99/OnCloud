const express = require('express');
const cors = require('cors');
const path = require('path');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000; 

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("Firebase Admin initialized successfully.");
    } catch (err) {
        console.error("Failed to parse Firebase Service Account JSON:", err);
    }
} else {
    console.warn("FIREBASE_SERVICE_ACCOUNT environment variable is missing.");
}


app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

app.get('/api/status', (req, res) => {
    res.json({ status: 'online', platform: 'Oncloud' });
});


app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});


app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Oncloud control panel server running on port ${PORT}`);
});