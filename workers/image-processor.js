// This runs in a SEPARATE THREAD - won't block main event loop!
const { parentPort, workerData } = require('worker_threads');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

class WorkerImageProcessor {
  constructor() {
    this.startTime = Date.now();
    console.log(`🔧 Worker started for: ${workerData.originalName}`);
  }
  
  async processImage() {
    try {
      // Progress reporting
      this.reportProgress(10, 'Worker started, reading image data...');
      
      // Read image buffer (in worker thread - doesn't block main)
      const imageBuffer = workerData.imageBuffer;
      
      // Get metadata
      this.reportProgress(20, 'Analyzing image metadata...');
      const metadata = await sharp(imageBuffer).metadata();
      
      // Generate thumbnails (CPU-intensive work in worker)
      this.reportProgress(30, 'Generating thumbnails...');
      const thumbnails = await this.generateThumbnails(imageBuffer);
      
      // Process multiple sizes (parallel processing in worker)
      this.reportProgress(60, 'Creating multiple sizes...');
      const sizes = await this.generateMultipleSizes(imageBuffer);
      
      // Perform security scan (in worker thread)
      this.reportProgress(80, 'Performing security scan...');
      const securityResult = await this.performSecurityScan(imageBuffer);
      
      this.reportProgress(100, 'Processing complete!');
      
      const totalTime = Date.now() - this.startTime;
      
      // Send result back to main thread
      parentPort.postMessage({
        type: 'complete',
        result: {
          type: 'image',
          metadata: {
            width: metadata.width,
            height: metadata.height,
            format: metadata.format,
            size: imageBuffer.length
          },
          thumbnails,
          sizes,
          security: securityResult,
          processingTime: totalTime,
          processedBy: 'worker-thread',
          workerPid: process.pid
        }
      });
      
    } catch (error) {
      console.error('💥 Worker error:', error);
      parentPort.postMessage({
        type: 'error',
        error: error.message
      });
    }
  }
  
  async generateThumbnails(imageBuffer) {
    this.reportProgress(35, 'Creating main thumbnail...');
    
    // Efficient thumbnail generation (no artificial blocking)
    const thumbnail = await sharp(imageBuffer)
      .resize(200, 200, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toBuffer();
    
    const thumbnailPath = path.join('uploads/thumbnails', `worker_thumb_${workerData.filename}`);
    await fs.writeFile(thumbnailPath, thumbnail);
    
    return {
      main: thumbnailPath,
      size: thumbnail.length
    };
  }
  
  async generateMultipleSizes(imageBuffer) {
    this.reportProgress(45, 'Generating multiple sizes...');
    
    const sizes = [100, 300, 500, 800];
    const results = {};
    
    // Process sizes in parallel (efficient)
    const sizePromises = sizes.map(async (size) => {
      const resized = await sharp(imageBuffer)
        .resize(size, size, { fit: 'cover' })
        .jpeg({ quality: 85 })
        .toBuffer();
      
      const sizePath = path.join('uploads/thumbnails', `worker_${size}_${workerData.filename}`);
      await fs.writeFile(sizePath, resized);
      
      return { size, path: sizePath, bytes: resized.length };
    });
    
    const sizeResults = await Promise.all(sizePromises);
    
    sizeResults.forEach(result => {
      results[result.size] = result.path;
    });
    
    return results;
  }
  
  async performSecurityScan(imageBuffer) {
    this.reportProgress(85, 'Scanning for security threats...');
    
    // Efficient security scanning (no artificial blocking)
    const chunkSize = 10000;
    let suspiciousPatterns = 0;
    const signatures = ['exec', 'eval', 'script', 'virus', 'malware'];
    
    for (let i = 0; i < imageBuffer.length; i += chunkSize) {
      const chunk = imageBuffer.slice(i, i + chunkSize).toString('ascii', 0, 100);
      
      for (const signature of signatures) {
        if (chunk.toLowerCase().includes(signature)) {
          suspiciousPatterns++;
        }
      }
      
      // Yield control occasionally (good practice)
      if (i % (chunkSize * 100) === 0) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }
    
    return {
      status: suspiciousPatterns > 5 ? 'suspicious' : 'clean',
      patternsFound: suspiciousPatterns,
      scannedBytes: imageBuffer.length,
      scanMethod: 'worker-thread'
    };
  }
  
  reportProgress(percent, message) {
    parentPort.postMessage({
      type: 'progress',
      percent,
      message,
      timestamp: new Date().toISOString()
    });
  }
}

// Start processing when worker is created
const processor = new WorkerImageProcessor();
processor.processImage();