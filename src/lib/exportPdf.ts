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
  stats?: {
    total: number;
    done: number;
    overdue: number;
    pending: number;
    totalHours?: string;
  };
};

export function exportTasksPDF({
  title = "Relatório de Tarefas",
  subtitle,
  fileName = "relatorio-tarefas.pdf",
  tasks,
  stats,
}: ExportOptions) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const now = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Header bar
  doc.setFillColor(30, 27, 75); // deep indigo
  doc.rect(0, 0, pageW, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 13);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(subtitle || `Gerado em ${now}`, 14, 20);

  doc.setFontSize(8);
  doc.text("ISP Consulte", pageW - 14, 13, { align: "right" });
  doc.text(now, pageW - 14, 19, { align: "right" });

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
  }

  // Table
  const tableBody = tasks.map((t) => [
    t.title,
    t.project,
    t.consultant,
    t.statusLabel,
    t.deadlineLabel,
    t.durationLabel,
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [["Tarefa", "Projeto", "Responsável", "Status", "Prazo", "Duração"]],
    body: tableBody,
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: [30, 27, 75],
      lineColor: [200, 200, 220],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [30, 27, 75],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 255],
    },
    columnStyles: {
      0: { cellWidth: "auto", fontStyle: "bold" },
      3: { halign: "center", cellWidth: 25 },
      4: { halign: "center", cellWidth: 25 },
      5: { halign: "center", cellWidth: 22 },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Footer on each page
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 170);
      doc.text(
        `ISP Consulte — ${now}`,
        14,
        pageH - 6
      );
      doc.text(
        `Página ${doc.getCurrentPageInfo().pageNumber}`,
        pageW - 14,
        pageH - 6,
        { align: "right" }
      );
    },
  });

  doc.save(fileName);
}

type AnalyticsExportOptions = {
  userName?: string;
  period?: string;
  fileName?: string;
  projects: Array<{
    name: string;
    totalTasks: number;
    doneTasks: number;
    overdueTasks: number;
    hours: number;
  }>;
  totals: {
    projects: number;
    tasks: number;
    done: number;
    overdue: number;
    hours: number;
  };
};

export function exportAnalyticsPDF({
  userName,
  period,
  fileName = "relatorio-analiticas.pdf",
  projects,
  totals,
}: AnalyticsExportOptions) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const now = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Header
  doc.setFillColor(30, 27, 75);
  doc.rect(0, 0, pageW, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório de Analíticas", 14, 13);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const sub = [userName, period].filter(Boolean).join(" · ") || now;
  doc.text(sub, 14, 20);

  doc.setFontSize(8);
  doc.text("ISP Consulte", pageW - 14, 13, { align: "right" });
  doc.text(now, pageW - 14, 19, { align: "right" });

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

  // Projects table
  const tableBody = projects.map((p) => {
    const completion = p.totalTasks > 0 ? Math.round((p.doneTasks / p.totalTasks) * 100) : 0;
    return [
      p.name,
      String(p.totalTasks),
      String(p.doneTasks),
      String(p.overdueTasks),
      `${Math.round(p.hours)}h`,
      `${completion}%`,
    ];
  });

  autoTable(doc, {
    startY: yPos,
    head: [["Projeto", "Tarefas", "Concluídas", "Atrasadas", "Horas", "Conclusão"]],
    body: tableBody,
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: [30, 27, 75],
      lineColor: [200, 200, 220],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [30, 27, 75],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 255],
    },
    columnStyles: {
      0: { cellWidth: "auto", fontStyle: "bold" },
      1: { halign: "center", cellWidth: 20 },
      2: { halign: "center", cellWidth: 22 },
      3: { halign: "center", cellWidth: 22 },
      4: { halign: "center", cellWidth: 20 },
      5: { halign: "center", cellWidth: 22 },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: () => {
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 170);
      doc.text(`ISP Consulte — ${now}`, 14, pageH - 6);
      doc.text(
        `Página ${doc.getCurrentPageInfo().pageNumber}`,
        pageW - 14,
        pageH - 6,
        { align: "right" }
      );
    },
  });

  doc.save(fileName);
}
