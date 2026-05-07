const Deal = require("../models/deal.model");
const Counter = require("../models/counter.model");

const BULK_MAX_RECORDS = 5000;
const DEAL_LIST_PROJECTION = {
  dealId: 1,
  cname: 1,
  cnum: 1,
  dname: 1,
  dlocation: 1,
  dcode: 1,
  scname: 1,
  model: 1,
  variant: 1,
  projectName: 1,
  decision: 1,
  dvisit: 1,
  totalSb: 1,
  totalAc: 1,
  totalVr: 1,
  files: 1,
  createdAt: 1,
};

// Helper to determine the correct URL/path to save in the database
const getFilePath = (fileArray) => {
  if (!fileArray || !fileArray[0]) return "";
  if (fileArray[0].filename) {
    return `/uploads/${fileArray[0].filename}`;
  }
  return fileArray[0].path;
};

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const num = Number(String(value).replace(/[₹,\s]/g, ""));
  return Number.isFinite(num) ? num : 0;
};

const toArray = (value, fallback = []) => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (_) {
      return value.split("|").map((item) => item.trim());
    }
  }
  return fallback;
};

const pick = (row, keys, fallback = "") => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
  }
  return fallback;
};

const normalizeBulkDeal = (row) => {
  const sb = toArray(pick(row, ["sb", "Should Be", "Standard Values"], []), []).map(toNumber);
  const ac = toArray(pick(row, ["ac", "Actual", "Actual Values"], []), []).map(toNumber);
  const dsb = toArray(pick(row, ["dsb", "Discount Should Be"], []), []).map(toNumber);
  const dac = toArray(pick(row, ["dac", "Discount Actual"], []), []).map(toNumber);

  const totalSb = toNumber(pick(row, ["totalSb", "Total Should Be", "Deal_Breakup.Total Deal.Should Be"], 0)) || sb.reduce((sum, n) => sum + n, 0);
  const totalAc = toNumber(pick(row, ["totalAc", "Total Actual", "Deal_Breakup.Total Deal.Actual"], 0)) || ac.reduce((sum, n) => sum + n, 0);

  return {
    cname: String(pick(row, ["cname", "Customer Name", "Customer_Dealer_Info.Customer Name"], "")).trim(),
    cnum: String(pick(row, ["cnum", "Customer Number", "Customer_Dealer_Info.Customer Number"], "")).trim(),
    dname: String(pick(row, ["dname", "Dealer Name", "Customer_Dealer_Info.Dealer Name"], "")).trim(),
    dlocation: String(pick(row, ["dlocation", "Dealership Location", "Customer_Dealer_Info.Dealership Location"], "")).trim(),
    dcode: String(pick(row, ["dcode", "Dealer Code", "Customer_Dealer_Info.Dealer Code"], "")).trim(),
    scname: String(pick(row, ["scname", "SC Name & No", "Customer_Dealer_Info.SC Name & No"], "")).trim(),
    model: String(pick(row, ["model", "Model & Variant", "Customer_Dealer_Info.Model & Variant"], "")).trim(),
    projectName: String(pick(row, ["projectName", "Project Name", "Customer_Dealer_Info.Project Name"], "")).trim(),
    nature: String(pick(row, ["nature", "Nature", "Customer_Dealer_Info.Nature"], "")).trim(),
    decision: String(pick(row, ["decision", "Final Decision", "Customer_Dealer_Info.Final Decision"], "")).trim(),
    mgmtDecision: String(pick(row, ["mgmtDecision", "Mgmt Decision", "Customer_Dealer_Info.Mgmt Decision"], "")).trim(),
    dvisit: String(pick(row, ["dvisit", "Date of Visit", "Visit_Booking_Info.Date of Visit"], "")).trim(),
    booking: String(pick(row, ["booking", "Booking Amount", "Visit_Booking_Info.Booking Amount"], "")).trim(),
    dbooking: String(pick(row, ["dbooking", "Booking Date", "Visit_Booking_Info.Booking Date"], "")).trim(),
    ddelivery: String(pick(row, ["ddelivery", "Delivery Date", "Visit_Booking_Info.Delivery Date"], "")).trim(),
    dbreach: String(pick(row, ["dbreach", "Breach Date", "Visit_Booking_Info.Breach Date"], "")).trim(),
    dms: String(pick(row, ["dms", "MS Date", "Visit_Booking_Info.MS Date"], "")).trim(),
    dclosed: String(pick(row, ["dclosed", "Date of Closed", "Visit_Booking_Info.Date of Closed"], "")).trim(),
    source: String(pick(row, ["source", "Observation Source"], "")).trim(),
    sb,
    ac,
    sbLabels: toArray(pick(row, ["sbLabels", "Deal Labels"], []), []),
    dealSb: totalSb,
    dealAc: totalAc,
    dealVr: totalAc - totalSb,
    dsb,
    dac,
    discLabels: toArray(pick(row, ["discLabels", "Discount Labels"], []), []),
    dSb: toNumber(pick(row, ["dSb", "Total Discount Should Be"], 0)) || dsb.reduce((sum, n) => sum + n, 0),
    dAc: toNumber(pick(row, ["dAc", "Total Discount Actual"], 0)) || dac.reduce((sum, n) => sum + n, 0),
    dVr: toNumber(pick(row, ["dVr", "Total Discount Variance"], 0)),
    totalSb,
    totalAc,
    totalVr: toNumber(pick(row, ["totalVr", "Total Variance", "Deal_Breakup.Total Deal.Variance"], totalAc - totalSb)),
    extraDisc: String(pick(row, ["extraDisc", "Observation_Remarks.Extra Discount"], "")).trim(),
    obsDetails: String(pick(row, ["obsDetails", "Observation_Remarks.Observation Details"], "")).trim(),
    mgmtRemarks: String(pick(row, ["mgmtRemarks", "Observation_Remarks.Management Remarks"], "")).trim(),
    additionalRemarks: String(pick(row, ["additionalRemarks", "Observation_Remarks.Additional Remarks"], "")).trim(),
  };
};

// CREATE DEAL
exports.createDeal = async (req, res) => {
  try {
    let data;
    if (req.body.data) {
      data = JSON.parse(req.body.data);
    } else {
      data = req.body;
    }

    if (!data.cname) {
      return res.status(400).json({ message: "Customer name required" });
    }

    if (!data.files) data.files = {};
    if (req.files) {
      if (req.files['pill-audio']) data.files.audioUpload = getFilePath(req.files['pill-audio']);
      if (req.files['pill-video']) data.files.videoUpload = getFilePath(req.files['pill-video']);
      if (req.files['pill-quot']) data.files.quotation = getFilePath(req.files['pill-quot']);
      if (req.files['pill-price']) data.files.pricelist = getFilePath(req.files['pill-price']);
      if (req.files['pill-ledger']) data.files.ledger = getFilePath(req.files['pill-ledger']);
      if (req.files['pill-slip']) data.files.paymentSlip = getFilePath(req.files['pill-slip']);
      if (req.files['pill-other']) data.files.other = getFilePath(req.files['pill-other']);
      if (req.files['pill-paycard']) data.files.paymentCard = getFilePath(req.files['pill-paycard']);
    }

    console.log("Saving deal:", data.cname);

    // Auto-generate sequential Deal ID for new deals
    const counter = await Counter.findOneAndUpdate(
      { id: "dealId" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    data.dealId = counter.seq;

    const deal = new Deal(data);
    await deal.save();

    res.status(201).json(deal);
  } catch (err) {
    console.error("Deal Save Error:", err.message);
    res.status(400).json({ error: err.message });
  }
};

// BULK CREATE DEALS - optimized for chunked Excel imports
exports.bulkCreateDeals = async (req, res) => {
  const startedAt = Date.now();
  try {
    const rows = Array.isArray(req.body.records) ? req.body.records : [];
    if (!rows.length) {
      return res.status(400).json({ error: "No records provided" });
    }
    if (rows.length > BULK_MAX_RECORDS) {
      return res.status(413).json({
        error: `Chunk too large. Send ${BULK_MAX_RECORDS} records or fewer per request.`,
      });
    }

    const invalid = [];
    const docs = rows
      .map((row, index) => {
        const doc = normalizeBulkDeal(row);
        if (!doc.cname) {
          invalid.push({ index, reason: "Customer name required" });
          return null;
        }
        return doc;
      })
      .filter(Boolean);

    if (!docs.length) {
      return res.status(400).json({ insertedCount: 0, skippedCount: rows.length, invalid });
    }

    const counter = await Counter.findOneAndUpdate(
      { id: "dealId" },
      { $inc: { seq: docs.length } },
      { new: true, upsert: true }
    ).lean();

    const firstDealId = counter.seq - docs.length + 1;
    docs.forEach((doc, index) => {
      doc.dealId = firstDealId + index;
    });

    const inserted = await Deal.insertMany(docs, {
      ordered: false,
      lean: true,
      rawResult: false,
    });

    res.status(201).json({
      insertedCount: inserted.length,
      skippedCount: invalid.length,
      firstDealId,
      lastDealId: firstDealId + inserted.length - 1,
      durationMs: Date.now() - startedAt,
      invalid,
    });
  } catch (err) {
    console.error("Bulk Deal Save Error:", err);
    res.status(500).json({ error: err.message, durationMs: Date.now() - startedAt });
  }
};

// GET ALL DEALS
exports.getDeals = async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
    const skip = (page - 1) * limit;
    const query = {};

    if (search) {
      query.$or = [
        { cname: { $regex: search, $options: "i" } },
        { dname: { $regex: search, $options: "i" } },
        { model: { $regex: search, $options: "i" } },
        { dcode: { $regex: search, $options: "i" } },
        { decision: { $regex: search, $options: "i" } },
        { projectName: { $regex: search, $options: "i" } },
      ];

      if (!Number.isNaN(Number(search))) {
        query.$or.push({ dealId: Number(search) });
      }
    }

    const [deals, total] = await Promise.all([
      Deal.find(query)
        .select(DEAL_LIST_PROJECTION)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Deal.countDocuments(query),
    ]);

    res.json({
      data: deals,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
        hasNextPage: skip + deals.length < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET SINGLE DEAL
exports.getDealById = async (req, res) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) {
      return res.status(404).json({ message: "Deal not found" });
    }
    res.json(deal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE DEAL
exports.updateDeal = async (req, res) => {
  try {
    let data;
    if (req.body.data) {
      data = JSON.parse(req.body.data);
    } else {
      data = req.body;
    }

    const updatePayload = { ...data };

    if (req.files) {
      if (req.files['pill-audio']) updatePayload['files.audioUpload'] = getFilePath(req.files['pill-audio']);
      if (req.files['pill-video']) updatePayload['files.videoUpload'] = getFilePath(req.files['pill-video']);
      if (req.files['pill-quot']) updatePayload['files.quotation'] = getFilePath(req.files['pill-quot']);
      if (req.files['pill-price']) updatePayload['files.pricelist'] = getFilePath(req.files['pill-price']);
      if (req.files['pill-ledger']) updatePayload['files.ledger'] = getFilePath(req.files['pill-ledger']);
      if (req.files['pill-slip']) updatePayload['files.paymentSlip'] = getFilePath(req.files['pill-slip']);
      if (req.files['pill-other']) updatePayload['files.other'] = getFilePath(req.files['pill-other']);
      if (req.files['pill-paycard']) updatePayload['files.paymentCard'] = getFilePath(req.files['pill-paycard']);
    }

    if (updatePayload.files) {
      delete updatePayload.files;
    }

    const deal = await Deal.findByIdAndUpdate(
      req.params.id,
      { $set: updatePayload },
      { new: true, runValidators: true }
    );

    if (!deal) {
      return res.status(404).json({ message: "Deal not found" });
    }

    res.json(deal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE DEAL
exports.deleteDeal = async (req, res) => {
  try {
    const deal = await Deal.findByIdAndDelete(req.params.id);
    if (!deal) {
      return res.status(404).json({ message: "Deal not found" });
    }
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// SUMMARY
exports.getSummary = async (req, res) => {
  try {
    const [summary] = await Deal.aggregate([
      {
        $group: {
          _id: null,
          totalDeals: { $sum: 1 },
          totalVariance: { $sum: { $ifNull: ["$totalVr", 0] } },
          totalBusiness: { $sum: { $ifNull: ["$totalAc", 0] } },
          avgAbsVariance: { $avg: { $abs: { $ifNull: ["$totalVr", 0] } } },
        },
      },
    ]);

    const totalDeals = summary?.totalDeals || 0;
    const totalVariance = summary?.totalVariance || 0;
    const totalBusiness = summary?.totalBusiness || 0;

    res.json({
      totalDeals,
      totalVariance,
      avgVariance: summary?.avgAbsVariance || 0,
      totalBusiness,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const os = require("os");
const { getStats } = require("../../../common/utils/monitor-store");

// HEALTH / CAPACITY STATS
exports.getHealthStats = async (req, res) => {
  try {
    const count = await Deal.countDocuments();
    let dbStats = { size: 0, storageSize: 0 };
    try {
      if (count > 0) dbStats = await Deal.collection.stats();
    } catch (e) {
      console.warn("DB Stats not available");
    }
    const monitorStats = getStats();

    const cpus = os.cpus();
    const freeMem = os.freemem() / 1024 / 1024;
    const totalMem = os.totalmem() / 1024 / 1024;
    const memUsagePercent = (((totalMem - freeMem) / totalMem) * 100).toFixed(1);

    const estimatedMaxUsers = Math.floor((freeMem / 2) + 50);

    const LIMIT_MB = 512;
    const sizeMB = (dbStats.storageSize || 0) / 1024 / 1024;
    const storageUsagePercent = ((sizeMB / LIMIT_MB) * 100).toFixed(2);

    const errorRate = monitorStats.totalRequests > 0
      ? ((monitorStats.totalErrors / monitorStats.totalRequests) * 100).toFixed(1)
      : 0;

    res.json({
      totalRecords: count,
      dataSizeMB: ((dbStats.size || 0) / 1024 / 1024).toFixed(3),
      storageUsagePercent,
      memoryUsageMB: (process.memoryUsage().rss / 1024 / 1024).toFixed(2),
      systemMemUsagePercent: memUsagePercent,
      cpuCores: cpus.length,
      estimatedMaxUsers,
      uptimeHours: (process.uptime() / 3600).toFixed(2),
      errorRate: errorRate + "%",
      slowQueries: monitorStats.slowQueries,
      status: storageUsagePercent > 90 || errorRate > 5 ? "CRITICAL" : (storageUsagePercent > 70 ? "WARNING" : "HEALTHY"),
      suggestions: [
        storageUsagePercent > 85 ? "Storage critical: Upgrade DB plan" : null,
        errorRate > 5 ? "High error rate detected: Check error.log" : null,
        count > 5000 ? "Pagination recommended for All Records" : null
      ].filter(Boolean)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
