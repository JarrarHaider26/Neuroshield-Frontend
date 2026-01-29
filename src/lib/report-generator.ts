'use client';

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ExternalHyperlink,
} from 'docx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ScanFileOutput } from '@/ai/flows/scan-file-flow';
import type { ScanUrlOutput } from '@/ai/flows/scan-url-flow';

function getThreatHexColor(threatLabel?: string): string {
  switch (threatLabel?.toLowerCase()) {
    case 'critical': return '#FF0000'; // Red
    case 'high': return '#FF4500'; // OrangeRed
    case 'medium': return '#FFA500'; // Orange
    case 'low': return '#FFFF00'; // Yellow
    case 'clean': return '#008000'; // Green
    default: return '#000000'; // Black for Unknown or other
  }
}

// ===== DOCX Generation Logic =====

function createSectionTitle(text: string): Paragraph {
  return new Paragraph({
    text: text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    border: { bottom: { color: "auto", space: 1, style: BorderStyle.SINGLE, size: 6 } }
  });
}

function createSubTitle(text: string): Paragraph {
  return new Paragraph({
    text: text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
  });
}

function createInfoRow(label: string, value?: string | number | null, valueColor?: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })] }),
      new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: String(value ?? 'N/A'), color: valueColor?.replace('#', '') })] })] }),
    ],
  });
}

const NO_BORDER = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

export async function generateScanReportDocx(
  result: ScanFileOutput | ScanUrlOutput,
  scanType: 'file' | 'url'
): Promise<void> {
  const isFileScan = scanType === 'file' && 'fileInfo' in result;
  const fileResult = isFileScan ? (result as ScanFileOutput) : null;
  const urlResult = !isFileScan ? (result as ScanUrlOutput) : null;

  const threatColor = getThreatHexColor(result.threatLabel);
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      text: 'NeuroShield Scan Report',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),

    createSectionTitle('Overall Scan Summary'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        createInfoRow('Scan Type:', scanType === 'file' ? 'File Scan' : 'URL Scan'),
        createInfoRow('Target:', fileResult?.fileInfo?.name || urlResult?.submittedUrl),
        createInfoRow('Scan Date:', result.scanDate ? new Date(result.scanDate * 1000).toLocaleString() : 'N/A'),
        createInfoRow('Overall Threat Assessment:', result.threatLabel, threatColor),
        createInfoRow('VirusTotal Analysis ID:', result.analysisId),
      ],
      borders: NO_BORDER,
    }),
  ];

  // NeuroShield AI Analysis Details
  children.push(createSectionTitle('Analysis Results'));
  if (result.error) {
    children.push(new Paragraph({ text: `Scan Error: ${result.error}`, style: "IntenseReference" }));
  } else if (result.results && result.results['NeuroShield_AI_Model']) {
    const emberResult = result.results['NeuroShield_AI_Model'];
    
    // Extract verdict and remove percentage
    const resultText = emberResult.result || 'N/A';
    const verdictWithoutPercentage = resultText.replace(/\s*\(\d+\.?\d*%\)/, '');
    
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          createInfoRow('AI Model:', emberResult.engine_name),
          createInfoRow('Verdict:', verdictWithoutPercentage),
          createInfoRow('Detection Method:', emberResult.method === 'machine_learning' ? 'Machine Learning' : emberResult.method),
        ],
        borders: NO_BORDER,
      })
    );
  } else if (result.stats) {
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          createInfoRow('Malicious:', result.stats.malicious),
          createInfoRow('Suspicious:', result.stats.suspicious),
          createInfoRow('Clean:', result.stats.harmless),
        ],
        borders: NO_BORDER,
      })
    );
  } else if (result.status && result.status !== 'completed') {
    children.push(new Paragraph({ text: `Scan status: ${result.status}. Full details may not be available.`}));
  } else {
    children.push(new Paragraph({ text: 'Scan data not available or scan did not complete.' }));
  }
  
  // File Information Section
  if (isFileScan && fileResult?.fileInfo) {
    children.push(createSubTitle('File Information'));
    children.push(new Paragraph({ children: [new TextRun({ text: 'File Name: ', bold: true }), new TextRun(fileResult.fileInfo.name || 'N/A')] }));
    children.push(new Paragraph({ children: [new TextRun({ text: 'File Size: ', bold: true }), new TextRun(fileResult.fileInfo.size ? `${(fileResult.fileInfo.size / 1024 / 1024).toFixed(2)} MB` : 'N/A')] }));
    children.push(createSubTitle('File Hashes'));
    children.push(new Paragraph({ children: [new TextRun({ text: 'MD5: ', bold: true }), new TextRun(fileResult.fileInfo.md5 || 'N/A')] }));
    children.push(new Paragraph({ children: [new TextRun({ text: 'SHA1: ', bold: true }), new TextRun(fileResult.fileInfo.sha1 || 'N/A')] }));
    children.push(new Paragraph({ children: [new TextRun({ text: 'SHA256: ', bold: true }), new TextRun(fileResult.fileInfo.sha256 || 'N/A')] }));
  }

  children.push(new Paragraph({
    children: [new TextRun({ text: 'Generated by NeuroShield', size: 18, italics: true })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 600, after: 100 },
  }));

  const doc = new Document({
    creator: 'NeuroShield',
    title: 'NeuroShield Scan Report',
    description: 'Scan report generated by NeuroShield using NeuroShield AI Model',
    styles: {
        paragraphStyles: [
            {
                id: "IntenseReference",
                name: "Intense Reference",
                basedOn: "Normal",
                quickFormat: true,
                run: { color: "FF0000" },
            },
        ],
    },
    sections: [{
      properties: {},
      children: children,
    }],
  });

  try {
    const blob = await Packer.toBlob(doc);
    const targetName = (fileResult?.fileInfo?.name || urlResult?.submittedUrl || 'scan_report')
      .replace(/[^a-z0-9_.-]/gi, '_')
      .substring(0, 50);
    saveAs(blob, `NeuroShield_Report_${targetName}.docx`);
  } catch (error) {
    console.error("Error generating DOCX report:", error);
  }
}


// ===== PDF Generation Logic =====

export async function generateScanReportPdf(
  result: ScanFileOutput | ScanUrlOutput,
  scanType: 'file' | 'url'
): Promise<void> {
  const doc = new jsPDF();
  const isFileScan = scanType === 'file' && 'fileInfo' in result;
  const fileResult = isFileScan ? (result as ScanFileOutput) : null;
  const urlResult = !isFileScan ? (result as ScanUrlOutput) : null;

  const threatColor = getThreatHexColor(result.threatLabel);
  const targetName = fileResult?.fileInfo?.name || urlResult?.submittedUrl || 'scan_report';
  const cleanTargetName = targetName.replace(/[^a-z0-9_.-]/gi, '_').substring(0, 50);

  // Header with logo placeholder and title
  doc.setFillColor(26, 26, 46); // Dark background
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('NeuroShield', 14, 15);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('AI-Powered Malware Analysis Report', 14, 25);
  
  doc.setTextColor(0, 0, 0);
  
  // Report metadata
  doc.setFontSize(9);
  doc.setTextColor(128, 128, 128);
  const reportDate = new Date().toLocaleString();
  doc.text(`Generated: ${reportDate}`, doc.internal.pageSize.getWidth() - 14, 15, { align: 'right' });
  
  doc.setTextColor(0, 0, 0);
  
  // Executive Summary Section
  let currentY = 45;
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(74, 144, 217);
  doc.text('Executive Summary', 14, currentY);
  
  currentY += 3;
  doc.setDrawColor(74, 144, 217);
  doc.setLineWidth(0.5);
  doc.line(14, currentY, doc.internal.pageSize.getWidth() - 14, currentY);
  
  currentY += 8;
  doc.setTextColor(0, 0, 0);
  
  autoTable(doc, {
    startY: currentY,
    theme: 'striped',
    headStyles: { fillColor: [74, 144, 217], textColor: [255, 255, 255], fontStyle: 'bold' },
    body: [
      ['Scan Type', scanType === 'file' ? 'File Analysis' : 'URL Analysis'],
      ['Target', targetName],
      ['Scan Date', result.scanDate ? new Date(result.scanDate * 1000).toLocaleString() : 'N/A'],
      ['Threat Assessment', result.threatLabel || 'N/A'],
      ['Analysis ID', result.analysisId],
    ],
    styles: { fontSize: 11, cellPadding: 4 },
    columnStyles: { 
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 'auto' }
    },
    didParseCell: (data) => {
        if(data.row.index === 3 && data.column.index === 1){
            data.cell.styles.textColor = threatColor;
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fontSize = 12;
        }
    }
  });
  
  let finalY = (doc as any).lastAutoTable.finalY + 15;

  // Analysis Results
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(74, 144, 217);
  doc.text('Analysis Results', 14, finalY);
  
  finalY += 3;
  doc.setDrawColor(74, 144, 217);
  doc.line(14, finalY, doc.internal.pageSize.getWidth() - 14, finalY);
  finalY += 8;
  
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');

  if (result.error) {
    doc.setFontSize(11);
    doc.setTextColor(255, 0, 0);
    doc.text(`Scan Error: ${result.error}`, 14, finalY);
    doc.setTextColor(0, 0, 0);
  } else if (result.results && result.results['NeuroShield_AI_Model']) {
    const emberResult = result.results['NeuroShield_AI_Model'];
    
    // Extract verdict and remove percentage
    const resultText = emberResult.result || 'N/A';
    const verdictWithoutPercentage = resultText.replace(/\s*\(\d+\.?\d*%\)/, '');
    
    autoTable(doc, {
      startY: finalY,
      theme: 'grid',
      headStyles: { fillColor: [74, 144, 217], fontStyle: 'bold' },
      body: [
        ['AI Model', emberResult.engine_name],
        ['Verdict', verdictWithoutPercentage],
        ['Detection Method', emberResult.method === 'machine_learning' ? 'Machine Learning' : emberResult.method],
      ],
      styles: { fontSize: 11, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
    });
    finalY = (doc as any).lastAutoTable.finalY + 8;
  } else if (result.stats) {
    const totalScanned = (result.stats.harmless ?? 0) + (result.stats.malicious ?? 0) + (result.stats.suspicious ?? 0) + (result.stats.timeout ?? 0) + (result.stats.undetected ?? 0);
    
    if (totalScanned === 0) {
      doc.setFontSize(11);
      doc.setTextColor(255, 165, 0);
      doc.text('Scan is still in progress. Results are not yet available.', 14, finalY);
      doc.setTextColor(0, 0, 0);
    } else {
      autoTable(doc, {
        startY: finalY,
        theme: 'grid',
        headStyles: { fillColor: [74, 144, 217], fontStyle: 'bold' },
        body: [
          ['Malicious', result.stats.malicious],
          ['Suspicious', result.stats.suspicious],
          ['Clean', result.stats.harmless],
        ],
        styles: { fontSize: 11, cellPadding: 3 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
      });
      finalY = (doc as any).lastAutoTable.finalY + 8;
    }
  } else {
    doc.setFontSize(11);
    doc.text('Scan data not available or scan did not complete.', 14, finalY);
  }
  
  // File Information Section
  if (isFileScan && fileResult?.fileInfo) {
    doc.setFontSize(14);
    doc.text('File Information', 14, finalY);
    finalY += 5;
    autoTable(doc, {
      startY: finalY,
      theme: 'plain',
      body: [
        ['File Name:', fileResult.fileInfo.name || 'N/A'],
        ['File Size:', fileResult.fileInfo.size ? `${(fileResult.fileInfo.size / 1024 / 1024).toFixed(2)} MB` : 'N/A'],
      ],
      styles: { fontSize: 11 },
      columnStyles: { 0: { fontStyle: 'bold' } },
    });
    finalY = (doc as any).lastAutoTable.finalY + 8;
    
    doc.setFontSize(14);
    doc.text('File Hashes', 14, finalY);
    finalY += 5;
    autoTable(doc, {
      startY: finalY,
      theme: 'grid',
      head: [['Hash Type', 'Value']],
      body: [
        ['MD5', fileResult.fileInfo.md5 || 'N/A'],
        ['SHA1', fileResult.fileInfo.sha1 || 'N/A'],
        ['SHA256', fileResult.fileInfo.sha256 || 'N/A'],
      ],
      styles: { fontSize: 10 },
    });
    finalY = (doc as any).lastAutoTable.finalY;
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(9);
  doc.setTextColor('#808080');
  doc.text('Generated by NeuroShield', doc.internal.pageSize.getWidth() / 2, pageHeight - 10, { align: 'center' });

  // Save the PDF
  doc.save(`NeuroShield_Report_${cleanTargetName}.pdf`);
}