const User = require("../models/User");
const { hasAdminAccess } = require("../utils/roles");

module.exports = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !hasAdminAccess(user.role)) {
      return res.status(403).json({ message: "Admin access only" });
    }
    req.adminUser = user;
    next();
  } catch (_error) {
    res.status(500).json({ message: "Authorization check failed" });
  }
};
