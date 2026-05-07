const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const Deal = require("../src/modules/deals/models/deal.model");
const Counter = require("../src/modules/deals/models/counter.model");

dotenv.config({ path: path.join(__dirname, "../.env") });

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/dealtracker");
    console.log("MongoDB Connected for migration...");

    // Find all deals sorted by creation date (ascending)
    const deals = await Deal.find({}).sort({ createdAt: 1 });

    let currentSeq = 0;

    // Check if counter exists, if not start from 0
    const counter = await Counter.findOne({ id: "dealId" });
    if (counter) {
      currentSeq = counter.seq;
    }

    console.log(`Found ${deals.length} deals. Current counter sequence: ${currentSeq}`);

    let updatedCount = 0;
    for (const deal of deals) {
      if (!deal.dealId) {
        currentSeq++;
        deal.dealId = currentSeq;
        await deal.save();
        updatedCount++;
      }
    }

    // Update the counter to match the new highest ID
    await Counter.findOneAndUpdate(
      { id: "dealId" },
      { $set: { seq: currentSeq } },
      { upsert: true, new: true }
    );

    console.log(`Migration complete! Updated ${updatedCount} deals. Final counter sequence: ${currentSeq}`);
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
};

migrate();
