const express = require("express");
const Team = require("../models/Team");
const User = require("../models/User");

const router = express.Router();

// GET /api/teams - List all teams (pagination ready)
router.get("/", async (req, res) => {
  try {
    console.log("🔍 Fetching teams list...");
    const start = Date.now();

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const teams = await Team.find()
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Team.countDocuments();
    const duration = Date.now() - start;

    console.log(`✅ Teams fetched in ${duration}ms`);

    res.json({
      teams,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: teams.length,
        totalItems: total,
      },
      performance: {
        queryTime: duration + "ms",
        itemsReturned: teams.length,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching teams:", error.message);
    res.status(500).json({
      error: "Failed to fetch teams",
      details: error.message,
    });
  }
});
// POST /api/teams - Create a new team (no user required initially)
router.post("/", async (req, res) => {
  try {
    console.log("📝 Creating new team:", req.body.name);
    const start = Date.now();

    const { name, description, createdBy } = req.body;

    // Input validation
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        error: "Team name is required and must be at least 2 characters",
      });
    }

    // Check if team name already exists
    const existingTeam = await Team.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (existingTeam) {
      return res.status(409).json({
        error: "Team with this name already exists",
      });
    }

    // If createdBy is provided, verify user exists
    if (createdBy) {
      const userExists = await User.findById(createdBy);
      if (!userExists) {
        return res.status(404).json({
          error: "Creator user not found",
        });
      }
    }

    const team = new Team({
      name: name.trim(),
      description: description?.trim(),
      createdBy: createdBy || null, // Can be null initially
    });

    await team.save();

    // Only populate if createdBy exists
    if (team.createdBy) {
      await team.populate("createdBy", "name email");
    }

    const duration = Date.now() - start;
    console.log(`✅ Team created in ${duration}ms`);

    res.status(201).json({
      message: "Team created successfully",
      team,
      performance: {
        creationTime: duration + "ms",
      },
    });
  } catch (error) {
    console.error("❌ Error creating team:", error.message);
    res.status(500).json({
      error: "Failed to create team",
      details: error.message,
    });
  }
});

// PUT /api/teams/:id/assign-creator - Assign creator to existing team
router.put("/:id/assign-creator", async (req, res) => {
  try {
    console.log(`👤 Assigning creator to team: ${req.params.id}`);
    const start = Date.now();

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: "userId is required",
      });
    }

    // Verify user exists and belongs to this team
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    // Verify user belongs to this team
    if (user.team.toString() !== req.params.id) {
      return res.status(400).json({
        error: "User must be a member of this team to become creator",
      });
    }

    // Only admin users can be team creators
    if (user.role !== "admin") {
      return res.status(400).json({
        error: "Only admin users can be team creators",
      });
    }

    const team = await Team.findByIdAndUpdate(
      req.params.id,
      { createdBy: userId },
      { new: true }
    ).populate("createdBy", "name email role");

    if (!team) {
      return res.status(404).json({
        error: "Team not found",
      });
    }

    const duration = Date.now() - start;
    console.log(`✅ Creator assigned in ${duration}ms`);

    res.json({
      message: "Team creator assigned successfully",
      team,
      performance: {
        updateTime: duration + "ms",
      },
    });
  } catch (error) {
    console.error("❌ Error assigning creator:", error.message);
    res.status(500).json({
      error: "Failed to assign creator",
      details: error.message,
    });
  }
});
// GET /api/teams/:id - Get specific team with members
router.get("/:id", async (req, res) => {
  try {
    console.log(`🔍 Fetching team: ${req.params.id}`);
    const start = Date.now();

    const team = await Team.findById(req.params.id).populate(
      "createdBy",
      "name email"
    );

    if (!team) {
      return res.status(404).json({
        error: "Team not found",
      });
    }

    // Get team members
    const members = await User.find({ team: team._id })
      .select("name email role createdAt")
      .sort({ name: 1 });

    const duration = Date.now() - start;
    console.log(`✅ Team details fetched in ${duration}ms`);

    res.json({
      team,
      members,
      stats: {
        totalMembers: members.length,
        admins: members.filter((m) => m.role === "admin").length,
        members: members.filter((m) => m.role === "member").length,
      },
      performance: {
        queryTime: duration + "ms",
      },
    });
  } catch (error) {
    console.error("❌ Error fetching team:", error.message);
    res.status(500).json({
      error: "Failed to fetch team",
      details: error.message,
    });
  }
});

// PUT /api/teams/:id - Update team
router.put("/:id", async (req, res) => {
  try {
    console.log(`📝 Updating team: ${req.params.id}`);
    const start = Date.now();

    const { name, description } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        error: "Team name is required and must be at least 2 characters",
      });
    }

    // Check if new name conflicts with existing team
    const existingTeam = await Team.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
      _id: { $ne: req.params.id },
    });

    if (existingTeam) {
      return res.status(409).json({
        error: "Team with this name already exists",
      });
    }

    const team = await Team.findByIdAndUpdate(
      req.params.id,
      {
        name: name.trim(),
        description: description?.trim(),
      },
      { new: true, runValidators: true }
    ).populate("createdBy", "name email");

    if (!team) {
      return res.status(404).json({
        error: "Team not found",
      });
    }

    const duration = Date.now() - start;
    console.log(`✅ Team updated in ${duration}ms`);

    res.json({
      message: "Team updated successfully",
      team,
      performance: {
        updateTime: duration + "ms",
      },
    });
  } catch (error) {
    console.error("❌ Error updating team:", error.message);
    res.status(500).json({
      error: "Failed to update team",
      details: error.message,
    });
  }
});

// DELETE /api/teams/:id - Delete team (with safety checks)
router.delete("/:id", async (req, res) => {
  try {
    console.log(`🗑️ Deleting team: ${req.params.id}`);
    const start = Date.now();

    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({
        error: "Team not found",
      });
    }

    // Check if team has members (safety check)
    const memberCount = await User.countDocuments({ team: team._id });

    if (memberCount > 0) {
      return res.status(400).json({
        error: "Cannot delete team with existing members",
        details: `Team has ${memberCount} members. Remove members first.`,
      });
    }

    await Team.findByIdAndDelete(req.params.id);

    const duration = Date.now() - start;
    console.log(`✅ Team deleted in ${duration}ms`);

    res.json({
      message: "Team deleted successfully",
      deletedTeam: {
        id: team._id,
        name: team.name,
      },
      performance: {
        deleteTime: duration + "ms",
      },
    });
  } catch (error) {
    console.error("❌ Error deleting team:", error.message);
    res.status(500).json({
      error: "Failed to delete team",
      details: error.message,
    });
  }
});

module.exports = router;
