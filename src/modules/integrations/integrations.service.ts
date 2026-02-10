import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { IntegrationsRepository } from './repositories/integrations.repository';
import * as crypto from 'crypto';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);
  private readonly algorithm = 'aes-256-ctr';
  private readonly secretKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly integrationsRepository: IntegrationsRepository,
  ) {
    this.secretKey =
      this.configService.get<string>('jwt.secret') ||
      'default-secret-for-encryption';
  }

  private getOAuth2Client() {
    return new google.auth.OAuth2(
      this.configService.get<string>('google.clientId'),
      this.configService.get<string>('google.clientSecret'),
      `${this.configService.get<string>('frontendUrl')}/integrations/callback`,
    );
  }

  generateAuthUrl(service: string, tenantId: string, userId?: string) {
    const oauth2Client = this.getOAuth2Client();
    const scopes = this.getScopesForService(service);

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: JSON.stringify({ service, tenantId, userId }),
      prompt: 'consent',
    });
  }

  async handleCallback(code: string, state: string) {
    const { service, tenantId, userId } = JSON.parse(state);
    const oauth2Client = this.getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    const credentials = {
      accessToken: this.encrypt(tokens.access_token!),
      refreshToken: tokens.refresh_token
        ? this.encrypt(tokens.refresh_token)
        : undefined,
      expiryDate: tokens.expiry_date || undefined,
      scope: tokens.scope ? tokens.scope.split(' ') : [],
    };

    return this.integrationsRepository.upsert(
      { tenantId, userId, service },
      { credentials, status: 'active' },
    );
  }

  async getAuthenticatedClient(
    tenantId: string,
    service: string,
    userId?: string,
  ) {
    const integration = await this.integrationsRepository.findByService(
      tenantId,
      service,
      userId,
    );
    if (!integration) return null;

    const oauth2Client = this.getOAuth2Client();
    const credentials = integration.credentials;

    oauth2Client.setCredentials({
      access_token: this.decrypt(credentials.accessToken),
      refresh_token: credentials.refreshToken
        ? this.decrypt(credentials.refreshToken)
        : undefined,
      expiry_date: credentials.expiryDate,
    });

    // Check if token is expired and refresh if necessary
    const now = Date.now();
    if (credentials.expiryDate && credentials.expiryDate <= now + 60000) {
      const { credentials: tokens } = await oauth2Client.refreshAccessToken();
      integration.credentials.accessToken = this.encrypt(tokens.access_token!);
      if (tokens.expiry_date) {
        integration.credentials.expiryDate = tokens.expiry_date;
      }
      await integration.save();
    }

    return oauth2Client;
  }

  async syncTaskToCalendar(tenantId: string, task: any, userId?: string) {
    const oauth2Client = await this.getAuthenticatedClient(
      tenantId,
      'google-calendar',
      userId,
    );
    if (!oauth2Client) return;

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const event = {
      summary: task.title,
      description: task.description,
      start: {
        dateTime: task.dueDate?.toISOString() || new Date().toISOString(),
      },
      end: {
        dateTime: new Date(
          new Date(task.dueDate || new Date()).getTime() + 3600000,
        ).toISOString(), // 1 hour later
      },
    };

    try {
      if (task.metadata?.googleEventId) {
        await calendar.events.update({
          calendarId: 'primary',
          eventId: task.metadata.googleEventId,
          requestBody: event,
        });
      } else {
        const res = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: event,
        });
        task.metadata = { ...task.metadata, googleEventId: res.data.id };
        // Note: The caller must save the task to update metadata
      }
    } catch (error) {
      this.logger.error(
        `Failed to sync task to Google Calendar: ${error.message}`,
      );
    }
  }

  async exportInvoicesToSheet(
    tenantId: string,
    invoices: any[],
    userId?: string,
  ) {
    const oauth2Client = await this.getAuthenticatedClient(
      tenantId,
      'google-sheets',
      userId,
    );
    if (!oauth2Client) return null;

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: `Invoices Export - ${new Date().toLocaleDateString()}`,
        },
      },
    });

    const values = [
      ['Invoice #', 'Client', 'Amount', 'Currency', 'Status', 'Due Date'],
      ...invoices.map((inv) => [
        inv.invoiceNumber,
        inv.clientName,
        inv.total,
        inv.currency,
        inv.status,
        inv.dueDate?.toISOString(),
      ]),
    ];

    const spreadsheetId = spreadsheet.data.spreadsheetId;
    if (!spreadsheetId) return null;

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      requestBody: { values },
    });

    return spreadsheet.data.spreadsheetUrl;
  }

  private getScopesForService(service: string): string[] {
    switch (service) {
      case 'google-calendar':
        return ['https://www.googleapis.com/auth/calendar.events'];
      case 'google-sheets':
        return ['https://www.googleapis.com/auth/spreadsheets'];
      default:
        return [];
    }
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.algorithm,
      crypto.scryptSync(this.secretKey, 'salt', 32),
      iv,
    );
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  private decrypt(hash: string): string {
    const [iv, content] = hash.split(':');
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      crypto.scryptSync(this.secretKey, 'salt', 32),
      Buffer.from(iv, 'hex'),
    );
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(content, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString();
  }
}
