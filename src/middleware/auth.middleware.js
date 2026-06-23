const jwt = require("jsonwebtoken");

const getBearerToken = (req) => {
  const authHeader = req.headers?.authorization;
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;

  return token;
};

const authMiddleware = (roles = ["user"]) => {
  return function verifyToken(req, res, next) {
    const cookieToken = req.cookies?.token;
    const token = cookieToken || getBearerToken(req);

    if (!token) {
      return res.status(401).json({
        message: "Unauthorized: No token provided",
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.auth = {
        hasTokenCookie: Boolean(cookieToken),
        userId: decoded?.userId,
        role: decoded?.role,
        authenticated: Boolean(decoded),
      };

      req.user = {
        ...decoded,
        userId: req.auth.userId,
        id: req.auth.userId,
        role: req.auth.role,
      };

      if (!roles.includes(req.auth.role)) {
        return res.status(403).json({
          message: "Forbidden: Insufficient permissions",
        });
      }

      next();
    } catch {
      return res.status(401).json({
        message: "Unauthorized: Invalid token",
      });
    }
  };
};

module.exports = authMiddleware;
