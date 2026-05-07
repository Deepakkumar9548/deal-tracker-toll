const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

const connectDB = require("./config/db.config");
const logger = require("./config/logger.config");
const apiLimiter = require("./common/middlewares/rate-limiter.middleware");
const errorMiddleware = require("./common/middlewares/error.middleware");
const { updateStats, getStats } = require("./common/utils/monitor-store");
const dealRoutes = require("./modules/deals/routes/deal.routes");

dotenv.config();

const app = express();

// Path logic for Vercel (assuming frontend folder is moved inside backend)
const frontendRoot = path.join(__dirname, "..", "frontend", "src");

// Connect to Database immediately for Vercel/Serverless environment
connectDB();


app.use("/api/", apiLimiter);
app.use(cors());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    updateStats(req.method, req.originalUrl, duration, res.statusCode);

    const message = `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`;
    if (res.statusCode >= 400) {
      logger.error(message);
    } else {
      logger.info(message);
    }
  });

  next();
});

app.get("/api/monitor/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify(getStats())}\n\n`);
  }, 2000);

  req.on("close", () => clearInterval(interval));
});

app.use("/api/deals", dealRoutes);
app.use("/uploads", express.static(path.join(backendRoot, "uploads")));
app.use(express.static(frontendRoot));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(frontendRoot, "pages", "index.html"));
});

app.use(errorMiddleware);

const startServer = async () => {
  await connectDB();

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

module.exports = app;

