const express = require("express");
const router = express.Router();
const upload = require("../../../common/middlewares/upload.middleware");

const uploadFields = upload.fields([
  { name: 'pill-auto', maxCount: 1 },
  { name: 'pill-video', maxCount: 1 },
  { name: 'pill-quot', maxCount: 1 },
  { name: 'pill-price', maxCount: 1 },
  { name: 'pill-ledger', maxCount: 1 },
  { name: 'pill-slip', maxCount: 1 },
  { name: 'pill-other', maxCount: 1 },
  { name: 'pill-paycard', maxCount: 1 }
]);

// Wrapper to handle Multer errors gracefully
const handleUpload = (req, res, next) => {
  uploadFields(req, res, (err) => {
    if (err) {
      if (err.name === 'MulterError') {
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      return res.status(500).json({ error: `Server error: ${err.message}` });
    }
    next();
  });
};

// Controller imports
const {
  createDeal,
  bulkCreateDeals,
  getDeals,
  getDealById,
  updateDeal,
  deleteDeal,
  getSummary,
  getHealthStats,
} = require("../controllers/deal.controller");

// =====================
// STATIC ROUTES FIRST
// =====================

// GET ALL DEALS
router.get("/", getDeals);

// GET HEALTH STATS
router.get("/health", getHealthStats);

// GET SUMMARY
router.get("/summary", getSummary);

// CREATE DEAL
router.post("/", handleUpload, createDeal);

// BULK CREATE DEALS (chunked Excel import)
router.post("/bulk", bulkCreateDeals);

// =====================
// DYNAMIC ROUTES LAST
// =====================

// GET SINGLE DEAL BY ID
router.get("/:id", getDealById);

// UPDATE DEAL
router.put("/:id", handleUpload, updateDeal);

// DELETE DEAL
router.delete("/:id", deleteDeal);

module.exports = router;
