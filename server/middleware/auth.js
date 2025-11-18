const jwt = require('jsonwebtoken');

// Middleware function to protect routes
function auth(req, res, next) {
    // 1. Get token from the header
    // The client sends the token in the format: "Bearer <token>"
    const token = req.header('Authorization')?.replace('Bearer ', ''); 

    // 2. Check if no token exists
    if (!token) {
        // 401: Unauthorized - Access denied
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        // 3. Verify token
        // The JWT_SECRET is used to check if the token is valid and hasn't been tampered with
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 4. Attach user payload to the request object
        // The token payload usually contains { user: { id: '...' } }
        req.user = decoded.user;
        
        // 5. Continue to the next middleware or route handler
        next();
    } catch (e) {
        // If verification fails (e.g., expired, wrong secret)
        res.status(401).json({ msg: 'Token is not valid' });
    }
}

module.exports = auth;