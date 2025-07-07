const express = require('express');
const realTimeMonitor = require('../monitoring/real-time-monitor');

const router = express.Router();

// GET /api/monitor/real-time - Live metrics
router.get('/real-time', (req, res) => {
  const metrics = realTimeMonitor.getRealTimeMetrics();
  
  res.json({
    status: metrics.blockingDetected ? 'DISASTER' : 'healthy',
    eventLoopLag: metrics.eventLoopLag.toFixed(2) + 'ms',
    requestsInProgress: metrics.requestsInProgress,
    requestQueue: metrics.requestQueue.map(r => ({
      method: r.method,
      path: r.path,
      duration: r.status === 'completed' ? r.duration : Date.now() - r.startTime,
      status: r.status
    })),
    memory: {
      heapUsed: Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(metrics.memoryUsage.heapTotal / 1024 / 1024) + 'MB',
      efficiency: metrics.memoryEfficiency,
      external: Math.round(metrics.memoryUsage.external / 1024 / 1024) + 'MB'
    },
    performance: {
      uptime: Math.round(metrics.uptime) + 's',
      eventLoopStatus: metrics.eventLoopLag > 1000 ? 'BLOCKED' : 'FREE'
    },
    timestamp: metrics.timestamp
  });
});

// GET /api/monitor/disaster - Check if disaster mode is active
router.get('/disaster', (req, res) => {
  const metrics = realTimeMonitor.getRealTimeMetrics();
  
  res.json({
    disasterActive: metrics.blockingDetected || metrics.eventLoopLag > 1000,
    eventLoopLag: metrics.eventLoopLag.toFixed(2) + 'ms',
    requestsStuck: metrics.requestQueue.filter(r => r.status === 'in-progress').length,
    severity: metrics.eventLoopLag > 5000 ? 'NUCLEAR' : 
             metrics.eventLoopLag > 1000 ? 'CRITICAL' : 'NORMAL'
  });
});

module.exports = router;