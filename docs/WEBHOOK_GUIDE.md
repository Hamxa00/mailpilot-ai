# How the Webhook System Works & Getting Your Webhook Secret

## 🔄 How the Webhook System Works

### Overview

The webhook system ensures that every user action in Supabase Auth is automatically synchronized with your custom database. Here's the complete flow:

```
User Action → Supabase Auth → Database Trigger → Webhook → Your API → Custom Database
```

### Detailed Flow

1. **User Action Occurs**

   - User registers via your API
   - User logs in via OAuth (Google, GitHub, etc.)
   - User updates profile
   - User deletes account

2. **Supabase Auth Processes Action**

   - Creates/updates record in `auth.users` table
   - Generates JWT tokens
   - Handles password validation, email verification, etc.

3. **Database Trigger Fires**

   - PostgreSQL trigger on `auth.users` table detects changes
   - Trigger calls your webhook URL with event data

4. **Your Webhook Endpoint Receives Event**

   - `/api/webhooks/supabase` validates the request
   - Verifies signature and timestamp for security
   - Parses the event payload

5. **Event Handler Processes Data**

   - Routes to appropriate handler based on event type
   - Transforms Supabase user data to your schema format
   - Syncs data to your custom `user` table

6. **Database Sync Completes**
   - User now exists in both Supabase Auth and your database
   - Additional user data can be stored (roles, preferences, etc.)

### Event Types Handled

| Event Type        | Description           | Action                        |
| ----------------- | --------------------- | ----------------------------- |
| `user.created`    | New user registration | Create user in your database  |
| `user.updated`    | Profile/email changes | Update user data              |
| `user.deleted`    | Account deletion      | Soft delete (deactivate) user |
| `user.signed_in`  | User login            | Update last login timestamp   |
| `user.signed_out` | User logout           | Log the sign-out event        |

### Security Features

1. **Signature Verification**: Uses HMAC-SHA256 to verify webhook authenticity
2. **Timestamp Validation**: Prevents replay attacks (5-minute tolerance)
3. **Rate Limiting**: Protects against webhook spam
4. **Payload Validation**: Strict schema validation using Zod

## 🔑 How to Get Your Webhook Secret

### Method 1: Generate Your Own Secret (Recommended)

Generate a secure 32+ character string:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32

# Using Python
python -c "import secrets; print(secrets.token_hex(32))"
```

Example output:

```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

Add this to your `.env.local`:

```env
SUPABASE_WEBHOOK_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

### Method 2: Use Supabase CLI (If Available)

```bash
supabase secrets list
# Look for webhook-related secrets
```

### Method 3: Check Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to **Settings → API**
3. Look for webhook-related secrets (if available)

## 🔧 Setting Up Webhooks in Supabase

### Step 1: Access Supabase Dashboard

1. Go to [supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your MailPilot AI project

### Step 2: Create the Webhook

1. Navigate to **Database → Webhooks**
2. Click **"Create a new webhook"**
3. Configure the webhook:

```yaml
Name: "MailPilot User Sync Webhook"
Table: "auth.users"
Events:
  - INSERT (user.created)
  - UPDATE (user.updated)
  - DELETE (user.deleted)
Type: "HTTP Request"
Method: "POST"
URL: "https://your-domain.com/api/webhooks/supabase"
HTTP Headers:
  Content-Type: "application/json"
  User-Agent: "Supabase-Webhook"
```

### Step 3: Configure Webhook Security (Optional but Recommended)

If Supabase provides webhook signature features, enable them. Otherwise, we'll rely on environment-based security.

### Step 4: Test the Webhook

1. Deploy your application
2. Register a new user
3. Check your logs to see if the webhook fired
4. Verify the user was created in your database

## 🧪 Testing Your Webhook Setup

### Local Development with ngrok

1. **Install ngrok**:

   ```bash
   npm install -g ngrok
   ```

2. **Start your development server**:

   ```bash
   npm run dev
   ```

3. **Expose localhost to the internet**:

   ```bash
   ngrok http 3000
   ```

4. **Update Supabase webhook URL**:

   ```
   https://your-ngrok-url.ngrok.io/api/webhooks/supabase
   ```

5. **Test user registration**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "SecurePass123!",
       "confirmPassword": "SecurePass123!",
       "firstName": "Test",
       "lastName": "User",
       "acceptTerms": true
     }'
   ```

### Production Testing

1. **Deploy to your hosting platform** (Vercel, Netlify, etc.)
2. **Update webhook URL** to production domain
3. **Test with real user registration**
4. **Monitor webhook logs**

## 📊 Monitoring Webhook Events

### Log Locations

Check these logs to monitor webhook activity:

1. **Application Logs**: Your server console/logs
2. **Supabase Logs**: Database → Logs in Supabase Dashboard
3. **Webhook Endpoint Logs**: Network tab in browser dev tools

### Key Log Messages to Look For

```
✅ SUCCESS:
- "Processing webhook event"
- "User created successfully via webhook"
- "User synced to database successfully"

❌ ERRORS:
- "Invalid webhook signature"
- "Failed to create user"
- "Database sync failed"
```

### Health Check

Test your webhook endpoint:

```bash
curl -X GET https://your-domain.com/api/webhooks/supabase
```

Should return:

```json
{
  "success": true,
  "message": "Supabase webhook endpoint is healthy",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🚨 Troubleshooting Common Issues

### Issue 1: Webhook Not Firing

**Symptoms**: Users created in Supabase Auth but not in your database

**Solutions**:

1. Check webhook URL is correct and accessible
2. Verify webhook is enabled in Supabase Dashboard
3. Check if your server is running and accessible
4. Look for network connectivity issues

### Issue 2: Invalid Signature Errors

**Symptoms**: "Invalid webhook signature" in logs

**Solutions**:

1. Verify `SUPABASE_WEBHOOK_SECRET` is set correctly
2. Make sure the secret matches what's configured in Supabase
3. Check for whitespace/formatting issues in the secret

### Issue 3: Database Connection Errors

**Symptoms**: "Failed to create user" errors

**Solutions**:

1. Check database connection string
2. Verify database is running and accessible
3. Check user table schema matches expected structure
4. Review database permissions

### Issue 4: Rate Limiting

**Symptoms**: "Too many webhook requests" errors

**Solutions**:

1. Check if webhook is being called excessively
2. Adjust rate limiting settings if needed
3. Look for infinite loops in webhook processing

## 🔒 Security Best Practices

1. **Keep secrets secure**: Never commit webhook secrets to version control
2. **Use HTTPS**: Always use secure connections for webhooks
3. **Validate payloads**: Strictly validate all incoming webhook data
4. **Monitor for abuse**: Watch for unusual webhook activity
5. **Rotate secrets**: Periodically update your webhook secret
6. **Implement timeouts**: Set appropriate timeouts for webhook processing
7. **Log security events**: Keep detailed logs of all webhook activities

## 📈 Performance Optimization

1. **Async Processing**: Process webhooks asynchronously when possible
2. **Database Indexing**: Ensure proper indexes on user table
3. **Connection Pooling**: Use database connection pooling
4. **Caching**: Cache frequently accessed data
5. **Retry Logic**: Implement exponential backoff for failed operations

Your webhook system is now ready for production use! 🚀
