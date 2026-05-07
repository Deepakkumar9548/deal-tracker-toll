let stats = {
  totalRequests: 0,
  totalErrors: 0,
  latencyHistory: [], // Last 100 requests
  slowQueries: [],    // Top 5 slowest
  errorTrends: {},    // Hour-based counts
  requestRates: [],   // Per second rates
  lastActive: Date.now()
};

const updateStats = (method, url, duration, statusCode) => {
  stats.totalRequests++;
  if (statusCode >= 400) stats.totalErrors++;
  
  stats.latencyHistory.push({ time: Date.now(), duration });
  if (stats.latencyHistory.length > 100) stats.latencyHistory.shift();

  if (duration > 500) {
    stats.slowQueries.push({ method, url, duration, time: new Date() });
    stats.slowQueries.sort((a, b) => b.duration - a.duration);
    stats.slowQueries = stats.slowQueries.slice(0, 5);
  }

  const hour = new Date().getHours();
  stats.errorTrends[hour] = (stats.errorTrends[hour] || 0) + (statusCode >= 400 ? 1 : 0);
};

const getStats = () => ({ ...stats });

module.exports = { updateStats, getStats };

