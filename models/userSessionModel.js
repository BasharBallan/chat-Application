const mongoose = require("mongoose");

const userSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
    },
    userAgent: String,
    ip: String,
    location: {
      city: String,
      region: String,
      country: String,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: Date,
  },
  { timestamps: true }
);


userSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("UserSession", userSessionSchema);
