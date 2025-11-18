// server/routes/linkRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); 
const Link = require('../models/Link'); 
const User = require('../models/User'); 


// ------------------------------------------------------------------
// A. @route   POST /api/links (PROTECTED)
// @desc    Submit a new link
// ------------------------------------------------------------------
router.post('/', auth, async (req, res) => {
    const { url } = req.body;
    try {
        const newLink = new Link({
            url,
            submittedBy: req.user.id // ID from the JWT token
        });
        const link = await newLink.save();
        res.json({ msg: 'Link submitted successfully.', link });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// ------------------------------------------------------------------
// B. @route   GET /api/links (PUBLIC)
// @desc    Get all approved links
// ------------------------------------------------------------------
router.get('/', async (req, res) => {
    try {
        const links = await Link.find({ status: 'approved' })
            .populate('submittedBy', 'username')
            .sort({ votes: -1, createdAt: -1 }); 
        res.json(links);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;