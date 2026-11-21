// netlify/functions/utils/db.js
const Redis = require('ioredis');

let redis = null;

function getRedisClient() {
  if (!redis) {
    const host = process.env.REDIS_HOST || 'board-hypersoft-cherished-99660.db.redis.io';
    const port = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 19019;
    const username = process.env.REDIS_USERNAME || 'default';
    const password = process.env.REDIS_PASSWORD || 'aej1evkVdeAM2kbnRQvLAICRyqwuyfvy';

    redis = new Redis({
      host,
      port,
      username,
      password,
      lazyConnect: false,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      connectTimeout: 10000,
    });

    redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
  }

  return redis;
}

module.exports = {
  getRedisClient,
};
