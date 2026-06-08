const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  if (email !== process.env.ADMIN_EMAIL) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const isValidPassword = await bcrypt.compare(password, process.env.ADMIN_PASSWORD || "");

  if (!isValidPassword) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "1d" });

  return res.json({ success: true, token });
};

module.exports = { login };
