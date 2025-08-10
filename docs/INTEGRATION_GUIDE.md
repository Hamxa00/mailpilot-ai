# MailPilot AI Authentication & User Sync Integration Guide

This guide explains how to set up the complete authentication system with Supabase Auth and automatic user synchronization.

## Overview

Your MailPilot AI application now has:

1. **Supabase Auth Integration** - Handles authentication with email/password and OAuth
2. **Custom User Database** - Stores additional user information in your PostgreSQL schema
3. **Webhook Synchronization** - Automatically syncs users between Supabase Auth and your database
4. **Registration API** - Complete user registration with validation and error handling

## Architecture Flow

```
User Registration → Supabase Auth → Webhook → Custom Database
                 ↘                ↗
                  Registration API (Fallback Sync)
```

## Setup Instructions

### 1. Environment Configuration

Add these environment variables to your `.env.local`:

```env
# Supabase Configuration (you already have these)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# New: Webhook Security
SUPABASE_WEBHOOK_SECRET=your-32-character-webhook-secret-here

# Database URL (you already have this)
DATABASE_URL=your-database-connection-string

# App Configuration (you already have this)
NEXT_PUBLIC_APP_URL=http://localhost:3000
JWT_SECRET=your-jwt-secret

# OAuth Configuration (you already have this)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 2. Supabase Webhook Configuration

**📖 For detailed webhook setup instructions, see [WEBHOOK_GUIDE.md](./WEBHOOK_GUIDE.md)**

Quick setup:

1. Generate a webhook secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. Add to `.env.local`: `SUPABASE_WEBHOOK_SECRET=your-generated-secret`
3. Go to your Supabase Dashboard → **Database → Webhooks**
4. Create webhook pointing to: `https://your-domain.com/api/webhooks/supabase`

### 3. Database Schema Verification

Ensure your user table matches this structure (already in your schema):

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

## API Endpoints

### Registration

**POST** `/api/auth/register`

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "acceptTerms": true,
  "acceptMarketing": false,
  "referralCode": "REF12345"
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "Registration successful! Please check your email to verify your account.",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "emailVerified": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "needsVerification": true,
  "session": null
}
```

### Login (Already Exists)

**POST** `/api/auth/login`

### OAuth (Already Exists)

**GET/POST** `/api/auth/oauth`

### Webhook

**POST** `/api/webhooks/supabase` (Internal - called by Supabase)

## Testing Your Integration

### 1. Test Registration API

```bash
# Test endpoint health
curl -X GET http://localhost:3000/api/auth/register

# Test user registration
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

### 2. Test Webhook Endpoint

```bash
# Test webhook health
curl -X GET http://localhost:3000/api/webhooks/supabase
```

### 3. Use the Test Script

Run the included test script:

```bash
npx ts-node scripts/test-registration.ts
```

## Postman Collection Updates

Your Postman collection is comprehensive. Here are the key updates made:

1. **Enhanced Registration Endpoint**: Now handles proper validation and database sync
2. **Added Webhook Support**: Automatic user synchronization
3. **Better Error Handling**: More specific error messages and status codes

### Updated Collection Usage

1. **Registration Flow**:

   - Use "Register User" to create new accounts
   - Check "Get Registration Requirements" for validation rules
   - Test invalid cases with the error testing folder

2. **OAuth Flow**:

   - Use "Get Available OAuth Providers" to see options
   - "Initiate Google OAuth" for Google sign-in
   - Callback handling is automatic

3. **User Management**:
   - "Get Current User" to fetch authenticated user info
   - "Update User Profile" to modify user data

## Integration with Your Frontend

### Registration Form

```typescript
interface RegistrationData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  acceptTerms: boolean;
  acceptMarketing?: boolean;
  referralCode?: string;
}

async function registerUser(data: RegistrationData) {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  return await response.json();
}
```

### OAuth Integration

```typescript
// Already exists in your OAuth routes
async function signInWithGoogle() {
  const response = await fetch("/api/auth/oauth", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      provider: "google",
      redirectTo: "/dashboard",
    }),
  });

  const { data } = await response.json();
  if (data?.url) {
    window.location.href = data.url;
  }
}
```

## Monitoring and Debugging

### Logs to Monitor

1. **Registration Events**: User creation, validation errors
2. **Webhook Events**: User sync success/failure
3. **OAuth Events**: Provider authentication, user creation
4. **Database Events**: User table operations

### Common Issues and Solutions

1. **User not syncing to database**:

   - Check webhook configuration in Supabase
   - Verify `SUPABASE_WEBHOOK_SECRET` environment variable
   - Check webhook endpoint logs

2. **Registration failing**:

   - Verify database connection
   - Check user schema matches expected structure
   - Review validation error messages

3. **OAuth users missing from database**:
   - Check OAuth callback handler
   - Verify `ensureUserInDatabase` function

## Next Steps

1. **Set up your webhook secret** and configure Supabase webhooks
2. **Test the registration flow** end-to-end
3. **Monitor webhook logs** to ensure sync is working
4. **Update your frontend** to use the new registration API
5. **Test OAuth flows** to ensure users sync properly

## Security Considerations

- Keep your webhook secret secure
- Monitor webhook endpoint for abuse
- Implement proper CORS policies
- Use HTTPS in production
- Regularly rotate secrets

Your authentication system is now production-ready with proper error handling, validation, and automatic user synchronization between Supabase Auth and your custom database!
