import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { LoggerService } from './common/services/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const logger = app.get(LoggerService);
  
  app.useLogger(logger);

  // ===== Security =====
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://www.tikwm.com", "https://api.cobalt.tools"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // ===== CORS =====
  app.enableCors({
    origin: configService.get<string>('FRONTEND_URL', 'http://localhost:5500'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });

  // ===== Compression & Cookies =====
  app.use(compression());
  app.use(cookieParser());

  // ===== Global Pipes =====
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ===== Global Filters =====
  app.useGlobalFilters(new GlobalExceptionFilter(logger));

  // ===== Global Interceptors =====
  app.useGlobalInterceptors(
    new RequestIdInterceptor(),
    new AuditLogInterceptor(logger),
  );

  // ===== API Versioning =====
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // ===== Swagger/OpenAPI =====
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('KRD-ProDown API')
      .setDescription('Enterprise Video Downloader API')
      .setVersion('2.0')
      .addBearerAuth()
      .addServer('http://localhost:3000', 'Local')
      .addServer('https://api.krd-prodown.com', 'Production')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  
  logger.log(`🚀 KRD-ProDown API running on port ${port}`, 'Bootstrap');
  logger.log(`📚 Swagger docs: http://localhost:${port}/api/docs`, 'Bootstrap');
}

bootstrap();
