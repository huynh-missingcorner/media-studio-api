import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { BullModule as NestBullModule } from '@nestjs/bull';
import { BullModule } from './bull.module';

describe('BullModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        BullModule,
      ],
    }).compile();
  });

  it('should be defined', () => {
    const bullModule = module.get(BullModule);
    expect(bullModule).toBeDefined();
  });

  it('should register BullModule.forRootAsync correctly', () => {
    const imports = Reflect.getMetadata('imports', BullModule);

    // Check if BullModule.forRootAsync is registered
    const hasBullModuleForRootAsync = imports.some(
      (importedModule: any) =>
        importedModule &&
        typeof importedModule === 'object' &&
        importedModule.module === NestBullModule,
    );

    expect(hasBullModuleForRootAsync).toBeTruthy();
  });
});
