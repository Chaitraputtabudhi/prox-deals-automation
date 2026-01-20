import * as Sentry from '@sentry/node';

export function initSentry() {
  const sentryDsn = process.env.SENTRY_DSN;
  
  if (!sentryDsn) {
    console.log('ℹ️  Sentry not configured (optional)');
    return;
  }

  try {
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 1.0,
      beforeSend(event) {
        // Remove PII
        if (event.request?.data) {
          event.request.data = '[Filtered]';
        }
        return event;
      },
    });
    console.log('✅ Sentry initialized');
  } catch (error) {
    console.warn('⚠️  Sentry initialization failed (non-critical)');
  }
}

export function captureError(error: Error, context?: Record<string, any>) {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, { contexts: { custom: context } });
  }
  console.error('Error:', error.message, context);
}

export function trackIngestionError(deal: any, error: Error) {
  captureError(error, { operation: 'ingestion', retailer: deal.retailer });
}

export function trackEmailError(userEmail: string, error: Error) {
  captureError(error, { operation: 'email_send' });
}

export function addBreadcrumb(message: string, data?: Record<string, any>) {
  if (process.env.SENTRY_DSN) {
    Sentry.addBreadcrumb({ message, level: 'info', data });
  }
}