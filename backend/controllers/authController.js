const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Generate JWT Helper
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, role, rollNo } = req.body;
    console.log(name, email, password, role, rollNo);
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "Please add all fields" });
    }

    if (role === "student" && !rollNo) {
      return res
        .status(400)
        .json({ message: "Student roll number is required" });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    console.log("Hi");
    // Create user
    const userData = {
      name,
      email,
      password,
      role,
    };

    if (role === "student") {
      userData.rollNo = rollNo;
    }

    const user = await User.create(userData);

    if (user) {
      res.status(201).json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        rollNo: user.rollNo || "",
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res
        .status(400)
        .json({ message: "Please provide email, password and role" });
    }

    // Check for user email
    const user = await User.findOne({ email, role });

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        rollNo: user.rollNo || "",
        token: generateToken(user._id, user.role),
      });
    } else {
      res
        .status(401)
        .json({
          message:
            "Invalid credentials or role mismatch or try registering first",
        });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
