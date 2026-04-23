const mongoose = require("mongoose");

const oauthTempSchema = new mongoose.Schema(
  {
    state: {
      type: String,
      required: true,
      unique: true,
    },
    codeVerifier: {
      type: String,
      required: true,
    },
    ip: String,
    userAgent: String,
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 300 
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("OAuthTemp", oauthTempSchema);
