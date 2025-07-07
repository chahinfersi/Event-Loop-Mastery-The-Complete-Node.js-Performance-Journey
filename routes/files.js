const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const pdfParse = require("pdf-parse");

const router = express.Router();

// Configure multer for file uploads
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
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 20, // Max 20 files at once
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Invalid file type"), false);
    }
  },
});

// POST /api/files/upload - THE EVENT LOOP DESTROYER! 💥
router.post("/upload", upload.single("file"), async (req, res) => {
  const start = Date.now();
  const startMemory = process.memoryUsage();

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    console.log(
      `🔥 CHAOS BEGINS: Processing ${req.file.originalname} (${Math.round(
        req.file.size / 1024 / 1024
      )}MB)`
    );

    let processingResult = {};

    // 💀 DISASTER #1: Synchronous file reading (blocks event loop)
    console.log("💀 Step 1: Reading file synchronously...");
    const fileBuffer = fs.readFileSync(req.file.path);
    console.log(`💀 File read completed: ${fileBuffer.length} bytes`);

    // 💀 DISASTER #2: CPU-intensive processing based on file type
    if (req.file.mimetype.startsWith("image/")) {
      console.log("🖼️ DISASTER: Processing image synchronously...");
      processingResult = processImageAbsolutelyDisastrously(
        fileBuffer,
        req.file
      );
    } else if (req.file.mimetype === "application/pdf") {
      console.log("📄 DISASTER: Processing PDF synchronously...");
      processingResult = await processPDFDisastrously(fileBuffer);
    } else {
      console.log("📄 DISASTER: Processing document...");
      processingResult = await processDocumentDisastrously(fileBuffer);
    }

    // 💀 DISASTER #3: Synchronous virus scanning simulation
    console.log("🔍 DISASTER: Performing synchronous virus scan...");
    const virusScanResult = performVirusScanDisastrously(fileBuffer);

    const endTime = Date.now();
    const endMemory = process.memoryUsage();
    const duration = endTime - start;

    console.log(
      `🔥 CHAOS COMPLETE: ${req.file.originalname} processed in ${duration}ms`
    );

    res.json({
      message: "File processed successfully (after causing chaos!)",
      file: {
        id: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype,
      },
      processing: processingResult,
      security: virusScanResult,
      performance: {
        totalTime: duration + "ms",
        timestamp: new Date().toISOString(),
        uptime: Math.round(process.uptime()),
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
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`💥 CHAOS FAILED: ${error.message} after ${duration}ms`);

    res.status(500).json({
      error: "File processing failed during chaos",
      details: error.message,
      chaosTime: duration + "ms",
    });
  }
});

// 💀 THIS IS NON BLOCKING IMAGE PROCESSOR EVEN ITS CPU INTENSIVE CAUSE WE HAVA "await" WHICH MAKE GAPS IN THE PROCESS
async function processImageDisastrouslyNonBlocking(imageBuffer, fileInfo) {
  console.log("🔄 Starting MAXIMUM image chaos...");
  const startTime = Date.now();

  try {
    // Step 1: Get image info
    console.log("💀 Getting image metadata synchronously...");
    const metadata = await sharp(imageBuffer).metadata();

    // Step 2: ENHANCED CHAOS - Multiple thumbnail operations
    console.log("💀 Generating thumbnails (MAXIMUM CPU-intensive blocking)...");
    const thumbnailStart = Date.now();

    // Generate main thumbnail with MAXIMUM processing
    let thumbnail = sharp(imageBuffer)
      .resize(200, 200, { fit: "cover" })
      .jpeg({ quality: 80 });

    // 💀 ENHANCED: More blocking operations
    for (let i = 0; i < 15; i++) {
      // Increased from 5 to 15
      console.log(`💀 Thumbnail iteration ${i + 1}/15 (CHAOS MODE)...`);
      thumbnail = thumbnail.blur(0.3).sharpen(0.8);

      // 💀 MASSIVE artificial CPU work to block MUCH longer
      let waste = 0;
      for (let j = 0; j < 50000000; j++) {
        // Increased from 10M to 50M
        waste += Math.sqrt(j * Math.random());
      }

      // Add more blocking operations
      for (let k = 0; k < 1000000; k++) {
        Math.sin(k) * Math.cos(k) * Math.tan(k);
      }
    }

    const thumbnailBuffer = await thumbnail.toBuffer();
    const thumbnailTime = Date.now() - thumbnailStart;

    // Step 3: Save thumbnail synchronously
    console.log("💀 Saving thumbnail synchronously...");
    const thumbnailPath = path.join(
      "uploads/thumbnails",
      `thumb_${fileInfo.filename}`
    );
    fs.writeFileSync(thumbnailPath, thumbnailBuffer);

    // Step 4: ENHANCED CHAOS - More sizes with MORE blocking
    console.log("💀 Generating multiple sizes (MAXIMUM CHAOS)...");
    const sizes = [50, 100, 150, 200, 300, 400, 500, 600, 800, 1000]; // More sizes
    const resizedImages = {};

    for (const size of sizes) {
      console.log(`💀 Generating ${size}x${size} version with CHAOS...`);

      // Add blocking operations for each size
      let waste = 0;
      for (let i = 0; i < 10000000; i++) {
        // 10M operations per size
        waste += Math.sqrt(i) * Math.random();
      }

      const resized = await sharp(imageBuffer)
        .resize(size, size, { fit: "cover" })
        .blur(0.5)
        .sharpen(0.5)
        .jpeg({ quality: 85 })
        .toBuffer();

      const sizePath = path.join(
        "uploads/thumbnails",
        `${size}_${fileInfo.filename}`
      );
      fs.writeFileSync(sizePath, resized);
      resizedImages[size] = sizePath;

      // More blocking per iteration
      for (let j = 0; j < 5000000; j++) {
        Math.pow(j, 0.5);
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`🔥 MAXIMUM Image chaos completed in ${totalTime}ms`);

    return {
      type: "image",
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: imageBuffer.length,
      },
      thumbnails: {
        main: thumbnailPath,
        sizes: resizedImages,
      },
      processingTime: totalTime + "ms",
      thumbnailGenerationTime: thumbnailTime + "ms",
      chaosLevel: "MAXIMUM",
    };
  } catch (error) {
    console.error("💥 MAXIMUM Image processing chaos failed:", error);
    throw error;
  }
}
// 💀 THE ABSOLUTELY BLOCKING IMAGE PROCESSOR (NO GAPS!)
async function processImageDisastrously(imageBuffer, fileInfo) {
  console.log("🔄 Starting PURE BLOCKING image chaos...");
  const startTime = Date.now();

  try {
    // Step 1: Get image info
    const metadata = await sharp(imageBuffer).metadata();

    console.log("💀 Starting PURE CPU blocking (no async gaps)...");

    // 💀 PURE BLOCKING: No async operations, just raw CPU work
    let wasteAccumulator = 0;
    for (let iteration = 1; iteration <= 20; iteration++) {
      console.log(`💀 PURE BLOCKING iteration ${iteration}/20...`);

      // Massive synchronous CPU work - NO async breaks!
      for (let i = 0; i < 100000000; i++) {
        // 100 million operations
        wasteAccumulator += Math.sqrt(i) * Math.sin(i) * Math.cos(i);

        // Every 10 million, do more complex math
        if (i % 10000000 === 0) {
          for (let j = 0; j < 1000000; j++) {
            wasteAccumulator += Math.pow(j, 0.5) * Math.log(j + 1);
          }
        }
      }

      // More blocking operations
      for (let k = 0; k < 50000000; k++) {
        wasteAccumulator += Math.tan(k) * Math.atan(k);
      }
    }

    console.log(`💀 PURE BLOCKING completed: ${wasteAccumulator}`);

    // Now do the image processing (this will be much faster)
    console.log("💀 Quick image processing after blocking...");
    const thumbnail = await sharp(imageBuffer)
      .resize(200, 200)
      .jpeg({ quality: 80 })
      .toBuffer();

    const thumbnailPath = path.join(
      "uploads/thumbnails",
      `thumb_${fileInfo.filename}`
    );
    fs.writeFileSync(thumbnailPath, thumbnail);

    // Generate fewer sizes but with pure blocking
    const sizes = [100, 300, 500];
    const resizedImages = {};

    for (const size of sizes) {
      console.log(`💀 PURE BLOCKING for ${size}x${size}...`);

      // More pure blocking per size
      let moreWaste = 0;
      for (let i = 0; i < 50000000; i++) {
        moreWaste += Math.sqrt(i * size) * Math.random();
      }

      const resized = await sharp(imageBuffer)
        .resize(size, size)
        .jpeg({ quality: 85 })
        .toBuffer();

      const sizePath = path.join(
        "uploads/thumbnails",
        `${size}_${fileInfo.filename}`
      );
      fs.writeFileSync(sizePath, resized);
      resizedImages[size] = sizePath;
    }

    const totalTime = Date.now() - startTime;
    console.log(`🔥 PURE BLOCKING chaos completed in ${totalTime}ms`);

    return {
      type: "image",
      metadata,
      thumbnails: {
        main: thumbnailPath,
        sizes: resizedImages,
      },
      processingTime: totalTime + "ms",
      chaosLevel: "PURE_BLOCKING",
    };
  } catch (error) {
    console.error("💥 PURE BLOCKING chaos failed:", error);
    throw error;
  }
}
// 💀 THE ABSOLUTE BLOCKING PROCESSOR (Zero Mercy!)
function processImageAbsolutelyDisastrously(imageBuffer, fileInfo) {
  console.log("🔄 Starting ABSOLUTE BLOCKING chaos (NO MERCY!)...");
  const startTime = Date.now();

  // 💀 NUCLEAR OPTION: Pure synchronous blocking with ZERO async calls
  console.log("💀 NUCLEAR BLOCKING: No async, no gaps, no mercy...");

  let wasteAccumulator = 0;

  // Phase 1: Initial blocking hell
  console.log("💀 Phase 1: Initial blocking hell...");
  for (let phase1 = 1; phase1 <= 10; phase1++) {
    console.log(`💀 NUCLEAR Phase 1.${phase1}/10 - Absolute blocking...`);

    for (let i = 0; i < 200000000; i++) {
      // 200 million operations
      wasteAccumulator +=
        Math.sqrt(i) * Math.sin(i) * Math.cos(i) * Math.tan(i % 100);

      if (i % 50000000 === 0) {
        // Nested blocking hell
        for (let j = 0; j < 10000000; j++) {
          wasteAccumulator +=
            Math.pow(j, 0.3) * Math.log(j + 1) * Math.exp(j % 10);
        }
      }
    }
  }

  // Phase 2: File system blocking hell
  console.log("💀 Phase 2: File system blocking hell...");
  for (let phase2 = 1; phase2 <= 5; phase2++) {
    console.log(`💀 NUCLEAR Phase 2.${phase2}/5 - File system torture...`);

    // Read the same file multiple times synchronously
    for (let read = 0; read < 5; read++) {
      const tempBuffer = fs.readFileSync(fileInfo.path);

      // Process every byte synchronously
      for (let byte = 0; byte < Math.min(tempBuffer.length, 1000000); byte++) {
        wasteAccumulator += tempBuffer[byte] * Math.sqrt(byte);
      }
    }

    // More CPU hell between reads
    for (let k = 0; k < 100000000; k++) {
      wasteAccumulator += Math.atan(k) * Math.asin((k % 100) / 100);
    }
  }

  // Phase 3: Final blocking apocalypse
  console.log("💀 Phase 3: Final blocking apocalypse...");
  for (let phase3 = 1; phase3 <= 15; phase3++) {
    console.log(`💀 NUCLEAR Phase 3.${phase3}/15 - Apocalypse mode...`);

    // Triple nested loops of doom
    for (let i = 0; i < 5000; i++) {
      for (let j = 0; j < 5000; j++) {
        for (let k = 0; k < 2000; k++) {
          wasteAccumulator += Math.sqrt(i * j * k + 1) * Math.random();
        }
      }
    }
  }

  console.log(`💀 NUCLEAR BLOCKING completed: ${wasteAccumulator}`);

  // Simple thumbnail creation (synchronous only)
  const thumbnailPath = path.join(
    "uploads/thumbnails",
    `nuclear_${fileInfo.filename}`
  );

  // Just copy the original file as "thumbnail" (no async Sharp operations)
  fs.writeFileSync(thumbnailPath, imageBuffer);

  const totalTime = Date.now() - startTime;
  console.log(`🔥 NUCLEAR chaos completed in ${totalTime}ms`);

  return {
    type: "image",
    metadata: {
      size: imageBuffer.length,
      processed: "NUCLEAR_BLOCKING",
    },
    thumbnails: {
      main: thumbnailPath,
    },
    processingTime: totalTime + "ms",
    chaosLevel: "NUCLEAR",
    wasteAccumulator: wasteAccumulator,
  };
}

// 💀 THE BLOCKING PDF PROCESSOR
async function processPDFDisastrously(pdfBuffer) {
  console.log("📄 Starting PDF chaos...");
  const startTime = Date.now();

  try {
    // 💀 DISASTER: Extract text synchronously (very CPU-intensive)
    console.log("💀 Extracting PDF text (CPU-intensive blocking)...");
    const pdfData = await pdfParse(pdfBuffer);

    // 💀 Additional blocking operations
    console.log("💀 Analyzing text content...");
    const text = pdfData.text;
    const words = text.split(/\s+/);
    const paragraphs = text.split(/\n\s*\n/);

    // Artificial heavy computation (intentionally blocking)
    let wordFrequency = {};
    for (let word of words) {
      const cleanWord = word.toLowerCase().replace(/[^\w]/g, "");
      if (cleanWord.length > 2) {
        wordFrequency[cleanWord] = (wordFrequency[cleanWord] || 0) + 1;

        // Add artificial delay per word
        let waste = 0;
        for (let i = 0; i < 100000; i++) {
          waste += Math.sqrt(i);
        }
      }
    }

    // Sort frequencies (more CPU work)
    const sortedWords = Object.entries(wordFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 50);

    const totalTime = Date.now() - startTime;
    console.log(`🔥 PDF chaos completed in ${totalTime}ms`);

    return {
      type: "pdf",
      analysis: {
        pages: pdfData.numpages,
        wordCount: words.length,
        paragraphCount: paragraphs.length,
        topWords: sortedWords.slice(0, 10),
      },
      textLength: text.length,
      processingTime: totalTime + "ms",
    };
  } catch (error) {
    console.error("💥 PDF processing chaos failed:", error);
    throw error;
  }
}

// 💀 THE BLOCKING DOCUMENT PROCESSOR
async function processDocumentDisastrously(fileBuffer) {
  console.log("📄 Starting document chaos...");
  const startTime = Date.now();

  // Simulate heavy document processing
  console.log("💀 Analyzing document content...");

  // Convert to string and process
  const content = fileBuffer.toString("utf8");
  const lines = content.split("\n");

  // Heavy processing simulation
  let analysis = {
    lineCount: lines.length,
    characterCount: content.length,
    wordCount: 0,
    encoding: "utf8",
  };

  // Intentionally slow word counting
  for (let line of lines) {
    const words = line.split(/\s+/);
    analysis.wordCount += words.length;

    // Add artificial CPU work
    let waste = 0;
    for (let i = 0; i < 50000; i++) {
      waste += Math.sqrt(i);
    }
  }

  const totalTime = Date.now() - startTime;
  console.log(`🔥 Document chaos completed in ${totalTime}ms`);

  return {
    type: "document",
    analysis,
    processingTime: totalTime + "ms",
  };
}

// 💀 THE BLOCKING VIRUS SCANNER
function performVirusScanDisastrously(fileBuffer) {
  console.log("🔍 Starting virus scan chaos...");
  const startTime = Date.now();

  // Simulate intensive virus scanning (synchronous and blocking)
  console.log("💀 Scanning file signatures...");

  // Simulate scanning every byte (intentionally inefficient)
  let suspiciousPatterns = 0;
  const dangerousSignatures = ["exec", "eval", "script", "virus", "malware"];

  for (let i = 0; i < fileBuffer.length; i += 1000) {
    const chunk = fileBuffer.slice(i, i + 1000).toString("ascii", 0, 100);

    for (const signature of dangerousSignatures) {
      if (chunk.toLowerCase().includes(signature)) {
        suspiciousPatterns++;
      }
    }

    // Add artificial delay to make it more blocking
    let waste = 0;
    for (let j = 0; j < 10000; j++) {
      waste += Math.sqrt(j);
    }
  }

  const scanTime = Date.now() - startTime;
  console.log(`🔥 Virus scan chaos completed in ${scanTime}ms`);

  return {
    status: suspiciousPatterns > 5 ? "suspicious" : "clean",
    patternsFound: suspiciousPatterns,
    scanTime: scanTime + "ms",
    scannedBytes: fileBuffer.length,
  };
}

module.exports = router;
