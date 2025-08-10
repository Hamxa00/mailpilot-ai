/**
 * @fileoverview Gmail API provider implementation
 * @description Gmail service integration for MailPilot AI
 * @author MailPilot AI Team
 * @version 1.0.0
 */

import { google, gmail_v1 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { logger, measureAsync, logExternalService } from "../logging";
import { ExternalServiceError } from "../errors";
import type {
  EmailProvider,
  EmailProviderConfig,
  EmailMessage,
  EmailThread,
  EmailFolder,
  EmailAccount,
  EmailSyncResult,
  EmailAddress,
  EmailAttachment,
  EmailSearchQuery,
} from "./types/email-types";

/**
 * Gmail provider implementation using Google APIs
 */
export class GmailProvider implements EmailProvider {
  public readonly type = "gmail" as const;
  public readonly config: EmailProviderConfig;

  private oauth2Client: OAuth2Client | null = null;
  private gmail: gmail_v1.Gmail | null = null;
  private initialized = false;

  constructor(config: EmailProviderConfig) {
    this.config = config;
  }

  /**
   * Initialize the Gmail provider
   */
  public async initialize(): Promise<void> {
    try {
      if (this.initialized) return;

      const { clientId, clientSecret, accessToken, refreshToken } =
        this.config.credentials;

      if (!clientId || !clientSecret) {
        throw new Error("Gmail OAuth2 credentials are required");
      }

      this.oauth2Client = new OAuth2Client(clientId, clientSecret);

      if (accessToken) {
        this.oauth2Client.setCredentials({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      }

      this.gmail = google.gmail({ version: "v1", auth: this.oauth2Client });
      this.initialized = true;

      logger.info("Gmail provider initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize Gmail provider", {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Authenticate with Gmail
   */
  public async authenticate(): Promise<boolean> {
    try {
      if (!this.oauth2Client) {
        await this.initialize();
      }

      // Try to refresh token if we have one
      if (this.config.credentials.refreshToken) {
        const { credentials } = await this.oauth2Client!.refreshAccessToken();
        this.oauth2Client!.setCredentials(credentials);
        return true;
      }

      return !!this.config.credentials.accessToken;
    } catch (error) {
      logger.error("Gmail authentication failed", {
        error: error instanceof Error ? error.message : error,
      });
      return false;
    }
  }

  /**
   * Check if Gmail service is healthy
   */
  public async healthCheck(): Promise<boolean> {
    try {
      if (!this.initialized || !this.gmail) {
        await this.initialize();
      }

      await this.gmail!.users.getProfile({ userId: "me" });
      return true;
    } catch (error) {
      logger.warn("Gmail health check failed", {
        error: error instanceof Error ? error.message : error,
      });
      return false;
    }
  }

  /**
   * Get Gmail account information
   */
  public async getAccount(): Promise<EmailAccount> {
    return measureAsync(
      "gmail_get_account",
      async () => {
        if (!this.gmail) {
          await this.initialize();
        }

        const profile = await this.gmail!.users.getProfile({ userId: "me" });
        const folders = await this.listFolders();

        return {
          id: profile.data.emailAddress!,
          emailAddress: profile.data.emailAddress!,
          name: profile.data.emailAddress || undefined,
          provider: "gmail",
          status: "active",
          lastSyncAt: new Date(),
          folders,
        };
      },
      { provider: "gmail", operation: "get_account" }
    );
  }

  /**
   * List Gmail labels (folders)
   */
  public async listFolders(): Promise<EmailFolder[]> {
    return measureAsync(
      "gmail_list_folders",
      async () => {
        if (!this.gmail) {
          await this.initialize();
        }

        const response = await this.gmail!.users.labels.list({ userId: "me" });
        const labels = response.data.labels || [];

        return labels.map((label): EmailFolder => {
          const type = this.mapLabelToFolderType(label.id!);
          return {
            id: label.id!,
            name: label.name!,
            type,
            messageCount: label.messagesTotal || undefined,
            unreadCount: label.messagesUnread || undefined,
          };
        });
      },
      { provider: "gmail", operation: "list_folders" }
    );
  }

  /**
   * List messages in a folder
   */
  public async listMessages(
    folderId: string,
    options: { maxResults?: number; pageToken?: string } = {}
  ): Promise<{ messages: EmailMessage[]; nextPageToken?: string }> {
    return measureAsync(
      "gmail_list_messages",
      async () => {
        if (!this.gmail) {
          await this.initialize();
        }

        const { maxResults = 50, pageToken } = options;

        const response = await this.gmail!.users.messages.list({
          userId: "me",
          labelIds: [folderId],
          maxResults,
          pageToken,
        });

        const messageList = response.data.messages || [];
        const messages: EmailMessage[] = [];

        // Batch get message details
        for (const msg of messageList) {
          try {
            const message = await this.getMessage(msg.id!);
            messages.push(message);
          } catch (error) {
            logger.warn("Failed to fetch Gmail message", {
              messageId: msg.id,
              error: error instanceof Error ? error.message : error,
            });
          }
        }

        return {
          messages,
          nextPageToken: response.data.nextPageToken || undefined,
        };
      },
      { provider: "gmail", operation: "list_messages", folderId }
    );
  }

  /**
   * Get specific Gmail message
   */
  public async getMessage(messageId: string): Promise<EmailMessage> {
    return measureAsync(
      "gmail_get_message",
      async () => {
        if (!this.gmail) {
          await this.initialize();
        }

        const response = await this.gmail!.users.messages.get({
          userId: "me",
          id: messageId,
          format: "full",
        });

        const message = response.data;
        return this.parseGmailMessage(message);
      },
      { provider: "gmail", operation: "get_message", messageId }
    );
  }

  /**
   * Get Gmail thread
   */
  public async getThread(threadId: string): Promise<EmailThread> {
    return measureAsync(
      "gmail_get_thread",
      async () => {
        if (!this.gmail) {
          await this.initialize();
        }

        const response = await this.gmail!.users.threads.get({
          userId: "me",
          id: threadId,
          format: "full",
        });

        const thread = response.data;
        const messages =
          thread.messages?.map((msg) => this.parseGmailMessage(msg)) || [];

        // Extract participants
        const participantEmails = new Set<string>();
        messages.forEach((msg) => {
          participantEmails.add(msg.from.email);
          msg.to.forEach((addr) => participantEmails.add(addr.email));
          msg.cc?.forEach((addr) => participantEmails.add(addr.email));
        });

        const participants: EmailAddress[] = Array.from(participantEmails).map(
          (email) => ({ email })
        );

        return {
          id: threadId,
          messages,
          snippet: thread.snippet || "",
          lastMessageDate: messages[messages.length - 1]?.date || new Date(),
          messageCount: messages.length,
          participants,
          labels: messages[0]?.labels || [],
        };
      },
      { provider: "gmail", operation: "get_thread", threadId }
    );
  }

  /**
   * Search Gmail messages
   */
  public async searchMessages(query: EmailSearchQuery): Promise<{
    messages: EmailMessage[];
    nextPageToken?: string;
    estimatedTotal?: number;
  }> {
    return measureAsync(
      "gmail_search_messages",
      async () => {
        if (!this.gmail) {
          await this.initialize();
        }

        const gmailQuery = this.buildGmailSearchQuery(query);

        const response = await this.gmail!.users.messages.list({
          userId: "me",
          q: gmailQuery,
          maxResults: query.maxResults || 50,
          pageToken: query.pageToken,
        });

        const messageList = response.data.messages || [];
        const messages: EmailMessage[] = [];

        // Batch get message details
        for (const msg of messageList) {
          try {
            const message = await this.getMessage(msg.id!);
            messages.push(message);
          } catch (error) {
            logger.warn("Failed to fetch Gmail search result", {
              messageId: msg.id,
              error: error instanceof Error ? error.message : error,
            });
          }
        }

        return {
          messages,
          nextPageToken: response.data.nextPageToken || undefined,
          estimatedTotal: response.data.resultSizeEstimate || undefined,
        };
      },
      { provider: "gmail", operation: "search_messages" }
    );
  }

  /**
   * Send Gmail message
   */
  public async sendMessage(message: {
    to: EmailAddress[];
    cc?: EmailAddress[];
    bcc?: EmailAddress[];
    subject: string;
    body: { text?: string; html?: string };
    attachments?: EmailAttachment[];
    threadId?: string;
  }): Promise<EmailMessage> {
    return measureAsync(
      "gmail_send_message",
      async () => {
        if (!this.gmail) {
          await this.initialize();
        }

        // Build the email message
        const emailMessage = this.buildEmailMessage(message);

        const response = await this.gmail!.users.messages.send({
          userId: "me",
          requestBody: {
            raw: emailMessage,
            threadId: message.threadId,
          },
        });

        // Fetch the sent message details
        return this.getMessage(response.data.id!);
      },
      { provider: "gmail", operation: "send_message" }
    );
  }

  /**
   * Update Gmail message
   */
  public async updateMessage(
    messageId: string,
    updates: {
      isRead?: boolean;
      isStarred?: boolean;
      isImportant?: boolean;
      labels?: { add?: string[]; remove?: string[] };
    }
  ): Promise<EmailMessage> {
    return measureAsync(
      "gmail_update_message",
      async () => {
        if (!this.gmail) {
          await this.initialize();
        }

        const labelsToAdd: string[] = [];
        const labelsToRemove: string[] = [];

        // Handle read status
        if (updates.isRead !== undefined) {
          if (updates.isRead) {
            labelsToRemove.push("UNREAD");
          } else {
            labelsToAdd.push("UNREAD");
          }
        }

        // Handle starred status
        if (updates.isStarred !== undefined) {
          if (updates.isStarred) {
            labelsToAdd.push("STARRED");
          } else {
            labelsToRemove.push("STARRED");
          }
        }

        // Handle important status
        if (updates.isImportant !== undefined) {
          if (updates.isImportant) {
            labelsToAdd.push("IMPORTANT");
          } else {
            labelsToRemove.push("IMPORTANT");
          }
        }

        // Handle custom labels
        if (updates.labels?.add) {
          labelsToAdd.push(...updates.labels.add);
        }
        if (updates.labels?.remove) {
          labelsToRemove.push(...updates.labels.remove);
        }

        // Apply label changes
        if (labelsToAdd.length > 0 || labelsToRemove.length > 0) {
          await this.gmail!.users.messages.modify({
            userId: "me",
            id: messageId,
            requestBody: {
              addLabelIds: labelsToAdd.length > 0 ? labelsToAdd : undefined,
              removeLabelIds:
                labelsToRemove.length > 0 ? labelsToRemove : undefined,
            },
          });
        }

        // Return updated message
        return this.getMessage(messageId);
      },
      { provider: "gmail", operation: "update_message", messageId }
    );
  }

  /**
   * Delete Gmail message
   */
  public async deleteMessage(messageId: string): Promise<void> {
    return measureAsync(
      "gmail_delete_message",
      async () => {
        if (!this.gmail) {
          await this.initialize();
        }

        await this.gmail!.users.messages.delete({
          userId: "me",
          id: messageId,
        });
      },
      { provider: "gmail", operation: "delete_message", messageId }
    );
  }

  /**
   * Sync messages from Gmail
   */
  public async syncMessages(
    options: {
      deltaToken?: string;
      maxResults?: number;
      folderId?: string;
    } = {}
  ): Promise<EmailSyncResult> {
    return measureAsync(
      "gmail_sync_messages",
      async () => {
        const startTime = Date.now();
        const stats = {
          messagesProcessed: 0,
          messagesAdded: 0,
          messagesUpdated: 0,
          messagesDeleted: 0,
          threadsProcessed: 0,
          syncDuration: 0,
        };

        try {
          if (!this.gmail) {
            await this.initialize();
          }

          // Use history API for incremental sync if delta token is provided
          if (options.deltaToken) {
            const historyResponse = await this.gmail!.users.history.list({
              userId: "me",
              startHistoryId: options.deltaToken,
              maxResults: options.maxResults || 500,
            });

            const histories = historyResponse.data.history || [];

            for (const history of histories) {
              if (history.messages) {
                stats.messagesProcessed += history.messages.length;
                // Process messages based on history type
                // This would involve checking if messages were added, modified, or deleted
              }
            }

            stats.syncDuration = Date.now() - startTime;

            return {
              accountId: (await this.getAccount()).id,
              status: "success",
              stats,
              nextDeltaToken: historyResponse.data.historyId?.toString(),
              syncedAt: new Date(),
            };
          }

          // Full sync - list all messages in specified folder or inbox
          const folderId = options.folderId || "INBOX";
          const messagesResponse = await this.listMessages(folderId, {
            maxResults: options.maxResults || 100,
          });

          stats.messagesProcessed = messagesResponse.messages.length;
          stats.messagesAdded = messagesResponse.messages.length; // Assume all are new for full sync
          stats.syncDuration = Date.now() - startTime;

          // Get current history ID for next incremental sync
          const profile = await this.gmail!.users.getProfile({ userId: "me" });

          return {
            accountId: (await this.getAccount()).id,
            status: "success",
            stats,
            nextDeltaToken: profile.data.historyId?.toString(),
            syncedAt: new Date(),
          };
        } catch (error) {
          stats.syncDuration = Date.now() - startTime;

          logger.error("Gmail sync failed", {
            error: error instanceof Error ? error.message : error,
          });

          return {
            accountId: (await this.getAccount()).id,
            status: "error",
            stats,
            errors: [
              {
                error: error instanceof Error ? error.message : "Unknown error",
                details: error,
              },
            ],
            syncedAt: new Date(),
          };
        }
      },
      { provider: "gmail", operation: "sync_messages" }
    );
  }

  /**
   * Create Gmail webhook (watch)
   */
  public async createWebhook(callbackUrl: string): Promise<{
    webhookId: string;
    expiresAt: Date;
  }> {
    if (!this.gmail) {
      await this.initialize();
    }

    const response = await this.gmail!.users.watch({
      userId: "me",
      requestBody: {
        topicName: process.env.GMAIL_PUBSUB_TOPIC!,
        labelIds: ["INBOX"], // Watch inbox by default
      },
    });

    return {
      webhookId: response.data.historyId!,
      expiresAt: new Date(parseInt(response.data.expiration!) * 1000),
    };
  }

  /**
   * Cleanup resources
   */
  public async dispose(): Promise<void> {
    try {
      this.oauth2Client = null;
      this.gmail = null;
      this.initialized = false;

      logger.info("Gmail provider disposed successfully");
    } catch (error) {
      logger.warn("Error disposing Gmail provider", {
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  // Private helper methods

  /**
   * Parse Gmail message into our format
   */
  private parseGmailMessage(message: gmail_v1.Schema$Message): EmailMessage {
    const headers = message.payload?.headers || [];
    const headerMap = new Map(
      headers.map((h) => [h.name!.toLowerCase(), h.value!])
    );

    const subject = headerMap.get("subject") || "";
    const fromHeader = headerMap.get("from") || "";
    const toHeader = headerMap.get("to") || "";
    const ccHeader = headerMap.get("cc") || "";
    const dateHeader = headerMap.get("date") || "";

    // Parse email addresses
    const from = this.parseEmailAddress(fromHeader);
    const to = this.parseEmailAddresses(toHeader);
    const cc = this.parseEmailAddresses(ccHeader);

    // Extract body
    const { text, html } = this.extractMessageBody(message.payload!);

    return {
      id: message.id!,
      threadId: message.threadId!,
      internetMessageId: headerMap.get("message-id") || message.id!,
      subject,
      from,
      to,
      cc: cc.length > 0 ? cc : undefined,
      body: { text, html },
      snippet: message.snippet || undefined,
      date: new Date(dateHeader),
      labels: message.labelIds || [],
      flags: {
        isRead: !message.labelIds?.includes("UNREAD"),
        isStarred: message.labelIds?.includes("STARRED") || false,
        isImportant: message.labelIds?.includes("IMPORTANT") || false,
        isDraft: message.labelIds?.includes("DRAFT") || false,
        isArchived: !message.labelIds?.includes("INBOX"),
        isSpam: message.labelIds?.includes("SPAM") || false,
        isTrash: message.labelIds?.includes("TRASH") || false,
      },
      attachments: this.extractAttachments(message.payload!),
      headers: Object.fromEntries(headerMap),
      metadata: {
        internalDate: message.internalDate,
        sizeEstimate: message.sizeEstimate,
      },
    };
  }

  /**
   * Extract message body from Gmail payload
   */
  private extractMessageBody(payload: gmail_v1.Schema$MessagePart): {
    text?: string;
    html?: string;
  } {
    let text: string | undefined;
    let html: string | undefined;

    const extractFromPart = (part: gmail_v1.Schema$MessagePart) => {
      if (part.mimeType === "text/plain" && part.body?.data) {
        text = Buffer.from(part.body.data, "base64").toString("utf-8");
      } else if (part.mimeType === "text/html" && part.body?.data) {
        html = Buffer.from(part.body.data, "base64").toString("utf-8");
      } else if (part.parts) {
        part.parts.forEach(extractFromPart);
      }
    };

    extractFromPart(payload);

    return { text, html };
  }

  /**
   * Extract attachments from Gmail payload
   */
  private extractAttachments(
    payload: gmail_v1.Schema$MessagePart
  ): EmailAttachment[] {
    const attachments: EmailAttachment[] = [];

    const extractFromPart = (part: gmail_v1.Schema$MessagePart) => {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          id: part.body.attachmentId,
          filename: part.filename,
          mimeType: part.mimeType || "application/octet-stream",
          size: part.body.size || 0,
          isInline:
            part.headers?.some(
              (h) =>
                h.name === "Content-Disposition" && h.value?.includes("inline")
            ) || false,
        });
      }

      if (part.parts) {
        part.parts.forEach(extractFromPart);
      }
    };

    extractFromPart(payload);

    return attachments;
  }

  /**
   * Parse single email address
   */
  private parseEmailAddress(addressString: string): EmailAddress {
    const match = addressString.match(/^(.+?)\s*<(.+?)>$/) || [
      null,
      "",
      addressString,
    ];
    return {
      email: match[2].trim(),
      name: match[1]?.replace(/['"]/g, "").trim() || undefined,
    };
  }

  /**
   * Parse multiple email addresses
   */
  private parseEmailAddresses(addressesString: string): EmailAddress[] {
    if (!addressesString) return [];

    return addressesString
      .split(",")
      .map((addr) => this.parseEmailAddress(addr.trim()))
      .filter((addr) => addr.email);
  }

  /**
   * Map Gmail label to folder type
   */
  private mapLabelToFolderType(labelId: string): EmailFolder["type"] {
    const labelMap: Record<string, EmailFolder["type"]> = {
      INBOX: "inbox",
      SENT: "sent",
      DRAFT: "drafts",
      TRASH: "trash",
      SPAM: "spam",
    };

    return labelMap[labelId] || "label";
  }

  /**
   * Build Gmail search query
   */
  private buildGmailSearchQuery(query: EmailSearchQuery): string {
    const parts: string[] = [];

    if (query.query) parts.push(query.query);
    if (query.from) parts.push(`from:${query.from}`);
    if (query.to) parts.push(`to:${query.to}`);
    if (query.subject) parts.push(`subject:${query.subject}`);
    if (query.isRead !== undefined)
      parts.push(`is:${query.isRead ? "read" : "unread"}`);
    if (query.isStarred !== undefined)
      parts.push(`is:${query.isStarred ? "starred" : "unstarred"}`);
    if (query.hasAttachments) parts.push("has:attachment");
    if (query.labels?.length)
      parts.push(`label:${query.labels.join(" OR label:")}`);

    if (query.dateRange) {
      if (query.dateRange.start) {
        parts.push(
          `after:${query.dateRange.start.toISOString().split("T")[0]}`
        );
      }
      if (query.dateRange.end) {
        parts.push(`before:${query.dateRange.end.toISOString().split("T")[0]}`);
      }
    }

    return parts.join(" ");
  }

  /**
   * Build email message for sending
   */
  private buildEmailMessage(message: {
    to: EmailAddress[];
    cc?: EmailAddress[];
    bcc?: EmailAddress[];
    subject: string;
    body: { text?: string; html?: string };
    attachments?: EmailAttachment[];
  }): string {
    const lines: string[] = [];

    // Headers
    lines.push(
      `To: ${message.to
        .map((addr) => this.formatEmailAddress(addr))
        .join(", ")}`
    );
    if (message.cc?.length) {
      lines.push(
        `Cc: ${message.cc
          .map((addr) => this.formatEmailAddress(addr))
          .join(", ")}`
      );
    }
    if (message.bcc?.length) {
      lines.push(
        `Bcc: ${message.bcc
          .map((addr) => this.formatEmailAddress(addr))
          .join(", ")}`
      );
    }
    lines.push(`Subject: ${message.subject}`);
    lines.push("MIME-Version: 1.0");

    if (message.body.html) {
      lines.push("Content-Type: text/html; charset=utf-8");
      lines.push("");
      lines.push(message.body.html);
    } else if (message.body.text) {
      lines.push("Content-Type: text/plain; charset=utf-8");
      lines.push("");
      lines.push(message.body.text);
    }

    const emailString = lines.join("\r\n");
    return Buffer.from(emailString)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  /**
   * Format email address for headers
   */
  private formatEmailAddress(addr: EmailAddress): string {
    if (addr.name) {
      return `"${addr.name}" <${addr.email}>`;
    }
    return addr.email;
  }
}

/**
 * Create and initialize Gmail provider
 */
export const createGmailProvider = async (
  config: EmailProviderConfig
): Promise<GmailProvider> => {
  const provider = new GmailProvider(config);
  await provider.initialize();
  return provider;
};
