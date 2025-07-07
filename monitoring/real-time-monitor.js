const EventEmitter = require('events');

class RealTimeMonitor extends EventEmitter {
  constructor() {
    super();
    this.metrics = {
      eventLoopLag: 0,
      requestsInProgress: 0,
      memoryUsage: {},
      requestQueue: [],
      blockingDetected: false
    };
    
    this.startMonitoring();
  }
  
  startMonitoring() {
    // Event loop lag detection
    setInterval(() => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1e6;
        this.metrics.eventLoopLag = lag;
        
        if (lag > 1000) {
          this.metrics.blockingDetected = true;
          this.emit('eventLoopBlocked', { lag, severity: 'DISASTER' });
        }
      });
    }, 100); // Check every 100ms
    
    // Memory monitoring
    setInterval(() => {
      this.metrics.memoryUsage = process.memoryUsage();
    }, 1000);
  }
  
  trackRequest(req, res) {
    const requestId = Date.now() + Math.random();
    const request = {
      id: requestId,
      method: req.method,
      path: req.path,
      startTime: Date.now(),
      status: 'in-progress'
    };
    
    this.metrics.requestQueue.push(request);
    this.metrics.requestsInProgress++;
    
    res.on('finish', () => {
      request.status = 'completed';
      request.duration = Date.now() - request.startTime;
      this.metrics.requestsInProgress--;
      
      // Remove from queue after completion
      setTimeout(() => {
        const index = this.metrics.requestQueue.findIndex(r => r.id === requestId);
        if (index > -1) this.metrics.requestQueue.splice(index, 1);
      }, 5000);
    });
    
    return requestId;
  }
  
  getRealTimeMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memoryEfficiency: Math.round((this.metrics.memoryUsage.heapUsed / this.metrics.memoryUsage.heapTotal) * 100) + '%'
    };
  }
}

module.exports = new RealTimeMonitor();