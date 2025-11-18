const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: [true, 'Username is required'], 
        unique: true 
    },
    password: { 
        type: String, 
        required: [true, 'Password is required'],
        select: false // Crucial: prevents password hash from being returned by default queries
    }, 
    email: { 
        type: String, 
        required: [true, 'Email is required'], 
        unique: true 
    },
    role: { 
        type: String, 
        default: 'member', 
        enum: ['member', 'curator', 'admin'] // Defines allowed roles
    },
    // Array to store IDs of Links the user has upvoted (for voting integrity)
    upvotedLinks: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Link' 
    }],
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('User', UserSchema);