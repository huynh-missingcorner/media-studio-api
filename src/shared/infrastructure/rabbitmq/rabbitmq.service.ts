import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';
import { connect, AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';
import { RABBITMQ_EXCHANGES, RABBITMQ_QUEUES, ROUTING_KEYS } from './rabbitmq.config';

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connectionManager: AmqpConnectionManager;
  private channelWrapper: ChannelWrapper;

  constructor() {}

  async onModuleInit() {
    try {
      this.connect();
      await this.setupExchangesAndQueues();
    } catch (error: unknown) {
      this.logger.error('Failed to initialize RabbitMQ', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.close();
  }

  private getConnectionUrl(): string {
    return process.env.RABBITMQ_URL || 'amqp://localhost';
  }

  private connect() {
    const url = this.getConnectionUrl();

    this.connectionManager = connect([url], {
      heartbeatIntervalInSeconds: 10,
      reconnectTimeInSeconds: 5,
      connectionOptions: {
        clientProperties: {
          connection_name: 'NestJS Application',
        },
      },
    });

    this.connectionManager.on('connect', () => {
      this.logger.log('RabbitMQ connection established');
    });

    this.connectionManager.on('disconnect', (err) => {
      this.logger.warn('RabbitMQ connection lost', err);
    });

    this.channelWrapper = this.connectionManager.createChannel({
      setup: async (channel: amqp.Channel) => {
        // Optional: Additional channel setup
        await channel.prefetch(1); // Fair dispatch
      },
    });

    return this.channelWrapper;
  }

  private async setupExchangesAndQueues() {
    await this.channelWrapper.addSetup(async (channel: amqp.Channel) => {
      // Declare Exchanges
      for (const [, exchangeConfig] of Object.entries(RABBITMQ_EXCHANGES)) {
        await channel.assertExchange(
          exchangeConfig.name,
          exchangeConfig.type,
          exchangeConfig.options,
        );
      }

      // Declare Queues and Bindings
      const queueBindings = [
        {
          queue: RABBITMQ_QUEUES.USER_CREATED,
          exchange: RABBITMQ_EXCHANGES.USER.name,
          routingKey: ROUTING_KEYS.USER.CREATED,
        },
      ];

      for (const binding of queueBindings) {
        await channel.assertQueue(binding.queue, { durable: true });
        await channel.bindQueue(binding.queue, binding.exchange, binding.routingKey);
      }
    });
  }

  async publish(
    exchange: string,
    routingKey: string,
    message: any,
    options: amqp.Options.Publish = {},
  ) {
    try {
      await this.channelWrapper.publish(
        exchange,
        routingKey,
        Buffer.from(JSON.stringify(message)),
        {
          persistent: true,
          timestamp: Date.now(),
          ...options,
        },
      );
      this.logger.log(`Message published to ${exchange} with key ${routingKey}`);
    } catch (error: unknown) {
      this.logger.error('Failed to publish message', error);
      throw error;
    }
  }

  async consume(queue: string, handler: (msg: amqp.ConsumeMessage) => Promise<void>) {
    return this.channelWrapper.consume(queue, (msg) => {
      void (async () => {
        try {
          if (msg) {
            await handler(msg);
            this.channelWrapper.ack(msg);
          }
        } catch (error: unknown) {
          this.logger.error('Error processing message', error);
          this.channelWrapper.nack(msg, false, false);
        }
      })();
    });
  }

  async close() {
    if (this.connectionManager) {
      await this.connectionManager.close();
      this.logger.log('RabbitMQ connection closed');
    }
  }
}
