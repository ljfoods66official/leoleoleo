// server.js
const express = require('express');
const path = require('path');
const app = express();

// Serve static files (CSS, JS, images, HTML) from the repo root
app.use(express.static(__dirname));

// ✅ Serve index.html when visiting "/"
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Optional: keep API route at /api/health (not root)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'LJ Foods API is running ✅' });
});

// Catch-all: for unknown routes, serve index.html (helps if you use client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
