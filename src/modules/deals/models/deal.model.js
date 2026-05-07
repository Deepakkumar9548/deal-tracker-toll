const mongoose = require("mongoose");

const dealSchema = new mongoose.Schema(
  {
    // 1. Customer_Dealer_Info
    dealId: { type: Number, unique: true, index: true }, // Sequential Deal ID
    cname: { type: String, required: [true, "Customer name is required"], trim: true },
    cnum: { type: String, trim: true },
    dname: { type: String, trim: true },
    dlocation: { type: String, trim: true },
    dcode: { type: String, trim: true }, // Dealer Code
    scname: { type: String, trim: true }, // SC Name & No
    model: { type: String, trim: true }, // Model & Variant
    projectName: { type: String, trim: true }, // Project Name
    nature: { type: String, trim: true }, // Nature (Out of scope, etc.)
    decision: { type: String, trim: true }, // Final Decision (Breach, etc.)
    mgmtDecision: { type: String, trim: true }, // Mgmt Decision (Accepted, etc.)

    // 2. Visit_Booking_Info
    dvisit: { type: String, trim: true },
    booking: { type: String, trim: true },
    dbooking: { type: String, trim: true },
    ddelivery: { type: String, trim: true },
    dbreach: { type: String, trim: true },
    dms: { type: String, trim: true },
    dclosed: { type: String, trim: true },
    source: { type: String, trim: true }, // Source (File Audit, etc.)

    // 4. Deal_Breakup
    sb: { type: [Number], default: [] },
    ac: { type: [Number], default: [] },
    sbLabels: { type: [String], default: [] },
    
    // Totals for Deal
    dealSb: { type: Number, default: 0 },
    dealAc: { type: Number, default: 0 },
    dealVr: { type: Number, default: 0 },

    // 5. Discount_Breakup
    dsb: { type: [Number], default: [] },
    dac: { type: [Number], default: [] },
    discLabels: { type: [String], default: [] },

    // Totals for Discount
    dSb: { type: Number, default: 0 }, // Total Disc SB
    dAc: { type: Number, default: 0 }, // Total Disc AC
    dVr: { type: Number, default: 0 }, // Variance

    // Final Totals
    totalSb: { type: Number, default: 0 },
    totalAc: { type: Number, default: 0 },
    totalVr: { type: Number, default: 0 },

    // 6. Observation_Remarks
    extraDisc: { type: String, trim: true },
    obsDetails: { type: String, trim: true },
    mgmtRemarks: { type: String, trim: true },
    additionalRemarks: { type: String, trim: true },

    // 3. Supporting_Documents (Files)
    files: {
      audioUpload: { type: String, default: "" },
      videoUpload: { type: String, default: "" },
      quotation: { type: String, default: "" },
      pricelist: { type: String, default: "" },
      ledger: { type: String, default: "" },
      paymentSlip: { type: String, default: "" },
      other: { type: String, default: "" },
      paymentCard: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

// Index for performance
dealSchema.index({ cname: "text", dname: "text", model: "text" });
dealSchema.index({ createdAt: -1 });
dealSchema.index({ dcode: 1, createdAt: -1 });
dealSchema.index({ decision: 1, createdAt: -1 });
dealSchema.index({ projectName: 1, createdAt: -1 });
dealSchema.index({ dvisit: 1 });
dealSchema.index({ totalAc: -1 });
dealSchema.index({ totalVr: -1 });

module.exports = mongoose.model("Deal", dealSchema);
