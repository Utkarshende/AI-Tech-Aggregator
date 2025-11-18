const mongoose = require('mongoose');

const LinkSchema = new mongoose.Schema({
    // User-submitted data
    url: { 
        type: String, 
        required: [true, 'URL is required'], 
        unique: true 
    },
    submittedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    // External metadata (fetched by the Express API in a later step)
    title: { type: String, default: 'No Title Found' },
    description: { type: String, default: '' },
    imageUrl: { type: String, default: '' }, // The Open Graph image

    // Voting and Moderation
    votes: { 
        type: Number, 
        default: 0 
    },
    status: { 
        type: String, 
        default: 'pending', 
        enum: ['pending', 'approved', 'rejected'] // Curators approve links before they appear
    },
    commentsCount: { // Optional: A virtual field could calculate this, but storing it is often faster.
        type: Number,
        default: 0
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('Link', LinkSchema);