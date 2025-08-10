# Webhook System Documentation

This directory contains the webhook system for MailPilot AI, specifically designed to handle Supabase Auth events and synchronize users between Supabase Auth and our custom user database schema.

## Overview

The webhook system ensures that when users register, login, or update their profiles via Supabase Auth, these changes are automatically synchronized with our application's user database. This provides a seamless integration between Supabase's authentication system and our custom user management features.

## Architecture

```
Supabase Auth Events → Webhook Endpoint → Event Handlers → Database Sync
```

### Components

1. **Types** (`types.ts`) - TypeScript interfaces for webhook payloads and user data
2. **Security** (`security.ts`) - Webhook signature and timestamp verification
3. **Database Sync** (`database-sync.ts`) - Database synchronization logic
4. **Event Handlers** (`event-handlers.ts`) - Event-specific processing logic
5. **API Endpoint** (`/api/webhooks/supabase`) - HTTP endpoint for receiving webhooks## Supported Events

- `user.created` - New user registration
- `user.updated` - User profile updates
- `user.deleted` - User account deletion (soft delete)
- `user.signed_in` - User login tracking
- `user.signed_out` - User logout tracking

## Setup Instructions

### 1. Configure Supabase Webhooks

In your Supabase project dashboard:

1. Go to Database > Webhooks
2. Create a new webhook with:
   - **Name**: "User Sync Webhook"
   - **Table**: `auth.users`
   - **Events**: Select all user events (INSERT, UPDATE, DELETE)
   - **Type**: HTTP Request
   - **HTTP Request**:
     - URL: `https://your-domain.com/api/webhooks/supabase`
     - Method: POST
     - Headers:
       ```json
       {
         "Content-Type": "application/json",
         "x-supabase-signature": "{{signature}}",
         "x-supabase-timestamp": "{{timestamp}}"
       }
       ```

### 2. Environment Variables

Add to your `.env.local`:

```env
# Webhook security (generate a secure random string)
SUPABASE_WEBHOOK_SECRET=your-32-character-webhook-secret-here
```

### 3. Database Schema

Ensure your user table schema matches the expected structure in `/src/db/schema/user.ts`:

```sql
CREATE TABLE "user" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email_address" varchar(255) NOT NULL UNIQUE,
  "first_name" varchar(255),
  "last_name" varchar(255),
  "image_url" text,
  "stripe_subscription_id" text UNIQUE,
  "role" text DEFAULT 'user',
  "is_active" boolean DEFAULT true,
  "email_verified" boolean DEFAULT false,
  "last_login_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
```

## Security

### Webhook Verification

The webhook endpoint includes multiple security layers:

1. **Signature Verification**: Uses HMAC-SHA256 to verify webhook authenticity
2. **Timestamp Verification**: Prevents replay attacks (5-minute tolerance window)
3. **Rate Limiting**: Protects against abuse (1000 requests per 15 minutes)
4. **Payload Validation**: Strict Zod schema validation

### Best Practices

- Keep your webhook secret secure and rotate it regularly
- Monitor webhook logs for suspicious activity
- Use HTTPS only for webhook endpoints
- Implement proper error handling and retries

## Error Handling

The webhook system includes comprehensive error handling:

1. **Payload Validation Errors**: Returns 400 Bad Request
2. **Authentication Errors**: Returns 401 Unauthorized
3. **Database Errors**: Logged but doesn't fail the webhook (allows retries)
4. **Rate Limiting**: Returns 429 Too Many Requests

## Monitoring

### Logs

All webhook events are logged with structured data:

```json
{
  "eventType": "user.created",
  "userId": "uuid",
  "email": "user@example.com",
  "success": true,
  "processingTime": "123ms"
}
```

### Health Check

The webhook endpoint provides a health check:

```bash
GET /api/webhooks/supabase
```

Returns service status and version information.

## Testing

### Local Testing with ngrok

1. Install ngrok: `npm install -g ngrok`
2. Start your dev server: `npm run dev`
3. Expose localhost: `ngrok http 3000`
4. Update Supabase webhook URL to ngrok URL
5. Test user registration/login to trigger webhooks

### Manual Testing

```bash
# Test webhook endpoint health
curl -X GET https://your-domain.com/api/webhooks/supabase

# Test webhook with sample payload (include proper headers)
curl -X POST https://your-domain.com/api/webhooks/supabase \
  -H "Content-Type: application/json" \
  -H "x-supabase-signature: sha256=signature" \
  -H "x-supabase-timestamp: $(date +%s)" \
  -d '{"type":"user.created","table":"auth.users",...}'
```

## Troubleshooting

### Common Issues

1. **Missing Webhook Secret**: Add `SUPABASE_WEBHOOK_SECRET` to environment
2. **Invalid Signatures**: Check webhook secret and signature generation
3. **Database Connection**: Ensure database is accessible and schema matches
4. **Rate Limiting**: Check if webhook requests exceed rate limits

### Debug Mode

Enable debug logging by setting:

```env
LOG_LEVEL=debug
```

This will log all webhook payloads and processing details.

## Integration with Registration

The registration API (`/api/auth/register`) includes immediate database sync as a fallback:

1. User registers via API
2. Supabase Auth creates user
3. Registration API immediately syncs to database
4. Webhook provides backup sync (if immediate sync fails)

This dual approach ensures reliability even if webhooks are delayed or fail.

## Performance Considerations

- Webhooks are processed asynchronously
- Database operations use connection pooling
- Failed webhook events should be retried by Supabase
- Consider implementing a dead letter queue for failed events

## Future Enhancements

- [ ] Webhook event queuing for high-volume scenarios
- [ ] Advanced retry logic with exponential backoff
- [ ] Webhook event analytics and reporting
- [ ] Multi-tenant webhook routing
- [ ] Custom event filtering and transformation
