import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { AppValidationPipe } from './common/pipes/validation.pipe';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('app.port', 4000);
  const frontendUrl = config.get<string>('app.frontendUrl', 'http://localhost:3000');
  const nodeEnv = config.get<string>('app.nodeEnv', 'development');

  // Security
  app.use(helmet({ contentSecurityPolicy: nodeEnv === 'production' }));
  app.use(compression());

  // CORS
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Id'],
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Validation
  app.useGlobalPipes(AppValidationPipe);

  // Swagger API Documentation
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Bily Games and Gadget API')
      .setDescription(
        'Enterprise-grade e-commerce API for Bily Games and Gadget platform. ' +
        'Supports full product catalog, orders, payments (Paystack & Flutterwave), ' +
        'user management, inventory, analytics, and real-time notifications.',
      )
      .setVersion('1.0.0')
      .addBearerAuth()
      .addTag('Authentication', 'User registration, login, and token management')
      .addTag('Products', 'Product catalog management and browsing')
      .addTag('Categories', 'Product category hierarchy')
      .addTag('Cart', 'Shopping cart operations')
      .addTag('Orders', 'Order placement and management')
      .addTag('Payments', 'Paystack and Flutterwave payment integration')
      .addTag('Reviews', 'Product reviews and ratings')
      .addTag('Wishlist', 'Save and manage favorite products')
      .addTag('Inventory', 'Stock management and tracking')
      .addTag('Notifications', 'User and system notifications')
      .addTag('Support', 'Customer support tickets')
      .addTag('Analytics', 'Admin dashboard analytics')
      .addTag('Search', 'Product search and suggestions')
      .addTag('Banners', 'Homepage banner management')
      .addTag('Coupons', 'Discount and coupon management')
      .addTag('Users', 'User profile and address management')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
      customSiteTitle: 'Bily Games & Gadget API',
    });

    logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
  }

  await app.listen(port);

  logger.log(`🚀 BILY GAMES AND GADGET API`);
  logger.log(`🌐 Running on: http://localhost:${port}/api/v1`);
  logger.log(`🌍 Environment: ${nodeEnv}`);
}

bootstrap();
