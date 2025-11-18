const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Import the User model
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Environment variable for JWT secret key (make sure to add this to your .env)
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key'; 

// ------------------------------------------------------------------
// A. @route   POST /api/users/register
// @desc    Register a new user
// @access  Public
// ------------------------------------------------------------------
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // 1. Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // 2. Create new user instance
        user = new User({ username, email, password });

        // 3. Hash the password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        // 4. Save the user to the database
        await user.save();
        
        // 5. Create JWT payload
        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        // 6. Sign the token and send it back
        jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: '5d' }, // Token expires in 5 days
            (err, token) => {
                if (err) throw err;
                res.json({ token, role: user.role });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// ------------------------------------------------------------------
// B. @route   POST /api/users/login
// @desc    Authenticate user & get token
// @access  Public
// ------------------------------------------------------------------
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Find the user by email, explicitly requesting the password hash
        let user = await User.findOne({ email }).select('+password'); 
        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        // 2. Compare submitted password with hashed password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        // 3. Create JWT payload (same as registration)
        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        // 4. Sign the token and send it back
        jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: '5d' },
            (err, token) => {
                if (err) throw err;
                res.json({ token, role: user.role, username: user.username });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;