# API Logging Standards

Centralized, structured logging is required across all API routes. This ensures consistent formatting, sensitive field redaction, and compatibility with aggregation and monitoring systems.

## Principles

- Use the centralized logger from `lib/logger/index.ts` (e.g., `apiLogger`, `smsLogger`)
- Never use `console.*` in API routes
- Use child loggers to add scoped context per endpoint or operation
- Log structured objects with a `msg` field and additional metadata
- Production logs output JSON; development logs are human-readable
- Sensitive fields (passwords, tokens, authorization, secrets, cookies) are redacted automatically

## Log Levels

- info: normal operations and successful actions
- warn: recoverable issues, rate-limit hits, validation failures, suppressed actions
- error: unexpected exceptions or failures
- debug: detailed diagnostics used during development
- fatal: unrecoverable errors that terminate a process

## Usage Pattern

```ts
import { apiLogger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const routeLogger = apiLogger.child({ context: 'api.endpoint.name' });
  try {
    routeLogger.info({ msg: 'Starting request', route: '/api/endpoint' });
    // ... perform work
    routeLogger.info({ msg: 'Completed request', result: 'ok' });
    return NextResponse.json({ success: true });
  } catch (error) {
    routeLogger.error({
      msg: 'Endpoint error',
      error: error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { message: String(error) },
    });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

## Migration Status

Non-webhook API routes now use the centralized logger (no `console.*` remain). Representative endpoints:

- Timesheets: `route.ts`, `[id]/route.ts`, `clock-in/route.ts`, `clock-out/route.ts`, `break/start/route.ts`, `break/end/route.ts`, `clock/route.ts`, `current/route.ts`, `export/route.ts`, `report/weekly/route.ts`, `report/payroll/route.ts`
- Tickets: `route.ts`, `[ticketId]/route.ts`, `[ticketId]/messages/route.ts`, `summarize/route.ts`
- Warranties: `route.ts`, `[id]/route.ts`, `claims/[id]/route.ts`
- Calls: `stats/route.ts`
- Admin Support and Leads Captain v2: endpoints import and use `apiLogger`

Verification:

- Lint: `eslint app/api/**/*.ts` shows no `no-console` warnings
- Type-check: passes with `tsc --noEmit`
- Tests: Jest suite passes with structured logger usage

## Before/After Samples

Before:
```ts
console.error('Error updating ticket:', err);
```

After:
```ts
apiLogger.error({
  msg: 'Error updating ticket',
  error: err instanceof Error
    ? { name: err.name, message: err.message, stack: err.stack }
    : { message: String(err) },
});
```

## Special Considerations

- Prefer `apiLogger.child({ context: 'api.<area>.<endpoint>' })` for consistent context tags
- Include correlation IDs when available via `lib/api/response.ts` for end-to-end tracing
- Avoid logging PII unless necessary; rely on redaction and log minimal sensitive data
