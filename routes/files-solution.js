const express = require("express");
const multer = require("multer");
const { Worker } = require("worker_threads");
const path = require("path");
const fs = require("fs").promises;

const router = express.Router();

// Same multer config as disaster version
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      "-" +
      file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

// POST /api/files/upload-worker - THE SOLUTION! 🚀
router.post("/upload-worker", upload.single("file"), async (req, res) => {
  const start = Date.now();
  const startMemory = process.memoryUsage();

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log(
      `🚀 SOLUTION: Processing ${req.file.originalname} with worker thread`
    );

    // Read file data (this is fast)
    const imageBuffer = await fs.readFile(req.file.path);

    // Create worker thread for heavy processing
    const worker = new Worker("./workers/image-processor.js", {
      workerData: {
        imageBuffer: imageBuffer,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
      },
    });

    // Track progress and handle results
    let progressUpdates = [];

    worker.on("message", (message) => {
      if (message.type === "progress") {
        progressUpdates.push(message);
        console.log(`📊 Progress: ${message.percent}% - ${message.message}`);
      } else if (message.type === "complete") {
        const endTime = Date.now();
        const endMemory = process.memoryUsage();

        console.log(
          `✅ SOLUTION COMPLETE: ${req.file.originalname} processed in ${
            endTime - start
          }ms`
        );

        res.json({
          message: "File processed successfully with worker thread!",
          file: {
            id: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            type: req.file.mimetype,
          },
          processing: message.result,
          progress: progressUpdates,
          performance: {
            totalTime: endTime - start + "ms",
            timestamp: new Date().toISOString(),
            uptime: Math.round(process.uptime()),
            eventLoopBlocked: false, // ← KEY DIFFERENCE!
            memory: {
              before: {
                used: Math.round(startMemory.heapUsed / 1024 / 1024) + "MB",
                total: Math.round(startMemory.heapTotal / 1024 / 1024) + "MB",
              },
              after: {
                used: Math.round(endMemory.heapUsed / 1024 / 1024) + "MB",
                total: Math.round(endMemory.heapTotal / 1024 / 1024) + "MB",
              },
              growth:
                Math.round(
                  (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024
                ) + "MB",
            },
          },
        });
      } else if (message.type === "error") {
        console.error(`💥 Worker error: ${message.error}`);
        res.status(500).json({
          error: "File processing failed in worker thread",
          details: message.error,
        });
      }
    });

    worker.on("error", (error) => {
      console.error("💥 Worker thread error:", error);
      res.status(500).json({
        error: "Worker thread failed",
        details: error.message,
      });
    });

    worker.on("exit", (code) => {
      if (code !== 0) {
        console.error(`💥 Worker stopped with exit code ${code}`);
      }
    });
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`💥 Solution failed: ${error.message} after ${duration}ms`);

    res.status(500).json({
      error: "File processing failed",
      details: error.message,
      failureTime: duration + "ms",
    });
  }
});
// POST /api/files/upload-worker-nuclear - Nuclear chaos in worker thread!
router.post(
  "/upload-worker-nuclear",
  upload.single("file"),
  async (req, res) => {
    const start = Date.now();
    const startMemory = process.memoryUsage();

    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      console.log(
        `💀 NUCLEAR WORKER: Processing ${req.file.originalname} with nuclear chaos in worker thread`
      );

      // Read file data
      const imageBuffer = await fs.readFile(req.file.path);

      // Create worker thread for NUCLEAR processing
      const worker = new Worker("./workers/nuclear-processor.js", {
        workerData: {
          imageBuffer: imageBuffer,
          filename: req.file.filename,
          originalName: req.file.originalname,
          filePath: req.file.path,
        },
      });

      worker.on("message", (message) => {
        if (message.type === "complete") {
          const endTime = Date.now();
          const endMemory = process.memoryUsage();

          console.log(
            `💀 NUCLEAR WORKER COMPLETE: ${
              req.file.originalname
            } processed in ${endTime - start}ms`
          );

          res.json({
            message:
              "Nuclear chaos completed in worker thread - main thread never blocked!",
            file: {
              id: req.file.filename,
              originalName: req.file.originalname,
              size: req.file.size,
              type: req.file.mimetype,
            },
            processing: message.result,
            performance: {
              totalTime: endTime - start + "ms",
              mainThreadBlocked: false, // ← KEY POINT!
              nuclearChaosInWorker: true,
              workerProcessingTime: message.result.processingTime,
              memory: {
                before: {
                  used: Math.round(startMemory.heapUsed / 1024 / 1024) + "MB",
                  total: Math.round(startMemory.heapTotal / 1024 / 1024) + "MB",
                },
                after: {
                  used: Math.round(endMemory.heapUsed / 1024 / 1024) + "MB",
                  total: Math.round(endMemory.heapTotal / 1024 / 1024) + "MB",
                },
              },
            },
          });
        } else if (message.type === "error") {
          console.error(`💥 Nuclear worker error: ${message.error}`);
          res.status(500).json({
            error: "Nuclear processing failed in worker thread",
            details: message.error,
          });
        }
      });

      worker.on("error", (error) => {
        console.error("💥 Nuclear worker thread error:", error);
        res.status(500).json({
          error: "Nuclear worker thread failed",
          details: error.message,
        });
      });
    } catch (error) {
      res.status(500).json({
        error: "Nuclear worker setup failed",
        details: error.message,
      });
    }
  }
);
// GET /api/files/compare - Compare disaster vs solution performance
router.get("/compare", (req, res) => {
  res.json({
    endpoints: {
      disaster: {
        url: "POST /api/files/upload",
        description: "Nuclear blocking version (2+ hours)",
        expectedTime: "7,200,000ms (2 hours)",
        eventLoopBlocking: "COMPLETE",
        concurrentRequests: "IMPOSSIBLE",
      },
      solution: {
        url: "POST /api/files/upload-worker",
        description: "Worker thread version",
        expectedTime: "30,000-60,000ms (30-60 seconds)",
        eventLoopBlocking: "NONE",
        concurrentRequests: "UNLIMITED",
      },
    },
    testingInstructions: {
      step1: "Test disaster version with external monitor",
      step2: "Test solution version with external monitor",
      step3: "Try concurrent requests during solution processing",
      step4: "Compare performance metrics",
    },
  });
});

module.exports = router;
