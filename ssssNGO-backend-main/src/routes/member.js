const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

router.post("/join", auth, async (req, res) => {
  res.status(410).json({
    message: "Direct membership activation has been retired. Submit a membership request and complete verified payment.",
    next: "/api/membership/request",
  });
});

module.exports = router;
