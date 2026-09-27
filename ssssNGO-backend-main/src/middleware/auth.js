const jwt = require("jsonwebtoken");
const User = require("../models/User");


const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("_id name role joined memberId email");
    if (!user) return res.status(401).json({ message: "Account not found" });
    req.user = {
      id: user._id.toString(),
      role: user.role,
      joined: user.joined,
      memberId: user.memberId,
      email: user.email,
      name: user.name,
    };
    next();
  } catch (error) {
    res.status(401).json({ message: "Token failed" });
  }
};

module.exports = protect;
