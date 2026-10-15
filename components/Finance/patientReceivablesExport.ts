import { fetchIdentity } from '../Documents/clinicIdentity';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
// O arquivo XLSX usa o padrão interno do Excel (ponto decimal e vírgula de milhar).
// O Excel aplica o idioma pt-BR ao abrir: "R$" vem antes do valor e zeros viram traço.
const BRL_FMT = '"R$" #,##0.00;[Red]"-R$" #,##0.00;-';

export interface PatientReceivablesExportRow {
  patient_name: string;
  status: 'active' | 'inactive';
  months: { amount: number }[];
  total_paid: number;
}

export interface PatientReceivablesExportFilters {
  year: string;
  statusLabel: string;
  search: string;
  monthLabel?: string;
}

const formatCnpjCpf = (value?: string) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 14) return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  if (digits.length === 11) return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  return value || '';
};

const formatPhone = (value?: string) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('55')) {
    const national = digits.slice(2);
    if (national.length === 11) return `+55 ${national.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')}`;
    if (national.length === 10) return `+55 ${national.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')}`;
  }
  if (digits.length === 11) return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  if (digits.length === 10) return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  return value || '';
};

const formatAddress = (value?: string) => String(value || '')
  .replace(/CEP\s*:?\s*(\d{5})-?(\d{3})/gi, 'CEP $1-$2');

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const addBorder = (cell: any) => {
  const border = { style: 'thin' as const, color: { argb: 'FFE2E8F0' } };
  cell.border = { top: border, left: border, right: border, bottom: border };
};

const createChartImage = (totals: number[]) => {
  const width = 1000;
  const height = 310;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#334155';
  ctx.font = '600 16px Arial';
  ctx.fillText('Recebimentos por mês', 32, 30);

  const chart = { x: 55, y: 55, width: 900, height: 195 };
  const max = Math.max(...totals, 1);
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  for (let index = 0; index < 4; index += 1) {
    const y = chart.y + (chart.height / 3) * index;
    ctx.beginPath();
    ctx.moveTo(chart.x, y);
    ctx.lineTo(chart.x + chart.width, y);
    ctx.stroke();
  }

  const slot = chart.width / MONTHS.length;
  const barWidth = Math.min(42, slot * 0.56);
  totals.forEach((total, index) => {
    const barHeight = Math.max(0, (total / max) * chart.height);
    const x = chart.x + slot * index + (slot - barWidth) / 2;
    const y = chart.y + chart.height - barHeight;
    ctx.fillStyle = '#4F46E5';
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, 5);
    ctx.fill();
    ctx.fillStyle = '#64748B';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(MONTHS[index], x + barWidth / 2, chart.y + chart.height + 22);
  });
  ctx.textAlign = 'left';
  return canvas.toDataURL('image/png');
};

export async function exportPatientReceivablesReport(
  patients: PatientReceivablesExportRow[],
  totals: number[],
  filters: PatientReceivablesExportFilters,
) {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Plaelo';
  workbook.created = new Date();
  const identity = await fetchIdentity().catch(() => null);
  const clinic = identity?.clinic;
  const professional = identity?.professional;
  const totalReceived = totals.reduce((sum, value) => sum + value, 0);
  const withPayments = patients.filter(patient => patient.total_paid > 0.004).length;

  const summary = workbook.addWorksheet('Resumo', { views: [{ showGridLines: false }] });
  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'].forEach(column => { summary.getColumn(column).width = 14; });
  summary.getColumn('A').width = 23;
  summary.getColumn('B').width = 23;

  summary.mergeCells('A1:N1');
  const title = summary.getCell('A1');
  title.value = 'RELATÓRIO DE RECEBIMENTOS POR PACIENTE';
  title.font = { name: 'Calibri', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  title.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  summary.getRow(1).height = 34;

  summary.mergeCells('A2:N2');
  const subtitle = summary.getCell('A2');
  subtitle.value = 'Recebimentos efetivamente registrados no Livro Caixa';
  subtitle.font = { name: 'Calibri', size: 10, color: { argb: 'FF475569' } };
  subtitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  subtitle.alignment = { vertical: 'middle', indent: 1 };
  summary.getRow(2).height = 23;

  const cnpjCpf = formatCnpjCpf(clinic?.cnpj);
  const documentLabel = cnpjCpf.replace(/\D/g, '').length === 11 ? 'CPF' : 'CNPJ';
  const identityRange = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  for (let row = 4; row <= 10; row += 1) identityRange.forEach(column => {
    const cell = summary.getCell(`${column}${row}`);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: row === 4 ? 'FFEEF2FF' : 'FFFAFCFF' } };
    addBorder(cell);
  });

  if (clinic?.logo?.dataUrl) {
    try {
      const logoId = workbook.addImage({
        base64: clinic.logo.dataUrl,
        extension: clinic.logo.format === 'JPEG' ? 'jpeg' : 'png',
      });
      // O logo pertence ao cartão de identificação da clínica, e não fica solto no título.
      summary.addImage(logoId, { tl: { col: 0.35, row: 3.45 }, ext: { width: 116, height: 58 } });
    } catch { /* arquivo de logo inválido não impede a exportação */ }
  }
  summary.mergeCells('C4:G4');
  const clinicName = summary.getCell('C4');
  clinicName.value = clinic?.name || 'Clínica';
  clinicName.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF1E293B' } };
  clinicName.alignment = { vertical: 'middle', indent: 1 };

  summary.mergeCells('C5:G5');
  const clinicLegal = summary.getCell('C5');
  clinicLegal.value = clinic?.legalName || 'Dados institucionais da clínica';
  clinicLegal.font = { name: 'Calibri', size: 9, color: { argb: 'FF64748B' } };
  clinicLegal.alignment = { vertical: 'middle', indent: 1 };

  summary.mergeCells('C6:E6');
  summary.mergeCells('F6:G6');
  const clinicDocument = summary.getCell('C6');
  clinicDocument.value = `${documentLabel}: ${cnpjCpf || 'Não informado'}`;
  clinicDocument.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF334155' } };
  clinicDocument.alignment = { vertical: 'middle', indent: 1 };
  const clinicPhone = summary.getCell('F6');
  clinicPhone.value = formatPhone(clinic?.phone) || 'Telefone não informado';
  clinicPhone.font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };
  clinicPhone.alignment = { vertical: 'middle', indent: 1 };

  summary.mergeCells('C7:G7');
  const clinicEmail = summary.getCell('C7');
  clinicEmail.value = clinic?.email || 'E-mail não informado';
  clinicEmail.font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };
  clinicEmail.alignment = { vertical: 'middle', indent: 1 };

  summary.mergeCells('A8:G9');
  const clinicAddress = summary.getCell('A8');
  clinicAddress.value = `Endereço: ${formatAddress(clinic?.address) || 'Não informado'}`;
  clinicAddress.font = { name: 'Calibri', size: 10, color: { argb: 'FF334155' } };
  clinicAddress.alignment = { vertical: 'middle', indent: 1, wrapText: true };

  summary.mergeCells('A10:G10');
  const clinicResponsible = summary.getCell('A10');
  clinicResponsible.value = `Responsável: ${professional?.name || 'Não informado'}`;
  clinicResponsible.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF334155' } };
  clinicResponsible.alignment = { vertical: 'middle', indent: 1 };
  summary.getRow(4).height = 24;
  summary.getRow(5).height = 18;
  summary.getRow(6).height = 20;
  summary.getRow(7).height = 20;
  summary.getRow(8).height = 20;
  summary.getRow(9).height = 20;
  summary.getRow(10).height = 20;

  summary.mergeCells('I4:N4');
  const filterTitle = summary.getCell('I4');
  filterTitle.value = 'FILTROS APLICADOS';
  filterTitle.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF475569' } };
  filterTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  filterTitle.alignment = { vertical: 'middle', indent: 1 };
  const filtersText = [
    `Ano: ${filters.year}`,
    `Situação: ${filters.statusLabel}`,
    filters.monthLabel ? `Mês: pagantes em ${filters.monthLabel}` : 'Mês: todos',
    `Busca: ${filters.search || 'sem busca'}`,
    `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
  ].join('\n');
  summary.mergeCells('I5:N10');
  const filterValue = summary.getCell('I5');
  filterValue.value = filtersText;
  filterValue.font = { name: 'Calibri', size: 10, color: { argb: 'FF0F172A' } };
  filterValue.alignment = { vertical: 'middle', indent: 1, wrapText: true };
  for (let row = 4; row <= 10; row += 1) ['I', 'J', 'K', 'L', 'M', 'N'].forEach(column => {
    const cell = summary.getCell(`${column}${row}`);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: row === 4 ? 'FFF1F5F9' : 'FFFAFCFF' } };
    addBorder(cell);
  });

  const cards = [
    { label: 'TOTAL RECEBIDO', value: totalReceived, color: 'FF059669', background: 'FFECFDF5' },
    { label: 'PACIENTES PAGANTES', value: withPayments, color: 'FF4F46E5', background: 'FFEEF2FF' },
    { label: 'PACIENTES EXIBIDOS', value: patients.length, color: 'FF0369A1', background: 'FFF0F9FF' },
  ];
  cards.forEach((card, index) => {
    const startColumn = ['A', 'E', 'I'][index];
    const endColumn = ['D', 'H', 'N'][index];
    summary.mergeCells(`${startColumn}12:${endColumn}12`);
    summary.mergeCells(`${startColumn}13:${endColumn}14`);
    const label = summary.getCell(`${startColumn}12`);
    label.value = card.label;
    label.font = { name: 'Calibri', size: 9, bold: true, color: { argb: card.color } };
    label.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: card.background } };
    label.alignment = { vertical: 'middle', horizontal: 'center' };
    const value = summary.getCell(`${startColumn}13`);
    value.value = card.value;
    if (index === 0) value.numFmt = BRL_FMT;
    value.font = { name: 'Calibri', size: 18, bold: true, color: { argb: card.color } };
    value.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: card.background } };
    value.alignment = { vertical: 'middle', horizontal: 'center' };
    for (let row = 12; row <= 14; row += 1) {
      for (let column = startColumn.charCodeAt(0); column <= endColumn.charCodeAt(0); column += 1) addBorder(summary.getCell(`${String.fromCharCode(column)}${row}`));
    }
  });
  summary.getRow(12).height = 20;
  summary.getRow(13).height = 24;
  summary.getRow(14).height = 18;

  const chartImage = createChartImage(totals);
  if (chartImage) {
    const chartId = workbook.addImage({ base64: chartImage, extension: 'png' });
    summary.addImage(chartId, { tl: { col: 0, row: 15 }, ext: { width: 900, height: 279 } });
  }

  const dataSheet = workbook.addWorksheet('Pacientes');
  dataSheet.views = [{ state: 'frozen', ySplit: 1, xSplit: 2, showGridLines: false }];
  dataSheet.columns = [
    { header: 'PACIENTE', key: 'patient', width: 38 },
    { header: 'SITUAÇÃO', key: 'status', width: 15 },
    ...MONTHS.map(month => ({ header: month.toUpperCase(), key: month, width: 15 })),
    { header: 'TOTAL RECEBIDO', key: 'total', width: 20 },
  ];
  const header = dataSheet.getRow(1);
  header.height = 27;
  header.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    addBorder(cell);
  });

  patients.forEach((patient, index) => {
    const row = dataSheet.addRow({
      patient: patient.patient_name,
      status: patient.status === 'active' ? 'Ativo' : 'Inativo',
      ...Object.fromEntries(MONTHS.map((month, monthIndex) => [month, patient.months[monthIndex]?.amount || 0])),
      total: patient.total_paid,
    });
    row.height = 19;
    row.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: index % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF' } };
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF0F172A' } };
      cell.alignment = { vertical: 'middle' };
      addBorder(cell);
    });
    row.getCell('status').alignment = { horizontal: 'center', vertical: 'middle' };
    if (patient.status === 'active') row.getCell('status').font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF059669' } };
    for (let column = 3; column <= 15; column += 1) {
      const cell = row.getCell(column);
      cell.numFmt = BRL_FMT;
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      if (Number(cell.value || 0) > 0) cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF047857' } };
    }
  });

  const totalRow = dataSheet.addRow({
    patient: 'TOTAL DO FILTRO',
    status: `${patients.length} paciente${patients.length === 1 ? '' : 's'}`,
    ...Object.fromEntries(MONTHS.map((month, index) => [month, totals[index] || 0])),
    total: totalReceived,
  });
  totalRow.height = 24;
  totalRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle' };
    addBorder(cell);
  });
  for (let column = 3; column <= 15; column += 1) {
    const cell = totalRow.getCell(column);
    cell.numFmt = BRL_FMT;
    cell.alignment = { horizontal: 'right', vertical: 'middle' };
  }
  dataSheet.autoFilter = { from: 'A1', to: 'O1' };

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `relatorio-recebimentos-pacientes-${filters.year}.xlsx`,
  );
}
