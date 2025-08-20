import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ExportExcelService {
  // Limites e sanitização simples para segurança
  private readonly maxCellLength = 30000; // abaixo do limite de 32.767 do Excel

  private sanitizeCell(v: any): any {
    if (v == null) return '';
    if (typeof v === 'number' || typeof v === 'boolean') return v;
    const s = String(v);
    // Neutraliza possíveis fórmulas e limita tamanho
    let out = /^[=+\-@]/.test(s) ? `'${s}` : s;
    if (out.length > this.maxCellLength) out = out.slice(0, this.maxCellLength);
    return out;
  }

  async exportAsExcel<T extends Record<string, any>>(data: T[], fileName: string, sheetName = 'Dados'): Promise<void> {
    if (!Array.isArray(data)) return;
    const rows = data.map(row => {
      const sanitized: Record<string, any> = {};
      for (const k of Object.keys(row)) sanitized[k] = this.sanitizeCell(row[k]);
      return sanitized;
    });
    const columns = rows.length ? Object.keys(rows[0]) : [];
    const safeName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;

    try {
      // Importação dinâmica para melhor compatibilidade de bundling
      const ExcelJS = await import('exceljs');
      // Alguns bundlers expõem como namespace, outros com default
      const Workbook: any = (ExcelJS as any).Workbook || (ExcelJS as any).default?.Workbook;
      const wb = new Workbook();
      const ws = wb.addWorksheet(sheetName);
      if (columns.length) {
        ws.columns = columns.map((key: string) => ({ header: key, key }));
        ws.addRows(rows);
      }
      const buffer: ArrayBuffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = safeName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (e) {
      console.error('Falha ao exportar Excel:', e);
    }
  }
}
