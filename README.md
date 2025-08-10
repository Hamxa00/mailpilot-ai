# MailPilot AI

**An AI-Powered Email Client for the Modern Workspace**

MailPilot AI is a cutting-edge email client that leverages artificial intelligence to transform how you manage your inbox. Built with modern technologies and designed for scalability, it provides intelligent email processing, smart categorization, automated responses, and seamless integration with popular email providers.

## 🚀 Project Overview

### Purpose

MailPilot AI aims to solve the problem of email overwhelm by providing:

- **Intelligent Email Processing**: AI-powered email summarization and categorization
- **Smart Automation**: Automated replies, sorting, and priority detection
- **Semantic Search**: Advanced search capabilities using AI-powered semantic understanding
- **Multi-Account Management**: Seamless handling of multiple email accounts
- **Modern Interface**: Clean, distraction-free UI built with Next.js and shadcn/ui

### Key Features

- 🤖 **AI-Powered Email Analysis**: Automatic summarization, sentiment analysis, and priority detection
- 📧 **Multi-Provider Support**: Gmail, Outlook, and other IMAP/SMTP providers
- 🔍 **Semantic Search**: Find emails using natural language queries
- 🎯 **Smart Categorization**: Automatic email sorting and labeling
- 📊 **Usage Analytics**: Track email patterns and productivity metrics
- 💳 **SaaS-Ready**: Built-in subscription management with Stripe
- 🔐 **Secure Authentication**: Supabase auth with Google OAuth integration

## 🏗️ Tech Stack

### Frontend

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **shadcn/ui** - Modern UI components
- **Tailwind CSS** - Utility-first styling

### Backend & Database

- **Supabase** - Backend-as-a-Service with PostgreSQL
- **Drizzle ORM** - Type-safe database queries
- **Prisma** - Database migrations and tooling (optional)

### AI & External Services

- **Google Gemini** - AI for email analysis and chatbot
- **Gmail API** - Email provider integration
- **Stripe** - Payment processing
- **Google OAuth** - Authentication

### Infrastructure

- **Vercel** - Deployment and hosting
- **Redis** - Caching and session management (optional)

## 📁 Project Structure

```
mailpilot-ai/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   ├── auth/              # Authentication pages
│   │   ├── dashboard/         # Main application
│   │   └── settings/          # User settings
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui components
│   │   └── shared/           # Shared components
│   ├── db/                   # Database layer
│   │   ├── schema/           # Drizzle schema definitions
│   │   ├── migrations/       # Database migrations
│   │   └── types.ts          # TypeScript types
│   ├── src/lib/
        ├── index.ts                    # Main exports
        ├── auth/                       # Authentication & Authorization
        │   ├── index.ts
        │   ├── authentication.ts       # Auth logic
        │   ├── authorization.ts        # Access control
        │   └── middleware.ts          # Auth middleware
        ├── api/                        # API utilities
        │   ├── index.ts
        │   ├── handler.ts             # Base API handler
        │   ├── responses.ts           # Response utilities
        │   └── middleware.ts          # API middleware
        ├── database/                   # Database utilities
        │   ├── index.ts
        │   ├── connection.ts          # DB connection
        │   ├── repository.ts          # Base repository
        │   └── transactions.ts        # Transaction utilities
        ├── validation/                 # Input validation
        │   ├── index.ts
        │   ├── schemas/               # Validation schemas
        │   │   ├── index.ts
        │   │   ├── common.ts
        │   │   ├── user.ts
        │   │   ├── email.ts
        │   │   └── ai.ts
        │   └── validator.ts           # Validation utilities
        ├── errors/                     # Error handling
        │   ├── index.ts
        │   ├── codes.ts               # Error codes
        │   ├── classes.ts             # Error classes
        │   └── handler.ts             # Error handler
        ├── logging/                    # Logging system
        │   ├── index.ts
        │   ├── logger.ts              # Logger configuration
        │   └── utilities.ts           # Logging utilities
        ├── security/                   # Security utilities
        │   ├── index.ts
        │   ├── rate-limiter.ts        # Rate limiting
        │   └── encryption.ts          # Encryption utilities
        ├── external/                   # External service integrations
        │   ├── index.ts
        │   ├── supabase.ts            # Supabase client
        │   ├── openai.ts              # AI service
        │   └── email-providers.ts     # Email providers
        └── documentation/              # API documentation
            ├── index.ts
            ├── swagger.ts             # Swagger config
            └── schemas.ts             # OpenAPI schemas
│   └── hooks/               # Custom React hooks
├── docs/                    # Project documentation
├── public/                  # Static assets
└── tests/                   # Test files
```

## 🗃️ Database Schema Overview

### Core Tables

#### **Users & Authentication**

- **`user`** - User profiles and account information
- **`account`** - Email account connections (Gmail, Outlook, etc.)
- **`stripe_subscription`** - Billing and subscription management

#### **Email Management**

- **`thread`** - Email conversation threads
- **`email`** - Individual email messages
- **`email_address`** - Email addresses and contacts
- **`email_recipient`** - To/CC/BCC relationships
- **`email_attachment`** - File attachments
- **`email_folder`** - Custom folders and labels

#### **AI Features**

- **`ai_preference`** - User AI settings and preferences
- **`ai_email_summary`** - AI-generated email summaries and analysis
- **`chatbot_interaction`** - Chatbot conversations and feedback

#### **Analytics & Monitoring**

- **`usage_metric`** - Usage tracking for billing and analytics

### Key Relationships

- Users can have multiple email accounts
- Each account contains threads and folders
- Threads contain multiple emails
- Emails can have multiple recipients and attachments
- AI summaries are generated per email per user

## 🔧 Database Schema Files

### `/src/db/schema/`

| File                        | Purpose            | Description                                                        |
| --------------------------- | ------------------ | ------------------------------------------------------------------ |
| **`user.ts`**               | User Management    | Core user profiles, authentication, and account status             |
| **`account.ts`**            | Email Accounts     | Connected email providers (Gmail, Outlook, etc.) with OAuth tokens |
| **`thread.ts`**             | Email Threads      | Conversation threads with status tracking and metadata             |
| **`email.ts`**              | Email Messages     | Individual emails with full content and metadata                   |
| **`emailAddress.ts`**       | Contact Management | Email addresses and contact information                            |
| **`emailRecipient.ts`**     | Recipient Mapping  | To/CC/BCC relationships for emails                                 |
| **`emailAttachment.ts`**    | File Attachments   | Email attachments with virus scanning support                      |
| **`emailFolder.ts`**        | Folder Management  | Custom folders, labels, and organization                           |
| **`aiPreference.ts`**       | AI Settings        | User preferences for AI features and automation                    |
| **`aiEmailSummary.ts`**     | AI Analysis        | AI-generated summaries, sentiment, and insights                    |
| **`chatbotInteraction.ts`** | Chatbot History    | User interactions with the AI assistant                            |
| **`stripeSubscription.ts`** | Billing Management | Stripe subscription and payment tracking                           |
| **`usageMetric.ts`**        | Analytics Data     | Usage tracking for billing and performance monitoring              |
| **`index.ts`**              | Schema Exports     | Central export file for all schema definitions                     |

### Database Files

| File                    | Purpose              | Description                                |
| ----------------------- | -------------------- | ------------------------------------------ |
| **`index.ts`**          | Database Connection  | Main database connection and configuration |
| **`types.ts`**          | TypeScript Types     | Generated types from Drizzle schema        |
| **`indexes.sql`**       | Performance Indexes  | Database indexes for query optimization    |
| **`drizzle-client.ts`** | Client Configuration | Drizzle ORM client setup                   |

## 🌟 Features by Schema

### 👤 User Management (`user.ts`)

- **User Profiles**: Name, email, profile pictures
- **Account Status**: Active/inactive, email verification
- **Role Management**: User roles and permissions
- **Audit Trails**: Creation and last login tracking

### 📧 Email Processing (`email.ts`, `thread.ts`)

- **Multi-Provider Support**: Gmail, Outlook, IMAP/SMTP
- **Thread Management**: Conversation tracking and organization
- **Status Tracking**: Read/unread, starred, important flags
- **Rich Content**: HTML emails, attachments, inline images
- **Metadata Storage**: Headers, labels, classifications

### 🤖 AI Intelligence (`aiEmailSummary.ts`, `aiPreference.ts`)

- **Smart Summaries**: AI-generated email summaries
- **Sentiment Analysis**: Emotion and tone detection
- **Priority Scoring**: Intelligent importance ranking
- **Action Items**: Extracted tasks and deadlines
- **Custom Preferences**: User-configurable AI behavior

### 💬 Chatbot Integration (`chatbotInteraction.ts`)

- **Natural Language Queries**: Semantic search for emails
- **Command Processing**: Email actions via chat interface
- **Feedback Loop**: User satisfaction tracking
- **Usage Analytics**: Interaction patterns and performance

### 💳 SaaS Features (`stripeSubscription.ts`, `usageMetric.ts`)

- **Subscription Management**: Multiple pricing tiers
- **Usage Tracking**: API calls, emails processed, storage used
- **Billing Integration**: Stripe payment processing
- **Analytics**: Usage patterns and performance metrics

## 🔍 Search & Performance

### Full-Text Search

- **Email Content**: Subject and body text search
- **Semantic Search**: AI-powered natural language queries
- **Metadata Search**: Labels, folders, dates, senders

### Optimization Features

- **Database Indexes**: 50+ optimized indexes for common queries
- **Caching Strategy**: Redis for frequently accessed data
- **Lazy Loading**: Efficient email content loading
- **Background Processing**: Async AI analysis and sync

## 📊 Analytics & Monitoring

### User Analytics

- **Email Patterns**: Sending/receiving trends
- **AI Usage**: Feature adoption and effectiveness
- **Performance Metrics**: Response times and user satisfaction

### System Monitoring

- **API Usage**: Rate limiting and quota management
- **Error Tracking**: System health and reliability
- **Performance**: Database query optimization

## 🔐 Security Features

### Data Protection

- **Encryption**: End-to-end encryption for sensitive data
- **Access Control**: Role-based permissions
- **Audit Logging**: Security event tracking
- **Compliance**: GDPR and SOC2 compliance ready

### Authentication

- **OAuth Integration**: Google, Microsoft authentication
- **Session Management**: Secure token handling
- **Multi-Factor Auth**: Additional security layers (future)

## 🚀 Getting Started

See the [Getting Started Guide](./docs/getting-started.md) for detailed setup instructions.

## 📚 Documentation

- [API Documentation](./docs/api/README.md)
- [Database Schema](./docs/database/README.md)
- [AI Integration](./docs/ai/README.md)
- [Deployment Guide](./docs/deployment/README.md)

## 🤝 Contributing

See [Contributing Guidelines](./docs/CONTRIBUTING.md) for development setup and contribution process.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
