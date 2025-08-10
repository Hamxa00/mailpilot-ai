# MailPilot AI - API Documentation

## Overview

MailPilot AI provides a comprehensive REST API for email management, AI-powered analysis, and user account operations. All APIs follow RESTful conventions and return JSON responses.

**Base URL**: `https://your-domain.com/api`  
**Authentication**: Bearer tokens with JWT  
**Rate Limiting**: Configurable per endpoint with different limits for different operations

## Table of Contents

1. [Authentication & Security](#authentication--security)
2. [User Management](#user-management)
3. [Email Account Management](#email-account-management)
4. [Email Operations](#email-operations)
5. [Thread Management](#thread-management)
6. [Email Folders & Organization](#email-folders--organization)
7. [AI Features](#ai-features)
8. [Chatbot](#chatbot)
9. [Search & Discovery](#search--discovery)
10. [Billing & Subscriptions](#billing--subscriptions)
11. [Usage Analytics](#usage-analytics)
12. [Webhooks & Notifications](#webhooks--notifications)
13. [Error Handling](#error-handling)
14. [Rate Limiting](#rate-limiting)

## Authentication & Security

### Headers Required

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
X-Request-ID: <unique_request_id>
```

### User Registration

**Endpoint:** `POST /api/auth/register`

**Description:** Create a new user account with email verification

**Request Body:**
- `email` (string, required): Valid email address
- `password` (string, required): Strong password (8+ chars, mixed case, numbers, symbols)
- `confirmPassword` (string, required): Must match password
- `firstName` (string, required): 2-50 characters, letters only
- `lastName` (string, required): 2-50 characters, letters only
- `acceptTerms` (boolean, required): Must be true
- `acceptMarketing` (boolean, optional): Marketing consent
- `referralCode` (string, optional): 6-12 character alphanumeric code

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "emailVerified": false,
      "createdAt": "2024-01-01T00:00:00Z"
    },
    "requiresVerification": true
  }
}
```

### User Login

**Endpoint:** `POST /api/auth/login`

**Description:** Authenticate user and create session

**Request Body:**
- `email` (string, required): User email
- `password` (string, required): User password
- `rememberMe` (boolean, optional): Extended session duration
- `totpCode` (string, optional): 6-digit 2FA code if enabled

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "emailVerified": true,
      "lastLoginAt": "2024-01-01T10:00:00Z"
    },
    "tokens": {
      "accessToken": "jwt_access_token",
      "refreshToken": "jwt_refresh_token",
      "expiresAt": "2024-01-01T11:00:00Z"
    },
    "session": {
      "id": "session_uuid",
      "expiresAt": "2024-01-01T18:00:00Z"
    }
  }
}
```

### Password Reset Request

**Endpoint:** `POST /api/auth/password-reset-request`

**Description:** Initiate password reset process

**Request Body:**
- `email` (string, required): User email address
- `callbackUrl` (string, optional): URL to redirect after reset

**Response:**
```json
{
  "success": true,
  "message": "Password reset instructions sent to email"
}
```

### Password Reset Confirmation

**Endpoint:** `POST /api/auth/password-reset-confirm`

**Description:** Complete password reset with token

**Request Body:**
- `token` (string, required): Reset token from email
- `password` (string, required): New password
- `confirmPassword` (string, required): Must match new password

**Response:**
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

### Get Current User

**Endpoint:** `GET /api/auth/user`

**Description:** Get authenticated user information

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "emailVerified": true,
      "twoFactorEnabled": false,
      "createdAt": "2024-01-01T00:00:00Z",
      "lastLoginAt": "2024-01-01T10:00:00Z"
    }
  }
}
```

### Refresh Token

**Endpoint:** `POST /api/auth/refresh`

**Description:** Refresh access token using refresh token

**Request Body:**
- `refreshToken` (string, required): Valid refresh token

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "new_jwt_access_token",
    "expiresAt": "2024-01-01T11:00:00Z"
  }
}
```

### Logout

**Endpoint:** `POST /api/auth/logout`

**Description:** Invalidate current session

**Response:**
```json
{
  "success": true,
  "message": "Successfully logged out"
}
```

### Email Verification

**Endpoint:** `POST /api/auth/verify-email`

**Description:** Verify user email with token

**Request Body:**
- `token` (string, required): Email verification token

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

## User Management

### Get User Profile

**Endpoint:** `GET /api/users/profile`

**Description:** Get detailed user profile information

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "imageUrl": "https://example.com/avatar.jpg",
      "timezone": "America/New_York",
      "language": "en",
      "createdAt": "2024-01-01T00:00:00Z",
      "lastLoginAt": "2024-01-01T10:00:00Z",
      "emailVerified": true,
      "role": "user"
    }
  }
}
```

### Update User Profile

**Endpoint:** `PATCH /api/users/profile`

**Description:** Update user profile information

**Request Body:**
- `firstName` (string, optional): 2-50 characters, letters only
- `lastName` (string, optional): 2-50 characters, letters only
- `imageUrl` (string, optional): Valid image URL
- `timezone` (string, optional): Valid timezone identifier
- `language` (string, optional): Language code (en, es, fr, etc.)
- `bio` (string, optional): User biography, max 500 characters
- `website` (string, optional): Valid website URL
- `company` (string, optional): Company name, max 100 characters
- `jobTitle` (string, optional): Job title, max 100 characters

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe Updated",
      "imageUrl": "https://example.com/new-avatar.jpg"
    }
  }
}
```

### Change Email Address

**Endpoint:** `POST /api/users/change-email`

**Description:** Request email address change with verification

**Request Body:**
- `newEmail` (string, required): New email address
- `password` (string, required): Current password for verification

**Response:**
```json
{
  "success": true,
  "message": "Email change verification sent to new address"
}
```

### Change Password

**Endpoint:** `POST /api/users/change-password`

**Description:** Change user password

**Request Body:**
- `currentPassword` (string, required): Current password
- `newPassword` (string, required): New strong password
- `confirmNewPassword` (string, required): Must match new password

**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

### Get User Preferences

**Endpoint:** `GET /api/users/preferences`

**Description:** Get user application preferences

**Response:**
```json
{
  "success": true,
  "data": {
    "preferences": {
      "theme": "dark",
      "language": "en",
      "timezone": "America/New_York",
      "emailFrequency": "daily",
      "notifications": {
        "email": true,
        "push": false,
        "desktop": true
      },
      "privacy": {
        "profileVisible": true,
        "activityVisible": false
      }
    }
  }
}
```

### Update User Preferences

**Endpoint:** `PATCH /api/users/preferences`

**Description:** Update user preferences

**Request Body:**
- `theme` (string, optional): light, dark, auto
- `language` (string, optional): Language code
- `timezone` (string, optional): Timezone identifier
- `emailFrequency` (string, optional): never, weekly, daily, immediate
- `notifications` (object, optional): Notification preferences
- `privacy` (object, optional): Privacy settings

**Response:**
```json
{
  "success": true,
  "data": {
    "preferences": {
      "theme": "dark",
      "notifications": {
        "email": false,
        "push": true
      }
    }
  }
}
```

### Setup Two-Factor Authentication

**Endpoint:** `POST /api/users/2fa/setup`

**Description:** Initialize 2FA setup process

**Response:**
```json
{
  "success": true,
  "data": {
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANS...",
    "secret": "JBSWY3DPEHPK3PXP",
    "backupCodes": ["12345678", "87654321"]
  }
}
```

### Verify Two-Factor Authentication

**Endpoint:** `POST /api/users/2fa/verify`

**Description:** Verify and enable 2FA

**Request Body:**
- `totpCode` (string, required): 6-digit TOTP code
- `secret` (string, required): Secret from setup

**Response:**
```json
{
  "success": true,
  "message": "Two-factor authentication enabled"
}
```

### Disable Two-Factor Authentication

**Endpoint:** `DELETE /api/users/2fa`

**Description:** Disable 2FA for account

**Request Body:**
- `password` (string, required): Current password
- `totpCode` (string, required): 6-digit TOTP code

**Response:**
```json
{
  "success": true,
  "message": "Two-factor authentication disabled"
}
```

### Get User Sessions

**Endpoint:** `GET /api/users/sessions`

**Description:** List all active user sessions

**Response:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "session_uuid",
        "userAgent": "Mozilla/5.0...",
        "ipAddress": "192.168.1.1",
        "location": "New York, US",
        "current": true,
        "createdAt": "2024-01-01T10:00:00Z",
        "lastActiveAt": "2024-01-01T11:30:00Z"
      }
    ]
  }
}
```

### Revoke Session

**Endpoint:** `DELETE /api/users/sessions/{sessionId}`

**Description:** Revoke a specific user session

**Response:**
```json
{
  "success": true,
  "message": "Session revoked successfully"
}
```

### Delete User Account

**Endpoint:** `DELETE /api/users/account`

**Description:** Delete user account and all associated data

**Request Body:**
- `password` (string, required): Current password
- `confirmation` (string, required): Must be "DELETE"
- `reason` (string, optional): Reason for deletion

**Response:**
```json
{
  "success": true,
  "message": "Account deletion initiated"
}
```

## Email Account Management

### List Email Accounts

**Endpoint:** `GET /api/accounts`

**Description:** Get all connected email accounts for the user

**Query Parameters:**
- `includeInactive` (boolean, optional): Include inactive accounts

**Response:**
```json
{
  "success": true,
  "data": {
    "accounts": [
      {
        "id": "uuid",
        "emailAddress": "user@gmail.com",
        "provider": "gmail",
        "name": "Personal Gmail",
        "isActive": true,
        "syncStatus": "active",
        "lastSyncAt": "2024-01-01T12:00:00Z",
        "syncProgress": 100,
        "totalEmails": 15420,
        "unreadCount": 23,
        "quotaUsed": 75,
        "quotaLimit": 100
      }
    ],
    "total": 1
  }
}
```

### Connect New Account

**Endpoint:** `POST /api/accounts/connect`

**Description:** Connect a new email account using OAuth

**Request Body:**
- `provider` (string, required): gmail, outlook, imap, exchange
- `authorizationCode` (string, required): OAuth authorization code
- `redirectUri` (string, required): OAuth redirect URI
- `name` (string, optional): Custom name for the account
- `settings` (object, optional): Provider-specific settings

**Response:**
```json
{
  "success": true,
  "data": {
    "account": {
      "id": "uuid",
      "emailAddress": "user@gmail.com",
      "provider": "gmail",
      "name": "Personal Gmail",
      "isActive": true,
      "syncStatus": "initializing"
    }
  }
}
```

### Get Account Details

**Endpoint:** `GET /api/accounts/{accountId}`

**Description:** Get detailed information about a specific account

**Response:**
```json
{
  "success": true,
  "data": {
    "account": {
      "id": "uuid",
      "emailAddress": "user@gmail.com",
      "provider": "gmail",
      "name": "Personal Gmail",
      "isActive": true,
      "syncStatus": "active",
      "lastSyncAt": "2024-01-01T12:00:00Z",
      "settings": {
        "syncFrequency": "15min",
        "syncHistory": "30days",
        "autoSort": true,
        "smartNotifications": true
      },
      "statistics": {
        "totalEmails": 15420,
        "unreadCount": 23,
        "sentCount": 1250,
        "storageUsed": 2.5
      }
    }
  }
}
```

### Update Account Settings

**Endpoint:** `PATCH /api/accounts/{accountId}`

**Description:** Update account settings and preferences

**Request Body:**
- `name` (string, optional): Custom account name
- `isActive` (boolean, optional): Enable/disable account
- `settings` (object, optional): Account-specific settings
  - `syncFrequency` (string): 5min, 15min, 30min, 1hour, manual
  - `syncHistory` (string): 7days, 30days, 90days, 1year, all
  - `autoSort` (boolean): Enable automatic email sorting
  - `smartNotifications` (boolean): Enable intelligent notifications

**Response:**
```json
{
  "success": true,
  "data": {
    "account": {
      "id": "uuid",
      "name": "Work Gmail",
      "settings": {
        "syncFrequency": "5min",
        "autoSort": true
      }
    }
  }
}
```

### Sync Account

**Endpoint:** `POST /api/accounts/{accountId}/sync`

**Description:** Trigger manual synchronization of account

**Request Body:**
- `type` (string, optional): incremental, full, folder_only
- `folders` (array, optional): Specific folders to sync

**Response:**
```json
{
  "success": true,
  "data": {
    "syncJob": {
      "id": "sync_uuid",
      "accountId": "account_uuid",
      "type": "incremental",
      "status": "started",
      "progress": 0,
      "estimatedDuration": 120
    }
  }
}
```

### Get Sync Status

**Endpoint:** `GET /api/accounts/{accountId}/sync-status`

**Description:** Get current synchronization status

**Response:**
```json
{
  "success": true,
  "data": {
    "sync": {
      "status": "syncing",
      "progress": 45,
      "currentFolder": "INBOX",
      "processedEmails": 450,
      "totalEmails": 1000,
      "startedAt": "2024-01-01T12:00:00Z",
      "estimatedCompletion": "2024-01-01T12:05:00Z"
    }
  }
}
```

### Test Account Connection

**Endpoint:** `GET /api/accounts/{accountId}/test`

**Description:** Test connection to email provider

**Response:**
```json
{
  "success": true,
  "data": {
    "connection": {
      "status": "healthy",
      "responseTime": 150,
      "lastChecked": "2024-01-01T12:00:00Z",
      "capabilities": ["read", "send", "delete", "move"]
    }
  }
}
```

### Disconnect Account

**Endpoint:** `DELETE /api/accounts/{accountId}`

**Description:** Disconnect and remove email account

**Request Body:**
- `deleteEmails` (boolean, optional): Also delete stored emails
- `confirmation` (string, required): Must be "DISCONNECT"

**Response:**
```json
{
  "success": true,
  "message": "Account disconnected successfully"
}
```

### Reconnect Account

**Endpoint:** `POST /api/accounts/{accountId}/reconnect`

**Description:** Reconnect account with new credentials

**Request Body:**
- `authorizationCode` (string, required): New OAuth authorization code
- `redirectUri` (string, required): OAuth redirect URI

**Response:**
```json
{
  "success": true,
  "data": {
    "account": {
      "id": "uuid",
      "syncStatus": "reconnected",
      "lastSyncAt": "2024-01-01T12:00:00Z"
    }
  }
}
```

## Email Operations

### List Emails

**Endpoint:** `GET /api/emails`

**Description:** Get emails with advanced filtering and pagination

**Query Parameters:**
- `accountId` (string, optional): Filter by specific account
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 50, max: 100)
- `folder` (string, optional): Folder name or ID
- `unreadOnly` (boolean, optional): Show only unread emails
- `starred` (boolean, optional): Show only starred emails
- `hasAttachments` (boolean, optional): Show only emails with attachments
- `from` (string, optional): Filter by sender email
- `to` (string, optional): Filter by recipient email
- `subject` (string, optional): Filter by subject contains
- `search` (string, optional): Full-text search query
- `startDate` (string, optional): ISO date string
- `endDate` (string, optional): ISO date string
- `category` (string, optional): AI-categorized emails
- `priority` (string, optional): low, medium, high, urgent
- `sortBy` (string, optional): date, subject, from, priority
- `sortOrder` (string, optional): asc, desc

**Response:**
```json
{
  "success": true,
  "data": {
    "emails": [
      {
        "id": "uuid",
        "threadId": "uuid",
        "accountId": "uuid",
        "messageId": "message@example.com",
        "subject": "Important Meeting",
        "from": {
          "name": "John Smith",
          "address": "john@example.com"
        },
        "bodySnippet": "Let's schedule a meeting to discuss...",
        "sentAt": "2024-01-01T10:00:00Z",
        "receivedAt": "2024-01-01T10:00:05Z",
        "isRead": false,
        "isStarred": true,
        "hasAttachments": true,
        "labels": ["inbox", "important"],
        "folder": "INBOX",
        "priority": "high",
        "category": "work"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1250,
      "totalPages": 25,
      "hasNext": true,
      "hasPrev": false
    },
    "filters": {
      "applied": ["unreadOnly", "hasAttachments"],
      "available": ["starred", "priority", "category"]
    }
  }
}
```

### Get Email Details

**Endpoint:** `GET /api/emails/{emailId}`

**Description:** Get complete email details including body and attachments

**Query Parameters:**
- `includeThread` (boolean, optional): Include full thread context
- `markAsRead` (boolean, optional): Mark as read when retrieving

**Response:**
```json
{
  "success": true,
  "data": {
    "email": {
      "id": "uuid",
      "threadId": "uuid",
      "accountId": "uuid",
      "messageId": "message@example.com",
      "subject": "Important Meeting",
      "body": {
        "text": "Plain text version of email...",
        "html": "<html>Rich HTML version...</html>"
      },
      "from": {
        "name": "John Smith",
        "address": "john@example.com"
      },
      "recipients": [
        {
          "type": "to",
          "name": "Jane Doe",
          "address": "jane@example.com"
        }
      ],
      "attachments": [
        {
          "id": "uuid",
          "name": "document.pdf",
          "mimeType": "application/pdf",
          "size": 1024576,
          "downloadUrl": "/api/attachments/uuid/download",
          "isInline": false,
          "contentId": null
        }
      ],
      "headers": {
        "messageId": "message@example.com",
        "references": "previous@example.com",
        "inReplyTo": "previous@example.com"
      },
      "metadata": {
        "sentAt": "2024-01-01T10:00:00Z",
        "receivedAt": "2024-01-01T10:00:05Z",
        "isRead": false,
        "isStarred": true,
        "labels": ["inbox", "important"],
        "folder": "INBOX",
        "size": 15360
      },
      "aiSummary": {
        "summary": "Meeting request for project discussion",
        "sentiment": "neutral",
        "priority": "high",
        "category": "work",
        "actionItems": ["Schedule meeting", "Prepare agenda"],
        "keyPoints": ["Project deadline", "Team coordination"],
        "confidence": 0.95
      }
    }
  }
}
```

### Send Email

**Endpoint:** `POST /api/emails/send`

**Description:** Send a new email

**Request Body:**
- `accountId` (string, required): Sending account ID
- `to` (array, required): Recipients array with name and email
- `cc` (array, optional): CC recipients
- `bcc` (array, optional): BCC recipients
- `subject` (string, required): Email subject
- `body` (object, required): Email body with text and/or html
- `attachments` (array, optional): File attachments
- `replyTo` (string, optional): Custom reply-to address
- `priority` (string, optional): low, normal, high
- `trackOpens` (boolean, optional): Enable open tracking
- `trackClicks` (boolean, optional): Enable click tracking
- `scheduleAt` (string, optional): ISO date for scheduled sending

**Response:**
```json
{
  "success": true,
  "data": {
    "email": {
      "id": "uuid",
      "messageId": "sent@example.com",
      "status": "sent",
      "sentAt": "2024-01-01T10:00:00Z",
      "threadId": "uuid"
    }
  }
}
```

### Create Draft

**Endpoint:** `POST /api/emails/drafts`

**Description:** Create or save email draft

**Request Body:** Same as send email but all fields optional except accountId

**Response:**
```json
{
  "success": true,
  "data": {
    "draft": {
      "id": "uuid",
      "status": "draft",
      "lastSavedAt": "2024-01-01T10:00:00Z"
    }
  }
}
```

### Update Draft

**Endpoint:** `PATCH /api/emails/drafts/{draftId}`

**Description:** Update existing draft

**Request Body:** Same as create draft

### Get Drafts

**Endpoint:** `GET /api/emails/drafts`

**Description:** List user's email drafts

**Query Parameters:**
- `accountId` (string, optional): Filter by account
- `page` (number, optional): Page number
- `limit` (number, optional): Items per page

### Send Draft

**Endpoint:** `POST /api/emails/drafts/{draftId}/send`

**Description:** Send an existing draft

**Response:**
```json
{
  "success": true,
  "data": {
    "email": {
      "id": "uuid",
      "status": "sent",
      "sentAt": "2024-01-01T10:00:00Z"
    }
  }
}
```

### Mark Email as Read/Unread

**Endpoint:** `PATCH /api/emails/{emailId}/read`

**Description:** Change read status of email

**Request Body:**
- `isRead` (boolean, required): Read status

**Response:**
```json
{
  "success": true,
  "data": {
    "email": {
      "id": "uuid",
      "isRead": true,
      "readAt": "2024-01-01T10:00:00Z"
    }
  }
}
```

### Star/Unstar Email

**Endpoint:** `PATCH /api/emails/{emailId}/star`

**Description:** Change starred status of email

**Request Body:**
- `isStarred` (boolean, required): Starred status

### Move Email

**Endpoint:** `PATCH /api/emails/{emailId}/move`

**Description:** Move email to different folder

**Request Body:**
- `folderId` (string, required): Target folder ID
- `folderName` (string, optional): Target folder name

### Archive Email

**Endpoint:** `PATCH /api/emails/{emailId}/archive`

**Description:** Archive email (move to archive folder)

### Delete Email

**Endpoint:** `DELETE /api/emails/{emailId}`

**Description:** Delete email (move to trash or permanent delete)

**Query Parameters:**
- `permanent` (boolean, optional): Permanently delete instead of moving to trash

### Bulk Email Operations

**Endpoint:** `POST /api/emails/bulk`

**Description:** Perform bulk operations on multiple emails

**Request Body:**
- `emailIds` (array, required): Array of email IDs
- `operation` (string, required): read, unread, star, unstar, archive, delete, move
- `operationData` (object, optional): Additional data for operation (e.g., folderId for move)

**Response:**
```json
{
  "success": true,
  "data": {
    "processed": 25,
    "failed": 0,
    "results": [
      {
        "emailId": "uuid",
        "success": true
      }
    ]
  }
}
```

### Get Email Templates

**Endpoint:** `GET /api/emails/templates`

**Description:** List available email templates

### Create Email Template

**Endpoint:** `POST /api/emails/templates`

**Description:** Create new email template

**Request Body:**
- `name` (string, required): Template name
- `subject` (string, required): Template subject
- `body` (object, required): Template body
- `category` (string, optional): Template category
- `variables` (array, optional): Template variables

### Email Auto-Responder

**Endpoint:** `POST /api/emails/auto-responder`

**Description:** Setup email auto-responder

**Request Body:**
- `accountId` (string, required): Account for auto-responder
- `enabled` (boolean, required): Enable/disable auto-responder
- `startDate` (string, optional): Start date for auto-responder
- `endDate` (string, optional): End date for auto-responder
- `subject` (string, required): Auto-response subject
- `body` (string, required): Auto-response body
- `conditions` (object, optional): Conditions for triggering auto-response

## Thread Management

### List Threads

**Endpoint:** `GET /api/threads`

**Description:** Get email conversation threads

**Query Parameters:**
- `accountId` (string, optional): Filter by account
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 25, max: 100)
- `folder` (string, optional): Filter by folder
- `unreadOnly` (boolean, optional): Show only threads with unread emails
- `hasAttachments` (boolean, optional): Show only threads with attachments
- `participants` (string, optional): Filter by participant email
- `sortBy` (string, optional): lastMessage, subject, participants
- `sortOrder` (string, optional): asc, desc

**Response:**
```json
{
  "success": true,
  "data": {
    "threads": [
      {
        "id": "uuid",
        "subject": "Project Discussion",
        "messageCount": 5,
        "unreadCount": 2,
        "lastMessageDate": "2024-01-01T12:00:00Z",
        "firstMessageDate": "2024-01-01T08:00:00Z",
        "participants": [
          {
            "name": "John Doe",
            "email": "john@example.com",
            "role": "sender"
          }
        ],
        "hasAttachments": true,
        "isStarred": false,
        "labels": ["inbox", "work"],
        "folder": "INBOX",
        "lastMessage": {
          "id": "uuid",
          "from": {
            "name": "John Doe",
            "email": "john@example.com"
          },
          "bodySnippet": "Thanks for the update...",
          "sentAt": "2024-01-01T12:00:00Z"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 25,
      "total": 150,
      "totalPages": 6
    }
  }
}
```

### Get Thread Details

**Endpoint:** `GET /api/threads/{threadId}`

**Description:** Get complete thread with all messages

**Query Parameters:**
- `includeDeleted` (boolean, optional): Include deleted messages
- `markAsRead` (boolean, optional): Mark all messages as read

**Response:**
```json
{
  "success": true,
  "data": {
    "thread": {
      "id": "uuid",
      "subject": "Project Discussion",
      "messageCount": 5,
      "unreadCount": 2,
      "participants": [
        {
          "name": "John Doe",
          "email": "john@example.com",
          "messageCount": 3,
          "lastMessageAt": "2024-01-01T12:00:00Z"
        }
      ],
      "labels": ["inbox", "work"],
      "hasAttachments": true,
      "createdAt": "2024-01-01T08:00:00Z",
      "updatedAt": "2024-01-01T12:00:00Z",
      "emails": [
        {
          "id": "uuid",
          "subject": "Project Discussion",
          "from": {
            "name": "John",
            "address": "john@example.com"
          },
          "sentAt": "2024-01-01T08:00:00Z",
          "bodySnippet": "Let's discuss the project timeline...",
          "isRead": true,
          "hasAttachments": false
        }
      ]
    }
  }
}
```

### Archive Thread

**Endpoint:** `PATCH /api/threads/{threadId}/archive`

**Description:** Archive entire conversation thread

**Response:**
```json
{
  "success": true,
  "data": {
    "thread": {
      "id": "uuid",
      "status": "archived",
      "archivedAt": "2024-01-01T12:00:00Z"
    }
  }
}
```

### Mark Thread as Done

**Endpoint:** `PATCH /api/threads/{threadId}/done`

**Description:** Mark thread as completed/done

**Response:**
```json
{
  "success": true,
  "data": {
    "thread": {
      "id": "uuid",
      "status": "done",
      "completedAt": "2024-01-01T12:00:00Z"
    }
  }
}
```

### Star Thread

**Endpoint:** `PATCH /api/threads/{threadId}/star`

**Description:** Star/unstar entire thread

**Request Body:**
- `isStarred` (boolean, required): Star status

### Snooze Thread

**Endpoint:** `PATCH /api/threads/{threadId}/snooze`

**Description:** Snooze thread until specified time

**Request Body:**
- `snoozeUntil` (string, required): ISO date string
- `snoozeType` (string, optional): time, location, condition

### Unsnooze Thread

**Endpoint:** `PATCH /api/threads/{threadId}/unsnooze`

**Description:** Remove snooze from thread

### Delete Thread

**Endpoint:** `DELETE /api/threads/{threadId}`

**Description:** Delete entire thread

**Query Parameters:**
- `permanent` (boolean, optional): Permanently delete instead of moving to trash

### Get Thread Statistics

**Endpoint:** `GET /api/threads/{threadId}/stats`

**Description:** Get thread analytics and statistics

**Response:**
```json
{
  "success": true,
  "data": {
    "statistics": {
      "messageCount": 5,
      "participantCount": 3,
      "averageResponseTime": 7200,
      "totalAttachments": 2,
      "threadDuration": 86400,
      "wordCount": 1250,
      "sentiment": "positive"
    }
  }
}
```

## Email Folders & Organization

### List Folders

**Endpoint:** `GET /api/folders`

**Description:** Get all folders for user's accounts

**Query Parameters:**
- `accountId` (string, optional): Filter by specific account
- `type` (string, optional): system, custom, all
- `includeEmpty` (boolean, optional): Include folders with no emails

**Response:**
```json
{
  "success": true,
  "data": {
    "folders": [
      {
        "id": "uuid",
        "accountId": "uuid",
        "name": "INBOX",
        "displayName": "Inbox",
        "type": "system",
        "parentId": null,
        "level": 0,
        "emailCount": 1250,
        "unreadCount": 23,
        "color": "#3b82f6",
        "icon": "inbox",
        "isSelectable": true,
        "canDelete": false,
        "syncEnabled": true
      }
    ]
  }
}
```

### Create Folder

**Endpoint:** `POST /api/folders`

**Description:** Create new email folder

**Request Body:**
- `accountId` (string, required): Account ID
- `name` (string, required): Folder name
- `displayName` (string, required): Display name
- `parentId` (string, optional): Parent folder ID
- `color` (string, optional): Hex color code
- `icon` (string, optional): Icon identifier
- `description` (string, optional): Folder description

**Response:**
```json
{
  "success": true,
  "data": {
    "folder": {
      "id": "uuid",
      "name": "Important Projects",
      "displayName": "Important Projects",
      "type": "custom",
      "color": "#3b82f6"
    }
  }
}
```

### Update Folder

**Endpoint:** `PATCH /api/folders/{folderId}`

**Description:** Update folder properties

**Request Body:**
- `displayName` (string, optional): New display name
- `color` (string, optional): New color
- `icon` (string, optional): New icon
- `description` (string, optional): New description

### Move Folder

**Endpoint:** `PATCH /api/folders/{folderId}/move`

**Description:** Move folder to different parent

**Request Body:**
- `parentId` (string, required): New parent folder ID

### Delete Folder

**Endpoint:** `DELETE /api/folders/{folderId}`

**Description:** Delete custom folder

**Query Parameters:**
- `moveEmailsTo` (string, optional): Folder ID to move emails to

### Get Folder Statistics

**Endpoint:** `GET /api/folders/{folderId}/stats`

**Description:** Get folder statistics and analytics

**Response:**
```json
{
  "success": true,
  "data": {
    "statistics": {
      "totalEmails": 1250,
      "unreadEmails": 23,
      "starredEmails": 45,
      "emailsWithAttachments": 125,
      "averageEmailSize": 15360,
      "oldestEmail": "2023-01-01T00:00:00Z",
      "newestEmail": "2024-01-01T12:00:00Z",
      "topSenders": [
        {
          "email": "john@example.com",
          "count": 45
        }
      ]
    }
  }
}
```

### Create Email Label

**Endpoint:** `POST /api/labels`

**Description:** Create custom email label

**Request Body:**
- `name` (string, required): Label name
- `color` (string, required): Hex color code
- `description` (string, optional): Label description

### Apply Label to Email

**Endpoint:** `PATCH /api/emails/{emailId}/labels`

**Description:** Add or remove labels from email

**Request Body:**
- `addLabels` (array, optional): Labels to add
- `removeLabels` (array, optional): Labels to remove

### Bulk Label Operations

**Endpoint:** `POST /api/labels/bulk`

**Description:** Apply labels to multiple emails

**Request Body:**
- `emailIds` (array, required): Email IDs
- `labelIds` (array, required): Label IDs to apply

## AI Features

### Generate Email Summary

**Endpoint:** `POST /api/ai/summarize`

**Description:** Generate AI-powered email summary with insights

**Request Body:**
- `emailId` (string, required): Email ID to summarize
- `options` (object, optional): Summarization options
  - `includeActionItems` (boolean): Extract action items
  - `includeSentiment` (boolean): Analyze sentiment
  - `includeKeyPoints` (boolean): Extract key points
  - `includeCategory` (boolean): Categorize email
  - `language` (string): Response language (default: en)
  - `summaryLength` (string): short, medium, long

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "id": "uuid",
      "emailId": "uuid",
      "summary": "This email discusses the upcoming project deadline and requests a team meeting to review progress.",
      "keyPoints": [
        "Project deadline is next Friday",
        "Need to review final draft",
        "Meeting scheduled for tomorrow"
      ],
      "sentiment": {
        "overall": "neutral",
        "score": 0.1,
        "confidence": 0.85
      },
      "priority": {
        "level": "high",
        "score": 0.8,
        "confidence": 0.92
      },
      "category": {
        "primary": "work",
        "secondary": "meeting",
        "confidence": 0.95
      },
      "actionItems": [
        {
          "text": "Review final draft by Thursday",
          "priority": "high",
          "dueDate": "2024-01-04T23:59:59Z"
        },
        {
          "text": "Attend meeting tomorrow at 2 PM",
          "priority": "medium",
          "dueDate": "2024-01-02T14:00:00Z"
        }
      ],
      "entities": [
        {
          "type": "date",
          "value": "next Friday",
          "normalized": "2024-01-05T00:00:00Z"
        },
        {
          "type": "person",
          "value": "John Smith",
          "email": "john@company.com"
        }
      ],
      "confidenceScore": 0.92,
      "processingTime": 1200,
      "createdAt": "2024-01-01T10:30:00Z"
    }
  }
}
```

### Batch Analyze Emails

**Endpoint:** `POST /api/ai/batch-analyze`

**Description:** Analyze multiple emails in batch for efficiency

**Request Body:**
- `emailIds` (array, required): Array of email IDs (max 50)
- `analysisTypes` (array, required): ["summary", "sentiment", "priority", "category", "actionItems"]
- `options` (object, optional): Analysis options

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "emailId": "uuid",
        "success": true,
        "analysis": {
          "summary": "Brief email summary...",
          "sentiment": "positive",
          "priority": "medium",
          "category": "work"
        }
      }
    ],
    "statistics": {
      "processed": 25,
      "failed": 0,
      "totalProcessingTime": 8500
    }
  }
}
```

### Generate Reply Suggestions

**Endpoint:** `POST /api/ai/reply-suggestions`

**Description:** Generate AI-powered reply suggestions

**Request Body:**
- `emailId` (string, required): Email ID to reply to
- `tone` (string, optional): professional, casual, friendly, formal
- `length` (string, optional): short, medium, long
- `context` (string, optional): Additional context for reply
- `includeQuote` (boolean, optional): Include original email quote
- `language` (string, optional): Reply language

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "id": "uuid",
        "subject": "Re: Meeting Invitation",
        "body": {
          "text": "Thank you for the invitation. I'll be there.",
          "html": "<p>Thank you for the invitation. I'll be there.</p>"
        },
        "tone": "professional",
        "confidence": 0.92,
        "reasoning": "Accepts invitation with professional tone"
      },
      {
        "id": "uuid",
        "subject": "Re: Meeting Invitation",
        "body": {
          "text": "Thanks for including me. I can attend at the proposed time.",
          "html": "<p>Thanks for including me. I can attend at the proposed time.</p>"
        },
        "tone": "casual",
        "confidence": 0.87,
        "reasoning": "Casual acceptance with confirmation"
      }
    ],
    "originalEmail": {
      "subject": "Meeting Invitation",
      "summary": "Invitation to project review meeting"
    }
  }
}
```

### Smart Email Composition

**Endpoint:** `POST /api/ai/compose`

**Description:** AI-assisted email composition

**Request Body:**
- `prompt` (string, required): Description of email to compose
- `recipient` (string, optional): Recipient context
- `tone` (string, optional): professional, casual, friendly, formal
- `length` (string, optional): short, medium, long
- `purpose` (string, optional): inquiry, update, request, follow-up
- `context` (string, optional): Additional context

**Response:**
```json
{
  "success": true,
  "data": {
    "composition": {
      "subject": "Follow-up on Project Status",
      "body": {
        "text": "Hi John,\n\nI wanted to follow up on our discussion about the project timeline...",
        "html": "<p>Hi John,</p><p>I wanted to follow up on our discussion...</p>"
      },
      "tone": "professional",
      "confidence": 0.89,
      "suggestions": [
        "Consider adding specific deadline",
        "Mention next steps"
      ]
    }
  }
}
```

### Email Categorization

**Endpoint:** `POST /api/ai/categorize`

**Description:** Automatically categorize emails using AI

**Request Body:**
- `emailIds` (array, required): Email IDs to categorize
- `customCategories` (array, optional): Custom category options
- `usePersonalModel` (boolean, optional): Use personalized AI model

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "emailId": "uuid",
        "category": {
          "primary": "work",
          "secondary": "meeting",
          "confidence": 0.94
        },
        "suggestions": ["urgent", "follow-up"]
      }
    ]
  }
}
```

### Priority Detection

**Endpoint:** `POST /api/ai/priority`

**Description:** Detect email priority using AI analysis

**Request Body:**
- `emailIds` (array, required): Email IDs to analyze
- `userContext` (object, optional): User preferences and context

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "emailId": "uuid",
        "priority": {
          "level": "high",
          "score": 0.85,
          "confidence": 0.91,
          "reasons": [
            "Contains urgent keywords",
            "From important contact",
            "Short response time expected"
          ]
        }
      }
    ]
  }
}
```

### Get AI Preferences

**Endpoint:** `GET /api/ai/preferences`

**Description:** Get user's AI feature preferences

**Response:**
```json
{
  "success": true,
  "data": {
    "preferences": {
      "autoSummary": true,
      "autoCategory": true,
      "autoPriority": true,
      "autoReply": false,
      "smartNotifications": true,
      "replyTone": "professional",
      "summaryLength": "medium",
      "languagePreference": "en",
      "customCategories": ["urgent", "follow-up", "information"],
      "priorityThresholds": {
        "high": 0.8,
        "medium": 0.5,
        "low": 0.2
      }
    }
  }
}
```

### Update AI Preferences

**Endpoint:** `PATCH /api/ai/preferences`

**Description:** Update AI feature preferences

**Request Body:**
- `autoSummary` (boolean, optional): Enable automatic summaries
- `autoCategory` (boolean, optional): Enable automatic categorization
- `autoPriority` (boolean, optional): Enable automatic priority detection
- `autoReply` (boolean, optional): Enable reply suggestions
- `smartNotifications` (boolean, optional): Enable intelligent notifications
- `replyTone` (string, optional): Default reply tone
- `summaryLength` (string, optional): Default summary length
- `languagePreference` (string, optional): Preferred language
- `customCategories` (array, optional): Custom category list

### AI Usage Statistics

**Endpoint:** `GET /api/ai/usage`

**Description:** Get AI feature usage statistics

**Query Parameters:**
- `period` (string, optional): today, week, month, year
- `feature` (string, optional): Filter by specific AI feature

**Response:**
```json
{
  "success": true,
  "data": {
    "usage": {
      "period": "month",
      "summaries": {
        "generated": 150,
        "successful": 148,
        "avgProcessingTime": 1200
      },
      "categorization": {
        "emails": 500,
        "accuracy": 0.92
      },
      "replyAssistance": {
        "suggestions": 75,
        "accepted": 45,
        "acceptanceRate": 0.6
      },
      "quotaUsed": 725,
      "quotaLimit": 1000,
      "resetDate": "2024-02-01T00:00:00Z"
    }
  }
}
```

## Chatbot

### Send Chat Message

**Endpoint:** `POST /api/chat`

**Description:** Interact with AI chatbot for email assistance

**Request Body:**
- `message` (string, required): User message/query
- `context` (object, optional): Conversation context
  - `currentFolder` (string): Currently viewed folder
  - `selectedEmails` (array): Selected email IDs
  - `lastAction` (string): Previous action taken
- `sessionId` (string, optional): Chat session identifier
- `responseFormat` (string, optional): text, structured, actionable

**Response:**
```json
{
  "success": true,
  "data": {
    "response": {
      "id": "uuid",
      "message": "I found 15 unread emails from last week. Here are the most important ones:",
      "type": "structured",
      "actionTaken": "email_search",
      "data": {
        "emailCount": 15,
        "emails": [
          {
            "id": "uuid",
            "subject": "Urgent: Project Deadline",
            "from": "boss@company.com",
            "priority": "high"
          }
        ]
      },
      "responseTime": 1200,
      "suggestions": [
        {
          "text": "Mark all as read",
          "action": "bulk_mark_read",
          "emailIds": ["uuid1", "uuid2"]
        },
        {
          "text": "Show only high priority",
          "action": "filter_priority",
          "filter": "high"
        },
        {
          "text": "Archive old emails",
          "action": "bulk_archive",
          "criteria": "older_than_week"
        }
      ],
      "confidence": 0.92,
      "timestamp": "2024-01-01T12:00:00Z"
    },
    "session": {
      "id": "session_uuid",
      "messageCount": 5,
      "startedAt": "2024-01-01T11:45:00Z"
    }
  }
}
```

### Execute Chatbot Action

**Endpoint:** `POST /api/chat/actions/{actionId}`

**Description:** Execute an action suggested by the chatbot

**Request Body:**
- `parameters` (object, optional): Action-specific parameters

**Response:**
```json
{
  "success": true,
  "data": {
    "action": {
      "id": "action_uuid",
      "type": "bulk_mark_read",
      "status": "completed",
      "result": {
        "processed": 15,
        "successful": 15,
        "failed": 0
      },
      "executedAt": "2024-01-01T12:00:00Z"
    }
  }
}
```

### Get Chat History

**Endpoint:** `GET /api/chat/history`

**Description:** Retrieve conversation history with chatbot

**Query Parameters:**
- `sessionId` (string, optional): Specific session ID
- `limit` (number, optional): Number of messages (default: 50)
- `before` (string, optional): Get messages before this ID
- `includeActions` (boolean, optional): Include executed actions

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "uuid",
        "type": "user",
        "message": "Show me unread emails from last week",
        "timestamp": "2024-01-01T11:55:00Z"
      },
      {
        "id": "uuid",
        "type": "assistant",
        "message": "I found 15 unread emails from last week...",
        "actionTaken": "email_search",
        "suggestions": ["Mark all as read"],
        "timestamp": "2024-01-01T11:55:02Z"
      }
    ],
    "session": {
      "id": "session_uuid",
      "totalMessages": 10,
      "startedAt": "2024-01-01T11:30:00Z",
      "lastActivity": "2024-01-01T12:00:00Z"
    }
  }
}
```

### Provide Chatbot Feedback

**Endpoint:** `POST /api/chat/{interactionId}/feedback`

**Description:** Provide feedback on chatbot response

**Request Body:**
- `rating` (number, required): 1-5 star rating
- `feedback` (string, optional): Text feedback
- `helpful` (boolean, optional): Whether response was helpful
- `accurate` (boolean, optional): Whether response was accurate
- `categories` (array, optional): Feedback categories

**Response:**
```json
{
  "success": true,
  "message": "Feedback received. Thank you for helping improve our AI!"
}
```

### Get Chat Sessions

**Endpoint:** `GET /api/chat/sessions`

**Description:** List all chat sessions

**Query Parameters:**
- `limit` (number, optional): Number of sessions
- `active` (boolean, optional): Only active sessions

**Response:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "uuid",
        "messageCount": 12,
        "startedAt": "2024-01-01T10:00:00Z",
        "lastActivity": "2024-01-01T10:30:00Z",
        "isActive": false,
        "summary": "Email organization and filtering"
      }
    ]
  }
}
```

### Clear Chat Session

**Endpoint:** `DELETE /api/chat/sessions/{sessionId}`

**Description:** Clear/delete a chat session

## Search & Discovery

### Semantic Search

**Endpoint:** `GET /api/search`

**Description:** Advanced AI-powered search across emails

**Query Parameters:**
- `q` (string, required): Search query
- `type` (string, optional): semantic, keyword, advanced, fuzzy
- `accountId` (string, optional): Filter by account
- `folder` (string, optional): Filter by folder
- `dateRange` (string, optional): today, week, month, year, custom
- `startDate` (string, optional): Custom start date (ISO)
- `endDate` (string, optional): Custom end date (ISO)
- `from` (string, optional): Filter by sender
- `hasAttachments` (boolean, optional): Only emails with attachments
- `isRead` (boolean, optional): Filter by read status
- `priority` (string, optional): Filter by AI-detected priority
- `category` (string, optional): Filter by AI category
- `limit` (number, optional): Results limit (default: 20, max: 100)
- `offset` (number, optional): Results offset for pagination

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "type": "email",
        "email": {
          "id": "uuid",
          "subject": "Team Meeting Next Wednesday",
          "from": {
            "name": "Manager",
            "email": "manager@company.com"
          },
          "bodySnippet": "Let's schedule our weekly team meeting...",
          "sentAt": "2024-01-01T10:00:00Z",
          "relevanceScore": 0.95,
          "matchedText": "team meeting next week",
          "highlights": [
            "team <mark>meeting</mark> <mark>next</mark> Wednesday"
          ]
        }
      }
    ],
    "pagination": {
      "total": 42,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    },
    "searchMeta": {
      "query": "meeting next week",
      "searchType": "semantic",
      "searchTime": 150,
      "resultsFound": 42
    },
    "suggestions": [
      "meeting this week",
      "upcoming meetings",
      "team meetings"
    ],
    "filters": {
      "applied": ["dateRange:week"],
      "available": [
        {
          "type": "sender",
          "options": ["manager@company.com", "hr@company.com"]
        }
      ]
    }
  }
}
```

### Advanced Search

**Endpoint:** `POST /api/search/advanced`

**Description:** Complex search with multiple criteria

**Request Body:**
- `criteria` (array, required): Search criteria objects
  - `field` (string): subject, body, from, to, attachments
  - `operator` (string): contains, equals, starts_with, regex
  - `value` (string): Search value
  - `condition` (string): and, or, not
- `sorting` (object, optional): Sort options
- `groupBy` (string, optional): Group results by thread, date, sender

### Search Suggestions

**Endpoint:** `GET /api/search/suggestions`

**Description:** Get search suggestions and autocomplete

**Query Parameters:**
- `query` (string, required): Partial query
- `type` (string, optional): all, contacts, subjects, folders

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "text": "meeting with John",
        "type": "recent_search",
        "count": 15
      },
      {
        "text": "john@company.com",
        "type": "contact",
        "name": "John Smith"
      }
    ]
  }
}
```

### Save Search

**Endpoint:** `POST /api/search/saved`

**Description:** Save search query for quick access

**Request Body:**
- `name` (string, required): Search name
- `query` (string, required): Search query
- `filters` (object, optional): Applied filters
- `isPublic` (boolean, optional): Share with team

### Get Saved Searches

**Endpoint:** `GET /api/search/saved`

**Description:** List user's saved searches

### Search Analytics

**Endpoint:** `GET /api/search/analytics`

**Description:** Get search usage analytics

**Query Parameters:**
- `period` (string, optional): week, month, quarter

**Response:**
```json
{
  "success": true,
  "data": {
    "analytics": {
      "totalSearches": 150,
      "avgResultsFound": 12.5,
      "avgSearchTime": 180,
      "topQueries": [
        {
          "query": "project status",
          "count": 25
        }
      ],
      "searchTypes": {
        "semantic": 60,
        "keyword": 40
      }
    }
  }
}
```

## Billing & Subscriptions

### Get Subscription Status

**Endpoint:** `GET /api/billing/subscription`

**Description:** Get current subscription details and status

**Response:**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "sub_uuid",
      "stripeSubscriptionId": "sub_stripe123",
      "status": "active",
      "planId": "pro_monthly",
      "planName": "Pro Plan",
      "billingInterval": "month",
      "currentPeriodStart": "2024-01-01T00:00:00Z",
      "currentPeriodEnd": "2024-02-01T00:00:00Z",
      "cancelAtPeriodEnd": false,
      "trialEnd": null,
      "amount": 2999,
      "currency": "usd",
      "features": {
        "emailAccounts": 5,
        "monthlyEmails": 10000,
        "aiSummaries": 1000,
        "storage": "50GB",
        "prioritySupport": true
      }
    },
    "usage": {
      "emailsProcessed": 7500,
      "aiSummariesUsed": 650,
      "storageUsed": "32.5GB",
      "lastUpdated": "2024-01-15T10:00:00Z"
    }
  }
}
```

### Create Checkout Session

**Endpoint:** `POST /api/billing/checkout`

**Description:** Create Stripe checkout session for subscription

**Request Body:**
- `priceId` (string, required): Stripe price ID
- `planType` (string, required): monthly, yearly
- `successUrl` (string, required): Success redirect URL
- `cancelUrl` (string, required): Cancel redirect URL
- `couponCode` (string, optional): Discount coupon code
- `trialDays` (number, optional): Trial period days

**Response:**
```json
{
  "success": true,
  "data": {
    "checkoutSession": {
      "id": "cs_stripe123",
      "url": "https://checkout.stripe.com/pay/cs_stripe123",
      "sessionId": "cs_stripe123"
    }
  }
}
```

### Create Billing Portal Session

**Endpoint:** `POST /api/billing/portal`

**Description:** Create Stripe customer portal session

**Request Body:**
- `returnUrl` (string, required): Return URL after portal session

**Response:**
```json
{
  "success": true,
  "data": {
    "portalSession": {
      "url": "https://billing.stripe.com/session/123"
    }
  }
}
```

### Get Available Plans

**Endpoint:** `GET /api/billing/plans`

**Description:** Get all available subscription plans

**Response:**
```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "free",
        "name": "Free Plan",
        "price": 0,
        "interval": "month",
        "features": {
          "emailAccounts": 1,
          "monthlyEmails": 1000,
          "aiSummaries": 50,
          "storage": "5GB"
        }
      },
      {
        "id": "pro_monthly",
        "name": "Pro Plan",
        "price": 2999,
        "interval": "month",
        "popular": true,
        "features": {
          "emailAccounts": 5,
          "monthlyEmails": 10000,
          "aiSummaries": 1000,
          "storage": "50GB",
          "prioritySupport": true
        }
      }
    ]
  }
}
```

### Get Usage Summary

**Endpoint:** `GET /api/billing/usage`

**Description:** Get detailed usage statistics for billing

**Query Parameters:**
- `period` (string, optional): current_month, last_month, current_year

**Response:**
```json
{
  "success": true,
  "data": {
    "usage": {
      "period": "current_month",
      "periodStart": "2024-01-01T00:00:00Z",
      "periodEnd": "2024-01-31T23:59:59Z",
      "metrics": {
        "emailsProcessed": {
          "used": 7500,
          "limit": 10000,
          "unlimited": false
        },
        "aiSummaries": {
          "used": 650,
          "limit": 1000,
          "unlimited": false
        },
        "storage": {
          "used": "32.5GB",
          "limit": "50GB",
          "unlimited": false
        }
      },
      "overage": {
        "emailsProcessed": 0,
        "aiSummaries": 0,
        "additionalCharges": 0
      }
    }
  }
}
```

### Cancel Subscription

**Endpoint:** `POST /api/billing/subscription/cancel`

**Description:** Cancel subscription at period end

**Request Body:**
- `reason` (string, optional): Cancellation reason
- `feedback` (string, optional): User feedback
- `immediate` (boolean, optional): Cancel immediately vs. at period end

**Response:**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "id": "sub_uuid",
      "status": "active",
      "cancelAtPeriodEnd": true,
      "canceledAt": "2024-01-15T10:00:00Z",
      "currentPeriodEnd": "2024-02-01T00:00:00Z"
    }
  }
}
```

### Reactivate Subscription

**Endpoint:** `POST /api/billing/subscription/reactivate`

**Description:** Reactivate a canceled subscription

### Get Invoices

**Endpoint:** `GET /api/billing/invoices`

**Description:** Get subscription invoices

**Query Parameters:**
- `limit` (number, optional): Number of invoices (default: 10)
- `startingAfter` (string, optional): Pagination cursor

**Response:**
```json
{
  "success": true,
  "data": {
    "invoices": [
      {
        "id": "inv_stripe123",
        "number": "INV-2024-001",
        "amount": 2999,
        "currency": "usd",
        "status": "paid",
        "paidAt": "2024-01-01T10:00:00Z",
        "periodStart": "2024-01-01T00:00:00Z",
        "periodEnd": "2024-02-01T00:00:00Z",
        "downloadUrl": "https://invoice.stripe.com/inv_stripe123"
      }
    ],
    "hasMore": false
  }
}
```

### Stripe Webhook

**Endpoint:** `POST /api/billing/webhook`

**Description:** Handle Stripe webhook events (internal endpoint)

## Usage Analytics

### Get Usage Metrics

**Endpoint:** `GET /api/analytics/usage`

**Description:** Get comprehensive usage analytics

**Query Parameters:**
- `period` (string, optional): today, week, month, quarter, year
- `startDate` (string, optional): Custom start date (ISO)
- `endDate` (string, optional): Custom end date (ISO)
- `granularity` (string, optional): hour, day, week, month
- `metrics` (array, optional): Filter specific metrics

**Response:**
```json
{
  "success": true,
  "data": {
    "metrics": {
      "emailsProcessed": {
        "total": 15420,
        "change": 12.5,
        "trend": "up",
        "breakdown": [
          {
            "date": "2024-01-01",
            "value": 150
          }
        ]
      },
      "aiSummariesGenerated": {
        "total": 850,
        "change": -5.2,
        "trend": "down"
      },
      "chatbotInteractions": {
        "total": 125,
        "change": 23.1,
        "trend": "up"
      },
      "storageUsed": {
        "total": "45.2GB",
        "change": 8.7,
        "trend": "up"
      }
    },
    "period": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-31T23:59:59Z",
      "label": "January 2024"
    },
    "comparison": {
      "period": "previous_month",
      "label": "vs December 2023"
    }
  }
}
```

### Get Email Analytics

**Endpoint:** `GET /api/analytics/emails`

**Description:** Detailed email analytics and insights

**Query Parameters:**
- `accountId` (string, optional): Filter by account
- `period` (string, optional): Time period
- `breakdown` (string, optional): sender, recipient, time, category

**Response:**
```json
{
  "success": true,
  "data": {
    "analytics": {
      "totalEmails": 1250,
      "received": 980,
      "sent": 270,
      "readRate": 78.5,
      "responseRate": 65.2,
      "averageResponseTime": 7200,
      "topSenders": [
        {
          "email": "colleague@company.com",
          "count": 45,
          "name": "Colleague Name"
        }
      ],
      "emailsByHour": [
        {
          "hour": 9,
          "count": 85
        }
      ],
      "categoryBreakdown": {
        "work": 650,
        "personal": 200,
        "newsletter": 150,
        "promotions": 100
      }
    }
  }
}
```

### Get AI Analytics

**Endpoint:** `GET /api/analytics/ai`

**Description:** AI feature usage and performance analytics

**Response:**
```json
{
  "success": true,
  "data": {
    "analytics": {
      "summaries": {
        "generated": 850,
        "averageAccuracy": 0.92,
        "averageProcessingTime": 1200,
        "userSatisfactionScore": 4.2
      },
      "categorization": {
        "emailsCategorized": 1200,
        "accuracy": 0.89,
        "topCategories": ["work", "personal", "newsletter"]
      },
      "priorityDetection": {
        "emailsAnalyzed": 1100,
        "accuracy": 0.87,
        "highPriorityDetected": 125
      },
      "replyAssistance": {
        "suggestionsGenerated": 200,
        "suggestionsAccepted": 120,
        "acceptanceRate": 0.6
      }
    }
  }
}
```

### Export Analytics Data

**Endpoint:** `GET /api/analytics/export`

**Description:** Export analytics data in various formats

**Query Parameters:**
- `format` (string, required): csv, json, xlsx
- `period` (string, optional): Time period
- `metrics` (array, optional): Specific metrics to export
- `email` (string, optional): Email address to send export to

**Response:**
```json
{
  "success": true,
  "data": {
    "export": {
      "id": "export_uuid",
      "status": "processing",
      "format": "csv",
      "downloadUrl": null,
      "expiresAt": "2024-01-08T00:00:00Z",
      "estimatedSize": "2.5MB"
    }
  }
}
```

## Webhooks & Notifications

### List Webhooks

**Endpoint:** `GET /api/webhooks`

**Description:** Get all configured webhooks for the user

**Response:**
```json
{
  "success": true,
  "data": {
    "webhooks": [
      {
        "id": "webhook_uuid",
        "url": "https://your-app.com/webhook",
        "events": ["email.received", "email.sent", "thread.archived"],
        "isActive": true,
        "secret": "wh_sec_...",
        "createdAt": "2024-01-01T00:00:00Z",
        "lastTriggered": "2024-01-15T10:30:00Z",
        "successCount": 150,
        "failureCount": 2,
        "description": "Main application webhook"
      }
    ]
  }
}
```

### Create Webhook

**Endpoint:** `POST /api/webhooks`

**Description:** Create new webhook endpoint

**Request Body:**
- `url` (string, required): Webhook endpoint URL
- `events` (array, required): Event types to subscribe to
- `secret` (string, optional): Webhook secret for verification
- `description` (string, optional): Webhook description
- `isActive` (boolean, optional): Enable/disable webhook

**Available Events:**
- `email.received` - New email received
- `email.sent` - Email sent successfully
- `email.read` - Email marked as read
- `email.starred` - Email starred/unstarred
- `email.archived` - Email archived
- `thread.archived` - Thread archived
- `thread.completed` - Thread marked as done
- `ai.summary_generated` - AI summary created
- `ai.analysis_completed` - Email analysis finished
- `account.sync_started` - Account sync initiated
- `account.sync_completed` - Account sync finished
- `account.sync_failed` - Account sync failed
- `subscription.updated` - Subscription changed
- `usage.limit_reached` - Usage limit reached

**Response:**
```json
{
  "success": true,
  "data": {
    "webhook": {
      "id": "webhook_uuid",
      "url": "https://your-app.com/webhook",
      "events": ["email.received", "email.sent"],
      "secret": "wh_sec_generated123",
      "isActive": true
    }
  }
}
```

### Update Webhook

**Endpoint:** `PATCH /api/webhooks/{webhookId}`

**Description:** Update webhook configuration

**Request Body:**
- `url` (string, optional): New webhook URL
- `events` (array, optional): Updated event types
- `isActive` (boolean, optional): Enable/disable webhook
- `description` (string, optional): Updated description

### Test Webhook

**Endpoint:** `POST /api/webhooks/{webhookId}/test`

**Description:** Send test event to webhook endpoint

**Request Body:**
- `eventType` (string, optional): Specific event type to test

**Response:**
```json
{
  "success": true,
  "data": {
    "test": {
      "id": "test_uuid",
      "eventType": "webhook.test",
      "response": {
        "status": 200,
        "responseTime": 250,
        "headers": {
          "content-type": "application/json"
        }
      },
      "testedAt": "2024-01-15T12:00:00Z"
    }
  }
}
```

### Get Webhook Logs

**Endpoint:** `GET /api/webhooks/{webhookId}/logs`

**Description:** Get webhook delivery logs

**Query Parameters:**
- `limit` (number, optional): Number of logs (default: 50)
- `status` (string, optional): Filter by status (success, failed, pending)
- `eventType` (string, optional): Filter by event type

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log_uuid",
        "eventType": "email.received",
        "status": "success",
        "httpStatus": 200,
        "responseTime": 150,
        "attempts": 1,
        "payload": {
          "event": "email.received",
          "data": {...}
        },
        "response": {
          "status": 200,
          "body": "OK"
        },
        "deliveredAt": "2024-01-15T10:30:00Z"
      }
    ],
    "statistics": {
      "totalDeliveries": 150,
      "successfulDeliveries": 148,
      "failedDeliveries": 2,
      "averageResponseTime": 175
    }
  }
}
```

### Delete Webhook

**Endpoint:** `DELETE /api/webhooks/{webhookId}`

**Description:** Delete webhook endpoint

### Retry Failed Webhook

**Endpoint:** `POST /api/webhooks/{webhookId}/retry`

**Description:** Retry failed webhook deliveries

**Request Body:**
- `logIds` (array, optional): Specific log IDs to retry
- `maxAge` (string, optional): Retry attempts within time period

## Error Handling

### Error Response Format

All API errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email address format",
    "details": {
      "field": "email",
      "value": "invalid-email",
      "expected": "Valid email address"
    },
    "timestamp": "2024-01-01T12:00:00Z",
    "requestId": "req_uuid",
    "documentation": "https://docs.mailpilot.ai/errors/validation-error"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Category | Description |
|------|-------------|----------|-------------|
| `AUTHENTICATION_REQUIRED` | 401 | Authentication | Missing or invalid auth token |
| `AUTHENTICATION_FAILED` | 401 | Authentication | Invalid credentials |
| `AUTHORIZATION_DENIED` | 403 | Authorization | Insufficient permissions |
| `RESOURCE_NOT_FOUND` | 404 | Resource | Requested resource doesn't exist |
| `VALIDATION_ERROR` | 400 | Validation | Request validation failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Rate Limiting | Too many requests |
| `QUOTA_EXCEEDED` | 402 | Billing | Usage quota exceeded |
| `ACCOUNT_SYNC_ERROR` | 422 | Email | Email provider sync failed |
| `AI_SERVICE_ERROR` | 503 | AI | AI analysis service unavailable |
| `EXTERNAL_SERVICE_ERROR` | 502 | External | Third-party service error |
| `DATABASE_ERROR` | 500 | Database | Database operation failed |
| `INTERNAL_SERVER_ERROR` | 500 | System | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | System | Service temporarily unavailable |
| `MAINTENANCE_MODE` | 503 | System | System under maintenance |

### Validation Errors

Validation errors include detailed field-level information:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "errors": [
        {
          "field": "email",
          "message": "Invalid email format",
          "value": "invalid-email",
          "code": "EMAIL_INVALID"
        },
        {
          "field": "password",
          "message": "Password must be at least 8 characters",
          "code": "PASSWORD_TOO_SHORT"
        }
      ]
    }
  }
}
```

### Rate Limiting Errors

Rate limiting errors include retry information:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "details": {
      "limit": 100,
      "used": 100,
      "resetTime": "2024-01-01T13:00:00Z",
      "retryAfter": 3600
    }
  }
}
```

### Error Recovery

For transient errors (5xx codes):
- Implement exponential backoff
- Maximum 3 retries for failed requests
- Use jitter to avoid thundering herd
- Check service status page for outages

## Rate Limiting

### Rate Limit Overview

Rate limits are applied per user and vary by endpoint type:

| Endpoint Category | Limit | Window | Burst |
|------------------|-------|---------|-------|
| Authentication | 10/min | Per IP | 5 |
| User Operations | 100/min | Per User | 20 |
| Email Read | 1000/hour | Per User | 50 |
| Email Write | 200/hour | Per User | 10 |
| AI Features | 100/hour | Per User | 5 |
| Search | 500/hour | Per User | 25 |
| Chatbot | 50/hour | Per User | 10 |
| Webhooks | 50/min | Per Webhook | 10 |
| Analytics | 100/hour | Per User | 20 |

### Rate Limit Headers

All API responses include rate limiting headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1641024000
X-RateLimit-Burst: 20
X-RateLimit-Burst-Remaining: 18
```

### Rate Limit Exceeded Response

When rate limit is exceeded:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "details": {
      "limit": 100,
      "used": 100,
      "window": "hour",
      "resetTime": "2024-01-01T13:00:00Z",
      "retryAfter": 3600
    }
  }
}
```

### Best Practices

1. **Respect Rate Limits**: Monitor rate limit headers
2. **Implement Backoff**: Use exponential backoff on rate limit errors
3. **Cache Responses**: Cache frequently accessed data
4. **Batch Operations**: Use bulk endpoints when available
5. **Optimize Requests**: Minimize unnecessary API calls
6. **Monitor Usage**: Track API usage patterns
7. **Use Webhooks**: Reduce polling with webhook notifications

### Rate Limit Bypass

For enterprise customers, higher rate limits are available:

- Contact support for custom rate limits
- Dedicated IP allowlisting
- Premium support SLA
- Custom webhook delivery guarantees

---

## API Versioning

- Current version: `v1`
- Version header: `API-Version: v1`
- Backwards compatibility maintained for 12 months
- Deprecation notices provided 6 months in advance

## Authentication Details

### JWT Token Structure

```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "role": "user",
  "sessionId": "session_uuid",
  "iat": 1641024000,
  "exp": 1641025800,
  "iss": "mailpilot-ai",
  "aud": "mailpilot-users"
}
```

### Token Refresh

Access tokens expire in 15 minutes. Use refresh tokens to obtain new access tokens without re-authentication.

### Security Best Practices

- Store tokens securely
- Use HTTPS for all requests
- Implement proper logout
- Monitor for suspicious activity
- Rotate refresh tokens regularly

---

*For additional support and documentation, visit [docs.mailpilot.ai](https://docs.mailpilot.ai) or contact our support team.*
