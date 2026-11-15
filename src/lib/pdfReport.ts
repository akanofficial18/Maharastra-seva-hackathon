import { jsPDF } from 'jspdf';
import { computeObservationMetrics } from './papAucEngine.ts';
import type { ExperimentDetail } from '../types/hvisa.ts';

async function svgElementToPngDataUrl(
  svgEl: SVGSVGElement | null
): Promise<{ dataUrl: string; aspectRatio: number } | null> {
  if (!svgEl) return null;
  try {
    const cloned = svgEl.cloneNode(true) as SVGSVGElement;
    const vb = svgEl.viewBox.baseVal;
    const width = vb && vb.width ? vb.width : 760;
    const height = vb && vb.height ? vb.height : 300;
    cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    cloned.setAttribute('width', String(width));
    cloned.setAttribute('height', String(height));

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(cloned);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = (err) => reject(err);
      image.src = url;
    });

    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(url);
      return null;
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);

    return {
      dataUrl: canvas.toDataURL('image/png'),
      aspectRatio: height / width,
    };
  } catch {
    return null;
  }
}

export async function generatePapAucPdfReport(
  detail: ExperimentDetail,
  chartSvg: SVGSVGElement | null
): Promise<void> {
  const {
    experiment,
    protocol,
    referenceStrain,
    observations,
    latestCalculation,
    qaFlags,
    reviews,
  } = detail;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = 14;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageH - 16) {
      doc.addPage();
      y = 16;
    }
  };

  const drawSectionHeading = (title: string) => {
    ensureSpace(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 29, 46);
    doc.text(title, margin, y);
    y += 1.8;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageW - margin, y);
    y += 4.5;
  };

  // Top Header Band
  doc.setFillColor(15, 29, 46);
  doc.rect(0, 0, pageW, 18, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text('SUKSHMAVEDH: PAP-AUC LABORATORY ANALYSIS REPORT', margin, 10.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Run: ${experiment.runId}  |  Status: ${experiment.status}`, pageW - margin, 10.5, {
    align: 'right',
  });
  y = 24;

  // Synthetic Demo Warning Banner
  if (experiment.isSyntheticDemo) {
    doc.setFillColor(254, 249, 238);
    doc.setDrawColor(229, 213, 181);
    doc.rect(margin, y, contentW, 9, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(146, 64, 14);
    doc.text(
      'DEMO / SYNTHETIC DATA: Fictional demonstration dataset. Not for clinical diagnosis or patient management.',
      margin + 3,
      y + 5.7
    );
    y += 13;
  }

  // Stale Calculation Warning
  if (
    experiment.status === 'CALCULATION_INVALIDATED' ||
    (latestCalculation && !latestCalculation.isValid)
  ) {
    doc.setFillColor(255, 241, 242);
    doc.setDrawColor(254, 205, 211);
    doc.rect(margin, y, contentW, 9, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(159, 18, 57);
    doc.text(
      'CALCULATION INVALIDATED: Raw observations or protocol settings changed after this calculation; recalculate.',
      margin + 3,
      y + 5.7
    );
    y += 13;
  }

  // Section 1: Metadata & Protocol Provenance
  drawSectionHeading('1. Experiment Metadata, Reference Strain & Protocol Provenance');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  const metaPairs: Array<[string, string, string, string]> = [
    ['Run ID:', experiment.runId, 'Protocol:', `${protocol.name} (v${protocol.version})`],
    [
      'Experiment Date:',
      experiment.experimentDate,
      'Concentration Grid:',
      `[${protocol.concentrationGrid.join(', ')}] mg/L`,
    ],
    [
      'Analyst ID:',
      experiment.analystId,
      'Zero-Colony Policy:',
      protocol.zeroColonyPolicy,
    ],
    [
      'Reference Strain:',
      `${referenceStrain.strainCode} (${referenceStrain.atccNumber})`,
      'Aggregation / Reps:',
      `${protocol.aggregationMethod} (${protocol.expectedReplicates} rep)`,
    ],
    [
      'Observation Rows:',
      String(observations.length),
      'Engine Version:',
      latestCalculation?.calculationVersion ?? 'Not calculated',
    ],
    [
      'Run Status:',
      experiment.status,
      'Calculated At:',
      latestCalculation ? new Date(latestCalculation.calculatedAt).toLocaleString() : '—',
    ],
  ];

  for (const [k1, v1, k2, v2] of metaPairs) {
    ensureSpace(6);
    doc.setFont('helvetica', 'bold');
    doc.text(k1, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(v1.slice(0, 38), margin + 32, y);

    doc.setFont('helvetica', 'bold');
    doc.text(k2, margin + contentW / 2, y);
    doc.setFont('helvetica', 'normal');
    doc.text(v2.slice(0, 44), margin + contentW / 2 + 34, y);
    y += 4.8;
  }
  y += 3;

  // Section 2: Population Analysis Graph
  if (latestCalculation) {
    const chartImg = await svgElementToPngDataUrl(chartSvg);
    if (chartImg) {
      drawSectionHeading('2. Population Analysis Profile (log10 CFU/mL vs. Vancomycin)');
      const imgW = contentW;
      const imgH = Math.min(82, imgW * chartImg.aspectRatio);
      ensureSpace(imgH + 6);
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, imgW, imgH, 'S');
      doc.addImage(chartImg.dataUrl, 'PNG', margin, y, imgW, imgH);
      y += imgH + 6;
    }

    // Section 3: AUC Calculations & Test/Reference Ratios
    drawSectionHeading('3. Trapezoidal AUC Calculations & Test / Mu3 Ratios');
    ensureSpace(14);
    doc.setFillColor(235, 241, 246);
    doc.rect(margin, y, contentW, 6.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text('Strain ID', margin + 2, y + 4.4);
    doc.text('Role', margin + 36, y + 4.4);
    doc.text('AUC', margin + 68, y + 4.4, { align: 'right' });
    doc.text('Mu3 AUC', margin + 90, y + 4.4, { align: 'right' });
    doc.text('Ratio', margin + 110, y + 4.4, { align: 'right' });
    doc.text('Configured Interpretation Band', margin + 115, y + 4.4);
    y += 7.5;

    const rowsToRender = [
      ...(latestCalculation.results.referenceProfile
        ? [
            {
              strainId: latestCalculation.results.referenceProfile.strainId,
              role: 'Reference Mu3',
              auc: latestCalculation.results.referenceProfile.auc?.toFixed(3) ?? '—',
              mu3Auc: '—',
              ratio: '1.000',
              band: 'Same-run Mu3 baseline control',
            },
          ]
        : []),
      ...latestCalculation.results.testProfiles.map((tp) => ({
        strainId: tp.strainId,
        role: 'Test Isolate',
        auc: tp.auc?.toFixed(3) ?? '—',
        mu3Auc: latestCalculation.results.mu3Auc?.toFixed(3) ?? '—',
        ratio: tp.papAucRatio !== null ? tp.papAucRatio.toFixed(3) : 'N/A',
        band: tp.interpretationLabel,
      })),
    ];

    doc.setFont('helvetica', 'normal');
    for (const r of rowsToRender) {
      const bandLines = doc.splitTextToSize(r.band, contentW - 117);
      const rowH = Math.max(5.5, bandLines.length * 4 + 1.5);
      ensureSpace(rowH + 1);
      doc.setTextColor(15, 29, 46);
      doc.text(r.strainId, margin + 2, y + 3.8);
      doc.text(r.role, margin + 36, y + 3.8);
      doc.text(r.auc, margin + 68, y + 3.8, { align: 'right' });
      doc.text(r.mu3Auc, margin + 90, y + 3.8, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text(r.ratio, margin + 110, y + 3.8, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.text(bandLines, margin + 115, y + 3.8);
      y += rowH;
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y, pageW - margin, y);
    }
    y += 3;

    // Interpretation thresholds & source
    const thresholdText = `Configured Interpretation Thresholds: < ${latestCalculation.results.hvisaLowerThreshold.toFixed(
      2
    )} (below threshold); ${latestCalculation.results.hvisaLowerThreshold.toFixed(
      2
    )}–${latestCalculation.results.visaUpperThreshold.toFixed(
      2
    )} (compatible with hVISA range); > ${latestCalculation.results.visaUpperThreshold.toFixed(
      2
    )} (flagged for expert review). Source: ${latestCalculation.results.sourceCitation}.`;
    const thresholdLines = doc.splitTextToSize(thresholdText, contentW);
    ensureSpace(thresholdLines.length * 4 + 3);
    doc.setFontSize(7.8);
    doc.setTextColor(71, 85, 105);
    doc.text(thresholdLines, margin, y);
    y += thresholdLines.length * 3.8 + 4;
  }

  // Section 4: Quality Assurance Flags
  drawSectionHeading(`4. Quality Assurance Flags (${qaFlags.length})`);
  doc.setFontSize(8);
  if (qaFlags.length === 0) {
    doc.setTextColor(71, 85, 105);
    doc.text('No QA flags recorded.', margin, y);
    y += 5;
  } else {
    for (const flag of qaFlags) {
      const prefix = `[${flag.severity}] ${flag.code}${flag.rowReference ? ` (${flag.rowReference})` : ''}: `;
      const fullLines = doc.splitTextToSize(`${prefix}${flag.message}`, contentW);
      ensureSpace(fullLines.length * 3.8 + 2);
      doc.setTextColor(
        flag.severity === 'BLOCKING' ? 159 : flag.severity === 'WARNING' ? 146 : 15,
        flag.severity === 'BLOCKING' ? 18 : flag.severity === 'WARNING' ? 64 : 29,
        flag.severity === 'BLOCKING' ? 57 : flag.severity === 'WARNING' ? 14 : 46
      );
      doc.text(fullLines, margin, y);
      y += fullLines.length * 3.8 + 1.5;
    }
  }
  y += 3;

  // Section 5: Reviewer Comments & Review Status
  drawSectionHeading(`5. Review Sign-Off & Comments (${reviews.length})`);
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  if (reviews.length === 0) {
    doc.text(`Current Status: ${experiment.status} (Pending microbiologist QA sign-off)`, margin, y);
    y += 6;
  } else {
    for (const rev of reviews) {
      const header = `${rev.decision} by ${rev.reviewerId} (${new Date(rev.createdAt).toLocaleString()})`;
      const commentLines = rev.comment ? doc.splitTextToSize(rev.comment, contentW - 4) : [];
      ensureSpace(5 + commentLines.length * 3.8);
      doc.setFont('helvetica', 'bold');
      doc.text(header, margin, y);
      y += 4;
      if (commentLines.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.text(commentLines, margin + 3, y);
        y += commentLines.length * 3.8 + 1.5;
      }
    }
    y += 2;
  }

  // Section 6: Raw Observations & Derived Metrics
  drawSectionHeading(`6. Raw Observations & Derived Conversions (${observations.length} rows)`);
  ensureSpace(12);
  doc.setFillColor(235, 241, 246);
  doc.rect(margin, y, contentW, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Strain', margin + 2, y + 4);
  doc.text('Role', margin + 30, y + 4);
  doc.text('Conc', margin + 52, y + 4, { align: 'right' });
  doc.text('Rep', margin + 62, y + 4);
  doc.text('Dil', margin + 80, y + 4, { align: 'right' });
  doc.text('Vol', margin + 94, y + 4, { align: 'right' });
  doc.text('Count', margin + 108, y + 4, { align: 'right' });
  doc.text('CFU/mL', margin + 136, y + 4, { align: 'right' });
  doc.text('log10', margin + 154, y + 4, { align: 'right' });
  doc.text('Curve', margin + 174, y + 4, { align: 'right' });
  y += 7;

  doc.setFont('helvetica', 'normal');
  for (const obs of observations) {
    ensureSpace(5);
    const derived =
      latestCalculation?.results.observationDerived.find((d) => d.observationId === obs.id) ??
      computeObservationMetrics(obs, protocol.zeroColonyPolicy);
    doc.setTextColor(15, 29, 46);
    doc.text(obs.strainId.slice(0, 14), margin + 2, y + 3.2);
    doc.text(obs.strainRole === 'REFERENCE_MU3' ? 'MU3' : 'TEST', margin + 30, y + 3.2);
    doc.text(String(obs.vancomycinConcentrationMgL), margin + 52, y + 3.2, { align: 'right' });
    doc.text(obs.replicateId, margin + 62, y + 3.2);
    doc.text(String(obs.dilutionFraction), margin + 80, y + 3.2, { align: 'right' });
    doc.text(String(obs.platedVolumeMl), margin + 94, y + 3.2, { align: 'right' });
    doc.text(String(obs.colonyCount), margin + 108, y + 3.2, { align: 'right' });
    doc.text(
      derived.cfuPerMl !== null ? derived.cfuPerMl.toLocaleString('en-US', { maximumFractionDigits: 0 }) : 'Invalid',
      margin + 136,
      y + 3.2,
      { align: 'right' }
    );
    doc.text(
      derived.isZeroCensored
        ? 'censored'
        : derived.log10CfuPerMl !== null
        ? derived.log10CfuPerMl.toFixed(3)
        : '—',
      margin + 154,
      y + 3.2,
      { align: 'right' }
    );
    doc.text(
      derived.effectiveLog10ForCurve !== null ? derived.effectiveLog10ForCurve.toFixed(3) : 'excl',
      margin + 174,
      y + 3.2,
      { align: 'right' }
    );
    y += 4.3;
  }

  // Disclaimer Footer
  y += 5;
  const disclaimer = `Methodological Limitations & Scope: ${protocol.disclaimerText} Generated on ${new Date().toLocaleString()}.`;
  const discLines = doc.splitTextToSize(disclaimer, contentW);
  ensureSpace(discLines.length * 3.8 + 4);
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageW - margin, y);
  y += 4;
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(discLines, margin, y);

  doc.save(`${experiment.runId}_PAP_AUC_Report.pdf`);
}
