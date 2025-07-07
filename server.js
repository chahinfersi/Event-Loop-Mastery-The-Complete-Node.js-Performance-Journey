const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Basic middleware
app.use(express.json({ limit: "10mb" }));
app.use(cors());

// Basic logging middleware (we'll see this in action)
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`📨 ${req.method} ${req.path} - Started`);

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `✅ ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`
    );
  });

  next();
});

// Connect to MongoDB
mongoose
  .connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/taskmaster-pro"
  )
  .then(() => {
    console.log("✅ Connected to MongoDB");
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  });

// Health check endpoint - always responsive at this stage
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + "MB",
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + "MB",
    },
  });
});
app.get('/memory-test', (req, res) => {
  const usage = process.memoryUsage();
  
  res.json({
    timestamp: new Date().toISOString(),
    memory: {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB',
      external: Math.round(usage.external / 1024 / 1024) + 'MB',
      rss: Math.round(usage.rss / 1024 / 1024) + 'MB'
    },
    efficiency: Math.round((usage.heapUsed / usage.heapTotal) * 100) + '%'
  });
});

app.use('/api/monitor', require('./routes/monitoring'));

app.use('/api/users', require('./routes/users'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/tasks', require('./routes/tasks')); 
app.use('/api/files', require('./routes/files'));
app.use('/api/files', require('./routes/files-solution'));

console.log('📋 API Routes loaded:');
console.log('  👥 Users: /api/users');
console.log('  📁 Teams: /api/teams');
console.log('  📝 Tasks: /api/tasks');
console.log('  💥 Files: /api/files (INCLUDES BOTH!)');
console.log('  📊 Monitor: /api/monitor (REAL-TIME! AND EXTERNEL MONITORING)');
console.log('');
console.log('📁 File Processing Options:');
console.log('  💀 Disaster: POST /api/files/upload (2+ hour blocking)');
console.log('  🚀 Solution: POST /api/files/upload-worker (30-60s, no blocking)');
console.log('  📊 Compare: GET /api/files/compare');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 TaskMaster Pro running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});
