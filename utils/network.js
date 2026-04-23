const axios = require("axios");

exports.getRealIp = (req) => {
  try {
    // 1) If behind proxy (NGINX, Cloudflare, etc.)
    const forwarded = req.headers["x-forwarded-for"];
    if (forwarded) return forwarded.split(",")[0].trim();

    // 2) Direct connection
    return (
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      "0.0.0.0"
    );
  } catch {
    return "0.0.0.0";
  }
};


exports.getGeoLocation = async (ip) => {
  try {
    const response = await axios.get(`https://ipapi.co/${ip}/json/`);
    return {
      city: response.data.city,
      region: response.data.region,
      country: response.data.country_name,
    };
  } catch {
    return {
      city: "Unknown",
      region: "Unknown",
      country: "Unknown",
    };
  }
};
