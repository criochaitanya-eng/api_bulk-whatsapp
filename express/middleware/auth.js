const verifyInternalToken = (req, res, next) => {

  console.log(process.env.KAFKA_SERVER_SECRET);
  try {
    const authHeader = req.headers.authorization;

    // ❌ Missing header
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        msg: "Authorization header missing",
      });
    }

    // 🔥 Extract token
    const token = authHeader.split(" ")[1];

    // ❌ Invalid token
    if (token !== process.env.KAFKA_SERVER_SECRET) {
      return res.status(403).json({
        success: false,
        msg: "Invalid token",
      });
    }

    // ✅ Allow request
    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      msg: "Middleware error",
    });
  }
};

export default verifyInternalToken;
