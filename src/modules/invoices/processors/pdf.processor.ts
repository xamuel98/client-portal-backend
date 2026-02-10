import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InvoicesService } from '../invoices.service';
import { FilesService } from '../../files/files.service';
import { TenantsService } from '../../tenants/tenants.service';
import { UsersService } from '../../users/users.service';
import * as puppeteer from 'puppeteer-core';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

export interface PDFJobData {
  invoiceId: string;
  tenantId: string;
}

@Processor('invoices')
export class PDFProcessor extends WorkerHost {
  private readonly logger = new Logger(PDFProcessor.name);

  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly filesService: FilesService,
    private readonly tenantsService: TenantsService,
    private readonly usersService: UsersService,
  ) {
    super();
  }

  async process(job: Job<PDFJobData>): Promise<any> {
    const { invoiceId, tenantId } = job.data;
    this.logger.log(`Generating PDF for invoice: ${invoiceId}`);

    try {
      const invoice = await this.invoicesService.findOne(invoiceId, tenantId);
      const tenant = await this.tenantsService.findOne(tenantId);
      const client = await this.usersService.findOne(
        invoice.clientId.toString(),
        tenantId,
      );

      const templatePath = path.join(
        process.cwd(),
        'src/modules/invoices/templates/invoice.hbs',
      );
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      const compiledTemplate = handlebars.compile(templateContent);

      const html = compiledTemplate({
        tenantName: tenant.name,
        tenantLogo: tenant.logo,
        brandColors: tenant.brandColors,
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate.toLocaleDateString(),
        dueDate: invoice.dueDate.toLocaleDateString(),
        clientName: `${client.profile.firstName} ${client.profile.lastName}`,
        clientEmail: client.email,
        items: invoice.items.map((item) => ({
          ...item,
          unitPrice: (item.unitPrice / 100).toFixed(2),
          amount: (item.amount / 100).toFixed(2),
        })),
        subtotal: (invoice.subtotal / 100).toFixed(2),
        taxTotal: (invoice.taxTotal / 100).toFixed(2),
        totalAmount: (invoice.totalAmount / 100).toFixed(2),
        currency: invoice.currency || 'USD',
        notes: invoice.notes,
      });

      const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome', // Standard path on many systems, might need adjustment
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
      });

      await browser.close();

      const fileName = `invoice-${invoice.invoiceNumber}.pdf`;
      const uploadedFile = await this.filesService.uploadBuffer(
        Buffer.from(pdfBuffer),
        fileName,
        'application/pdf',
        tenantId,
        undefined,
        'invoice',
        invoiceId,
      );

      await this.invoicesService.update(
        invoiceId,
        { pdfUrl: uploadedFile.url } as any,
        tenantId,
      );

      this.logger.log(
        `Successfully generated and uploaded PDF for invoice: ${invoiceId}`,
      );

      return { success: true, invoiceId, pdfUrl: uploadedFile.url };
    } catch (error) {
      this.logger.error(
        `Failed to generate PDF for invoice ${invoiceId}: ${error.message}`,
      );
      throw error;
    }
  }
}
