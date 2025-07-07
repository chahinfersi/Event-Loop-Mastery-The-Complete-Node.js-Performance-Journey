const express = require("express");
const User = require("../models/User");
const Team = require("../models/Team");

const router = express.Router();

// POST /api/users - Create a new user
router.post("/", async (req, res) => {
  try {
    console.log("👤 Creating new user:", req.body.email);
    const start = Date.now();

    const { name, email, team, role } = req.body;

    // Input validation
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        error: "Name is required and must be at least 2 characters",
      });
    }

    if (!email || !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
      return res.status(400).json({
        error: "Valid email is required",
      });
    }

    if (!team) {
      return res.status(400).json({
        error: "Team is required",
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(409).json({
        error: "User with this email already exists",
      });
    }

    // Verify team exists
    const teamExists = await Team.findById(team);
    if (!teamExists) {
      return res.status(404).json({
        error: "Team not found",
      });
    }

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      team,
      role: role || "member",
    });

    await user.save();
    await user.populate("team", "name description");

    const duration = Date.now() - start;
    console.log(`✅ User created in ${duration}ms`);

    res.status(201).json({
      message: "User created successfully",
      user,
      performance: {
        creationTime: duration + "ms",
        timestamp: new Date().toISOString(),
        uptime: Math.round(process.uptime()),
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + "MB",
          total:
            Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + "MB",
        },
      },
    });
  } catch (error) {
    console.error("❌ Error creating user:", error.message);
    res.status(500).json({
      error: "Failed to create user",
      details: error.message,
    });
  }
});

// GET /api/users - List users with team info
router.get("/", async (req, res) => {
  try {
    console.log("👥 Fetching users list...");
    const start = Date.now();

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (req.query.team) filter.team = req.query.team;
    if (req.query.role) filter.role = req.query.role;

    const users = await User.find(filter)
      .populate("team", "name description")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await User.countDocuments(filter);

    const duration = Date.now() - start;
    console.log(`✅ Users fetched in ${duration}ms`);

    res.json({
      users,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: users.length,
        totalItems: total,
      },
      performance: {
        queryTime: duration + "ms",
        usersReturned: users.length,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching users:", error.message);
    res.status(500).json({
      error: "Failed to fetch users",
      details: error.message,
    });
  }
});

// GET /api/users/:id - Get specific user
router.get("/:id", async (req, res) => {
  try {
    console.log(`👤 Fetching user: ${req.params.id}`);
    const start = Date.now();

    const user = await User.findById(req.params.id).populate(
      "team",
      "name description createdAt"
    );

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    const duration = Date.now() - start;
    console.log(`✅ User details fetched in ${duration}ms`);

    res.json({
      user,
      performance: {
        queryTime: duration + "ms",
      },
    });
  } catch (error) {
    console.error("❌ Error fetching user:", error.message);
    res.status(500).json({
      error: "Failed to fetch user",
      details: error.message,
    });
  }
});

// PUT /api/users/:id - Update user
router.put("/:id", async (req, res) => {
  try {
    console.log(`👤 Updating user: ${req.params.id}`);
    const start = Date.now();

    const { name, email, role } = req.body;
    const updateData = {};

    if (name) {
      if (name.trim().length < 2) {
        return res.status(400).json({
          error: "Name must be at least 2 characters",
        });
      }
      updateData.name = name.trim();
    }

    if (email) {
      if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
        return res.status(400).json({
          error: "Valid email is required",
        });
      }

      // Check if email already exists for different user
      const existingUser = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: req.params.id },
      });

      if (existingUser) {
        return res.status(409).json({
          error: "User with this email already exists",
        });
      }

      updateData.email = email.toLowerCase();
    }

    if (role && ["member", "admin"].includes(role)) {
      updateData.role = role;
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate("team", "name description");

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    const duration = Date.now() - start;
    console.log(`✅ User updated in ${duration}ms`);

    res.json({
      message: "User updated successfully",
      user,
      performance: {
        updateTime: duration + "ms",
      },
    });
  } catch (error) {
    console.error("❌ Error updating user:", error.message);
    res.status(500).json({
      error: "Failed to update user",
      details: error.message,
    });
  }
});

// DELETE /api/users/:id - Delete user
router.delete("/:id", async (req, res) => {
  try {
    console.log(`🗑️ Deleting user: ${req.params.id}`);
    const start = Date.now();

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    await User.findByIdAndDelete(req.params.id);

    const duration = Date.now() - start;
    console.log(`✅ User deleted in ${duration}ms`);

    res.json({
      message: "User deleted successfully",
      deletedUser: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      performance: {
        deleteTime: duration + "ms",
      },
    });
  } catch (error) {
    console.error("❌ Error deleting user:", error.message);
    res.status(500).json({
      error: "Failed to delete user",
      details: error.message,
    });
  }
});

module.exports = router;
