export const ExportService = {
  /**
   * Generates a CSV string from an array of objects
   */
  toCSV(data: any[]): string {
    if (!data || data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header];
        const strVal = String(val);
        // Escape quotes and wrap in quotes if contains comma
        if (strVal.includes(',') || strVal.includes('"')) {
          return `"${strVal.replace(/"/g, '""')}"`;
        }
        return strVal;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  },

  /**
   * MVP: Returns a formatted text document that can be printed to PDF by the frontend.
   * A full PDF generator would require 'pdfkit' or 'puppeteer'.
   */
  toPDFPrintableText(title: string, data: any[]): string {
    if (!data || data.length === 0) return `${title}\n\nNo data available.`;
    
    let doc = `${title}\n`;
    doc += `Generated on: ${new Date().toISOString()}\n`;
    doc += '-'.repeat(50) + '\n\n';

    for (const row of data) {
      for (const [key, val] of Object.entries(row)) {
        doc += `${key}: ${val}\n`;
      }
      doc += '\n';
    }

    return doc;
  }
};
