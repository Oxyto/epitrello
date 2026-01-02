import { RedisClient } from 'bun';

export const rdb = new RedisClient(process.env.REDIS_URL)
