/**
 * PDF Export Service
 * Generates PDF reports for group settlements with multi-language support
 * Uses jsPDF library for PDF generation
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { groupSettlementService } from './groupSettlement.service';
import { Currency } from '../types/currency.types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getTranslation } from '../utils/i18n';

interface PDFExportOptions {
  groupName: string;
  period?: { start: Date; end: Date };
  currency: Currency;
  language: string;
  includeTransactions?: boolean;
  includeSummary?: boolean;
  includeChart?: boolean;
}

interface TransactionData {
  id: string;
  date: Date;
  from: string;
  to: string;
  amount: number;
  currency: Currency;
  description: string;
}

export class PDFExportService {
  private readonly PAGE_WIDTH = 210; // A4 width in mm
  private readonly PAGE_HEIGHT = 297; // A4 height in mm
  private readonly MARGIN = 15;

  /**
   * Generate and download PDF report for group settlements
   */
  async generateSettlementReport(
    transactions: TransactionData[],
    options: PDFExportOptions
  ): Promise<Blob> {
    const doc = new jsPDF();
    const t = (key: string) => getTranslation(key, options.language);

    // Calculate settlements
    const settlementData = await groupSettlementService.getSettlementSummary(
      transactions,
      options.currency
    );

    let yPosition = this.MARGIN;

    // Add header
    yPosition = this.addHeader(doc, options, t, yPosition);

    // Add period info if provided
    if (options.period) {
      yPosition = this.addPeriodInfo(doc, options.period, t, yPosition);
    }

    // Add summary section
    if (options.includeSummary !== false) {
      yPosition = this.addSummary(doc, settlementData.summary, t, yPosition);
    }

    // Add settlements table
    yPosition = this.addSettlementsTable(doc, settlementData.settlements, t, yPosition);

    // Add transactions table if requested
    if (options.includeTransactions && transactions.length > 0) {
      yPosition = this.addTransactionsTable(doc, transactions, t, yPosition);
    }

    // Add footer
    this.addFooter(doc, t);

    // Convert to blob for download
    return doc.output('blob');
  }

  /**
   * Generate and auto-download PDF
   */
  async downloadReport(
    transactions: TransactionData[],
    options: PDFExportOptions
  ): Promise<void> {
    const blob = await this.generateSettlementReport(transactions, options);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${options.groupName}_settlement_${Date.now()}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Add header section with title and group name
   */
  private addHeader(
    doc: jsPDF,
    options: PDFExportOptions,
    t: (key: string) => string,
    yPosition: number
  ): number {
    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(t('settlement_report'), this.MARGIN, yPosition);
    yPosition += 10;

    // Group name
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(`${t('group')}: ${options.groupName}`, this.MARGIN, yPosition);
    yPosition += 10;

    // Generated date
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(
      `${t('generated')}: ${formatDate(new Date(), options.language)}`,
      this.MARGIN,
      yPosition
    );
    yPosition += 15;
    doc.setTextColor(0);

    return yPosition;
  }

  /**
   * Add period information
   */
  private addPeriodInfo(
    doc: jsPDF,
    period: { start: Date; end: Date },
    t: (key: string) => string,
    yPosition: number
  ): number {
    doc.setFontSize(11);
    doc.text(
      `${t('period')}: ${formatDate(period.start)} - ${formatDate(period.end)}`,
      this.MARGIN,
      yPosition
    );
    return yPosition + 10;
  }

  /**
   * Add summary section with key statistics
   */
  private addSummary(
    doc: jsPDF,
    summary: any,
    t: (key: string) => string,
    yPosition: number
  ): number {
    // Summary title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(t('summary'), this.MARGIN, yPosition);
    yPosition += 8;

    // Summary items
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    const summaryItems = [
      `${t('total_amount')}: ${formatCurrency(summary.totalAmount, summary.currency)}`,
      `${t('number_of_settlements')}: ${summary.numberOfSettlements}`,
      `${t('number_of_users')}: ${summary.numberOfUsers}`
    ];

    summaryItems.forEach(item => {
      doc.text(item, this.MARGIN + 5, yPosition);
      yPosition += 7;
    });

    return yPosition + 10;
  }

  /**
   * Add settlements table using autoTable
   */
  private addSettlementsTable(
    doc: jsPDF,
    settlements: any[],
    t: (key: string) => string,
    yPosition: number
  ): number {
    // Section title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(t('settlements'), this.MARGIN, yPosition);
    yPosition += 5;

    // Prepare table data
    const tableData = settlements.map(s => [
      s.from.name || s.from.id,
      s.to.name || s.to.id,
      formatCurrency(s.amount, s.currency)
    ]);

    // Generate table
    autoTable(doc, {
      startY: yPosition,
      head: [[t('from'), t('to'), t('amount')]],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: 'bold'
      },
      margin: { left: this.MARGIN, right: this.MARGIN },
      styles: {
        fontSize: 10,
        cellPadding: 5
      }
    });

    return (doc as any).lastAutoTable.finalY + 10;
  }

  /**
   * Add transactions table
   */
  private addTransactionsTable(
    doc: jsPDF,
    transactions: TransactionData[],
    t: (key: string) => string,
    yPosition: number
  ): number {
    // Check if new page is needed
    if (yPosition > this.PAGE_HEIGHT - 60) {
      doc.addPage();
      yPosition = this.MARGIN;
    }

    // Section title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(t('transactions'), this.MARGIN, yPosition);
    yPosition += 5;

    // Prepare table data
    const tableData = transactions.map(tx => [
      formatDate(tx.date),
      tx.from,
      tx.to,
      formatCurrency(tx.amount, tx.currency),
      tx.description || '-'
    ]);

    // Generate table
    autoTable(doc, {
      startY: yPosition,
      head: [[t('date'), t('from'), t('to'), t('amount'), t('description')]],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: 'bold'
      },
      margin: { left: this.MARGIN, right: this.MARGIN },
      styles: {
        fontSize: 9,
        cellPadding: 4
      }
    });

    return (doc as any).lastAutoTable.finalY + 10;
  }

  /**
   * Add footer with page numbers and generation info
   */
  private addFooter(doc: jsPDF, t: (key: string) => string): void {
    const pageCount = (doc as any).internal.getNumberOfPages();

    doc.setFontSize(9);
    doc.setTextColor(100);

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(
        `${t('page')} ${i} ${t('of')} ${pageCount}`,
        this.PAGE_WIDTH - this.MARGIN - 20,
        this.PAGE_HEIGHT - 10
      );
      doc.text(
        t('generated_by_monez'),
        this.MARGIN,
        this.PAGE_HEIGHT - 10
      );
    }
  }

  /**
   * Validate export options
   */
  validateOptions(options: PDFExportOptions): boolean {
    if (!options.groupName || options.groupName.trim() === '') {
      throw new Error('Group name is required');
    }
    if (!options.currency) {
      throw new Error('Currency is required');
    }
    if (!options.language) {
      throw new Error('Language is required');
    }
    return true;
  }
}

export const pdfExportService = new PDFExportService();
