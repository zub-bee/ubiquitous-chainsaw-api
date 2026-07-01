import hash from "object-hash";
import redisClient from "../db/redisClient.js";

function requestToKey(req) {
  // For search requests, use the canonical parsed filters and the raw query
  // params as the hash input so semantically equivalent queries still share a
  // cache key, while page/limit/sort changes remain distinct.
  const reqDataToHash = req.parsedFilters
    ? { path: req.path, filters: req.parsedFilters, query: req.query }
    : { path: req.path, query: req.query, body: req.body };

  // `${req.path}@...` to make it easier to find keys on a Redis client
  return `${req.path}@${hash.sha1(reqDataToHash)}`;
}

function isRedisWorking() {
  // verify wheter there is an active connection
  // to a Redis server or not
  return !!redisClient?.isOpen;
}

async function writeData(key, data, options) {
  if (isRedisWorking()) {
    try {
      // write data to the Redis cache
      await redisClient.set(key, data, options);
    } catch (e) {
      console.error(`Failed to cache data for key=${key}`, e);
    }
  }
}

async function readData(key) {
  let cachedValue = undefined;

  if (isRedisWorking()) {
    // try to get the cached response from redis
    cachedValue = await redisClient.get(key);
    if (cachedValue) {
      return cachedValue;
    }
  }
}

export function redisCacheMiddleware(
  options = {
    EX: process.env.REDIS_EXPIRY_TIME,
  },
) {
  return async (req, res, next) => {
    // Only cache GET requests — POST uploads must always reach the controller.
    if (req.method !== "GET") {
      return next();
    }

    if (isRedisWorking()) {
      const key = requestToKey(req);
      // if there is some cached data, retrieve it and return it
      const cachedValue = await readData(key);
      if (cachedValue) {
        try {
          // if it is JSON data, then return it
          return res.json(JSON.parse(cachedValue));
        } catch {
          // if it is not JSON data, then return it
          return res.send(cachedValue);
        }
      } else {
        // override how res.send behaves
        // to introduce the caching logic
        const oldSend = res.send;
        res.send = function (data) {
          // set the function back to avoid the 'double-send' effect
          res.send = oldSend;

          // cache the response only if it is successful
          if (res.statusCode.toString().startsWith("2")) {
            writeData(key, data, options).then();
          }

          return res.send(data);
        };

        // continue to the controller function
        next();
      }
    } else {
      // proceed with no caching
      next();
    }
  };
}
