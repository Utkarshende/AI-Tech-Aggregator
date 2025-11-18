const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
    content: { 
        type: String, 
        required: [true, 'Comment content cannot be empty'] 
    },
    postedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    link: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Link', 
        required: true 
    },
    // Key for threading: If null, it's a top-level comment. If set, it's a reply.
    parentComment: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Comment', 
        default: null 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('Comment', CommentSchema);