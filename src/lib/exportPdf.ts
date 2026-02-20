import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type TaskRow = {
  title: string;
  project: string;
  consultant: string;
  statusLabel: string;
  deadlineLabel: string;
  durationLabel: string;
};

type ExportOptions = {
  title?: string;
  subtitle?: string;
  fileName?: string;
  tasks: TaskRow[];
  generatedBy?: string;
  stats?: {
    total: number;
    done: number;
    overdue: number;
    pending: number;
    totalHours?: string;
  };
};

/** Load logo as base64 for PDF embedding */
async function loadLogoBase64(): Promise<string | null> {
  try {
    const response = await fetch("/resouce/ISP-Consulte-v3-branco.png");
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Draw logo with correct aspect ratio */
function drawLogo(doc: jsPDF, logo: string, pageW: number) {
  try {
    const h = 10;
    const w = h * 3.6;
    const x = pageW - w - 10;
    const y = (28 - h) / 2;
    doc.addImage(logo, "PNG", x, y, w, h);
  } catch {
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("ISP Consulte", pageW - 14, 13, { align: "right" });
  }
}

/** Draw a simple horizontal bar chart */
function drawBarChart(
  doc: jsPDF, x: number, y: number, width: number, height: number,
  data: { label: string; value: number; color: number[] }[], title: string
) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barGap = 4;
  const labelH = 12;
  const chartH = height - labelH - 10;
  const barW = (width - barGap * (data.length + 1)) / data.length;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 27, 75);
  doc.text(title, x, y + 6);

  data.forEach((d, i) => {
    const bx = x + barGap + i * (barW + barGap);
    const bh = (d.value / maxVal) * chartH;
    const by = y + 10 + (chartH - bh);
    doc.setFillColor(d.color[0], d.color[1], d.color[2]);
    doc.roundedRect(bx, by, barW, bh, 1, 1, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(d.color[0], d.color[1], d.color[2]);
    doc.text(String(d.value), bx + barW / 2, by - 2, { align: "center" });
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 120);
    const label = d.label.length > 10 ? d.label.slice(0, 9) + "…" : d.label;
    doc.text(label, bx + barW / 2, y + 10 + chartH + 6, { align: "center" });
  });
}

/** Draw a donut chart */
function drawDonutChart(
  doc: jsPDF, cx: number, cy: number, r: number,
  data: { label: string; value: number; color: number[] }[]
) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return;

  let startAngle = -Math.PI / 2;
  data.forEach((d) => {
    const sliceAngle = (d.value / total) * 2 * Math.PI;
    doc.setFillColor(d.color[0], d.color[1], d.color[2]);
    const points: number[][] = [[cx, cy]];
    const steps = Math.max(8, Math.ceil(sliceAngle * 20));
    for (let s = 0; s <= steps; s++) {
      const a = startAngle + (s / steps) * sliceAngle;
      points.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    for (let s = 1; s < points.length - 1; s++) {
      doc.triangle(points[0][0], points[0][1], points[s][0], points[s][1], points[s + 1][0], points[s + 1][1], "F");
    }
    startAngle += sliceAngle;
  });

  doc.setFillColor(255, 255, 255);
  const inner = r * 0.55;
  const cSteps = 40;
  for (let s = 0; s < cSteps; s++) {
    const a1 = (s / cSteps) * 2 * Math.PI;
    const a2 = ((s + 1) / cSteps) * 2 * Math.PI;
    doc.triangle(cx, cy, cx + inner * Math.cos(a1), cy + inner * Math.sin(a1), cx + inner * Math.cos(a2), cy + inner * Math.sin(a2), "F");
  }

  const legendX = cx + r + 6;
  data.forEach((d, i) => {
    const ly = cy - r + i * 10 + 2;
    doc.setFillColor(d.color[0], d.color[1], d.color[2]);
    doc.roundedRect(legendX, ly, 4, 4, 0.5, 0.5, "F");
    doc.setFontSize(6);
    doc.setTextColor(60, 60, 80);
    const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
    doc.text(`${d.label} (${pct}%)`, legendX + 6, ly + 3.5);
  });
}

/** Draw a horizontal bar chart for completion % by project (replaces buggy area chart) */
function drawHorizontalCompletionChart(
  doc: jsPDF, x: number, y: number, width: number, height: number,
  tasks: TaskRow[], title: string
) {
  // Group by project and compute completion rate
  const projectMap = new Map<string, { total: number; done: number; overdue: number }>();
  tasks.forEach((t) => {
    const p = t.project || "Sem projeto";
    const cur = projectMap.get(p) ?? { total: 0, done: 0, overdue: 0 };
    cur.total += 1;
    if (t.statusLabel === "Concluída" || t.statusLabel === "Done") cur.done += 1;
    if (t.statusLabel === "Atrasada" || t.statusLabel === "Overdue") cur.overdue += 1;
    projectMap.set(p, cur);
  });

  const data = Array.from(projectMap.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 8)
    .map(([name, { total, done, overdue }]) => ({
      label: name.length > 22 ? name.slice(0, 21) + "…" : name,
      pct: total > 0 ? Math.round((done / total) * 100) : 0,
      overdue,
      total,
    }));

  if (data.length === 0) return;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 27, 75);
  doc.text(title, x, y + 6);

  const startY = y + 12;
  const rowH = Math.min((height - 14) / data.length, 8);
  const labelW = 52;
  const barMaxW = width - labelW - 20;

  data.forEach((d, i) => {
    const ry = startY + i * rowH;

    // Label
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 70);
    doc.text(d.label, x, ry + rowH * 0.65);

    // Background track
    const bx = x + labelW;
    const bh = rowH * 0.55;
    const by = ry + rowH * 0.2;
    doc.setFillColor(230, 230, 240);
    doc.roundedRect(bx, by, barMaxW, bh, 0.8, 0.8, "F");

    // Completion bar (green)
    if (d.pct > 0) {
      const fillW = (d.pct / 100) * barMaxW;
      const color: [number, number, number] = d.pct >= 80 ? [34, 197, 94] : d.pct >= 50 ? [250, 204, 21] : [239, 68, 68];
      doc.setFillColor(...color);
      doc.roundedRect(bx, by, fillW, bh, 0.8, 0.8, "F");
    }

    // Percentage label
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 70);
    doc.text(`${d.pct}%`, bx + barMaxW + 3, ry + rowH * 0.65);
  });
}

function drawFooter(doc: jsPDF, pageW: number, now: string, generatedBy?: string) {
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 170);
  const footer = generatedBy
    ? `ISP Consulte — Gerado por ${generatedBy} em ${now}`
    : `ISP Consulte — ${now}`;
  doc.text(footer, 14, pageH - 6);
  doc.text(`Página ${doc.getCurrentPageInfo().pageNumber}`, pageW - 14, pageH - 6, { align: "right" });
}

export async function exportTasksPDF({
  title = "Relatório de Tarefas",
  subtitle,
  fileName = "relatorio-tarefas.pdf",
  tasks,
  stats,
  generatedBy,
}: ExportOptions) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const now = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const logo = await loadLogoBase64();

  // Header bar
  doc.setFillColor(30, 27, 75);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 13);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const subLine = generatedBy
    ? `Gerado por ${generatedBy} em ${now}`
    : subtitle || `Gerado em ${now}`;
  doc.text(subLine, 14, 20);

  if (logo) drawLogo(doc, logo, pageW);
  else {
    doc.setFontSize(8); doc.setTextColor(255, 255, 255);
    doc.text("ISP Consulte", pageW - 14, 13, { align: "right" });
  }

  let yPos = 34;

  // Stats cards
  if (stats) {
    const cards = [
      { label: "Total", value: String(stats.total), color: [99, 102, 241] },
      { label: "Concluídas", value: String(stats.done), color: [34, 197, 94] },
      { label: "Em Andamento", value: String(stats.pending), color: [250, 204, 21] },
      { label: "Atrasadas", value: String(stats.overdue), color: [239, 68, 68] },
    ];
    if (stats.totalHours) {
      cards.push({ label: "Horas Totais", value: stats.totalHours, color: [139, 92, 246] });
    }

    const cardW = (pageW - 28 - (cards.length - 1) * 4) / cards.length;
    cards.forEach((card, i) => {
      const x = 14 + i * (cardW + 4);
      doc.setFillColor(card.color[0], card.color[1], card.color[2]);
      doc.roundedRect(x, yPos, cardW, 16, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(card.value, x + cardW / 2, yPos + 8, { align: "center" });
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(card.label, x + cardW / 2, yPos + 13, { align: "center" });
    });
    yPos += 22;

    // Row 1: Status donut + Tasks by project bar chart
    const chartData = [
      { label: "Concluídas", value: stats.done, color: [34, 197, 94] },
      { label: "Andamento", value: stats.pending, color: [250, 204, 21] },
      { label: "Atrasadas", value: stats.overdue, color: [239, 68, 68] },
    ];

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 27, 75);
    doc.text("Distribuição por Status", 14, yPos + 4);
    drawDonutChart(doc, 50, yPos + 26, 16, chartData);

    // Bar chart — tasks by top 6 projects
    const projectCounts = new Map<string, number>();
    tasks.forEach((t) => {
      const p = t.project || "Sem projeto";
      projectCounts.set(p, (projectCounts.get(p) ?? 0) + 1);
    });
    const topProjects = Array.from(projectCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map((e, i) => ({
        label: e[0],
        value: e[1],
        color: [[99, 102, 241], [34, 197, 94], [250, 204, 21], [139, 92, 246], [239, 68, 68], [59, 130, 246]][i % 6],
      }));

    if (topProjects.length > 0) {
      drawBarChart(doc, 110, yPos, (pageW - 124) / 2, 44, topProjects, "Tarefas por Projeto");
    }

    // Bar chart — tasks by consultant
    const consultantCounts = new Map<string, number>();
    tasks.forEach((t) => {
      const c = t.consultant || "Não atribuído";
      consultantCounts.set(c, (consultantCounts.get(c) ?? 0) + 1);
    });
    const topConsultants = Array.from(consultantCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map((e, i) => ({
        label: e[0],
        value: e[1],
        color: [[59, 130, 246], [139, 92, 246], [34, 197, 94], [250, 204, 21], [239, 68, 68]][i % 5],
      }));

    if (topConsultants.length > 0) {
      const chartX = 110 + (pageW - 124) / 2 + 8;
      drawBarChart(doc, chartX, yPos, (pageW - 124) / 2 - 8, 44, topConsultants, "Tarefas por Responsável");
    }

    yPos += 50;

    // Row 2: Performance chart — completion % by project
    if (tasks.length >= 2) {
      drawHorizontalCompletionChart(doc, 14, yPos, pageW - 28, 48, tasks, "Conclusão por Projeto (%)");
      yPos += 54;
    }
  }

  // Table
  const tableBody = tasks.map((t) => [
    t.title, t.project, t.consultant, t.statusLabel, t.deadlineLabel, t.durationLabel,
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [["Tarefa", "Projeto", "Responsável", "Status", "Prazo", "Duração"]],
    body: tableBody,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 3, textColor: [30, 27, 75], lineColor: [200, 200, 220], lineWidth: 0.2 },
    headStyles: { fillColor: [30, 27, 75], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 245, 255] },
    columnStyles: {
      0: { cellWidth: "auto", fontStyle: "bold" },
      3: { halign: "center", cellWidth: 25 },
      4: { halign: "center", cellWidth: 25 },
      5: { halign: "center", cellWidth: 22 },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: () => drawFooter(doc, pageW, now, generatedBy),
  });

  doc.save(fileName);
}

type AnalyticsExportOptions = {
  generatedBy?: string;
  userName?: string;
  period?: string;
  fileName?: string;
  projects: Array<{
    name: string;
    totalTasks: number;
    doneTasks: number;
    overdueTasks: number;
    hours: number;
    hoursContracted?: number;
  }>;
  totals: {
    projects: number;
    tasks: number;
    done: number;
    overdue: number;
    hours: number;
  };
};

type ClientExportOptions = {
  clientName: string;
  generatedBy?: string;
  period?: string;
  fileName?: string;
  projects: Array<{
    name: string;
    totalTasks: number;
    doneTasks: number;
    overdueTasks: number;
    hours: number;
    hoursContracted: number;
  }>;
};

/** Draws a horizontal hours bar for contracted vs used */
function drawClientHoursBar(
  doc: jsPDF, x: number, y: number, width: number,
  used: number, contracted: number, label: string
) {
  const pct = contracted > 0 ? Math.min(100, Math.round((used / contracted) * 100)) : 0;
  const color: [number, number, number] =
    pct >= 90 ? [239, 68, 68] : pct >= 70 ? [250, 204, 21] : [34, 197, 94];

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50, 50, 70);
  doc.text(label, x, y + 4);

  const bx = x + 48;
  const bw = width - 48 - 28;
  doc.setFillColor(220, 220, 235);
  doc.roundedRect(bx, y, bw, 4, 0.8, 0.8, "F");
  if (pct > 0) {
    doc.setFillColor(...color);
    doc.roundedRect(bx, y, (pct / 100) * bw, 4, 0.8, 0.8, "F");
  }

  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(color[0], color[1], color[2]);
  const hoursText = contracted > 0
    ? `${Math.round(used)}h / ${Math.round(contracted)}h (${pct}%)`
    : `${Math.round(used)}h`;
  doc.text(hoursText, bx + bw + 3, y + 3.5);
}

export async function exportClientPDF({
  clientName,
  period,
  generatedBy,
  fileName,
  projects,
}: ClientExportOptions) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const now = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const logo = await loadLogoBase64();
  const safeFileName = fileName ?? `relatorio-${clientName.toLowerCase().replace(/[^a-z0-9]/g, "-")}.pdf`;

  // Header
  doc.setFillColor(30, 27, 75);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`Relatório — ${clientName}`, 14, 12);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  const subLine = [generatedBy ? `Gerado por ${generatedBy}` : null, period, now]
    .filter(Boolean).join(" · ");
  doc.text(subLine, 14, 21);
  if (logo) drawLogo(doc, logo, pageW);

  let yPos = 34;

  // Totals
  const totalTasks = projects.reduce((s, p) => s + p.totalTasks, 0);
  const totalDone  = projects.reduce((s, p) => s + p.doneTasks, 0);
  const totalOver  = projects.reduce((s, p) => s + p.overdueTasks, 0);
  const totalHours = projects.reduce((s, p) => s + p.hours, 0);
  const totalContr = projects.reduce((s, p) => s + (p.hoursContracted || 0), 0);

  const cards = [
    { label: "Projetos",    value: String(projects.length),       color: [99, 102, 241]  as [number,number,number] },
    { label: "Tarefas",     value: String(totalTasks),            color: [59, 130, 246]  as [number,number,number] },
    { label: "Concluídas",  value: String(totalDone),             color: [34, 197, 94]   as [number,number,number] },
    { label: "Atrasadas",   value: String(totalOver),             color: [239, 68, 68]   as [number,number,number] },
    { label: "Horas usadas",value: `${Math.round(totalHours)}h`,  color: [139, 92, 246]  as [number,number,number] },
  ];

  const cardW = (pageW - 28 - 4 * 4) / 5;
  cards.forEach((card, i) => {
    const x = 14 + i * (cardW + 4);
    doc.setFillColor(...card.color);
    doc.roundedRect(x, yPos, cardW, 16, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(card.value, x + cardW / 2, yPos + 8, { align: "center" });
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.text(card.label, x + cardW / 2, yPos + 13, { align: "center" });
  });
  yPos += 22;

  // Completion donut
  const completionData = [
    { label: "Concluídas", value: totalDone,                          color: [34, 197, 94]  },
    { label: "Andamento",  value: totalTasks - totalDone - totalOver, color: [250, 204, 21] },
    { label: "Atrasadas",  value: totalOver,                          color: [239, 68, 68]  },
  ];
  doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 27, 75);
  doc.text("Status das Tarefas", 14, yPos + 4);
  drawDonutChart(doc, 50, yPos + 26, 16, completionData);

  // Hours bar chart by project (right side)
  const hoursData = [...projects]
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 6)
    .map((p, i) => ({
      label: p.name,
      value: Math.round(p.hours),
      color: [[99,102,241],[34,197,94],[250,204,21],[139,92,246],[239,68,68],[59,130,246]][i % 6] as number[],
    }));
  if (hoursData.length > 0) {
    drawBarChart(doc, 110, yPos, pageW - 124, 44, hoursData, "Horas por Projeto");
  }
  yPos += 52;

  // Hours progress bars per project
  if (totalContr > 0) {
    doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 27, 75);
    doc.text("Consumo de Horas Contratadas", 14, yPos);
    yPos += 6;
    projects.forEach((p) => {
      drawClientHoursBar(doc, 14, yPos, pageW - 28, p.hours, p.hoursContracted, p.name);
      yPos += 8;
    });
    yPos += 4;
  }

  // Projects table
  const tableBody = projects.map((p) => {
    const completion = p.totalTasks > 0 ? Math.round((p.doneTasks / p.totalTasks) * 100) : 0;
    const hoursLeft  = p.hoursContracted > 0 ? Math.round(p.hoursContracted - p.hours) : "—";
    return [
      p.name,
      String(p.totalTasks),
      String(p.doneTasks),
      String(p.overdueTasks),
      `${Math.round(p.hours)}h`,
      p.hoursContracted > 0 ? `${p.hoursContracted}h` : "—",
      typeof hoursLeft === "number" ? `${hoursLeft}h` : "—",
      `${completion}%`,
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [["Projeto", "Tarefas", "Concluídas", "Atrasadas", "Horas Usadas", "Contratadas", "Restam", "Conclusão"]],
    body: tableBody,
    theme: "grid",
    styles: { fontSize: 7.5, cellPadding: 2.5, textColor: [30, 27, 75], lineColor: [200, 200, 220], lineWidth: 0.2 },
    headStyles: { fillColor: [30, 27, 75], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5 },
    alternateRowStyles: { fillColor: [245, 245, 255] },
    columnStyles: {
      0: { cellWidth: "auto", fontStyle: "bold" },
      1: { halign: "center", cellWidth: 18 },
      2: { halign: "center", cellWidth: 22 },
      3: { halign: "center", cellWidth: 20 },
      4: { halign: "center", cellWidth: 22 },
      5: { halign: "center", cellWidth: 22 },
      6: { halign: "center", cellWidth: 18 },
      7: { halign: "center", cellWidth: 20 },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: () => drawFooter(doc, pageW, now, generatedBy),
  });

  doc.save(safeFileName);
}

export async function exportAnalyticsPDF({
  userName,
  period,
  fileName = "relatorio-analiticas.pdf",
  projects,
  totals,
  generatedBy,
}: AnalyticsExportOptions) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const now = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const logo = await loadLogoBase64();

  // Header
  doc.setFillColor(30, 27, 75);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório de Analíticas", 14, 13);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const subLine = generatedBy
    ? `Gerado por ${generatedBy} em ${now}`
    : [userName, period].filter(Boolean).join(" · ") || now;
  doc.text(subLine, 14, 20);

  if (logo) drawLogo(doc, logo, pageW);
  else {
    doc.setFontSize(8); doc.setTextColor(255, 255, 255);
    doc.text("ISP Consulte", pageW - 14, 13, { align: "right" });
  }

  let yPos = 34;

  // Totals
  const cards = [
    { label: "Projetos", value: String(totals.projects), color: [99, 102, 241] },
    { label: "Tarefas", value: String(totals.tasks), color: [59, 130, 246] },
    { label: "Concluídas", value: String(totals.done), color: [34, 197, 94] },
    { label: "Atrasadas", value: String(totals.overdue), color: [239, 68, 68] },
    { label: "Horas", value: `${Math.round(totals.hours)}h`, color: [139, 92, 246] },
  ];

  const cardW = (pageW - 28 - 4 * 4) / 5;
  cards.forEach((card, i) => {
    const x = 14 + i * (cardW + 4);
    doc.setFillColor(card.color[0], card.color[1], card.color[2]);
    doc.roundedRect(x, yPos, cardW, 16, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(card.value, x + cardW / 2, yPos + 8, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(card.label, x + cardW / 2, yPos + 13, { align: "center" });
  });
  yPos += 22;

  // Charts — completion donut + hours bar
  const completionData = [
    { label: "Concluídas", value: totals.done, color: [34, 197, 94] },
    { label: "Pendentes", value: totals.tasks - totals.done - totals.overdue, color: [250, 204, 21] },
    { label: "Atrasadas", value: totals.overdue, color: [239, 68, 68] },
  ];

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 27, 75);
  doc.text("Status Geral", 14, yPos + 4);
  drawDonutChart(doc, 50, yPos + 26, 16, completionData);

  // Bar chart — hours by top projects
  const topByHours = [...projects]
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 6)
    .map((p, i) => ({
      label: p.name,
      value: Math.round(p.hours),
      color: [[99, 102, 241], [34, 197, 94], [250, 204, 21], [139, 92, 246], [239, 68, 68], [59, 130, 246]][i % 6],
    }));

  if (topByHours.length > 0) {
    drawBarChart(doc, 110, yPos, pageW - 124, 44, topByHours, "Horas por Projeto");
  }
  yPos += 50;

  // Projects table
  const tableBody = projects.map((p) => {
    const completion = p.totalTasks > 0 ? Math.round((p.doneTasks / p.totalTasks) * 100) : 0;
    return [p.name, String(p.totalTasks), String(p.doneTasks), String(p.overdueTasks), `${Math.round(p.hours)}h`, `${completion}%`];
  });

  autoTable(doc, {
    startY: yPos,
    head: [["Projeto", "Tarefas", "Concluídas", "Atrasadas", "Horas", "Conclusão"]],
    body: tableBody,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 3, textColor: [30, 27, 75], lineColor: [200, 200, 220], lineWidth: 0.2 },
    headStyles: { fillColor: [30, 27, 75], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 245, 255] },
    columnStyles: {
      0: { cellWidth: "auto", fontStyle: "bold" },
      1: { halign: "center", cellWidth: 20 },
      2: { halign: "center", cellWidth: 22 },
      3: { halign: "center", cellWidth: 22 },
      4: { halign: "center", cellWidth: 20 },
      5: { halign: "center", cellWidth: 22 },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: () => drawFooter(doc, pageW, now, generatedBy),
  });

  doc.save(fileName);
}
