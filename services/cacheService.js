// ======================================================================
// CACHE SERVICE (Redis Wrapper)
// ======================================================================
// This service provides a clean abstraction layer over Redis operations.
// It includes helper methods for getting, setting, and deleting cached data.
// ======================================================================

const redis = require("../config/redis");

class CacheService {
  // ------------------------------------------------------
  // @desc    Get cached value by key
  // @param   {string} key - Redis key
  // @return  {Promise<any>} - Parsed JSON value or null
  // ------------------------------------------------------
  async get(key) {
    return await redis.get(key);
  }

  // ------------------------------------------------------
  // @desc    Set cached value with TTL (default: 60 seconds)
  // @param   {string} key - Redis key
  // @param   {any} value - Value to store (auto JSON stringified)
  // @param   {number} ttl - Expiration time in seconds
  // ------------------------------------------------------
  async set(key, value, ttl = 60) {
    return await redis.set(key, JSON.stringify(value), { EX: ttl });
  }

  // ------------------------------------------------------
  // @desc    Delete a single key from cache
  // @param   {string} key - Redis key
  // ------------------------------------------------------
  async del(key) {
    return await redis.del(key);
  }

  // ------------------------------------------------------
  // @desc    Delete multiple keys from cache
  // @param   {string[]} keys - Array of Redis keys
  // ------------------------------------------------------
  async delMany(keys = []) {
    if (!Array.isArray(keys)) return;
    for (const key of keys) {
      await redis.del(key);
    }
  }
}

module.exports = new CacheService();
