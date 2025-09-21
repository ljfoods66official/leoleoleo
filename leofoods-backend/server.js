// server.js
const express = require('express');
const path = require('path');
const app = express();

// Serve static files from "public" folder (or change to your folder)
const staticFolder = path.join(__dirname, 'public'); // or '.' if index.html is repo root
app.use(express.static(staticFolder));

// If you want /api route(s), keep them:
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'LJ Foods API is running ✅' });
});

// Fallback: for client-side routing or default to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(staticFolder, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
