import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    // Only seed in development mode or if explicitly enabled
    const shouldSeed =
      this.configService.get<string>('ENABLE_SEEDING') === 'true' ||
      this.configService.get<string>('NODE_ENV') === 'development';

    if (shouldSeed) {
      await this.seedAdminUser();
    }
  }

  async seedAdminUser(): Promise<void> {
    try {
      const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
      const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');
      const adminFirstName = this.configService.get<string>('ADMIN_FIRST_NAME', 'Admin');
      const adminLastName = this.configService.get<string>('ADMIN_LAST_NAME', 'User');

      if (!adminEmail || !adminPassword) {
        this.logger.warn('Admin credentials not configured. Skipping admin user creation.');
        return;
      }

      const existingAdmin = await this.prisma.user.findUnique({
        where: { email: adminEmail },
      });

      if (!existingAdmin) {
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

        await this.prisma.user.create({
          data: {
            email: adminEmail,
            passwordHash,
            firstName: adminFirstName,
            lastName: adminLastName,
            role: UserRole.ADMIN,
          },
        });

        this.logger.log('Admin user created successfully');
      } else {
        this.logger.log('Admin user already exists');
      }
    } catch (error) {
      this.logger.error('Failed to seed admin user', error);
    }
  }
}
