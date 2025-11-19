const express = require('express');
const router = express.Router();
const Link = require('../models/Link');
const User = require('../models/User'); // Needed to get username/id and update upvotedLinks
const auth = require('../middleware/auth'); // For protected routes
const mongoose = require('mongoose'); // For ObjectId handling

// @route   GET api/links
// @desc    Get all APPROVED links for the public feed
// @access  Public
router.get('/', async (req, res) => {
    try {
        // Fetch only links with 'approved' status
        const links = await Link.find({ status: 'approved' })
            .sort({ score: -1, createdAt: -1 }); // Sort by score, then newest first

        // Map the links to include a simple 'id' field for the frontend
        const responseLinks = links.map(link => ({
            id: link._id,
            url: link.url,
            username: link.username,
            score: link.score,
        }));

        res.json(responseLinks);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error fetching links');
    }
});

// @route   POST api/links
// @desc    Submit a new link (automatically sets status to 'pending')
// @access  Private (Requires JWT)
router.post('/', auth, async (req, res) => {
    const { url } = req.body;
    const userId = req.user.id; // User ID comes from the JWT payload
    
    // Simple validation
    if (!url) {
        return res.status(400).json({ msg: 'URL is required' });
    }

    try {
        // Get the username from the User model (for caching in the Link document)
        // We use .select('username') to retrieve only the username field efficiently
        const user = await User.findById(userId).select('username');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Create the new link with 'pending' status
        const newLink = new Link({
            url,
            user: userId,
            username: user.username,
            status: 'pending', // New links are pending by default
            score: 0,
        });

        const link = await newLink.save();
        
        // Return a cleaner object to the client
        res.json({
            id: link._id,
            url: link.url,
            status: link.status,
            username: link.username
        });

    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
             return res.status(400).json({ msg: 'Invalid user ID format' });
        }
        res.status(500).send('Server Error during link submission');
    }
});

// @route   PATCH api/links/:id/vote
// @desc    Upvote a specific link and update user's upvotedLinks list
// @access  Private (Requires JWT)
router.patch('/:id/vote', auth, async (req, res) => {
    const linkId = req.params.id;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(linkId)) {
        return res.status(400).json({ msg: 'Invalid link ID format' });
    }

    try {
        // 1. Find the link and check if it's approved
        const link = await Link.findById(linkId);
        if (!link) {
            return res.status(404).json({ msg: 'Link not found' });
        }
        
        // Only allow voting on approved links
        if (link.status !== 'approved') {
            return res.status(403).json({ msg: 'Only approved links can be voted on' });
        }

        // 2. Check if the user has already voted
        const user = await User.findById(userId).select('upvotedLinks');
        if (!user) {
             return res.status(404).json({ msg: 'User not found' });
        }
        
        // Convert linkId to string for comparison
        const linkIdStr = linkId.toString(); 

        // Check if the linkId is present in the user's upvotedLinks array
        const hasVoted = user.upvotedLinks.some(votedId => votedId.toString() === linkIdStr);

        if (hasVoted) {
            // 400 Bad Request: The request is valid, but the user has already performed this action.
            return res.status(400).json({ msg: 'You have already voted for this link' });
        }

        // --- 3. Perform the Atomic Update (Two separate transactions) ---

        // A. Update the User: Add linkId to upvotedLinks
        await User.updateOne(
            { _id: userId },
            { $push: { upvotedLinks: linkId } }
        );

        // B. Update the Link: Increment score
        const updatedLink = await Link.findByIdAndUpdate(
            linkId,
            { $inc: { score: 1 } },
            { new: true } // Return the updated link document
        );

        // 4. Return the new score to the client
        res.json({
            id: updatedLink._id,
            score: updatedLink.score,
            msg: 'Vote counted successfully'
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error during voting process');
    }
});

module.exports = router;