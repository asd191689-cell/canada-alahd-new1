import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../context/AppContext";
import { hasPermission } from "../utils/permissions";
import AccessDenied from "../components/AccessDenied";
import { FileSpreadsheet, FileText, FileArchive } from "lucide-react";
import {
  Download,
  BarChart2,
  Users,
  Gift,
  MapPin,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Shield,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList,
} from "recharts";

const AID_CHART_COLORS = [
  "#15803D", // أخضر النظام
  "#0F766E", // أخضر بترولي
  "#2563EB", // أزرق رسمي
  "#475569", // رمادي أردوازي
  "#0891B2", // أزرق تركوازي
  "#166534", // أخضر داكن
];
const GOV_CHART_COLORS = [
  "#0F766E", // أخضر بترولي
  "#2563EB", // أزرق رسمي
  "#0891B2", // أزرق تركوازي
  "#475569", // رمادي أردوازي
  "#4F46E5", // أزرق بنفسجي هادئ
  "#15803D", // أخضر داكن
];

export default function ReportsPage() {
  const { families, aidDistributions, aidTypes, currentUser } = useApp();
  const canAccessReports =
    currentUser &&
    hasPermission(
      currentUser.role as "admin" | "representative" | "employee",
      "reports",
    );

  if (!canAccessReports) {
    return (
      <AccessDenied
        title="غير مخول للوصول"
        message="لا تمتلك صلاحية للوصول إلى صفحة التقارير."
      />
    );
  }
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState("");

  const activeFamilies = families.filter((f) => !f.isDeleted);
  const totalIndividuals = activeFamilies.reduce(
    (s, f) => s + f.membersCount,
    0,
  );
  const avgSize = activeFamilies.length
    ? (totalIndividuals / activeFamilies.length).toFixed(1)
    : "0";
  const maxFamilySize = activeFamilies.length
    ? Math.max(...activeFamilies.map((f) => f.membersCount))
    : 0;

  const minFamilySize = activeFamilies.length
    ? Math.min(...activeFamilies.map((f) => f.membersCount))
    : 0;

  const governorateData = activeFamilies.reduce(
    (acc, f) => {
      acc[f.originGovernorate] = (acc[f.originGovernorate] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const govChartData = Object.entries(governorateData)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const aidCatData = aidTypes
    .map((t) => ({
      name: t.name,
      count: aidDistributions.filter((d) => d.aidTypeId === t.id).length,
    }))
    .filter((d) => d.count > 0);

  const healthData = [
    {
      name: "بصحة جيدة",
      count: activeFamilies.filter((f) => f.headHealthStatus === "healthy")
        .length,
      color: "#16a34a",
    },
    {
      name: "مريض",
      count: activeFamilies.filter((f) => f.headHealthStatus === "sick").length,
      color: "#f59e0b",
    },
    {
      name: "إعاقة",
      count: activeFamilies.filter((f) => f.headHealthStatus === "disabled")
        .length,
      color: "#dc2626",
    },
  ];

  const disabledMembers = activeFamilies.reduce(
    (s, f) => s + f.members.filter((m) => m.healthStatus === "disabled").length,
    0,
  );
  const childrenUnder12 = activeFamilies.reduce(
    (s, f) => s + f.members.filter((m) => m.age < 12).length,
    0,
  );

  const handleExport = async (type: string) => {
    setExporting(true);
    await new Promise((r) => setTimeout(r, 1500));

    // Generate CSV content
    let csvContent = "";
    if (type === "families") {
      csvContent =
        "رقم الملف,اسم رب الأسرة,الرقم الوطني,الهاتف,المحافظة,المدينة,عدد الأفراد,الحالة الصحية,تاريخ الدخول,العنوان\n";
      activeFamilies.forEach((f) => {
        const health =
          f.headHealthStatus === "healthy"
            ? "جيدة"
            : f.headHealthStatus === "sick"
              ? "مريض"
              : "إعاقة";
        csvContent += `${f.fileNumber},"${f.headName}",${f.headNationalId},${f.headPhone},${f.originGovernorate},${f.originCity},${f.membersCount},${health},${f.entryDate},"${f.currentAddress}"\n`;
      });
    } else if (type === "aid") {
      csvContent =
        "العائلة,رقم الملف,صنف المساعدة,الكمية,الوحدة,تاريخ التوزيع,المشرف\n";
      aidDistributions.forEach((d) => {
        csvContent += `"${d.familyName}",${d.fileNumber},"${d.aidTypeName}",${d.quantity},${d.unit},${d.distributionDate},"${d.supervisorName}"\n`;
      });
    } else {
      csvContent =
        "رقم الملف,اسم رب الأسرة,الاسم,العمر,صلة القرابة,الحالة الصحية\n";
      activeFamilies.forEach((f) => {
        f.members.forEach((m) => {
          const rel =
            m.relation === "wife"
              ? "زوجة"
              : m.relation === "son"
                ? "ابن"
                : m.relation === "daughter"
                  ? "ابنة"
                  : "أخرى";
          const health =
            m.healthStatus === "healthy"
              ? "جيدة"
              : m.healthStatus === "sick"
                ? "مريض"
                : "إعاقة";
          csvContent += `${f.fileNumber},"${f.headName}","${m.name}",${m.age},${rel},${health}\n`;
        });
      });
    }

    // Add BOM for Arabic support
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `تقرير_${type === "families" ? "العائلات" : type === "aid" ? "المساعدات" : "الأفراد"}_${new Date().toLocaleDateString("ar-IQ").replace(/\//g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setExporting(false);

    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };
  const handleExportExcel = async (reportType: string) => {
    setExporting(true);

    try {
      // ============================================================
      // ExcelJS Workbook
      // ============================================================

      const workbook = new ExcelJS.Workbook();

      workbook.creator = "نظام إدارة كندا العهد";
      workbook.lastModifiedBy = currentUser?.name || "System";
      workbook.created = new Date();
      workbook.modified = new Date();

      // ============================================================
      // Theme
      // ============================================================

      const COLORS = {
        primary: "15803D",
        primaryDark: "14532D",
        primarySoft: "DCFCE7",
        primaryVerySoft: "F0FDF4",

        accent: "0F766E",

        white: "FFFFFF",
        text: "1F2937",
        muted: "64748B",

        border: "D7E2DB",
        borderDark: "B8C9BE",

        rowEven: "FFFFFF",
        rowOdd: "F8FBF9",

        familyHead: "E2F5E8",
        familyHeadBorder: "8BC79A",

        warning: "FFF7D6",
        danger: "FDECEC",
        info: "EAF4FF",
      };

      const argb = (hex: string) => `FF${hex}`;

      // ============================================================
      // Helpers
      // ============================================================

      const safe = (value: unknown): string => {
        if (value === null || value === undefined) return "";
        return String(value);
      };

      const toNumber = (value: unknown): number | null => {
        if (value === null || value === undefined || value === "") {
          return null;
        }

        const number = Number(value);

        return Number.isFinite(number) ? number : null;
      };

      const parseDate = (value: unknown): Date | null => {
        if (!value) return null;

        if (value instanceof Date && !Number.isNaN(value.getTime())) {
          return value;
        }

        const text = String(value).trim();

        // YYYY-MM-DD
        const dateOnlyMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);

        if (dateOnlyMatch) {
          const [, year, month, day] = dateOnlyMatch;

          const date = new Date(Number(year), Number(month) - 1, Number(day));

          return Number.isNaN(date.getTime()) ? null : date;
        }

        const date = new Date(text);

        return Number.isNaN(date.getTime()) ? null : date;
      };

      const formatDateText = (value: unknown): string => {
        const date = parseDate(value);

        if (!date) return safe(value);

        return [
          date.getFullYear(),
          String(date.getMonth() + 1).padStart(2, "0"),
          String(date.getDate()).padStart(2, "0"),
        ].join("-");
      };

      const translate = (value: unknown): string => {
        const v = safe(value).trim();

        const map: Record<string, string> = {
          healthy: "جيدة",
          sick: "مريض",
          disabled: "إعاقة",
          needs_follow_up: "يحتاج متابعة",

          male: "ذكر",
          female: "أنثى",

          wife: "زوجة",
          husband: "زوج",
          son: "ابن",
          daughter: "ابنة",
          father: "أب",
          mother: "أم",
          brother: "أخ",
          sister: "أخت",
          relative: "قريب",
          other: "أخرى",

          yes: "نعم",
          no: "لا",

          cash: "نقدي",
          in_kind: "عيني",

          active: "نشط",
          deleted: "محذوف",

          healthy_status: "جيدة",

          piece: "قطعة",
          pieces: "قطع",

          person: "فرد",
          individual: "فرد",
        };

        return map[v] ?? v;
      };

      // ============================================================
      // Borders
      // ============================================================

      const thinBorder = {
        top: {
          style: "thin" as const,
          color: { argb: argb(COLORS.border) },
        },
        bottom: {
          style: "thin" as const,
          color: { argb: argb(COLORS.border) },
        },
        left: {
          style: "thin" as const,
          color: { argb: argb(COLORS.border) },
        },
        right: {
          style: "thin" as const,
          color: { argb: argb(COLORS.border) },
        },
      };

      const mediumBottomBorder = {
        bottom: {
          style: "medium" as const,
          color: { argb: argb(COLORS.primary) },
        },
      };

      // ============================================================
      // Report metadata
      // ============================================================

      const reportTitles: Record<string, string> = {
        families: "تقرير العائلات الشامل",
        individuals: "تقرير أفراد الأسر",
        aid: "تقرير المساعدات والتوزيعات",
      };

      const reportFileNames: Record<string, string> = {
        families: "تقرير_العائلات_الشامل",
        individuals: "تقرير_أفراد_الأسر",
        aid: "تقرير_المساعدات",
      };

      const title = reportTitles[reportType] || "تقرير النظام";
      const fileName = reportFileNames[reportType] || "تقرير";

      const now = new Date();
      const exportDate = formatDateText(now);

      // ============================================================
      // Generic worksheet builder
      // ============================================================

      type ReportColumn = {
        header: string;
        key: string;
        width: number;
        type?: "text" | "number" | "date";
        align?: "left" | "center" | "right";
      };

      type ReportRow = Record<string, unknown>;

      const createProfessionalSheet = (
        sheetName: string,
        columns: ReportColumn[],
        rows: ReportRow[],
        options?: {
          stats?: Array<{
            label: string;
            value: string | number;
          }>;
          note?: string;
          tableName?: string;
          familyHeadRows?: number[];
        },
      ) => {
        const worksheet = workbook.addWorksheet(sheetName);

        // ----------------------------------------------------------
        // Sheet direction / freeze
        // ----------------------------------------------------------

        worksheet.views = [
          {
            rightToLeft: true,
            state: "frozen",
            ySplit: 8,
          },
        ];

        worksheet.properties.defaultRowHeight = 24;

        // ----------------------------------------------------------
        // Page setup
        // ----------------------------------------------------------

        worksheet.pageSetup.orientation = "landscape";
        worksheet.pageSetup.fitToPage = true;
        worksheet.pageSetup.fitToWidth = 1;
        worksheet.pageSetup.fitToHeight = 0;

        worksheet.pageSetup.margins = {
          left: 0.5,
          right: 0.5,
          top: 0.75,
          bottom: 0.75,
          header: 0.3,
          footer: 0.3,
        };

        // ----------------------------------------------------------
        // Column widths
        // ----------------------------------------------------------

        columns.forEach((column, index) => {
          worksheet.getColumn(index + 1).width = column.width;
        });

        const lastColumnNumber = columns.length;
        const lastColumnLetter = worksheet.getColumn(lastColumnNumber).letter;

        // ----------------------------------------------------------
        // Main title
        // ----------------------------------------------------------

        worksheet.mergeCells(`A1:${lastColumnLetter}1`);

        const titleCell = worksheet.getCell("A1");

        titleCell.value = "نظام إدارة كندا العهد";
        titleCell.font = {
          name: "Segoe UI",
          size: 19,
          bold: true,
          color: { argb: argb(COLORS.white) },
        };

        titleCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: argb(COLORS.primaryDark) },
        };

        titleCell.alignment = {
          horizontal: "center",
          vertical: "middle",
        };

        titleCell.border = mediumBottomBorder;

        worksheet.getRow(1).height = 36;

        // ----------------------------------------------------------
        // Report title
        // ----------------------------------------------------------

        worksheet.mergeCells(`A2:${lastColumnLetter}2`);

        const reportTitleCell = worksheet.getCell("A2");

        reportTitleCell.value = title;

        reportTitleCell.font = {
          name: "Segoe UI",
          size: 16,
          bold: true,
          color: { argb: argb(COLORS.primaryDark) },
        };

        reportTitleCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: argb(COLORS.primaryVerySoft) },
        };

        reportTitleCell.alignment = {
          horizontal: "center",
          vertical: "middle",
        };

        worksheet.getRow(2).height = 32;

        // ----------------------------------------------------------
        // Export information
        // ----------------------------------------------------------

        worksheet.mergeCells(`A3:${lastColumnLetter}3`);

        const metaCell = worksheet.getCell("A3");

        metaCell.value = `تاريخ التصدير: ${exportDate}   |   مصدر البيانات: النظام   |   البيانات لم يتم تعديلها أثناء التصدير`;

        metaCell.font = {
          name: "Segoe UI",
          size: 10,
          color: { argb: argb(COLORS.muted) },
          italic: true,
        };

        metaCell.alignment = {
          horizontal: "center",
          vertical: "middle",
        };

        worksheet.getRow(3).height = 24;

        // ----------------------------------------------------------
        // Statistics cards
        // ----------------------------------------------------------

        const stats =
          options?.stats && options.stats.length > 0
            ? options.stats.slice(0, 4)
            : [];

        if (stats.length > 0) {
          const cardRanges = [
            ["A4", "B4", "A5", "B5"],
            ["C4", "D4", "C5", "D5"],
            ["E4", "F4", "E5", "F5"],
            ["G4", "H4", "G5", "H5"],
          ];

          stats.forEach((stat, index) => {
            const range = cardRanges[index];

            if (!range) return;

            const [labelStart, labelEnd, valueStart, valueEnd] = range;

            worksheet.mergeCells(`${labelStart}:${labelEnd}`);
            worksheet.mergeCells(`${valueStart}:${valueEnd}`);

            const labelCell = worksheet.getCell(labelStart);
            const valueCell = worksheet.getCell(valueStart);

            labelCell.value = stat.label;
            valueCell.value = stat.value;

            labelCell.font = {
              name: "Segoe UI",
              size: 9,
              bold: true,
              color: { argb: argb(COLORS.muted) },
            };

            valueCell.font = {
              name: "Segoe UI",
              size: 14,
              bold: true,
              color: { argb: argb(COLORS.primaryDark) },
            };

            labelCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: argb(COLORS.primaryVerySoft) },
            };

            valueCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: argb(COLORS.white) },
            };

            labelCell.alignment = {
              horizontal: "center",
              vertical: "middle",
            };

            valueCell.alignment = {
              horizontal: "center",
              vertical: "middle",
            };

            labelCell.border = thinBorder;
            valueCell.border = thinBorder;
          });
        }

        worksheet.getRow(4).height = 22;
        worksheet.getRow(5).height = 30;

        // ----------------------------------------------------------
        // Note / legend
        // ----------------------------------------------------------

        worksheet.mergeCells(`A6:${lastColumnLetter}6`);

        const noteCell = worksheet.getCell("A6");

        noteCell.value =
          options?.note ||
          "يمكن استخدام أسهم التصفية في رأس الجدول للبحث والفرز حسب أي حقل.";

        noteCell.font = {
          name: "Segoe UI",
          size: 9,
          color: { argb: argb(COLORS.muted) },
        };

        noteCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: argb("F8FAFC") },
        };

        noteCell.alignment = {
          horizontal: "right",
          vertical: "middle",
          wrapText: true,
        };

        noteCell.border = thinBorder;

        worksheet.getRow(6).height = 30;

        // ----------------------------------------------------------
        // Spacer
        // ----------------------------------------------------------

        worksheet.getRow(7).height = 8;

        // ----------------------------------------------------------
        // Table header
        // ----------------------------------------------------------

        const headerRowNumber = 8;
        const dataStartRow = 9;

        const headerRow = worksheet.getRow(headerRowNumber);

        headerRow.values = [
          undefined,
          ...columns.map((column) => column.header),
        ];

        headerRow.height = 42;

        headerRow.eachCell((cell, columnNumber) => {
          const column = columns[columnNumber - 1];

          cell.font = {
            name: "Segoe UI",
            size: 10,
            bold: true,
            color: { argb: argb(COLORS.white) },
          };

          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: argb(COLORS.primary) },
          };

          cell.border = {
            top: {
              style: "medium",
              color: { argb: argb(COLORS.primaryDark) },
            },
            bottom: {
              style: "medium",
              color: { argb: argb(COLORS.primaryDark) },
            },
            left: {
              style: "thin",
              color: { argb: argb(COLORS.borderDark) },
            },
            right: {
              style: "thin",
              color: { argb: argb(COLORS.borderDark) },
            },
          };

          cell.alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };

          if (column) {
            worksheet.getColumn(columnNumber).width = column.width;
          }
        });

        // ----------------------------------------------------------
        // Data
        // ----------------------------------------------------------

        const safeRows =
          rows.length > 0
            ? rows
            : [
                columns.reduce((acc, column) => {
                  acc[column.key] = "";
                  return acc;
                }, {} as ReportRow),
              ];

        safeRows.forEach((rowData, rowIndex) => {
          const excelRowNumber = dataStartRow + rowIndex;

          const row = worksheet.getRow(excelRowNumber);

          row.values = [
            undefined,
            ...columns.map((column) => {
              const value = rowData[column.key];

              if (column.type === "number") {
                return toNumber(value) ?? "";
              }

              if (column.type === "date") {
                return parseDate(value) ?? "";
              }

              return safe(value);
            }),
          ];

          row.height = 30;

          const isFamilyHead =
            options?.familyHeadRows?.includes(excelRowNumber) ?? false;

          row.eachCell((cell, columnNumber) => {
            const column = columns[columnNumber - 1];

            cell.font = {
              name: "Segoe UI",
              size: isFamilyHead ? 10 : 9.5,
              bold: isFamilyHead,
              color: { argb: argb(COLORS.text) },
            };

            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: {
                argb: argb(
                  isFamilyHead
                    ? COLORS.familyHead
                    : rowIndex % 2 === 0
                      ? COLORS.rowEven
                      : COLORS.rowOdd,
                ),
              },
            };

            cell.border = thinBorder;

            cell.alignment = {
              horizontal:
                column?.align ||
                (column?.type === "number" ? "center" : "right"),
              vertical: "middle",
              wrapText: true,
            };

            if (column?.type === "number") {
              cell.numFmt = "#,##0";
            }

            if (column?.type === "date") {
              cell.numFmt = "yyyy-mm-dd";
            }

            // Highlight important health states.
            if (column?.header === "الحالة الصحية") {
              const value = safe(cell.value);

              if (value === "مريض" || value === "يحتاج متابعة") {
                cell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: argb(COLORS.warning) },
                };
              }

              if (value === "إعاقة") {
                cell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: argb(COLORS.danger) },
                };
              }
            }
          });
        });

        // ----------------------------------------------------------
        // Excel Table
        // ----------------------------------------------------------

        const lastRowNumber = dataStartRow + Math.max(safeRows.length, 1) - 1;

        const tableRef = `A${headerRowNumber}:${lastColumnLetter}${lastRowNumber}`;

        worksheet.addTable({
          name:
            options?.tableName ||
            `ReportTable${Math.random().toString(36).slice(2, 8)}`,
          ref: tableRef,
          headerRow: true,
          totalsRow: false,
          style: {
            theme: "TableStyleMedium4",
            showFirstColumn: false,
            showLastColumn: false,
            showRowStripes: true,
            showColumnStripes: false,
          },
          columns: columns.map((column) => ({
            name: column.header,
          })),
          rows: safeRows.map((rowData) =>
            columns.map((column) => {
              const value = rowData[column.key];

              if (column.type === "number") {
                return toNumber(value) ?? "";
              }

              if (column.type === "date") {
                return parseDate(value) ?? "";
              }

              return safe(value);
            }),
          ),
        });

        // ----------------------------------------------------------
        // Final table styling
        // ----------------------------------------------------------

        worksheet.autoFilter = undefined;

        worksheet.getRow(headerRowNumber).eachCell((cell) => {
          cell.font = {
            name: "Segoe UI",
            size: 10,
            bold: true,
            color: { argb: argb(COLORS.white) },
          };

          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: argb(COLORS.primary) },
          };

          cell.alignment = {
            horizontal: "center",
            vertical: "middle",
            wrapText: true,
          };
        });

        return worksheet;
      };

      // ============================================================
      // 1. FAMILY REPORT
      // ============================================================

      if (reportType === "families") {
        const columns: ReportColumn[] = [
          {
            header: "رقم الملف",
            key: "fileNumber",
            width: 14,
            type: "text",
            align: "center",
          },
          {
            header: "اسم رب الأسرة",
            key: "headName",
            width: 25,
          },
          {
            header: "رقم هوية رب الأسرة",
            key: "headNationalId",
            width: 20,
            align: "center",
          },
          {
            header: "تاريخ ميلاد رب الأسرة",
            key: "headDateOfBirth",
            width: 18,
            type: "date",
            align: "center",
          },
          {
            header: "عمر رب الأسرة",
            key: "headAge",
            width: 14,
            type: "number",
            align: "center",
          },
          {
            header: "الجنس",
            key: "gender",
            width: 12,
            align: "center",
          },
          {
            header: "رقم الجوال",
            key: "headPhone",
            width: 18,
            align: "center",
          },
          {
            header: "الجوال البديل",
            key: "alternatePhone",
            width: 18,
            align: "center",
          },
          {
            header: "الحالة الصحية",
            key: "headHealthStatus",
            width: 18,
            align: "center",
          },
          {
            header: "المحافظة الأصل",
            key: "originGovernorate",
            width: 18,
          },
          {
            header: "مدينة الأصل",
            key: "originCity",
            width: 18,
          },
          {
            header: "العنوان الحالي",
            key: "currentAddress",
            width: 32,
          },
          {
            header: "موقع المخيم",
            key: "campLocation",
            width: 24,
          },
          {
            header: "تاريخ الدخول",
            key: "entryDate",
            width: 17,
            type: "date",
            align: "center",
          },
          {
            header: "الحالة الاجتماعية",
            key: "maritalStatus",
            width: 18,
            align: "center",
          },
          {
            header: "المعيل",
            key: "isProvider",
            width: 12,
            align: "center",
          },
          {
            header: "نوع السكن",
            key: "housingType",
            width: 18,
            align: "center",
          },
          {
            header: "عدد أفراد الأسرة",
            key: "membersCount",
            width: 16,
            type: "number",
            align: "center",
          },
          {
            header: "عدد الذكور",
            key: "malesCount",
            width: 14,
            type: "number",
            align: "center",
          },
          {
            header: "عدد الإناث",
            key: "femalesCount",
            width: 14,
            type: "number",
            align: "center",
          },
          {
            header: "ذكور 0-5",
            key: "male0to5",
            width: 12,
            type: "number",
            align: "center",
          },
          {
            header: "ذكور 6-11",
            key: "male6to11",
            width: 12,
            type: "number",
            align: "center",
          },
          {
            header: "ذكور 12-17",
            key: "male12to17",
            width: 12,
            type: "number",
            align: "center",
          },
          {
            header: "ذكور 18-24",
            key: "male18to24",
            width: 12,
            type: "number",
            align: "center",
          },
          {
            header: "ذكور 25-60",
            key: "male25to60",
            width: 12,
            type: "number",
            align: "center",
          },
          {
            header: "ذكور 60+",
            key: "male60Plus",
            width: 12,
            type: "number",
            align: "center",
          },
          {
            header: "إناث 0-5",
            key: "female0to5",
            width: 12,
            type: "number",
            align: "center",
          },
          {
            header: "إناث 6-11",
            key: "female6to11",
            width: 12,
            type: "number",
            align: "center",
          },
          {
            header: "إناث 12-17",
            key: "female12to17",
            width: 12,
            type: "number",
            align: "center",
          },
          {
            header: "إناث 18-24",
            key: "female18to24",
            width: 12,
            type: "number",
            align: "center",
          },
          {
            header: "إناث 25-60",
            key: "female25to60",
            width: 12,
            type: "number",
            align: "center",
          },
          {
            header: "إناث 60+",
            key: "female60Plus",
            width: 12,
            type: "number",
            align: "center",
          },
          {
            header: "الملاحظات",
            key: "notes",
            width: 34,
          },
        ];

        const rows: ReportRow[] = activeFamilies.map((f) => ({
          fileNumber: safe(f.fileNumber),
          headName: safe(f.headName),
          headNationalId: safe(f.headNationalId),
          headDateOfBirth: parseDate(f.headDateOfBirth),
          headAge: toNumber(f.headAge),
          gender: translate(f.gender),
          headPhone: safe(f.headPhone),
          alternatePhone: safe(f.alternatePhone),
          headHealthStatus: translate(f.headHealthStatus),
          originGovernorate: safe(f.originGovernorate),
          originCity: safe(f.originCity),
          currentAddress: safe(f.currentAddress),
          campLocation: safe(f.campLocation),
          entryDate: parseDate(f.entryDate),
          maritalStatus: translate(f.maritalStatus),
          isProvider: f.isProvider ? "نعم" : "لا",
          housingType: translate(f.housingType),

          membersCount: toNumber(f.membersCount) ?? 0,
          malesCount: toNumber(f.malesCount) ?? 0,
          femalesCount: toNumber(f.femalesCount) ?? 0,

          male0to5: toNumber(f.male0to5) ?? 0,
          male6to11: toNumber(f.male6to11) ?? 0,
          male12to17: toNumber(f.male12to17) ?? 0,
          male18to24: toNumber(f.male18to24) ?? 0,
          male25to60: toNumber(f.male25to60) ?? 0,
          male60Plus: toNumber(f.male60Plus) ?? 0,

          female0to5: toNumber(f.female0to5) ?? 0,
          female6to11: toNumber(f.female6to11) ?? 0,
          female12to17: toNumber(f.female12to17) ?? 0,
          female18to24: toNumber(f.female18to24) ?? 0,
          female25to60: toNumber(f.female25to60) ?? 0,
          female60Plus: toNumber(f.female60Plus) ?? 0,

          notes: safe(f.notes),
        }));

        createProfessionalSheet("العائلات", columns, rows, {
          tableName: "FamiliesReportTable",

          stats: [
            {
              label: "إجمالي الأسر",
              value: activeFamilies.length,
            },
            {
              label: "إجمالي الأفراد",
              value: totalIndividuals,
            },
            {
              label: "متوسط حجم الأسرة",
              value: avgSize,
            },
            {
              label: "أكبر أسرة",
              value: maxFamilySize,
            },
          ],

          note: "تقرير شامل للأسر. استخدم أسهم التصفية أعلى الأعمدة للبحث حسب العمر، المحافظة، الحالة الصحية، السكن، عدد الأفراد وغيرها.",
        });
      }

      // ============================================================
      // 2. INDIVIDUALS REPORT
      // ============================================================
      else if (reportType === "individuals") {
        const columns: ReportColumn[] = [
          {
            header: "رقم الملف",
            key: "fileNumber",
            width: 14,
            align: "center",
          },
          {
            header: "رب الأسرة",
            key: "familyHead",
            width: 25,
          },
          {
            header: "نوع السجل",
            key: "recordType",
            width: 14,
            align: "center",
          },
          {
            header: "معرف الفرد",
            key: "memberId",
            width: 15,
            align: "center",
          },
          {
            header: "اسم الفرد",
            key: "memberName",
            width: 25,
          },
          {
            header: "رقم الهوية",
            key: "nationalId",
            width: 20,
            align: "center",
          },
          {
            header: "تاريخ الميلاد",
            key: "dateOfBirth",
            width: 17,
            type: "date",
            align: "center",
          },
          {
            header: "العمر",
            key: "age",
            width: 10,
            type: "number",
            align: "center",
          },
          {
            header: "الجنس",
            key: "gender",
            width: 12,
            align: "center",
          },
          {
            header: "صلة القرابة",
            key: "relation",
            width: 16,
            align: "center",
          },
          {
            header: "الحالة الصحية",
            key: "healthStatus",
            width: 18,
            align: "center",
          },
          {
            header: "الإعاقة",
            key: "disability",
            width: 20,
            align: "center",
          },
          {
            header: "الملاحظات",
            key: "notes",
            width: 34,
          },
        ];

        const rows: ReportRow[] = [];
        const familyHeadRows: number[] = [];

        activeFamilies.forEach((f) => {
          // --------------------------------------------------------
          // رب الأسرة
          // --------------------------------------------------------

          rows.push({
            fileNumber: safe(f.fileNumber),
            familyHead: safe(f.headName),
            recordType: "رب الأسرة",
            memberId: "",
            memberName: safe(f.headName),
            nationalId: safe(f.headNationalId),
            dateOfBirth: parseDate(f.headDateOfBirth),
            age: toNumber(f.headAge),
            gender: translate(f.gender),
            relation: "رب الأسرة",
            healthStatus: translate(f.headHealthStatus),
            disability: "",
            notes: safe(f.notes),
          });

          // --------------------------------------------------------
          // أفراد الأسرة
          // --------------------------------------------------------

          (f.members ?? []).forEach((m) => {
            rows.push({
              fileNumber: safe(f.fileNumber),
              familyHead: safe(f.headName),
              recordType: "فرد",
              memberId: safe(m.id),
              memberName: safe(m.name),
              nationalId: safe(m.nationalId),
              dateOfBirth: parseDate(m.dateOfBirth),
              age: toNumber(m.age),
              gender: translate(m.gender),
              relation: translate(m.relation),
              healthStatus: translate(m.healthStatus),
              disability: translate(m.disability),
              notes: safe(m.notes),
            });
          });
        });

        // ----------------------------------------------------------
        // Calculate actual Excel rows for family heads.
        // Data begins at row 9.
        // ----------------------------------------------------------

        let currentExcelRow = 9;

        activeFamilies.forEach((f) => {
          familyHeadRows.push(currentExcelRow);

          currentExcelRow += 1;

          currentExcelRow += (f.members ?? []).length;
        });

        const totalIndividualRows = rows.length;

        const individualFamiliesCount = activeFamilies.length;

        createProfessionalSheet("الأفراد", columns, rows, {
          tableName: "IndividualsReportTable",

          familyHeadRows,

          stats: [
            {
              label: "عدد الأسر",
              value: individualFamiliesCount,
            },
            {
              label: "إجمالي السجلات",
              value: totalIndividualRows,
            },
            {
              label: "عدد أفراد الأسرة",
              value: totalIndividuals,
            },
            {
              label: "الأسر ذات الأفراد",
              value: activeFamilies.filter((f) => (f.members ?? []).length > 0)
                .length,
            },
          ],

          note: "الأخضر الفاتح = رب الأسرة. كل رب أسرة يظهر أولًا ثم أفراد أسرته مباشرة. جميع السجلات داخل جدول Excel واحد ويمكن فلترتها وفرزها حسب العمر والجنس والقرابة والحالة الصحية.",
        });

        // ----------------------------------------------------------
        // Additional visual grouping for individuals
        // ----------------------------------------------------------

        const individualSheet = workbook.getWorksheet("الأفراد");

        if (individualSheet) {
          let rowNumber = 9;

          activeFamilies.forEach((f) => {
            const headRow = individualSheet.getRow(rowNumber);

            headRow.height = 34;

            headRow.eachCell((cell) => {
              cell.font = {
                name: "Segoe UI",
                size: 10.5,
                bold: true,
                color: { argb: argb(COLORS.primaryDark) },
              };

              cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: argb(COLORS.familyHead) },
              };

              cell.border = {
                top: {
                  style: "medium",
                  color: { argb: argb(COLORS.familyHeadBorder) },
                },
                bottom: {
                  style: "thin",
                  color: { argb: argb(COLORS.familyHeadBorder) },
                },
                left: {
                  style: "thin",
                  color: { argb: argb(COLORS.border) },
                },
                right: {
                  style: "thin",
                  color: { argb: argb(COLORS.border) },
                },
              };
            });

            // Members are visually subordinate and grouped.
            const membersCount = (f.members ?? []).length;

            for (let i = 1; i <= membersCount; i++) {
              const memberRow = individualSheet.getRow(rowNumber + i);

              memberRow.height = 28;
              memberRow.outlineLevel = 1;
            }

            rowNumber += 1 + membersCount;
          });
        }
      }

      // ============================================================
      // 3. AID DISTRIBUTIONS REPORT
      // ============================================================
      else if (reportType === "aid") {
        const columns: ReportColumn[] = [
          {
            header: "معرف العملية",
            key: "id",
            width: 18,
            align: "center",
          },
          {
            header: "معرف العائلة",
            key: "familyId",
            width: 18,
            align: "center",
          },
          {
            header: "رقم الهوية",
            key: "headNationalId",
            width: 20,
            align: "center",
          },
          {
            header: "اسم العائلة",
            key: "familyName",
            width: 24,
          },
          {
            header: "رقم الملف",
            key: "fileNumber",
            width: 14,
            align: "center",
          },
          {
            header: "معرف نوع المساعدة",
            key: "aidTypeId",
            width: 20,
            align: "center",
          },
          {
            header: "نوع المساعدة",
            key: "aidTypeName",
            width: 22,
          },
          {
            header: "الكمية",
            key: "quantity",
            width: 14,
            type: "number",
            align: "center",
          },
          {
            header: "الوحدة",
            key: "unit",
            width: 14,
            align: "center",
          },
          {
            header: "تاريخ التوزيع",
            key: "distributionDate",
            width: 18,
            type: "date",
            align: "center",
          },
          {
            header: "معرف المشرف",
            key: "supervisorId",
            width: 18,
            align: "center",
          },
          {
            header: "اسم المشرف",
            key: "supervisorName",
            width: 24,
          },
          {
            header: "الملاحظات",
            key: "notes",
            width: 34,
          },
          {
            header: "تاريخ الإنشاء",
            key: "createdAt",
            width: 18,
            type: "date",
            align: "center",
          },
        ];

        const rows: ReportRow[] = aidDistributions.map((d) => ({
          id: safe(d.id),
          familyId: safe(d.familyId),
          headNationalId: safe(d.headNationalId),
          familyName: safe(d.familyName),
          fileNumber: safe(d.fileNumber),
          aidTypeId: safe(d.aidTypeId),
          aidTypeName: translate(d.aidTypeName),
          quantity: toNumber(d.quantity) ?? 0,
          unit: translate(d.unit),
          distributionDate: parseDate(d.distributionDate),
          supervisorId: safe(d.supervisorId),
          supervisorName: safe(d.supervisorName),
          notes: safe(d.notes),
          createdAt: parseDate(d.createdAt),
        }));

        const totalQuantity = aidDistributions.reduce(
          (sum, distribution) => sum + (toNumber(distribution.quantity) ?? 0),
          0,
        );

        const uniqueAidTypes = new Set(
          aidDistributions
            .map((d) => safe(d.aidTypeName).trim())
            .filter(Boolean),
        ).size;

        const uniqueFamilies = new Set(
          aidDistributions
            .map((d) => safe(d.fileNumber).trim())
            .filter(Boolean),
        ).size;

        createProfessionalSheet("المساعدات", columns, rows, {
          tableName: "AidDistributionsReportTable",

          stats: [
            {
              label: "إجمالي العمليات",
              value: aidDistributions.length,
            },
            {
              label: "إجمالي الكميات",
              value: totalQuantity,
            },
            {
              label: "أنواع المساعدات",
              value: uniqueAidTypes,
            },
            {
              label: "الأسر المستفيدة",
              value: uniqueFamilies,
            },
          ],

          note: "تقرير عمليات المساعدات. الكمية والتواريخ محفوظة كقيم Excel فعلية، مما يسمح بالفرز والتصفية والحساب مباشرة داخل Excel.",
        });
      }

      // ============================================================
      // Unknown report
      // ============================================================
      else {
        throw new Error(`نوع التقرير غير معروف: ${reportType}`);
      }

      // ============================================================
      // Workbook properties
      // ============================================================

      workbook.calcProperties.fullCalcOnLoad = true;

      // ============================================================
      // Download
      // ============================================================

      const excelBuffer = await workbook.xlsx.writeBuffer();

      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;
      link.download = `${fileName}_${exportDate}.xlsx`;

      document.body.appendChild(link);

      link.click();

      document.body.removeChild(link);

      window.setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);

      // ============================================================
      // Success
      // ============================================================

      setExportSuccess(true);

      window.setTimeout(() => {
        setExportSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("EXPORT EXCEL ERROR:", error);

      alert(
        "حدث خطأ أثناء إنشاء تقرير Excel. راجع وحدة التحكم لمعرفة التفاصيل.",
      );
    } finally {
      setExporting(false);
    }
  };
  // =========================================================
  // PDF Export
  // =========================================================

  const handleExportPDF = async (reportType: string) => {
    const safe = (value: unknown): string => {
      if (value === null || value === undefined) return "";
      return String(value);
    };

    const formatDate = (value: unknown): string => {
      if (!value) return "";

      const date = new Date(String(value));

      if (Number.isNaN(date.getTime())) {
        return safe(value);
      }

      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
        2,
        "0",
      )}-${String(date.getDate()).padStart(2, "0")}`;
    };

    const translate = (value: unknown): string => {
      if (value === null || value === undefined) return "";

      const translations: Record<string, string> = {
        healthy: "سليمة",
        sick: "مريض",
        disabled: "ذوو إعاقة",

        male: "ذكر",
        female: "أنثى",

        son: "ابن",
        daughter: "ابنة",
        wife: "زوجة",
        husband: "زوج",
        father: "أب",
        mother: "أم",

        person: "فرد",
        individual: "فرد",

        piece: "قطعة",
        pieces: "قطع",

        cash: "نقد",
      };

      const text = String(value);

      return translations[text] ?? text;
    };
    setExporting(true);

    try {
      const reportTitles: Record<string, string> = {
        families: "تقرير العائلات",
        individuals: "تقرير أفراد الأسر",
        aid: "تقرير المساعدات",
      };

      const title = reportTitles[reportType] || "تقرير";

      // إنشاء عنصر مؤقت للتقرير
      const reportElement = document.createElement("div");

      reportElement.dir = "rtl";

      reportElement.style.position = "fixed";
      reportElement.style.left = "-10000px";
      reportElement.style.top = "0";

      reportElement.style.width = "1400px";

      reportElement.style.background = "#ffffff";

      reportElement.style.padding = "40px";

      reportElement.style.fontFamily = "Arial, Tahoma, sans-serif";

      reportElement.style.color = "#1F2937";

      // =======================================================
      // Header
      // =======================================================

      const header = document.createElement("div");

      header.style.textAlign = "center";
      header.style.marginBottom = "30px";
      header.style.borderBottom = "3px solid #15803D";
      header.style.paddingBottom = "15px";

      const heading = document.createElement("h1");

      heading.textContent = title;

      heading.style.margin = "0";
      heading.style.fontSize = "28px";
      heading.style.fontWeight = "700";
      heading.style.color = "#15803D";

      header.appendChild(heading);

      const dateText = document.createElement("div");

      const now = new Date();

      dateText.textContent = `${now.getFullYear()}-${String(
        now.getMonth() + 1,
      ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      dateText.style.marginTop = "8px";
      dateText.style.fontSize = "14px";
      dateText.style.color = "#6B7280";

      header.appendChild(dateText);

      reportElement.appendChild(header);

      // =======================================================
      // Table helper
      // =======================================================

      const createTable = (columns: string[], rows: string[][]) => {
        const table = document.createElement("table");

        table.style.width = "100%";
        table.style.borderCollapse = "collapse";
        table.style.marginBottom = "25px";
        table.style.fontSize = "11px";
        table.style.tableLayout = "fixed";
        // =======================================================
        // توزيع ذكي لأعمدة PDF
        // =======================================================

        const getColumnWidth = (column: string): string => {
          const wideColumns = [
            "اسم رب الأسرة",
            "رب الأسرة",
            "اسم الفرد",
            "العنوان الحالي",
            "الملاحظات",
          ];

          const mediumColumns = [
            "رقم الملف",
            "رقم الهوية",
            "رقم هوية رب الأسرة",
            "الجوال",
            "رقم الجوال",
            "الجوال البديل",
            "المحافظة الأصل",
            "مدينة الأصل",
            "موقع المخيم",
            "الحالة الصحية",
            "الحالة الاجتماعية",
            "صلة القرابة",
            "نوع المساعدة",
            "المشرف",
          ];

          const smallColumns = [
            "العمر",
            "الجنس",
            "الكمية",
            "الوحدة",
            "المعيل",
            "عدد أفراد الأسرة",
            "عدد الذكور",
            "عدد الإناث",
            "تاريخ الميلاد",
            "تاريخ الدخول",
            "تاريخ التوزيع",
            "حالة السجل",
            "الإعاقة",
          ];

          if (wideColumns.includes(column)) return "16%";

          if (mediumColumns.includes(column)) return "10%";

          if (smallColumns.includes(column)) return "7%";

          return "9%";
        };
        table.dir = "rtl";
        // تحديد عرض كل عمود
        const colgroup = document.createElement("colgroup");

        columns.forEach((column) => {
          const col = document.createElement("col");
          col.style.width = getColumnWidth(column);
          colgroup.appendChild(col);
        });

        table.appendChild(colgroup);

        const thead = document.createElement("thead");

        const headerRow = document.createElement("tr");

        columns.forEach((column) => {
          const th = document.createElement("th");

          th.textContent = column;

          th.style.background = "#15803D";
          th.style.color = "#FFFFFF";
          th.style.padding = "8px 6px";
          th.style.border = "1px solid #D1D5DB";
          th.style.fontWeight = "700";
          th.style.textAlign = "center";
          th.style.verticalAlign = "middle";
          th.style.lineHeight = "1.4";
          th.style.whiteSpace = "normal";

          headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");

        rows.forEach((row, rowIndex) => {
          const tr = document.createElement("tr");

          row.forEach((value) => {
            const td = document.createElement("td");

            td.textContent = value ?? "";
            const textValue = String(value ?? "");

            if (
              /^\d{8,}$/.test(textValue.replace(/\s/g, "")) ||
              /^\d{4}-\d{2}-\d{2}$/.test(textValue)
            ) {
              td.style.direction = "ltr";
              td.style.textAlign = "center";
              td.style.whiteSpace = "nowrap";
            }

            td.style.padding = "7px 6px";
            td.style.border = "1px solid #D1D5DB";
            td.style.textAlign = "right";
            td.style.verticalAlign = "middle";
            td.style.lineHeight = "1.35";
            td.style.wordBreak = "normal";
            td.style.overflowWrap = "break-word";

            if (rowIndex % 2 === 1) {
              td.style.background = "#F6FBF8";
            }

            tr.appendChild(td);
          });

          tbody.appendChild(tr);
        });

        table.appendChild(tbody);

        reportElement.appendChild(table);

        return table;
      };
      // =======================================================
      // Families
      // =======================================================

      if (reportType === "families") {
        // =======================================================
        // 1. بيانات العائلات الأساسية
        // =======================================================

        const familyColumns = [
          "رقم الملف",
          "اسم رب الأسرة",
          "رقم هوية رب الأسرة",
          "تاريخ الميلاد",
          "العمر",
          "الجنس",
          "رقم الجوال",
          "الجوال البديل",
          "الحالة الصحية",
          "الحالة الاجتماعية",
          "نوع السكن",
        ];

        const familyRows = activeFamilies.map((f) => [
          safe(f.fileNumber),
          safe(f.headName),
          safe(f.headNationalId),
          formatDate(f.headDateOfBirth),
          safe(f.headAge),
          translate(f.gender),
          safe(f.headPhone),
          safe(f.alternatePhone),
          translate(f.headHealthStatus),
          translate(f.maritalStatus),
          translate(f.housingType),
        ]);

        createTable(familyColumns, familyRows);

        // =======================================================
        // 2. الموقع والعنوان
        // =======================================================

        const locationColumns = [
          "رقم الملف",
          "المحافظة الأصل",
          "مدينة الأصل",
          "العنوان الحالي",
          "موقع المخيم",
          "تاريخ الدخول",
          "المعيل",
          "عدد أفراد الأسرة",
          "عدد الذكور",
          "عدد الإناث",
        ];

        const locationRows = activeFamilies.map((f) => [
          safe(f.fileNumber),
          safe(f.originGovernorate),
          safe(f.originCity),
          safe(f.currentAddress),
          safe(f.campLocation),
          formatDate(f.entryDate),
          f.isProvider ? "نعم" : "لا",
          safe(f.membersCount),
          safe(f.malesCount ?? 0),
          safe(f.femalesCount ?? 0),
        ]);

        createTable(locationColumns, locationRows);

        // =======================================================
        // 3. التوزيع العمري للذكور والإناث
        // =======================================================

        const ageColumns = [
          "رقم الملف",
          "ذكور 0-5",
          "ذكور 6-11",
          "ذكور 12-17",
          "ذكور 18-24",
          "ذكور 25-60",
          "ذكور 60+",
          "إناث 0-5",
          "إناث 6-11",
          "إناث 12-17",
          "إناث 18-24",
          "إناث 25-60",
          "إناث 60+",
        ];

        const ageRows = activeFamilies.map((f) => [
          safe(f.fileNumber),

          safe(f.male0to5 ?? 0),
          safe(f.male6to11 ?? 0),
          safe(f.male12to17 ?? 0),
          safe(f.male18to24 ?? 0),
          safe(f.male25to60 ?? 0),
          safe(f.male60Plus ?? 0),

          safe(f.female0to5 ?? 0),
          safe(f.female6to11 ?? 0),
          safe(f.female12to17 ?? 0),
          safe(f.female18to24 ?? 0),
          safe(f.female25to60 ?? 0),
          safe(f.female60Plus ?? 0),
        ]);

        createTable(ageColumns, ageRows);

        // =======================================================
        // 4. البيانات الإدارية وحالة السجل
        // =======================================================

        const adminColumns = [
          "رقم الملف",
          "الملاحظات",
          "المسجل بواسطة",
          "تاريخ الإنشاء",
          "آخر تحديث",
          "حالة السجل",
        ];

        const adminRows = activeFamilies.map((f) => [
          safe(f.fileNumber),
          safe(f.notes),
          safe(f.registeredBy),
          formatDate(f.createdAt),
          formatDate(f.updatedAt),
          f.isDeleted ? "محذوف" : "نشط",
        ]);

        createTable(adminColumns, adminRows);

        // =======================================================
        // 5. أفراد العائلات
        // =======================================================

        const memberColumns = [
          "رقم الملف",
          "اسم الفرد",
          "رقم الهوية",
          "تاريخ الميلاد",
          "العمر",
          "الجنس",
          "صلة القرابة",
          "الحالة الصحية",
          "الإعاقة",
          "الملاحظات",
        ];

        const memberRows: string[][] = [];

        activeFamilies.forEach((f) => {
          (f.members ?? []).forEach((m) => {
            memberRows.push([
              safe(f.fileNumber),
              safe(m.name),
              safe(m.nationalId),
              formatDate(m.dateOfBirth),
              safe(m.age),
              translate(m.gender),
              translate(m.relation),
              translate(m.healthStatus),
              translate(m.disability),
              safe(m.notes),
            ]);
          });
        });

        if (memberRows.length > 0) {
          createTable(memberColumns, memberRows);
        }
      }
      // =======================================================
      // Individuals
      // =======================================================
      else if (reportType === "individuals") {
        const columns = [
          "رقم الملف",
          "رب الأسرة",
          "اسم الفرد",
          "رقم الهوية",
          "تاريخ الميلاد",
          "العمر",
          "الجنس",
          "صلة القرابة",
          "الحالة الصحية",
          "الإعاقة",
          "الملاحظات",
        ];

        const rows: string[][] = [];

        activeFamilies.forEach((f) => {
          (f.members ?? []).forEach((m) => {
            rows.push([
              safe(f.fileNumber),
              safe(f.headName),
              safe(m.name),
              safe(m.nationalId),
              formatDate(m.dateOfBirth),
              safe(m.age),
              translate(m.gender),
              translate(m.relation),
              translate(m.healthStatus),
              translate(m.disability),
              safe(m.notes),
            ]);
          });
        });

        createTable(columns, rows);
      }

      // =======================================================
      // Aid
      // =======================================================
      else if (reportType === "aid") {
        const columns = [
          "رقم الملف",
          "اسم العائلة",
          "رقم الهوية",
          "نوع المساعدة",
          "الكمية",
          "الوحدة",
          "تاريخ التوزيع",
          "المشرف",
          "الملاحظات",
        ];

        const rows = aidDistributions.map((d) => [
          safe(d.fileNumber),
          safe(d.familyName),
          safe(d.headNationalId),
          translate(d.aidTypeName),
          safe(d.quantity),
          translate(d.unit),
          formatDate(d.distributionDate),
          safe(d.supervisorName),
          safe(d.notes),
        ]);

        createTable(columns, rows);
      }

      // =======================================================
      // Footer
      // =======================================================

      const footer = document.createElement("div");

      footer.textContent =
        "تم إنشاء التقرير بواسطة نظام إدارة الأسر والمساعدات";

      footer.style.marginTop = "20px";
      footer.style.paddingTop = "12px";
      footer.style.borderTop = "1px solid #D1D5DB";
      footer.style.textAlign = "center";
      footer.style.fontSize = "11px";
      footer.style.color = "#6B7280";

      reportElement.appendChild(footer);

      document.body.appendChild(reportElement);
      // =======================================================
      // إنشاء PDF - نسخة محسنة وأسرع
      // =======================================================

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const marginX = 8;
      const marginY = 8;

      const printableWidth = pageWidth - marginX * 2;

      // -------------------------------------------------------
      // العناصر
      // -------------------------------------------------------

      const headerElement = header;

      const tables = Array.from(
        reportElement.querySelectorAll("table"),
      ) as HTMLTableElement[];

      const footerElement = footer;

      // -------------------------------------------------------
      // حجم العرض الحقيقي بالـ Pixel
      // مهم جدًا: لا نستخدم mm كأنه px
      // -------------------------------------------------------

      const renderWidthPx = Math.round((printableWidth * 96) / 25.4);

      reportElement.style.width = `${renderWidthPx}px`;
      reportElement.style.boxSizing = "border-box";

      // -------------------------------------------------------
      // تحويل HTML إلى Canvas
      // scale = 1 أسرع بكثير من 2
      // -------------------------------------------------------

      const renderElement = async (element: HTMLElement) => {
        return await html2canvas(element, {
          scale: 0.8,
          useCORS: true,
          backgroundColor: "#FFFFFF",
          logging: false,
          imageTimeout: 0,
          windowWidth: renderWidthPx,
          removeContainer: true,
        });
      };

      // -------------------------------------------------------
      // تجهيز الـ Header
      // -------------------------------------------------------

      headerElement.style.width = `${renderWidthPx}px`;
      headerElement.style.boxSizing = "border-box";
      headerElement.style.marginBottom = "15px";

      // نخفي الجداول والفوتر مؤقتًا
      tables.forEach((table) => {
        table.style.display = "none";
      });

      footerElement.style.display = "none";

      const headerCanvas = await renderElement(headerElement);

      // إعادة الجداول
      tables.forEach((table) => {
        table.style.display = "table";
      });

      // -------------------------------------------------------
      // حساب ارتفاع الـ Header
      // -------------------------------------------------------

      const headerRatio = printableWidth / headerCanvas.width;

      const headerHeight = headerCanvas.height * headerRatio;

      // -------------------------------------------------------
      // إضافة Header للصفحة
      // -------------------------------------------------------

      const addPageHeader = () => {
        pdf.addImage(
          headerCanvas,
          "JPEG",
          marginX,
          marginY,
          printableWidth,
          headerHeight,
        );

        return marginY + headerHeight + 5;
      };

      // -------------------------------------------------------
      // الصفحة الأولى
      // -------------------------------------------------------

      let currentY = addPageHeader();

      // -------------------------------------------------------
      // معالجة الجداول
      // -------------------------------------------------------

      for (const table of tables) {
        // مهم: نفس عرض الـ HTML الحقيقي
        table.style.width = `${renderWidthPx}px`;
        table.style.boxSizing = "border-box";
        table.style.tableLayout = "fixed";

        const rows = Array.from(
          table.querySelectorAll("tbody tr"),
        ) as HTMLTableRowElement[];

        const thead = table.querySelector("thead");

        // -----------------------------------------------------
        // جدول فارغ
        // -----------------------------------------------------

        if (rows.length === 0) {
          const tableCanvas = await renderElement(table);

          const tableRatio = printableWidth / tableCanvas.width;

          const tableHeight = tableCanvas.height * tableRatio;

          if (currentY + tableHeight > pageHeight - marginY) {
            pdf.addPage();
            currentY = addPageHeader();
          }

          pdf.addImage(
            tableCanvas,
            "JPEG",
            marginX,
            currentY,
            printableWidth,
            tableHeight,
          );

          currentY += tableHeight + 5;

          continue;
        }

        // -----------------------------------------------------
        // قياس الصفوف
        // -----------------------------------------------------

        const headerRow = thead?.querySelector(
          "tr",
        ) as HTMLTableRowElement | null;

        const headerHeightPx = headerRow
          ? headerRow.getBoundingClientRect().height
          : 35;

        const rowHeights = rows.map(
          (row) => row.getBoundingClientRect().height,
        );

        const tableWidthPx = table.getBoundingClientRect().width;

        const pxToMm = printableWidth / tableWidthPx;

        const headerHeightMm = headerHeightPx * pxToMm;

        // -----------------------------------------------------
        // تقسيم الصفوف
        // -----------------------------------------------------

        const availableHeight = pageHeight - marginY - 5;

        const chunks: HTMLTableRowElement[][] = [];

        let currentChunk: HTMLTableRowElement[] = [];

        let currentChunkHeight = headerHeightMm;

        for (let i = 0; i < rows.length; i++) {
          const rowHeightMm = rowHeights[i] * pxToMm;

          if (
            currentChunk.length > 0 &&
            currentChunkHeight + rowHeightMm > availableHeight
          ) {
            chunks.push(currentChunk);

            currentChunk = [];
            currentChunkHeight = headerHeightMm;
          }

          currentChunk.push(rows[i]);
          currentChunkHeight += rowHeightMm;
        }

        if (currentChunk.length > 0) {
          chunks.push(currentChunk);
        }

        // -----------------------------------------------------
        // رسم أجزاء الجدول
        // -----------------------------------------------------

        for (const rowsChunk of chunks) {
          const tempTable = document.createElement("table");

          tempTable.dir = "rtl";

          tempTable.style.width = `${renderWidthPx}px`;

          tempTable.style.boxSizing = "border-box";

          tempTable.style.tableLayout = "fixed";

          tempTable.style.borderCollapse = "collapse";

          tempTable.style.background = "#FFFFFF";

          tempTable.style.position = "fixed";

          tempTable.style.left = "-10000px";

          tempTable.style.top = "0";

          // ---------------------------------------------------
          // Header
          // ---------------------------------------------------

          if (thead) {
            tempTable.appendChild(thead.cloneNode(true));
          }

          // ---------------------------------------------------
          // الصفوف
          // ---------------------------------------------------

          const tbody = document.createElement("tbody");

          rowsChunk.forEach((row) => {
            tbody.appendChild(row.cloneNode(true));
          });

          tempTable.appendChild(tbody);

          document.body.appendChild(tempTable);

          // ---------------------------------------------------
          // Canvas
          // ---------------------------------------------------

          const tableCanvas = await renderElement(tempTable);

          document.body.removeChild(tempTable);

          const tableRatio = printableWidth / tableCanvas.width;

          const tableHeight = tableCanvas.height * tableRatio;

          // ---------------------------------------------------
          // صفحة جديدة إذا لم يوجد مكان
          // ---------------------------------------------------

          if (currentY + tableHeight > pageHeight - marginY) {
            pdf.addPage();

            currentY = addPageHeader();
          }

          // ---------------------------------------------------
          // إضافة الجدول
          // ---------------------------------------------------

          pdf.addImage(
            tableCanvas,
            "JPEG",
            marginX,
            currentY,
            printableWidth,
            tableHeight,
          );

          currentY += tableHeight + 5;
        }
      }

      // -------------------------------------------------------
      // Footer
      // -------------------------------------------------------

      footerElement.style.display = "block";

      footerElement.style.width = `${renderWidthPx}px`;

      footerElement.style.boxSizing = "border-box";

      const footerCanvas = await renderElement(footerElement);

      const footerRatio = printableWidth / footerCanvas.width;

      const footerHeight = footerCanvas.height * footerRatio;

      // -------------------------------------------------------
      // إضافة Footer
      // -------------------------------------------------------

      if (currentY + footerHeight > pageHeight - marginY) {
        pdf.addPage();

        currentY = addPageHeader();
      }

      pdf.addImage(
        footerCanvas,
        "JPEG",
        marginX,
        currentY,
        printableWidth,
        footerHeight,
      );

      // -------------------------------------------------------
      // تنظيف
      // -------------------------------------------------------

      if (document.body.contains(reportElement)) {
        document.body.removeChild(reportElement);
      }
      // -------------------------------------------------------
      // حفظ الملف
      // -------------------------------------------------------

      const date = new Date().toISOString().split("T")[0];

      pdf.save(`${title}_${date}.pdf`);

      setExportSuccess(true);

      setTimeout(() => {
        setExportSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("EXPORT PDF ERROR:", error);

      alert("حدث خطأ أثناء إنشاء ملف PDF.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5 fade-in">
      {/* Export Success Banner */}
      {exportSuccess && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-semibold">تم تصدير التقرير بنجاح</span>
        </div>
      )}

      {/* =========================================================
    Summary Cards
========================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          {
            label: "إجمالي العائلات",
            value: activeFamilies.length,
            color: "text-green-600",
            bg: "bg-green-50",
            accent: "bg-green-600",
            icon: Users,
          },
          {
            label: "إجمالي الأفراد",
            value: totalIndividuals,
            color: "text-blue-600",
            bg: "bg-blue-50",
            accent: "bg-blue-600",
            icon: Users,
          },
          {
            label: "متوسط الأسرة",
            value: avgSize,
            color: "text-purple-600",
            bg: "bg-purple-50",
            accent: "bg-purple-600",
            icon: TrendingUp,
          },
          {
            label: "ذوو الإعاقات",
            value: disabledMembers,
            color: "text-red-600",
            bg: "bg-red-50",
            accent: "bg-red-600",
            icon: AlertCircle,
          },
          {
            label: "أطفال أقل من 12",
            value: childrenUnder12,
            color: "text-orange-600",
            bg: "bg-orange-50",
            accent: "bg-orange-600",
            icon: Users,
          },
          {
            label: "توزيعات المساعدات",
            value: aidDistributions.length,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            accent: "bg-emerald-600",
            icon: Gift,
          },
        ].map((s, i) => {
          const Icon = s.icon;

          return (
            <div
              key={i}
              className="
          group
          relative
          overflow-hidden
          min-h-[112px]
          bg-white
          rounded-2xl
          border border-gray-100
          shadow-sm
          transition-all duration-200
          hover:-translate-y-0.5
          hover:shadow-md
        "
            >
              {/* الشريط العلوي */}
              <div
                className={`
            absolute
            top-0
            right-0
            left-0
            h-1
            ${s.accent}
          `}
              />

              {/* محتوى البطاقة */}
              <div className="flex h-full items-center justify-between gap-3 px-4 py-5">
                {/* النص والإحصائية */}
                <div className="min-w-0 flex-1 text-right">
                  <p
                    className="
                min-h-[40px]
                flex
                items-center
                text-xs
                font-semibold
                leading-5
                text-gray-500
              "
                  >
                    {s.label}
                  </p>

                  <p
                    className={`
                mt-1
                text-2xl
                font-black
                leading-none
                tracking-tight
                ${s.color}
              `}
                  >
                    {s.value}
                  </p>
                </div>

                {/* الأيقونة */}
                <div
                  className={`
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-xl
              ${s.bg}
              ${s.color}
              transition-transform duration-200
              group-hover:scale-105
            `}
                >
                  <Icon className="h-5 w-5" strokeWidth={2.2} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* =========================================================
    Export Section
========================================================= */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
        {/* Section Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="
          flex h-10 w-10 shrink-0
          items-center justify-center
          rounded-xl
          bg-green-50
          text-green-600
        "
            >
              <Download className="h-5 w-5" strokeWidth={2.2} />
            </div>

            <div className="min-w-0">
              <h3 className="text-base font-bold text-gray-800">
                تصدير البيانات
              </h3>

              <p className="mt-0.5 text-xs leading-5 text-gray-400">
                تصدير بيانات النظام بتنسيق احترافي يدعم العربية
              </p>
            </div>
          </div>
        </div>

        {/* Export Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              id: "families",
              title: "تقرير العائلات",
              description: `${activeFamilies.length} عائلة مسجلة`,
              icon: Users,
              iconBg: "bg-green-50",
              iconColor: "text-green-600",
              accent: "bg-green-600",
            },
            {
              id: "individuals",
              title: "تقرير الأفراد",
              description: `${totalIndividuals} فرد مسجل`,
              icon: Users,
              iconBg: "bg-green-50",
              iconColor: "text-green-600",
              accent: "bg-green-600",
            },
            {
              id: "aid",
              title: "تقرير المساعدات",
              description: `${aidDistributions.length} عملية توزيع`,
              icon: Gift,
              iconBg: "bg-emerald-50",
              iconColor: "text-emerald-600",
              accent: "bg-green-600",
            },
          ].map((exp) => {
            const Icon = exp.icon;

            return (
              <button
                key={exp.id}
                type="button"
                onClick={() => {
                  setSelectedReport(exp.id);
                  setShowExportModal(true);
                }}
                disabled={exporting}
                className="
            group
            relative
            overflow-hidden
            flex
            min-h-[170px]
            w-full
            flex-col
            rounded-2xl
            border border-gray-100
            bg-white
            p-5
            text-right
            shadow-sm
            transition-all
            duration-200
            hover:-translate-y-0.5
            hover:border-gray-200
            hover:shadow-md
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
              >
                {/* Top Accent */}
                <div
                  className={`
              absolute
              top-0
              right-0
              left-0
              h-1
              ${exp.accent}
            `}
                />

                {/* Icon */}
                <div
                  className={`
              flex
              h-12
              w-12
              shrink-0
              items-center
              justify-center
              rounded-xl
              ${exp.iconBg}
              ${exp.iconColor}
              transition-transform
              duration-200
              group-hover:scale-105
            `}
                >
                  <Icon className="h-6 w-6" strokeWidth={2.1} />
                </div>

                {/* Text */}
                <div className="mt-4 min-w-0">
                  <h4 className="text-base font-bold leading-6 text-gray-800">
                    {exp.title}
                  </h4>

                  <p className="mt-1 text-xs leading-5 text-gray-400">
                    {exp.description}
                  </p>
                </div>

                {/* Action */}
                <div
                  className="
              mt-auto
              pt-4
              flex
              items-center
              gap-2
              text-sm
              font-bold
              text-green-600
            "
                >
                  {exporting ? (
                    <div
                      className="
                  h-4 w-4
                  animate-spin
                  rounded-full
                  border-2
                  border-green-500
                  border-t-transparent
                "
                    />
                  ) : (
                    <Download
                      className="
                  h-4 w-4
                  transition-transform
                  duration-200
                  group-hover:-translate-y-0.5
                "
                      strokeWidth={2.2}
                    />
                  )}

                  <span>{exporting ? "جاري التصدير..." : "تصدير التقرير"}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Governorate */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
                <MapPin className="w-4 h-4 text-emerald-600" />
              </div>

              <div>
                <h3 className="font-bold text-gray-800 text-base">
                  توزيع العائلات حسب المحافظة
                </h3>

                <p className="text-xs text-gray-400 mt-1">
                  عدد العائلات المسجلة
                </p>
              </div>
            </div>
          </div>

          <div className="pt-1">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={govChartData} layout="vertical">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  horizontal={false}
                />

                <XAxis
                  type="number"
                  domain={[0, "dataMax + 1"]}
                  ticks={[0, 1, 2, 3, 4, 5]}
                  tick={{
                    fontSize: 11,
                    fill: "#64748b",
                    fontWeight: 500,
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  type="category"
                  dataKey="name"
                  orientation="right"
                  tick={{
                    fontSize: 11,
                    fill: "#334155",
                    fontWeight: 600,
                    textAnchor: "start",
                  }}
                  width={95}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "#f8fafc" }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                    fontSize: "12px",
                  }}
                  formatter={(v) => [`${v} عائلة`, ""]}
                />

                <Bar dataKey="count" radius={[8, 0, 0, 8]} barSize={24}>
                  {govChartData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={GOV_CHART_COLORS[i % GOV_CHART_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Health Status */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-red-600" />
            </div>

            <div>
              <h3 className="font-bold text-gray-800">
                الحالة الصحية لأرباب الأسر
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                توزيع الحالات الصحية للأسر المسجلة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ResponsiveContainer width="58%" height={190}>
              <PieChart>
                <Pie
                  data={healthData}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={2}
                  dataKey="count"
                  nameKey="name"
                >
                  {healthData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={
                        index === 0
                          ? "#16a34a"
                          : index === 1
                            ? "#f59e0b"
                            : "#dc2626"
                      }
                    />
                  ))}
                </Pie>

                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e5e7eb",
                    fontSize: "12px",
                  }}
                  formatter={(value, name) => [`${value} حالة`, name]}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="flex-1 space-y-4">
              {healthData.map((h, i) => {
                const total = healthData.reduce(
                  (sum, item) => sum + Number(item.count || 0),
                  0,
                );

                const percentage =
                  total > 0
                    ? Math.round((Number(h.count || 0) / total) * 100)
                    : 0;

                const statusColor =
                  i === 0 ? "#16a34a" : i === 1 ? "#f59e0b" : "#dc2626";

                return (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: statusColor }}
                    />

                    <span className="text-sm text-gray-600 flex-1">
                      {h.name}
                    </span>

                    <span className="text-sm font-bold text-gray-800">
                      {h.count}
                    </span>

                    <span className="text-xs text-gray-400 w-10 text-left">
                      ({percentage}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Aid Distribution */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
                <Gift className="w-4 h-4 text-emerald-600" />
              </div>

              <div>
                <h3 className="font-bold text-gray-800 text-base">
                  توزيع المساعدات حسب النوع
                </h3>

                <p className="text-xs text-gray-400 mt-1">
                  عدد عمليات التوزيع لكل نوع
                </p>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="pt-1">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart
                data={aidCatData}
                margin={{
                  top: 20,
                  right: 10,
                  left: 5,
                  bottom: 15,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  vertical={false}
                />

                <XAxis
                  dataKey="name"
                  tick={{
                    fontSize: 10,
                    fill: "#475569",
                    fontWeight: 500,
                  }}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={10}
                  interval={0}
                />

                <YAxis
                  allowDecimals={false}
                  domain={[0, 5]}
                  ticks={[0, 1, 2, 3, 4, 5]}
                  tick={{
                    fontSize: 12,
                    fill: "#334155",
                    fontWeight: 700,
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={34}
                />

                <Tooltip
                  cursor={{ fill: "#f8fafc" }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                    fontSize: "12px",
                    direction: "rtl",
                  }}
                  labelStyle={{
                    color: "#1f2937",
                    fontWeight: "700",
                    marginBottom: "4px",
                  }}
                  formatter={(value) => [`${value} توزيع`, ""]}
                />

                <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={38}>
                  <LabelList
                    dataKey="count"
                    position="top"
                    offset={8}
                    style={{
                      fill: "#1e293b",
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  />

                  {aidCatData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={AID_CHART_COLORS[i % AID_CHART_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
                <BarChart2 className="w-4 h-4 text-emerald-600" />
              </div>

              <div>
                <h3 className="text-base font-bold text-emerald-700">
                  ملخص إحصائي شامل
                </h3>

                <p className="text-xs text-gray-400 mt-1">
                  نظرة سريعة على أهم مؤشرات النظام
                </p>
              </div>
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                label: "العائلات النشطة",
                value: activeFamilies.length,
                unit: "عائلة",
              },
              {
                label: "العائلات المحذوفة (ناعم)",
                value: families.filter((f) => f.isDeleted).length,
                unit: "عائلة",
              },
              {
                label: "إجمالي الأفراد",
                value: totalIndividuals,
                unit: "فرد",
              },
              {
                label: "متوسط حجم الأسرة",
                value: avgSize,
                unit: "أفراد",
              },
              {
                label: "أكبر عائلة",
                value: maxFamilySize,
                unit: "أفراد",
              },
              {
                label: "أصغر عائلة",
                value: minFamilySize,
                unit: "أفراد",
              },
              {
                label: "مجموع توزيعات المساعدات",
                value: aidDistributions.length,
                unit: "توزيع",
              },
              {
                label: "أصناف المساعدات",
                value: aidTypes.length,
                unit: "صنف",
              },
            ].map((row, i) => (
              <div
                key={i}
                className="
          flex items-center justify-between
          min-h-[60px]
          rounded-xl
          border border-emerald-100/70
          bg-emerald-50/40
          px-4
          py-3
          transition-all
          duration-200
          hover:border-emerald-200
hover:bg-emerald-50/70
        "
              >
                {/* Label */}
                <span className="text-sm font-medium text-gray-600">
                  {row.label}
                </span>

                {/* Value */}
                <div className="flex items-baseline gap-1.5 shrink-0">
                  <span className="text-xl font-black tracking-tight text-emerald-700">
                    {row.value}
                  </span>

                  <span className="text-xs font-medium text-gray-400">
                    {row.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {showExportModal &&
        createPortal(
          <div
            className="
  fixed inset-0 z-[9999]
  flex items-center justify-center
  bg-black/50
  backdrop-blur-[3px]
  p-4
"
            onClick={() => {
              if (!exporting) {
                setShowExportModal(false);
              }
            }}
          >
            <div
              dir="rtl"
              className="
  w-full max-w-md
  max-h-[calc(100vh-2rem)]
  overflow-y-auto
  rounded-3xl
  bg-white
  shadow-2xl
  ring-1 ring-black/5
  animate-in fade-in zoom-in-95
  duration-200
"
              onClick={(e) => e.stopPropagation()}
            >
              {/* =========================
          Header
      ========================== */}
              <div className="relative bg-gradient-to-br from-green-700 to-emerald-600 px-6 py-6 text-white">
                {/* Close */}
                <button
                  type="button"
                  onClick={() => {
                    if (!exporting) {
                      setShowExportModal(false);
                    }
                  }}
                  disabled={exporting}
                  className="
            absolute left-4 top-4
            flex h-8 w-8 items-center justify-center
            rounded-full
            bg-white/10
            text-white
            transition
            hover:bg-white/20
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
                  aria-label="إغلاق"
                >
                  ×
                </button>

                <div className="flex flex-col items-center text-center">
                  <div
                    className="
              mb-3 flex h-14 w-14
              items-center justify-center
              rounded-2xl
              bg-white/15
              ring-1 ring-white/20
            "
                  >
                    <Download className="h-7 w-7" />
                  </div>

                  <h2 className="text-2xl font-black tracking-tight">
                    تصدير التقرير
                  </h2>

                  <p className="mt-1 text-sm text-green-50">
                    اختر صيغة الملف المناسبة
                  </p>
                </div>
              </div>

              {/* =========================
          Export Options
      ========================== */}
              <div className="space-y-3 p-5">
                {/* CSV */}
                <button
                  type="button"
                  onClick={() => {
                    handleExport(selectedReport);
                    setShowExportModal(false);
                  }}
                  disabled={exporting}
                  className="
            group
            flex w-full items-center gap-4
            rounded-2xl
            border border-gray-200
            bg-white
            p-4
            text-right
            transition-all duration-200
            hover:-translate-y-0.5
            hover:border-green-300
            hover:bg-green-50/60
            hover:shadow-md
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
                >
                  <div
                    className="
              flex h-12 w-12 shrink-0
              items-center justify-center
              rounded-xl
              bg-green-50
              text-green-600
              transition
              group-hover:bg-green-100
            "
                  >
                    <FileText className="h-6 w-6" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-gray-800">CSV</div>

                    <div className="mt-1 text-xs leading-5 text-gray-500">
                      مناسب لبرنامج Excel وجميع الجداول
                    </div>
                  </div>

                  <div className="text-gray-300 transition group-hover:text-green-600">
                    ←
                  </div>
                </button>

                {/* Excel */}
                <button
                  type="button"
                  onClick={() => {
                    handleExportExcel(selectedReport);
                    setShowExportModal(false);
                  }}
                  disabled={exporting}
                  className="
            group
            flex w-full items-center gap-4
            rounded-2xl
            border border-gray-200
            bg-white
            p-4
            text-right
            transition-all duration-200
            hover:-translate-y-0.5
            hover:border-emerald-300
            hover:bg-emerald-50/60
            hover:shadow-md
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
                >
                  <div
                    className="
              flex h-12 w-12 shrink-0
              items-center justify-center
              rounded-xl
              bg-emerald-50
              text-emerald-600
              transition
              group-hover:bg-emerald-100
            "
                  >
                    <FileSpreadsheet className="h-6 w-6" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-gray-800">Excel</div>

                    <div className="mt-1 text-xs leading-5 text-gray-500">
                      للتعديل والتحليل وإدارة البيانات
                    </div>
                  </div>

                  <div className="text-gray-300 transition group-hover:text-emerald-600">
                    ←
                  </div>
                </button>

                {/* PDF */}
                <button
                  type="button"
                  onClick={async () => {
                    await handleExportPDF(selectedReport);
                    setShowExportModal(false);
                  }}
                  disabled={exporting}
                  className="
            group
            flex w-full items-center gap-4
            rounded-2xl
            border border-gray-200
            bg-white
            p-4
            text-right
            transition-all duration-200
            hover:-translate-y-0.5
            hover:border-red-300
            hover:bg-red-50/60
            hover:shadow-md
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
                >
                  <div
                    className="
              flex h-12 w-12 shrink-0
              items-center justify-center
              rounded-xl
              bg-red-50
              text-red-500
              transition
              group-hover:bg-red-100
            "
                  >
                    <FileArchive className="h-6 w-6" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-gray-800">PDF</div>

                    <div className="mt-1 text-xs leading-5 text-gray-500">
                      جاهز للطباعة والمشاركة
                    </div>
                  </div>

                  <div className="text-gray-300 transition group-hover:text-red-500">
                    ←
                  </div>
                </button>
              </div>

              {/* =========================
          Footer
      ========================== */}
              <div className="border-t border-gray-100 bg-gray-50/70 px-5 py-4">
                <button
                  type="button"
                  onClick={() => {
                    if (!exporting) {
                      setShowExportModal(false);
                    }
                  }}
                  disabled={exporting}
                  className="
            h-11 w-full
            rounded-xl
            border border-gray-200
            bg-white
            font-semibold
            text-gray-600
            transition-all duration-200
            hover:border-gray-300
            hover:bg-gray-100
            hover:text-gray-800
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
