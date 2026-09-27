const User = require("../models/User");
const { hasOwnerAccess } = require("../utils/roles");

module.exports = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("_id role");
    if (!user || !hasOwnerAccess(user.role)) {
      return res.status(403).json({ message: "Owner access only" });
    }
    req.ownerUser = user;
    next();
  } catch (_error) {
    res.status(500).json({ message: "Authorization check failed" });
  }
};
