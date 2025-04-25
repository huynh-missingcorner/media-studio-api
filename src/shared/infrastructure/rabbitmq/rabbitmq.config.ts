import { z } from 'zod';

// RabbitMQ Configuration Schema
export const RabbitMQConfigSchema = z.object({
  RABBITMQ_URL: z.string().default('amqp://localhost'),
});

// Exchanges and Queues Configuration
export const RABBITMQ_EXCHANGES = {
  USER: {
    name: 'user_exchange',
    type: 'topic',
    options: { durable: true },
  },
} as const;

export const RABBITMQ_QUEUES = {
  USER_CREATED: 'user_created_queue',
} as const;

export const ROUTING_KEYS = {
  USER: {
    CREATED: 'user.created',
    UPDATED: 'user.updated',
    DELETED: 'user.deleted',
  },
} as const;
