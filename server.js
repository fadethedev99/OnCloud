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
app.get('/api/auth/github', (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const scope = 'repo user'; 
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=${scope}`;
    res.redirect(githubAuthUrl);
});

app.get('/api/auth/github/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).send('Authentication failed: No code provided.');
    }

    try {
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code: code
            })
        });

        const tokenData = await tokenResponse.json();
        if (tokenData.error) {
            return res.status(400).send(`GitHub OAuth Error: ${tokenData.error_description}`);
        }

        const accessToken = tokenData.access_token;

        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'User-Agent': 'Oncloud-Platform'
            }
        });
        const githubUser = await userResponse.json();
        const userUid = `github_${githubUser.id}`;
        
        const userData = {
            uid: userUid,
            username: githubUser.login,
            displayName: githubUser.name || githubUser.login,
            avatarUrl: githubUser.avatar_url,
            githubToken: accessToken, 
            lastLogin: new Date().toISOString()
        };

        const db = admin.firestore();
        await db.collection('users').doc(userUid).set(userData, { merge: true });
        const firebaseToken = await admin.auth().createCustomToken(userUid);
        res.redirect(`/dashboard?token=${firebaseToken}`);

    } catch (error) {
        console.error('OAuth System Error:', error);
        res.status(500).send('Internal Server Error.');
    }
});


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
    console.log(`Oncloud server running on port ${PORT}`);
});