const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }
    
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { verifyToken };
