/**
 * @fileoverview Email service type definitions
 * @description Type definitions for email service providers
 * @author MailPilot AI Team
 * @version 1.0.0
 */

/**
 * Supported email provider types
 */
export type EmailProviderType = "gmail" | "outlook" | "imap" | "custom";

/**
 * Email provider configuration interface
 */
export interface EmailProviderConfig {
  /** Provider type */
  type: EmailProviderType;

  /** Provider-specific configuration */
  credentials: {
    /** OAuth2 access token */
    accessToken?: string;
    /** OAuth2 refresh token */
    refreshToken?: string;
    /** Client ID for OAuth2 */
    clientId?: string;
    /** Client secret for OAuth2 */
    clientSecret?: string;
    /** IMAP/SMTP specific configs */
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    secure?: boolean;
  };

  /** Rate limiting configuration */
  rateLimit?: {
    requestsPerMinute: number;
    batchSize: number;
  };

  /** Sync configuration */
  sync?: {
    enabled: boolean;
    intervalMinutes: number;
    maxMessagesPerSync: number;
    syncHistoryDays: number;
  };
}

/**
 * Email message structure
 */
export interface EmailMessage {
  /** Unique message ID from provider */
  id: string;

  /** Thread ID */
  threadId: string;

  /** Internet Message ID */
  internetMessageId: string;

  /** Message subject */
  subject?: string;

  /** Sender information */
  from: EmailAddress;

  /** Recipients */
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];

  /** Message body */
  body?: {
    text?: string;
    html?: string;
  };

  /** Message snippet/preview */
  snippet?: string;

  /** Message timestamps */
  date: Date;
  receivedAt?: Date;
  sentAt?: Date;

  /** Message labels/folders */
  labels: string[];

  /** Message flags */
  flags: {
    isRead: boolean;
    isStarred: boolean;
    isImportant: boolean;
    isDraft: boolean;
    isArchived: boolean;
    isSpam: boolean;
    isTrash: boolean;
  };

  /** Attachments */
  attachments?: EmailAttachment[];

  /** Message headers */
  headers?: Record<string, string>;

  /** Provider-specific metadata */
  metadata?: Record<string, any>;
}

/**
 * Email address structure
 */
export interface EmailAddress {
  /** Email address */
  email: string;

  /** Display name */
  name?: string;
}

/**
 * Email attachment structure
 */
export interface EmailAttachment {
  /** Attachment ID */
  id: string;

  /** Filename */
  filename: string;

  /** MIME type */
  mimeType: string;

  /** File size in bytes */
  size: number;

  /** Content ID (for inline attachments) */
  contentId?: string;

  /** Whether attachment is inline */
  isInline: boolean;

  /** Attachment data (base64 encoded) */
  data?: string;
}

/**
 * Email thread structure
 */
export interface EmailThread {
  /** Thread ID */
  id: string;

  /** Messages in thread */
  messages: EmailMessage[];

  /** Thread snippet */
  snippet?: string;

  /** Last message date */
  lastMessageDate: Date;

  /** Number of messages */
  messageCount: number;

  /** Thread participants */
  participants: EmailAddress[];

  /** Thread labels */
  labels: string[];
}

/**
 * Email folder/label structure
 */
export interface EmailFolder {
  /** Folder ID */
  id: string;

  /** Folder name */
  name: string;

  /** Folder type */
  type:
    | "inbox"
    | "sent"
    | "drafts"
    | "trash"
    | "spam"
    | "archive"
    | "label"
    | "folder";

  /** Parent folder ID */
  parentId?: string;

  /** Message count */
  messageCount?: number;

  /** Unread message count */
  unreadCount?: number;
}

/**
 * Email account information
 */
export interface EmailAccount {
  /** Account ID */
  id: string;

  /** Email address */
  emailAddress: string;

  /** Account name/label */
  name?: string;

  /** Provider type */
  provider: EmailProviderType;

  /** Account status */
  status: "active" | "inactive" | "error" | "syncing";

  /** Last sync timestamp */
  lastSyncAt?: Date;

  /** Sync error if any */
  syncError?: string;

  /** Account folders */
  folders: EmailFolder[];
}

/**
 * Email sync result
 */
export interface EmailSyncResult {
  /** Account ID */
  accountId: string;

  /** Sync status */
  status: "success" | "error" | "partial";

  /** Sync statistics */
  stats: {
    messagesProcessed: number;
    messagesAdded: number;
    messagesUpdated: number;
    messagesDeleted: number;
    threadsProcessed: number;
    syncDuration: number;
  };

  /** Next delta token for incremental sync */
  nextDeltaToken?: string;

  /** Sync errors */
  errors?: Array<{
    messageId?: string;
    error: string;
    details?: any;
  }>;

  /** Sync timestamp */
  syncedAt: Date;
}

/**
 * Email search query
 */
export interface EmailSearchQuery {
  /** Search terms */
  query?: string;

  /** Search in specific folder */
  folderId?: string;

  /** Filter by sender */
  from?: string;

  /** Filter by recipient */
  to?: string;

  /** Filter by subject */
  subject?: string;

  /** Date range */
  dateRange?: {
    start?: Date;
    end?: Date;
  };

  /** Filter by read status */
  isRead?: boolean;

  /** Filter by starred status */
  isStarred?: boolean;

  /** Filter by labels */
  labels?: string[];

  /** Include attachments only */
  hasAttachments?: boolean;

  /** Maximum results */
  maxResults?: number;

  /** Pagination token */
  pageToken?: string;
}

/**
 * Base email provider interface
 */
export interface EmailProvider {
  /** Provider type identifier */
  readonly type: EmailProviderType;

  /** Provider configuration */
  readonly config: EmailProviderConfig;

  /**
   * Initialize the provider
   */
  initialize(): Promise<void>;

  /**
   * Authenticate with the email service
   */
  authenticate(): Promise<boolean>;

  /**
   * Check if provider is healthy/available
   */
  healthCheck(): Promise<boolean>;

  /**
   * Get account information
   */
  getAccount(): Promise<EmailAccount>;

  /**
   * List folders/labels
   */
  listFolders(): Promise<EmailFolder[]>;

  /**
   * List messages in a folder
   */
  listMessages(
    folderId: string,
    options?: {
      maxResults?: number;
      pageToken?: string;
    }
  ): Promise<{
    messages: EmailMessage[];
    nextPageToken?: string;
  }>;

  /**
   * Get specific message
   */
  getMessage(messageId: string): Promise<EmailMessage>;

  /**
   * Get message thread
   */
  getThread(threadId: string): Promise<EmailThread>;

  /**
   * Search messages
   */
  searchMessages(query: EmailSearchQuery): Promise<{
    messages: EmailMessage[];
    nextPageToken?: string;
    estimatedTotal?: number;
  }>;

  /**
   * Send new message
   */
  sendMessage(message: {
    to: EmailAddress[];
    cc?: EmailAddress[];
    bcc?: EmailAddress[];
    subject: string;
    body: {
      text?: string;
      html?: string;
    };
    attachments?: EmailAttachment[];
    threadId?: string;
  }): Promise<EmailMessage>;

  /**
   * Update message (mark as read, star, etc.)
   */
  updateMessage(
    messageId: string,
    updates: {
      isRead?: boolean;
      isStarred?: boolean;
      isImportant?: boolean;
      labels?: {
        add?: string[];
        remove?: string[];
      };
    }
  ): Promise<EmailMessage>;

  /**
   * Delete message
   */
  deleteMessage(messageId: string): Promise<void>;

  /**
   * Sync messages from the provider
   */
  syncMessages(options?: {
    deltaToken?: string;
    maxResults?: number;
    folderId?: string;
  }): Promise<EmailSyncResult>;

  /**
   * Create webhook for real-time updates
   */
  createWebhook?(callbackUrl: string): Promise<{
    webhookId: string;
    expiresAt: Date;
  }>;

  /**
   * Cleanup resources
   */
  dispose(): Promise<void>;
}
