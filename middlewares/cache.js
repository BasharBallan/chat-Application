// middlewares/cache.js
const cacheService = require("../services/cacheService");

exports.cache = (keyBuilder, ttl = 60) => {
  return async (req, res, next) => {
    try {
      const key = keyBuilder(req);

      const cached = await cacheService.get(key);
      if (cached) {
        return res.status(200).json({
          status: "success",
          source: "cache",
          data: JSON.parse(cached),
        });
      }

      // Override res.json to store data after controller finishes
      const originalJson = res.json.bind(res);

      res.json = async (body) => {
        if (body?.data) {
          await cacheService.set(key, body.data, ttl);
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      next();
    }
  };
};
