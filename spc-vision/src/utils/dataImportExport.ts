import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { DataPoint, ProcessData, ImportOptions, ExportOptions } from '../types/spc';

// CSV Import Functions
export const importCSVData = async (
  file: File, 
  options: ImportOptions
): Promise<DataPoint[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: options.hasHeader,
      delimiter: options.delimiter || ',',
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const dataPoints = parseCSVResults(results.data, options);
          resolve(dataPoints);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};

const parseCSVResults = (data: any[], options: ImportOptions): DataPoint[] => {
  const dataPoints: DataPoint[] = [];
  
  data.forEach((row, index) => {
    try {
      const value = parseFloat(row[options.valueColumn]);
      if (isNaN(value)) return;
      
      let timestamp = new Date();
      if (options.timestampColumn !== undefined && row[options.timestampColumn]) {
        timestamp = parseDate(row[options.timestampColumn], options.dateFormat);
      }
      
      const dataPoint: DataPoint = {
        id: crypto.randomUUID(),
        timestamp,
        value,
        subgroup: options.subgroupColumn !== undefined ? parseInt(row[options.subgroupColumn]) : undefined,
        batch: options.batchColumn !== undefined ? row[options.batchColumn] : undefined,
        operator: undefined,
        notes: undefined,
      };
      
      dataPoints.push(dataPoint);
    } catch (error) {
      console.warn(`Error parsing row ${index}:`, error);
    }
  });
  
  return dataPoints;
};

// Excel Import Functions
export const importExcelData = async (
  file: File, 
  options: ImportOptions
): Promise<DataPoint[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        const dataPoints = parseExcelResults(jsonData as any[][], options);
        resolve(dataPoints);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read Excel file'));
    reader.readAsBinaryString(file);
  });
};

const parseExcelResults = (data: any[][], options: ImportOptions): DataPoint[] => {
  const dataPoints: DataPoint[] = [];
  const startRow = options.hasHeader ? 1 : 0;
  
  for (let i = startRow; i < data.length; i++) {
    const row = data[i];
    try {
      const value = parseFloat(row[options.valueColumn]);
      if (isNaN(value)) continue;
      
      let timestamp = new Date();
      if (options.timestampColumn !== undefined && row[options.timestampColumn]) {
        timestamp = parseDate(row[options.timestampColumn], options.dateFormat);
      }
      
      const dataPoint: DataPoint = {
        id: crypto.randomUUID(),
        timestamp,
        value,
        subgroup: options.subgroupColumn !== undefined ? parseInt(row[options.subgroupColumn]) : undefined,
        batch: options.batchColumn !== undefined ? row[options.batchColumn] : undefined,
        operator: undefined,
        notes: undefined,
      };
      
      dataPoints.push(dataPoint);
    } catch (error) {
      console.warn(`Error parsing row ${i}:`, error);
    }
  }
  
  return dataPoints;
};

// Export Functions
export const exportToCSV = (processData: ProcessData, options: ExportOptions): string => {
  const data = options.includeData ? processData.dataPoints : [];
  
  const csvData = data.map(dp => ({
    'Timestamp': dp.timestamp.toISOString(),
    'Value': dp.value,
    'Subgroup': dp.subgroup || '',
    'Batch': dp.batch || '',
    'Operator': dp.operator || '',
    'Notes': dp.notes || '',
  }));
  
  return Papa.unparse(csvData);
};

export const exportToExcel = (processData: ProcessData, options: ExportOptions): void => {
  const workbook = XLSX.utils.book_new();
  
  if (options.includeData) {
    const data = processData.dataPoints.map(dp => ({
      'Timestamp': dp.timestamp.toISOString(),
      'Value': dp.value,
      'Subgroup': dp.subgroup || '',
      'Batch': dp.batch || '',
      'Operator': dp.operator || '',
      'Notes': dp.notes || '',
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  }
  
  if (options.includeStatistics) {
    const stats = generateStatisticsSheet(processData);
    const statsWorksheet = XLSX.utils.json_to_sheet(stats);
    XLSX.utils.book_append_sheet(workbook, statsWorksheet, 'Statistics');
  }
  
  XLSX.writeFile(workbook, `${processData.name}_export.xlsx`);
};

export const exportToPDF = async (
  processData: ProcessData, 
  options: ExportOptions,
  charts?: any[]
): Promise<void> => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  
  // Add title
  doc.setFontSize(20);
  doc.text(processData.name, 20, 30);
  
  // Add description
  if (processData.description) {
    doc.setFontSize(12);
    doc.text(processData.description, 20, 45);
  }
  
  // Add process information
  doc.setFontSize(14);
  doc.text('Process Information', 20, 65);
  
  doc.setFontSize(10);
  let yPos = 80;
  doc.text(`Created: ${processData.createdAt.toLocaleDateString()}`, 20, yPos);
  yPos += 15;
  doc.text(`Last Updated: ${processData.updatedAt.toLocaleDateString()}`, 20, yPos);
  yPos += 15;
  doc.text(`Total Data Points: ${processData.dataPoints.length}`, 20, yPos);
  
  if (processData.specifications) {
    yPos += 20;
    doc.setFontSize(14);
    doc.text('Specifications', 20, yPos);
    yPos += 15;
    doc.setFontSize(10);
    
    if (processData.specifications.usl) {
      doc.text(`Upper Specification Limit: ${processData.specifications.usl} ${processData.specifications.unit}`, 20, yPos);
      yPos += 15;
    }
    if (processData.specifications.lsl) {
      doc.text(`Lower Specification Limit: ${processData.specifications.lsl} ${processData.specifications.unit}`, 20, yPos);
      yPos += 15;
    }
    if (processData.specifications.target) {
      doc.text(`Target: ${processData.specifications.target} ${processData.specifications.unit}`, 20, yPos);
      yPos += 15;
    }
  }
  
  // Add charts if provided
  if (options.includeCharts && charts) {
    for (const chart of charts) {
      doc.addPage();
      doc.setFontSize(16);
      doc.text(chart.title || 'Chart', 20, 30);
      
      // Note: In a real implementation, you would convert the chart to an image
      // and add it to the PDF using html2canvas or similar
      doc.text('Chart image would be inserted here', 20, 50);
    }
  }
  
  // Save the PDF
  doc.save(`${processData.name}_report.pdf`);
};

// Utility Functions
const parseDate = (dateString: string, _format?: string): Date => {
  if (!dateString) return new Date();
  
  // Try different date formats
  const formats = [
    'YYYY-MM-DD',
    'MM/DD/YYYY',
    'DD/MM/YYYY',
    'YYYY-MM-DD HH:mm:ss',
    'MM/DD/YYYY HH:mm:ss',
    'DD/MM/YYYY HH:mm:ss',
  ];
  
  for (const fmt of formats) {
    try {
      const parsed = parseDateWithFormat(dateString, fmt);
      if (parsed && !isNaN(parsed.getTime())) {
        return parsed;
      }
    } catch (error) {
      continue;
    }
  }
  
  // Fallback to default parsing
  return new Date(dateString);
};

const parseDateWithFormat = (dateString: string, format: string): Date | null => {
  // Simple date parsing implementation
  // In a production app, you might want to use a library like date-fns or moment.js
  
  if (format === 'YYYY-MM-DD') {
    const [year, month, day] = dateString.split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  if (format === 'MM/DD/YYYY') {
    const [month, day, year] = dateString.split('/');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  if (format === 'DD/MM/YYYY') {
    const [day, month, year] = dateString.split('/');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // Add more formats as needed
  return null;
};

const generateStatisticsSheet = (processData: ProcessData): any[] => {
  const values = processData.dataPoints.map(dp => dp.value);
  const stats = [
    { Metric: 'Count', Value: values.length },
    { Metric: 'Mean', Value: values.reduce((sum, val) => sum + val, 0) / values.length },
    { Metric: 'Min', Value: Math.min(...values) },
    { Metric: 'Max', Value: Math.max(...values) },
    { Metric: 'Range', Value: Math.max(...values) - Math.min(...values) },
  ];
  
  return stats;
};

// Data Validation Functions
export const validateDataPoint = (dataPoint: Partial<DataPoint>): string[] => {
  const errors: string[] = [];
  
  if (!dataPoint.value || isNaN(dataPoint.value)) {
    errors.push('Value is required and must be a number');
  }
  
  if (!dataPoint.timestamp || isNaN(dataPoint.timestamp.getTime())) {
    errors.push('Valid timestamp is required');
  }
  
  if (dataPoint.subgroup !== undefined && (isNaN(dataPoint.subgroup) || dataPoint.subgroup < 1)) {
    errors.push('Subgroup must be a positive integer');
  }
  
  return errors;
};

export const validateProcessData = (processData: Partial<ProcessData>): string[] => {
  const errors: string[] = [];
  
  if (!processData.name || processData.name.trim().length === 0) {
    errors.push('Process name is required');
  }
  
  if (!processData.dataPoints || processData.dataPoints.length === 0) {
    errors.push('At least one data point is required');
  }
  
  if (processData.specifications) {
    const { usl, lsl } = processData.specifications;
    if (usl !== undefined && lsl !== undefined && usl <= lsl) {
      errors.push('Upper specification limit must be greater than lower specification limit');
    }
  }
  
  return errors;
};

// File Upload Helper
export const handleFileUpload = async (
  file: File,
  options: ImportOptions
): Promise<DataPoint[]> => {
  const fileType = file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'excel';
  
  if (fileType === 'csv') {
    return await importCSVData(file, options);
  } else {
    return await importExcelData(file, options);
  }
};

// Download Helper
export const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};