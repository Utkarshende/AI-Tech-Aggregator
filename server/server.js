// server/server.js

const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

// 💡 NEW STEP 1: Import the user routes file 
const userRoutes = require('./routes/userRoutes'); 

// Load environment variables from .env file
dotenv.config();

// Initialize Express App
const app = express();

// Middleware
app.use(cors()); // Enables cross-origin requests
app.use(express.json()); // Allows parsing of JSON request bodies 
                         // IMPORTANT: This must be before any route handlers!

// --- Database Connection ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ai_tech_db';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// 💡 NEW STEP 2: Use the imported router at the base path
// This mounts userRoutes.js, meaning router.post('/login') becomes POST /api/users/login
app.use('/api/users', userRoutes); 

// --- Basic Route ---
app.get('/', (req, res) => {
    res.send('AITechAggregator Backend Active');
});

// --- Server Listener ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));