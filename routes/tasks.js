const express = require("express");
const Task = require("../models/Task");
const Team = require("../models/Team");
const User = require('../models/User');

const router = express.Router();

// GET /api/tasks - List tasks with filtering and sorting
router.get("/", async (req, res) => {
  try {
    console.log("🔍 Fetching tasks...", req.query);
    const start = Date.now();

    // Query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};

    if (req.query.team) filter.team = req.query.team;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.assignee) filter.assignee = req.query.assignee;

    // Date range filtering
    if (req.query.dueBefore) {
      filter.dueDate = { $lte: new Date(req.query.dueBefore) };
    }

    // Build sort object
    const sortOptions = {};
    if (req.query.sortBy) {
      const sortField = req.query.sortBy;
      const sortOrder = req.query.sortOrder === "desc" ? -1 : 1;
      sortOptions[sortField] = sortOrder;
    } else {
      sortOptions.createdAt = -1; // Default: newest first
    }

    const tasks = await Task.find(filter)
      .populate("assignee", "name email")
      .populate("team", "name")
      .populate("createdBy", "name email")
      .sort(sortOptions)
      .limit(limit)
      .skip(skip);

    const total = await Task.countDocuments(filter);

    // Calculate some quick stats
    const stats = await Task.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const duration = Date.now() - start;
    console.log(`✅ Tasks fetched in ${duration}ms`);

    res.json({
      tasks,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: tasks.length,
        totalItems: total,
      },
      stats: {
        byStatus: stats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        total,
      },
      performance: {
        queryTime: duration + "ms",
        tasksReturned: tasks.length,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching tasks:", error.message);
    res.status(500).json({
      error: "Failed to fetch tasks",
      details: error.message,
    });
  }
});

// POST /api/tasks - Create a new task
router.post("/", async (req, res) => {
  try {
    console.log("📝 Creating new task:", req.body.title);
    const start = Date.now();

    const { title, description, priority, dueDate, assignee, team, createdBy } =
      req.body;

    // Input validation
    if (!title || title.trim().length < 3) {
      return res.status(400).json({
        error: "Task title is required and must be at least 3 characters",
      });
    }

    if (!team) {
      return res.status(400).json({
        error: "Team is required",
      });
    }

    // Verify team exists
    const teamExists = await Team.findById(team);
    if (!teamExists) {
      return res.status(404).json({
        error: "Team not found",
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

    // If assignee is provided, verify user exists
    if (assignee) {
      const assigneeExists = await User.findById(assignee);
      if (!assigneeExists) {
        return res.status(404).json({
          error: "Assignee user not found",
        });
      }
    }

    const task = new Task({
      title: title.trim(),
      description: description?.trim(),
      priority: priority || "medium",
      dueDate: dueDate ? new Date(dueDate) : null,
      assignee: assignee || null,
      team,
      createdBy: createdBy || null, // Can be null initially
    });

    await task.save();

    // Populate only existing references
    const populateOptions = [{ path: "team", select: "name" }];

    if (task.assignee) {
      populateOptions.push({ path: "assignee", select: "name email" });
    }

    if (task.createdBy) {
      populateOptions.push({ path: "createdBy", select: "name email" });
    }

    await task.populate(populateOptions);

    const duration = Date.now() - start;
    console.log(`✅ Task created in ${duration}ms`);

    res.status(201).json({
      message: "Task created successfully",
      task, 
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
    console.error("❌ Error creating task:", error.message);
    res.status(500).json({
      error: "Failed to create task",
      details: error.message,
    });
  }
});

// GET /api/tasks/:id - Get specific task
router.get("/:id", async (req, res) => {
  try {
    console.log(`🔍 Fetching task: ${req.params.id}`);
    const start = Date.now();

    const task = await Task.findById(req.params.id)
      .populate("assignee", "name email role")
      .populate("team", "name description")
      .populate("createdBy", "name email");

    if (!task) {
      return res.status(404).json({
        error: "Task not found",
      });
    }

    const duration = Date.now() - start;
    console.log(`✅ Task details fetched in ${duration}ms`);

    res.json({
      task,
      performance: {
        queryTime: duration + "ms",
      },
    });
  } catch (error) {
    console.error("❌ Error fetching task:", error.message);
    res.status(500).json({
      error: "Failed to fetch task",
      details: error.message,
    });
  }
});

// PUT /api/tasks/:id - Update task
router.put("/:id", async (req, res) => {
  try {
    console.log(`📝 Updating task: ${req.params.id}`);
    const start = Date.now();

    const updateData = { ...req.body };

    // Input validation
    if (updateData.title && updateData.title.trim().length < 3) {
      return res.status(400).json({
        error: "Task title must be at least 3 characters",
      });
    }

    // Clean up data
    if (updateData.title) updateData.title = updateData.title.trim();
    if (updateData.description)
      updateData.description = updateData.description.trim();
    if (updateData.dueDate) updateData.dueDate = new Date(updateData.dueDate);

    // Always update the updatedAt field
    updateData.updatedAt = new Date();

    const task = await Task.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate([
      { path: "assignee", select: "name email" },
      { path: "team", select: "name" },
      { path: "createdBy", select: "name email" },
    ]);

    if (!task) {
      return res.status(404).json({
        error: "Task not found",
      });
    }

    const duration = Date.now() - start;
    console.log(`✅ Task updated in ${duration}ms`);

    res.json({
      message: "Task updated successfully",
      task,
      performance: {
        updateTime: duration + "ms",
      },
    });
  } catch (error) {
    console.error("❌ Error updating task:", error.message);
    res.status(500).json({
      error: "Failed to update task",
      details: error.message,
    });
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete("/:id", async (req, res) => {
  try {
    console.log(`🗑️ Deleting task: ${req.params.id}`);
    const start = Date.now();

    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({
        error: "Task not found",
      });
    }

    const duration = Date.now() - start;
    console.log(`✅ Task deleted in ${duration}ms`);

    res.json({
      message: "Task deleted successfully",
      deletedTask: {
        id: task._id,
        title: task.title,
      },
      performance: {
        deleteTime: duration + "ms",
      },
    });
  } catch (error) {
    console.error("❌ Error deleting task:", error.message);
    res.status(500).json({
      error: "Failed to delete task",
      details: error.message,
    });
  }
});

module.exports = router;
