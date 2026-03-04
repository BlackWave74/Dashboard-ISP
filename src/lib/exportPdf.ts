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

/* ═══════════════════════════════════════════════
 * Page break helper — ensures a section fits on
 * the current page, otherwise adds a new page.
 * Returns the Y position to draw at.
 * ═══════════════════════════════════════════════ */
function ensureSpace(doc: jsPDF, currentY: number, neededHeight: number, margin = 14): number {
  const pageH = doc.internal.pageSize.getHeight();
  const available = pageH - margin - currentY;
  if (neededHeight > available && currentY > margin + 32) {
    doc.addPage();
    drawPageBg(doc);
    return margin;
  }
  return currentY;
}

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
  doc.setTextColor(200, 200, 230);
  doc.text(title, x, y + 6);

  const titleYEnd = y + 10; // spacing below title so numbers don't touch it

  data.forEach((d, i) => {
    const bx = x + barGap + i * (barW + barGap);
    const bh = (d.value / maxVal) * (chartH - 4);
    const by = titleYEnd + 4 + (chartH - 4 - bh);
    doc.setFillColor(d.color[0], d.color[1], d.color[2]);
    doc.roundedRect(bx, by, barW, bh, 1, 1, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(d.color[0], d.color[1], d.color[2]);
    doc.text(String(d.value), bx + barW / 2, by - 2.5, { align: "center" });
    doc.setFontSize(5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160, 160, 190);
    const maxLabelLen = Math.max(8, Math.floor(barW / 1.8));
    const label = d.label.length > maxLabelLen ? d.label.slice(0, maxLabelLen - 1) + "…" : d.label;
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

  doc.setFillColor(18, 16, 42); // match dark page bg
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
    doc.setTextColor(180, 180, 210);
    const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
    doc.text(`${d.label} (${pct}%)`, legendX + 6, ly + 3.5);
  });
}

/** Paint the entire page with the dark background */
function drawPageBg(doc: jsPDF) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFillColor(18, 16, 42); // dark indigo matching the app
  doc.rect(0, 0, pageW, pageH, "F");
}

function drawFooter(doc: jsPDF, pageW: number, now: string, generatedBy?: string) {
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 180);
  const footer = generatedBy
    ? `ISP Consulte — Gerado por ${generatedBy} em ${now}`
    : `ISP Consulte — ${now}`;
  doc.text(footer, 14, pageH - 6);
  doc.text(`Página ${doc.getCurrentPageInfo().pageNumber}`, pageW - 14, pageH - 6, { align: "right" });
}

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
  doc.setTextColor(180, 180, 210);
  const shortLabel = label.length > 24 ? label.slice(0, 23) + "…" : label;
  doc.text(shortLabel, x, y + 4);

  const bx = x + 48;
  const bw = width - 48 - 28;
  doc.setFillColor(40, 38, 70);
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

/* ═══════════════════════════════════════════════
 * EXPORT: Tasks PDF
 * ═══════════════════════════════════════════════ */
export async function exportTasksPDF({
  title = "Relatório de Tarefas",
  subtitle,
  fileName = "relatorio-tarefas.pdf",
  tasks,
  stats,
  generatedBy,
}: ExportOptions) {
  const projectNames = new Set(tasks.map(t => t.project).filter(Boolean));
  const dynamicTitle = projectNames.size === 1
    ? `Relatório — ${[...projectNames][0]}`
    : title;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const now = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const logo = await loadLogoBase64();

  // Dark page background
  drawPageBg(doc);

  // Header bar
  doc.setFillColor(24, 22, 60);
  doc.rect(0, 0, pageW, 30, "F");
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 30, pageW, 1.2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(dynamicTitle, 14, 14);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 180, 210);
  const subLine = generatedBy
    ? `Gerado por ${generatedBy} em ${now}`
    : subtitle || `Gerado em ${now}`;
  doc.text(subLine, 14, 22);

  if (logo) drawLogo(doc, logo, pageW);
  else {
    doc.setFontSize(8); doc.setTextColor(255, 255, 255);
    doc.text("ISP Consulte", pageW - 14, 13, { align: "right" });
  }

  let yPos = 38;

  // Stats cards
  if (stats) {
    const cards = [
      { label: "Total", value: String(stats.total), color: [80, 85, 140] },
      { label: "Concluído", value: String(stats.done), color: [34, 197, 94] },
      { label: "Em Andamento", value: String(stats.pending), color: [100, 116, 139] },
      { label: "Atrasado", value: String(stats.overdue), color: [239, 68, 68] },
    ];
    if (stats.totalHours) {
      cards.push({ label: "Horas Totais", value: stats.totalHours, color: [139, 92, 246] });
    }

    // Cards section needs ~24mm
    yPos = ensureSpace(doc, yPos, 24);

    const cardW = (pageW - 28 - (cards.length - 1) * 5) / cards.length;
    cards.forEach((card, i) => {
      const x = 14 + i * (cardW + 5);
      doc.setFillColor(card.color[0], card.color[1], card.color[2]);
      doc.roundedRect(x, yPos, cardW, 18, 2.5, 2.5, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.text(card.value, x + cardW / 2, yPos + 9, { align: "center" });
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(230, 230, 255);
      doc.text(card.label, x + cardW / 2, yPos + 15, { align: "center" });
    });
    yPos += 24;

    const hasAnyTask = stats.done > 0 || stats.pending > 0 || stats.overdue > 0;

    if (hasAnyTask) {
      // Donut + Bar chart section — compact height
      const chartSectionH = 44;
      yPos = ensureSpace(doc, yPos, chartSectionH);

      const chartData = [
        { label: "Concluído", value: stats.done, color: [34, 197, 94] },
        { label: "Andamento", value: stats.pending, color: [250, 204, 21] },
        { label: "Atrasado", value: stats.overdue, color: [239, 68, 68] },
      ];
      doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(200, 200, 230);
      doc.text("Distribuição por Status", 14, yPos + 4);
      drawDonutChart(doc, 50, yPos + 22, 14, chartData);

      // Bar chart — Tarefas por Responsável (top 4 to avoid name truncation)
      const consultantCounts = new Map<string, number>();
      tasks.forEach((t) => {
        const c = t.consultant || "Não atribuído";
        consultantCounts.set(c, (consultantCounts.get(c) ?? 0) + 1);
      });
      const topConsultants = Array.from(consultantCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map((e, i) => ({
          label: e[0].length > 18 ? e[0].slice(0, 17) + "…" : e[0],
          value: e[1],
          color: [[59, 130, 246], [139, 92, 246], [34, 197, 94], [250, 204, 21]][i % 4],
        }));

      if (topConsultants.length > 0) {
        drawBarChart(doc, 115, yPos, pageW - 129, 38, topConsultants, "Tarefas por Responsável");
      }

      yPos += chartSectionH + 2;

      // Productivity pulse — horizontal completion by project
      const projectCounts = new Map<string, { done: number; pending: number; overdue: number }>();
      tasks.forEach((t) => {
        const p = t.project || "Sem projeto";
        const cur = projectCounts.get(p) ?? { done: 0, pending: 0, overdue: 0 };
        if (t.statusLabel === "Concluído") cur.done++;
        else if (t.statusLabel === "Atrasado") cur.overdue++;
        else cur.pending++;
        projectCounts.set(p, cur);
      });

      const productivityData = Array.from(projectCounts.entries())
        .map(([name, s]) => {
          const total = s.done + s.pending + s.overdue;
          const pct = total > 0 ? Math.round((s.done / total) * 100) : 0;
          return [name, s, pct] as [string, typeof s, number];
        })
        .sort((a, b) => {
          const totalB = b[1].done + b[1].pending + b[1].overdue;
          const totalA = a[1].done + a[1].pending + a[1].overdue;
          return totalB - totalA; // mais tarefas primeiro
        })
        .slice(0, 8);

      if (productivityData.length > 0) {
        const sectionH = 16 + productivityData.length * 8 + 6;
        // Ensure the ENTIRE productivity section (title + bars) fits on one page
        yPos = ensureSpace(doc, yPos, sectionH);

        doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(200, 200, 230);
        doc.text("Pulso de Produtividade — % Conclusão por Projeto", 14, yPos + 4);

        const startY = yPos + 8;
        const rowH = 8;
        const labelW = 58;
        const barMaxW = pageW - 28 - labelW - 28;

        productivityData.forEach(([name, s, pct], i) => {
          const total = s.done + s.pending + s.overdue;
          const ry = startY + i * rowH;

          // Row background for alternating
          if (i % 2 === 0) {
            doc.setFillColor(28, 26, 56);
            doc.roundedRect(12, ry - 1, pageW - 24, rowH, 1, 1, "F");
          }

          doc.setFontSize(6.5); doc.setFont("helvetica", "normal"); doc.setTextColor(180, 180, 210);
          const shortName = name.length > 28 ? name.slice(0, 27) + "…" : name;
          doc.text(shortName, 14, ry + rowH * 0.55);

          const bx = 14 + labelW;
          const bh = rowH * 0.45;
          const by = ry + rowH * 0.2;
          doc.setFillColor(40, 38, 70); doc.roundedRect(bx, by, barMaxW, bh, 1, 1, "F");

          if (pct > 0) {
            const fillW = (pct / 100) * barMaxW;
            const color: [number, number, number] = pct >= 80 ? [34, 197, 94] : pct >= 50 ? [250, 204, 21] : [239, 68, 68];
            doc.setFillColor(...color);
            doc.roundedRect(bx, by, fillW, bh, 1, 1, "F");
          }

          doc.setFontSize(7); doc.setFont("helvetica", "bold");
          const pctColor: [number, number, number] = pct >= 80 ? [34, 160, 80] : pct >= 50 ? [180, 150, 20] : [220, 50, 50];
          doc.setTextColor(...pctColor);
          doc.text(`${pct}%`, bx + barMaxW + 4, ry + rowH * 0.6);

        });

        yPos += sectionH;
      }
    } else {
      yPos += 4;
    }
  }

  // Table — autoTable handles its own page breaks, but we ensure header+first rows stay together
  yPos = ensureSpace(doc, yPos, 30); // at least header + 2 rows

  const tableBody = tasks.map((t) => [
    t.title, t.project, t.consultant, t.statusLabel, t.deadlineLabel, t.durationLabel,
  ]);

  autoTable(doc, {
    startY: yPos + 2,
    head: [["Tarefa", "Projeto", "Responsável", "Status", "Prazo", "Duração"]],
    body: tableBody,
    theme: "grid",
    styles: { fontSize: 7.5, cellPadding: 3.5, textColor: [200, 200, 230], lineColor: [50, 48, 80], lineWidth: 0.15, fillColor: [22, 20, 48] },
    headStyles: {
      fillColor: [24, 22, 60],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "center",
      cellPadding: 4,
    },
    alternateRowStyles: { fillColor: [28, 26, 56] },
    columnStyles: {
      0: { cellWidth: "auto", fontStyle: "bold", halign: "left" },
      1: { halign: "center", cellWidth: 44 },
      2: { halign: "center", cellWidth: 34 },
      3: { halign: "center", cellWidth: 24 },
      4: { halign: "center", cellWidth: 24 },
      5: { halign: "center", cellWidth: 20 },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data: any) => { if (data.pageNumber > 1) drawPageBg(doc); drawFooter(doc, pageW, now, generatedBy); },
    didParseCell: (data: any) => {
      if (data.section === "body" && data.column.index === 3) {
        const val = String(data.cell.raw ?? "").toLowerCase();
        if (val.includes("conclu") || val === "done") {
          data.cell.styles.textColor = [34, 160, 80];
          data.cell.styles.fontStyle = "bold";
        } else if (val.includes("atras") || val === "overdue") {
          data.cell.styles.textColor = [220, 50, 50];
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  doc.save(fileName);
}

/* ═══════════════════════════════════════════════
 * EXPORT: Client PDF
 * ═══════════════════════════════════════════════ */

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

  // Dark page background
  drawPageBg(doc);

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

  // Cards need ~22mm
  yPos = ensureSpace(doc, yPos, 22);

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

  // Donut needs ~52mm
  yPos = ensureSpace(doc, yPos, 52);

  const completionData = [
    { label: "Concluídas", value: totalDone,                          color: [34, 197, 94]  },
    { label: "Andamento",  value: totalTasks - totalDone - totalOver, color: [250, 204, 21] },
    { label: "Atrasadas",  value: totalOver,                          color: [239, 68, 68]  },
  ];
  doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(200, 200, 230);
  doc.text("Status das Tarefas", 14, yPos + 4);
  drawDonutChart(doc, 50, yPos + 26, 16, completionData);

  yPos += 52;

  // Hours progress bars per project
  if (totalContr > 0) {
    const hoursH = 6 + projects.length * 8 + 4;
    yPos = ensureSpace(doc, yPos, hoursH);

    doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(200, 200, 230);
    doc.text("Consumo de Horas Contratadas", 14, yPos);
    yPos += 6;
    projects.forEach((p) => {
      // Check each bar individually for page breaks
      yPos = ensureSpace(doc, yPos, 10);
      drawClientHoursBar(doc, 14, yPos, pageW - 28, p.hours, p.hoursContracted, p.name);
      yPos += 8;
    });
    yPos += 4;
  }

  // Projects table — ensure header + first rows fit
  yPos = ensureSpace(doc, yPos, 30);

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
    styles: { fontSize: 7.5, cellPadding: 2.5, textColor: [200, 200, 230], lineColor: [50, 48, 80], lineWidth: 0.2, fillColor: [22, 20, 48] },
    headStyles: { fillColor: [30, 27, 75], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5 },
    alternateRowStyles: { fillColor: [28, 26, 56] },
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
    didDrawPage: (data: any) => { if (data.pageNumber > 1) drawPageBg(doc); drawFooter(doc, pageW, now, generatedBy); },
  });

  doc.save(safeFileName);
}

/* ═══════════════════════════════════════════════
 * EXPORT: Analytics PDF
 * ═══════════════════════════════════════════════ */

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

  // Dark page background
  drawPageBg(doc);

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

  // Cards need ~22mm
  yPos = ensureSpace(doc, yPos, 22);

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

  // Donut needs ~50mm
  yPos = ensureSpace(doc, yPos, 50);

  const completionData = [
    { label: "Concluídas", value: totals.done, color: [34, 197, 94] },
    { label: "Pendentes", value: totals.tasks - totals.done - totals.overdue, color: [250, 204, 21] },
    { label: "Atrasadas", value: totals.overdue, color: [239, 68, 68] },
  ];

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(200, 200, 230);
  doc.text("Status Geral", 14, yPos + 4);
  drawDonutChart(doc, 50, yPos + 26, 16, completionData);

  yPos += 50;

  // Table — ensure header + first rows fit
  yPos = ensureSpace(doc, yPos, 30);

  const tableBody = projects.map((p) => {
    const completion = p.totalTasks > 0 ? Math.round((p.doneTasks / p.totalTasks) * 100) : 0;
    return [p.name, String(p.totalTasks), String(p.doneTasks), String(p.overdueTasks), `${Math.round(p.hours)}h`, `${completion}%`];
  });

  autoTable(doc, {
    startY: yPos,
    head: [["Projeto", "Tarefas", "Concluídas", "Atrasadas", "Horas", "Conclusão"]],
    body: tableBody,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 3, textColor: [200, 200, 230], lineColor: [50, 48, 80], lineWidth: 0.2, fillColor: [22, 20, 48] },
    headStyles: { fillColor: [30, 27, 75], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: [28, 26, 56] },
    columnStyles: {
      0: { cellWidth: "auto", fontStyle: "bold" },
      1: { halign: "center", cellWidth: 20 },
      2: { halign: "center", cellWidth: 22 },
      3: { halign: "center", cellWidth: 22 },
      4: { halign: "center", cellWidth: 20 },
      5: { halign: "center", cellWidth: 22 },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data: any) => { if (data.pageNumber > 1) drawPageBg(doc); drawFooter(doc, pageW, now, generatedBy); },
  });

  doc.save(fileName);
}
