const http = require("http");
const fs = require("fs");

class ExternalMonitor {
  constructor() {
    this.logFile = "monitoring-log.txt";
    this.monitoringActive = true;

    console.log("🔍 External Monitor Started - Independent Process");
    this.startMonitoring();
  }

  async checkServerHealth() {
    return new Promise((resolve) => {
      const start = Date.now();

      const req = http.get(
        "http://localhost:3000/health",
        {
          timeout: 2000, // 2 second timeout
        },
        (res) => {
          const duration = Date.now() - start;
          resolve({
            status: "responsive",
            responseTime: duration,
            httpStatus: res.statusCode,
            timestamp: new Date().toISOString(),
          });
        }
      );

      req.on("timeout", () => {
        req.destroy();
        const duration = Date.now() - start;
        resolve({
          status: "TIMEOUT",
          responseTime: duration,
          httpStatus: "TIMEOUT",
          timestamp: new Date().toISOString(),
        });
      });

      req.on("error", (error) => {
        const duration = Date.now() - start;
        resolve({
          status: "ERROR",
          responseTime: duration,
          httpStatus: error.message,
          timestamp: new Date().toISOString(),
        });
      });
    });
  }

  startMonitoring() {
    console.log("📊 Starting external health checks every 5 seconds...");

    const checkInterval = setInterval(async () => {
      if (!this.monitoringActive) {
        clearInterval(checkInterval);
        return;
      }

      const health = await this.checkServerHealth();
      const logEntry = `${health.timestamp} | Status: ${health.status} | Response: ${health.responseTime}ms | HTTP: ${health.httpStatus}`;

      // Log to console
      if (health.status === "TIMEOUT" || health.responseTime > 1000) {
        console.log(`🚨 DISASTER DETECTED: ${logEntry}`);
      } else {
        console.log(`✅ HEALTHY: ${logEntry}`);
      }

      // Log to file
      fs.appendFileSync(this.logFile, logEntry + "\n");
    }, 5000); // Check every 5 seconds
  }

  stop() {
    this.monitoringActive = false;
    console.log("🛑 External monitoring stopped");
  }
}

// Run if this file is executed directly
if (require.main === module) {
  const monitor = new ExternalMonitor();

  // Stop monitoring on Ctrl+C
  process.on("SIGINT", () => {
    monitor.stop();
    process.exit(0);
  });
}

module.exports = ExternalMonitor;
