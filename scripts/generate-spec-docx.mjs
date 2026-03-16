import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, LevelFormat } from "docx";
import fs from "fs";

// Brand colors
const PRIMARY_RED = "E60012";
const DARK = "1A1A1A";
const MUTED_BG = "F5F5F5";
const BORDER = "E5E5E5";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const HEADER_BG = "D5E8F0";
const WHITE = "FFFFFF";

// Table helper
const border = { style: BorderStyle.SINGLE, size: 1, color: BORDER };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

function headerCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: "2B5797", type: ShadingType.CLEAR },
    margins: cellMargins,
    verticalAlign: "center",
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: WHITE, font: "Arial", size: 20 })] })]
  });
}

function cell(text, width, opts = {}) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: opts.shading ? { fill: opts.shading, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    children: [new Paragraph({
      children: [new TextRun({ text, font: "Arial", size: 20, bold: opts.bold, color: opts.color || DARK })]
    })]
  });
}

function makeTable(headers, rows, colWidths) {
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({ children: headers.map((h, i) => headerCell(h, colWidths[i])) }),
      ...rows.map((row, ri) => new TableRow({
        children: row.map((c, i) => cell(c, colWidths[i], { shading: ri % 2 === 1 ? MUTED_BG : undefined }))
      }))
    ]
  });
}

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 32, color: DARK })]
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 160 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 26, color: "2B5797" })]
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 120 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 22, color: DARK })]
  });
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after || 120 },
    children: [new TextRun({ text, font: "Arial", size: 20, ...opts })]
  });
}

function codePara(text) {
  return new Paragraph({
    spacing: { after: 40 },
    indent: { left: 360 },
    children: [new TextRun({ text, font: "Consolas", size: 18, color: "333333" })]
  });
}

function bulletItem(text, ref = "bullets") {
  return new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, font: "Arial", size: 20 })]
  });
}

// Build document
const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 20 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial" },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial" },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: "Arial" },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
    ]
  },
  numbering: {
    config: [
      { reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  sections: [
    // === Cover Page ===
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        }
      },
      headers: {
        default: new Header({ children: [
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: PRIMARY_RED, space: 1 } },
            children: [new TextRun({ text: "Dr.stretch SPOT \u2014 System Specification", font: "Arial", size: 18, color: "999999" })]
          })
        ]})
      },
      footers: {
        default: new Footer({ children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "Page ", font: "Arial", size: 16, color: "999999" }),
              new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: "999999" })
            ]
          })
        ]})
      },
      children: [
        new Paragraph({ spacing: { before: 3000 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: "Dr.stretch SPOT", bold: true, font: "Arial", size: 56, color: PRIMARY_RED })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
          children: [new TextRun({ text: "System Specification", font: "Arial", size: 36, color: DARK })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "OB/OG Trainer Matching Platform", font: "Arial", size: 24, color: "666666" })]
        }),
        new Paragraph({ spacing: { before: 1200 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Version 1.0.0", font: "Arial", size: 22, color: "666666" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "2026-03-11", font: "Arial", size: 22, color: "666666" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200 },
          children: [new TextRun({ text: "Status: Phase 2 Production", font: "Arial", size: 22, color: "666666" })]
        }),

        // === Page Break → Content ===
        new Paragraph({ children: [new PageBreak()] }),

        // === Project Overview ===
        heading1("Project Overview"),
        para("Dr.stretch SPOT は、Dr.stretch を退職したトレーナーが副業として店舗シフトに参加できる OB/OG トレーナー マッチングプラットフォームである。"),
        para("店舗が人手不足のシフトを公開 \u2192 退職済みトレーナーが応募 \u2192 QR コードで打刻 \u2192 勤務完了後に時給精算、という一連のフローをシステム化する。"),

        // === Purpose ===
        heading1("Purpose"),
        makeTable(
          ["\u8AB2\u984C", "\u89E3\u6C7A\u7B56"],
          [
            ["店舗の慢性的な人手不足", "退職トレーナーを即戦力として活用"],
            ["退職者の離職後スキル活用", "副業として柔軟にシフト参加可能"],
            ["時給計算の属人化", "在籍年数・出勤頻度・緊急度による自動計算"],
            ["ブランク期間による品質低下", "60/90/120日ルールでスキルチェック自動管理"],
            ["出退勤の不正防止", "QRコード + GPS位置認証による打刻"],
            ["緊急シフトの埋まりにくさ", "24h経過 + 充足率50%未満で自動ボーナス発動"],
          ],
          [4680, 4680]
        ),

        // === Target Users ===
        heading1("Target Users"),
        makeTable(
          ["\u30ED\u30FC\u30EB", "\u5BFE\u8C61\u8005", "\u4E3B\u306A\u64CD\u4F5C"],
          [
            ["Trainer", "Dr.stretch退職トレーナー", "シフト閲覧・応募・QR打刻・収入確認"],
            ["Store Manager", "店舗マネージャー", "シフト作成・応募管理・勤怠確認・評価"],
            ["HR / Area Manager", "本部HR・エリアマネージャー", "全店舗横断管理・時給設定・マッチング監視"],
            ["Admin", "システム管理者", "トレーナー一括管理・店舗設定・予算監視"],
            ["Employee", "退職前社員", "退職申請・SPOT登録"],
          ],
          [2000, 3000, 4360]
        ),

        new Paragraph({ children: [new PageBreak()] }),

        // === Tech Stack ===
        heading1("Tech Stack"),
        makeTable(
          ["\u30AB\u30C6\u30B4\u30EA", "\u6280\u8853", "\u30D0\u30FC\u30B8\u30E7\u30F3", "\u7528\u9014"],
          [
            ["Language", "TypeScript", "5.x (strict)", "\u5168\u30B3\u30FC\u30C9"],
            ["Framework", "Next.js", "16.1.6", "App Router / RSC / Server Actions"],
            ["UI Library", "shadcn/ui + Radix UI", "latest", "\u30B3\u30F3\u30DD\u30FC\u30CD\u30F3\u30C8"],
            ["CSS", "Tailwind CSS", "4.x", "\u30E6\u30FC\u30C6\u30A3\u30EA\u30C6\u30A3\u30D5\u30A1\u30FC\u30B9\u30C8"],
            ["Form", "React Hook Form + Zod", "7.x / 4.x", "\u30D5\u30A9\u30FC\u30E0 + \u30D0\u30EA\u30C7\u30FC\u30B7\u30E7\u30F3"],
            ["Database", "PostgreSQL (Supabase)", "15", "\u30E1\u30A4\u30F3DB"],
            ["Auth", "Supabase Auth", "-", "Email/Password + Magic Link"],
            ["Hosting", "Vercel", "-", "\u30B5\u30FC\u30D0\u30FC\u30EC\u30B9\u30C7\u30D7\u30ED\u30A4"],
            ["Email", "Resend", "-", "\u30C8\u30E9\u30F3\u30B6\u30AF\u30B7\u30E7\u30F3\u30E1\u30FC\u30EB"],
            ["Messaging", "LINE Messaging API", "-", "\u30D7\u30C3\u30B7\u30E5\u901A\u77E5\u30FB\u30A2\u30AB\u30A6\u30F3\u30C8\u9023\u643A"],
            ["Icons", "Lucide React", "0.575", "SVG\u30A2\u30A4\u30B3\u30F3"],
            ["Date", "date-fns", "4.x", "\u65E5\u4ED8\u64CD\u4F5C (JST)"],
          ],
          [1800, 2600, 1800, 3160]
        ),

        // === System Architecture ===
        heading1("System Architecture"),
        heading3("3\u5C64\u69CB\u6210"),
        bulletItem("Vercel (Hosting) \u2014 Next.js 16 App Router, Server Components, Server Actions, API Routes"),
        bulletItem("Supabase (Backend) \u2014 PostgreSQL 16\u30C6\u30FC\u30D6\u30EB + Auth + RLS + pg_cron"),
        bulletItem("External Services \u2014 LINE Messaging API, Resend (Email), Vercel Cron"),

        heading3("\u30C7\u30FC\u30BF\u30A2\u30AF\u30BB\u30B9\u30D1\u30BF\u30FC\u30F3"),
        bulletItem("Browser Client \u2014 Supabase Anon Key\u3067RLS\u7D4C\u7531\u30A2\u30AF\u30BB\u30B9"),
        bulletItem("Server Client \u2014 Server Component/Action\u304B\u3089Cookie\u30D9\u30FC\u30B9\u30BB\u30C3\u30B7\u30E7\u30F3"),
        bulletItem("Admin Client \u2014 Service Role Key\u3067RLS\u30D0\u30A4\u30D1\u30B9\uFF08\u7BA1\u7406\u64CD\u4F5C\u7528\uFF09"),

        new Paragraph({ children: [new PageBreak()] }),

        // === Server Actions ===
        heading1("Components \u2014 Server Actions"),
        para("16\u30D5\u30A1\u30A4\u30EB\u30FB5100+\u884C\u306E\u30D3\u30B8\u30CD\u30B9\u30ED\u30B8\u30C3\u30AF\u3002\u5168\u3066 src/actions/ \u914D\u4E0B\u3002"),
        makeTable(
          ["\u30D5\u30A1\u30A4\u30EB", "\u884C\u6570", "\u4E3B\u8981\u95A2\u6570", "\u6982\u8981"],
          [
            ["admin.ts", "564", "getAdminKPIs, updateTrainer", "\u7BA1\u7406\u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9"],
            ["applications.ts", "396", "applyToShift, approveApplication", "\u30B7\u30D5\u30C8\u5FDC\u52DF\u30FB\u627F\u8A8D"],
            ["attendance.ts", "219", "clockIn, clockOut, verifyAttendance", "GPS\u6253\u523B\u30FB\u52E4\u6020\u78BA\u8A8D"],
            ["pricing.ts", "305", "calculateRate, simulateRateChange", "\u6642\u7D66\u8A08\u7B97\u30A8\u30F3\u30B8\u30F3\uFF08\u30B3\u30A2\uFF09"],
            ["qr.ts", "200", "generateQrToken, verifyQrToken", "QR\u30B3\u30FC\u30C9\u6253\u523B"],
            ["shifts.ts", "298", "createShiftRequest, approveShiftRequest", "\u30B7\u30D5\u30C8\u52DF\u96C6\u7BA1\u7406"],
            ["rates.ts", "318", "getRateConfigs, updateRateConfig", "\u6642\u7D66\u8A2D\u5B9ACRUD"],
            ["offers.ts", "395", "sendOffer, acceptOffer, declineOffer", "\u76F4\u63A5\u30AA\u30D5\u30A1\u30FC"],
            ["line.ts", "360", "generateLinkToken, verifyAndLinkAccount", "LINE\u30A2\u30AB\u30A6\u30F3\u30C8\u9023\u643A"],
            ["resignation.ts", "326", "submitResignation, completeResignation", "\u9000\u8077\u7533\u8ACB\u30D5\u30ED\u30FC"],
            ["notifications.ts", "201", "createNotification, createBatchNotifications", "\u901A\u77E5\u30ED\u30B0\u7BA1\u7406"],
            ["matching.ts", "276", "getAllMatchings, confirmPreDayAttendance", "\u30DE\u30C3\u30C1\u30F3\u30B0\u30FB\u524D\u65E5\u78BA\u8A8D"],
            ["availability.ts", "236", "submitAvailability, getStoreAvailabilities", "\u30B7\u30D5\u30C8\u5E0C\u671B\u7533\u544A"],
            ["templates.ts", "199", "createShiftTemplate, createShiftFromTemplate", "\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8\u7BA1\u7406"],
            ["evaluations.ts", "83", "createEvaluation, getTrainerEvaluations", "\u52E4\u52D9\u5F8C\u8A55\u4FA1"],
            ["config.ts", "100+", "getCostCeilingConfig, updateCostCeilingConfig", "\u30B3\u30B9\u30C8\u4E0A\u9650\u8A2D\u5B9A"],
          ],
          [1800, 600, 3200, 3760]
        ),

        new Paragraph({ children: [new PageBreak()] }),

        // === Page Structure ===
        heading1("Components \u2014 \u30DA\u30FC\u30B8\u69CB\u6210"),
        makeTable(
          ["\u30EB\u30FC\u30C8\u30B0\u30EB\u30FC\u30D7", "\u30DA\u30FC\u30B8\u6570", "\u4E3B\u306A\u30DA\u30FC\u30B8"],
          [
            ["(auth)", "2", "/login, /register"],
            ["(trainer)", "15", "/home, /shifts, /my-shifts, /clock, /earnings, /availability, /rank, /evaluation-history, /resignation, ..."],
            ["(store)", "9", "/store, /store/shifts, /store/templates, /store/applications, /store/attendance, /store/evaluations, ..."],
            ["(hr)", "11", "/hr, /hr/matchings, /hr/trainers, /hr/rates, /hr/blank-rules, /hr/cost-ceiling, /hr/simulation, ..."],
            ["(admin)", "5", "/admin, /admin/trainers, /admin/stores, /admin/costs, /admin/skill-checks"],
          ],
          [2000, 1200, 6160]
        ),

        heading2("API Routes"),
        makeTable(
          ["Method", "Path", "\u8A8D\u8A3C", "\u7528\u9014"],
          [
            ["GET", "/api/auth/demo-login?role=", "\u4E0D\u8981", "\u30C7\u30E2\u30ED\u30B0\u30A4\u30F3\uFF08\u958B\u767A\u74B0\u5883\u306E\u307F\uFF09"],
            ["GET", "/api/auth/token-login?token=", "\u4E0D\u8981", "\u30DE\u30B8\u30C3\u30AF\u30EA\u30F3\u30AF\u30ED\u30B0\u30A4\u30F3"],
            ["GET/POST", "/api/attendance/verify?token=", "QR\u30C8\u30FC\u30AF\u30F3", "QR\u30B3\u30FC\u30C9\u6253\u523B\u691C\u8A3C"],
            ["POST", "/api/confirm", "\u4E0D\u8981", "\u30E1\u30FC\u30EB\u78BA\u8A8D\u30EA\u30F3\u30AF\uFF08\u524D\u65E5\u30EA\u30DE\u30A4\u30F3\u30C0\u30FC\uFF09"],
            ["GET", "/api/cron/reminders", "Cron Secret", "\u5B9A\u671F\u30EA\u30DE\u30A4\u30F3\u30C0\u30FC\u9001\u4FE1"],
            ["POST", "/api/line/webhook", "LINE\u7F72\u540D", "LINE Webhook\u53D7\u4FE1"],
          ],
          [1200, 3200, 1800, 3160]
        ),

        new Paragraph({ children: [new PageBreak()] }),

        // === Data Flow ===
        heading1("Data Flow"),

        heading2("1. \u30B7\u30D5\u30C8\u5FDC\u52DF\u30D5\u30ED\u30FC\uFF08\u30E1\u30A4\u30F3\u30D5\u30ED\u30FC\uFF09"),
        codePara("Store Manager: createShiftRequest()"),
        codePara("  \u2192 status: pending_approval"),
        codePara("HR: approveShiftRequest()"),
        codePara("  \u2192 status: open \u2192 Trainer\u306B\u901A\u77E5"),
        codePara("Trainer: applyToShift()"),
        codePara("  \u2192 calculateRate() \u2192 rate_breakdown JSONB\u3067\u6642\u7D66\u56FA\u5B9A"),
        codePara("  \u2192 auto_confirm=true: \u5373\u6642approved + attendance_record\u4F5C\u6210"),
        codePara("  \u2192 auto_confirm=false: pending \u2192 Manager\u304Capprove"),

        heading2("2. QR\u6253\u523B\u30D5\u30ED\u30FC"),
        codePara("Trainer: generateQrToken(applicationId, 'clock_in')"),
        codePara("  \u2192 15\u5206\u6709\u52B9\u30FBQR\u30B3\u30FC\u30C9\u8868\u793A"),
        codePara("Store Scanner: GET /api/attendance/verify?token=xxx"),
        codePara("  \u2192 verifyQrToken() \u2192 GPS\u8DDD\u96E2\u30C1\u30A7\u30C3\u30AF"),
        codePara("  \u2192 clock_in_at / clock_out_at \u66F4\u65B0"),
        codePara("  \u2192 blank_status / last_shift_date \u66F4\u65B0"),

        heading2("3. \u6642\u7D66\u8A08\u7B97\u30ED\u30B8\u30C3\u30AF"),
        codePara("calculateRate(trainerId, shiftRequestId)"),
        codePara("  Step 1: tenure_years \u53D6\u5F97"),
        codePara("  Step 2: hourly_rate_config \u304B\u3089\u8A72\u5F53\u30EC\u30F3\u30B8\u691C\u7D22"),
        codePara("    2.0\u301C3.0\u5E74: \u00A51,400 / 3.0\u301C5.0\u5E74: \u00A51,600"),
        codePara("    5.0\u301C7.0\u5E74: \u00A51,800 / 7.0\u5E74\u4EE5\u4E0A: \u00A52,000"),
        codePara("  Step 3: \u76F4\u8FD130\u65E5\u51FA\u52E4\u22655\u56DE \u2192 +\u00A5200"),
        codePara("  Step 4: is_emergency \u2192 +\u00A5500"),
        codePara("  Step 5: cost_ceiling \u3067\u30AD\u30E3\u30C3\u30D7"),
        codePara("  \u203B \u5FDC\u52DF\u6642\u70B9\u3067fixed\uFF08\u5F8C\u306E\u8A2D\u5B9A\u5909\u66F4\u306E\u5F71\u97FF\u3092\u53D7\u3051\u306A\u3044\uFF09"),

        heading2("4. \u30D6\u30E9\u30F3\u30AF\u7BA1\u7406\uFF08pg_cron JST 02:00\u81EA\u52D5\u66F4\u65B0\uFF09"),
        codePara("0\u301C59\u65E5:  blank_status='ok'"),
        codePara("60\u301C89\u65E5: blank_status='alert_60' \u2192 \u901A\u77E5"),
        codePara("90\u301C119\u65E5: blank_status='skill_check_required' \u2192 \u30B9\u30AD\u30EB\u30C1\u30A7\u30C3\u30AF\u5FC5\u9808"),
        codePara("120\u65E5\u4EE5\u4E0A: blank_status='training_required' \u2192 \u518D\u7814\u4FEE\u5FC5\u9808"),

        new Paragraph({ children: [new PageBreak()] }),

        // === Database ===
        heading1("Database Schema"),
        para("\u30C6\u30FC\u30D6\u30EB\u4E00\u89A7\uFF0816 + pg_cron \u30B8\u30E7\u30D6\uFF09"),
        makeTable(
          ["\u30C6\u30FC\u30D6\u30EB", "\u884C\u6570\u76EE\u5B89", "\u6982\u8981"],
          [
            ["profiles", "\u30E6\u30FC\u30B6\u30FC\u6570", "\u8A8D\u8A3C\u5F8C\u306E\u30ED\u30FC\u30EB\u30FB\u8868\u793A\u540D"],
            ["alumni_trainers", "\u30C8\u30EC\u30FC\u30CA\u30FC\u6570", "\u30DE\u30B9\u30BF\uFF08\u9280\u884C\u53E3\u5EA7\u30FB\u30E9\u30F3\u30AF\u30FB\u30D6\u30E9\u30F3\u30AF\uFF09"],
            ["stores", "221", "\u5168\u56FD\u5E97\u8217\uFF08\u5EA7\u6A19\u30FB\u4E88\u7B97\u30FB\u81EA\u52D5\u78BA\u8A8D\uFF09"],
            ["store_managers", "\u5E97\u8217\u6570", "\u5E97\u8217\u30DE\u30CD\u30FC\u30B8\u30E3\u30FC\u95A2\u9023\u4ED8\u3051"],
            ["shift_requests", "\u6708\u6B21\u7D2F\u7A4D", "\u30B7\u30D5\u30C8\u52DF\u96C6\uFF08\u30B9\u30C6\u30FC\u30BF\u30B9\u30DE\u30B7\u30F3\uFF09"],
            ["shift_applications", "\u6708\u6B21\u7D2F\u7A4D", "\u5FDC\u52DF\uFF08\u6642\u7D66\u56FA\u5B9A\u30FBrate_breakdown JSONB\uFF09"],
            ["attendance_records", "\u6708\u6B21\u7D2F\u7A4D", "\u51FA\u9000\u52E4\uFF08GPS\u30FB\u5B9F\u52B4\u50CD\u6642\u9593\uFF09"],
            ["qr_tokens", "\u4E00\u6642\u7684", "QR\u30B3\u30FC\u30C9\uFF0815\u5206\u6709\u52B9\u30FB1\u56DE\u9650\u308A\uFF09"],
            ["hourly_rate_config", "\u6570\u4EF6", "\u6642\u7D66\u8A2D\u5B9A\u30DE\u30B9\u30BF"],
            ["blank_rule_config", "3\u4EF6", "\u30D6\u30E9\u30F3\u30AF\u30EB\u30FC\u30EB\uFF0860/90/120\u65E5\uFF09"],
            ["notification_logs", "\u5927\u91CF", "\u901A\u77E5\u5C65\u6B74\uFF08\u30E1\u30FC\u30EB/LINE/\u30D7\u30C3\u30B7\u30E5\uFF09"],
            ["config_snapshots", "\u7D2F\u7A4D", "\u8A2D\u5B9A\u30ED\u30FC\u30EB\u30D0\u30C3\u30AF\u7528"],
            ["shift_availabilities", "\u7D2F\u7A4D", "\u30C8\u30EC\u30FC\u30CA\u30FC\u306E\u51FA\u52E4\u53EF\u80FD\u65E5\u6642"],
            ["shift_offers", "\u7D2F\u7A4D", "\u76F4\u63A5\u30AA\u30D5\u30A1\u30FC"],
            ["resignation_requests", "\u7D2F\u7A4D", "\u9000\u8077\u7533\u8ACB"],
          ],
          [2400, 1600, 5360]
        ),

        heading2("RLS \u30DD\u30EA\u30B7\u30FC\u6982\u8981"),
        makeTable(
          ["\u30C6\u30FC\u30D6\u30EB", "Trainer", "Store Manager", "HR/Admin"],
          [
            ["alumni_trainers", "\u81EA\u8EAB\u306E\u307F R/W", "\u5168\u54E1 R", "\u5168\u54E1 R/W"],
            ["shift_requests", "open\u306E\u307F R", "\u81EA\u5E97\u8217 R/W", "\u5168\u54E1 R"],
            ["shift_applications", "\u81EA\u8EAB\u306E\u307F R/W", "\u81EA\u5E97\u8217 R/W", "\u5168\u54E1 R"],
            ["attendance_records", "\u81EA\u8EAB\u306E\u307F R/W", "\u81EA\u5E97\u8217 R/W", "\u5168\u54E1 R"],
            ["hourly_rate_config", "\u5168\u54E1 R", "\u5168\u54E1 R", "\u5168\u54E1 R/W"],
          ],
          [2400, 1800, 1800, 3360]
        ),

        heading2("pg_cron \u30B8\u30E7\u30D6"),
        makeTable(
          ["\u30B8\u30E7\u30D6", "\u5B9F\u884C\u6642\u9593 (JST)", "\u51E6\u7406"],
          [
            ["blank_status\u66F4\u65B0", "\u6BCE\u65E5 02:00", "last_shift_date\u304B\u3089\u7D4C\u904E\u65E5\u6570\u2192\u30B9\u30C6\u30FC\u30BF\u30B9\u81EA\u52D5\u5909\u66F4"],
            ["rank\u66F4\u65B0", "\u6BCE\u65E5 03:00", "\u51FA\u52E4\u6570+\u8A55\u4FA1\u5E73\u5747\u3067\u30E9\u30F3\u30AF\u81EA\u52D5\u6607\u683C"],
            ["\u6708\u6B21\u4E88\u7B97\u30EA\u30BB\u30C3\u30C8", "\u6BCE\u67081\u65E5 00:00", "emergency_budget_used=0"],
          ],
          [2400, 2400, 4560]
        ),

        new Paragraph({ children: [new PageBreak()] }),

        // === Development Workflow ===
        heading1("Development Workflow"),

        heading2("\u30ED\u30FC\u30AB\u30EB\u958B\u767A"),
        codePara("npm install"),
        codePara("cp .env.local.example .env.local  # \u74B0\u5883\u5909\u6570\u8A2D\u5B9A"),
        codePara("npm run dev                       # http://localhost:3000"),
        para(""),
        heading3("\u30C7\u30E2\u30ED\u30B0\u30A4\u30F3"),
        codePara("/api/auth/demo-login?role=trainer  (\u30C8\u30EC\u30FC\u30CA\u30FC)"),
        codePara("/api/auth/demo-login?role=store    (\u5E97\u8217\u30DE\u30CD\u30FC\u30B8\u30E3\u30FC)"),
        codePara("/api/auth/demo-login?role=hr       (HR)"),
        codePara("/api/auth/demo-login?role=admin    (\u7BA1\u7406\u8005)"),

        heading2("\u30B3\u30FC\u30C7\u30A3\u30F3\u30B0\u30EB\u30FC\u30EB"),
        makeTable(
          ["\u30EB\u30FC\u30EB", "\u8A73\u7D30"],
          [
            ["\u30B3\u30F3\u30DD\u30FC\u30CD\u30F3\u30C8", "Functional Components\u306E\u307F\uFF08class\u7981\u6B62\uFF09"],
            ["\u30C7\u30FC\u30BF\u30D5\u30A7\u30C3\u30C1", "Server Components\u3067\u53D6\u5F97 \u2192 Client Components\u306Bprops"],
            ["\u72B6\u614B\u5909\u66F4", "Server Actions (src/actions/) \u7D4C\u7531\u306E\u307F"],
            ["UI", "shadcn/ui\u30D9\u30FC\u30B9\uFF08\u30AB\u30B9\u30BF\u30E0\u30D7\u30EA\u30DF\u30C6\u30A3\u30D6\u7981\u6B62\uFF09"],
            ["\u578B", "src/types/database.ts\u306B\u5168\u578B\u96C6\u7D04"],
            ["\u30D3\u30EB\u30C9", "npm run build \u30A8\u30E9\u30FC/\u8B66\u544A\u30BC\u30ED\u5FC5\u9808"],
            ["redirect", "Server Action\u5185\u3067redirect()\u4F7F\u7528\u7981\u6B62 \u2192 return { success } + router.push()"],
          ],
          [2400, 6960]
        ),

        heading2("\u30C7\u30D7\u30ED\u30A4"),
        codePara("npm run build        # 53\u30DA\u30FC\u30B8, \u30A8\u30E9\u30FC\u30BC\u30ED"),
        codePara("npx vercel --prod    # Vercel\u30C7\u30D7\u30ED\u30A4"),
        codePara("curl https://dr-stretch-spot.vercel.app/api/health  # \u30D8\u30EB\u30B9\u30C1\u30A7\u30C3\u30AF"),

        new Paragraph({ children: [new PageBreak()] }),

        // === Middleware Routing ===
        heading1("Middleware Routing"),
        codePara("1. Public Routes\uFF08\u8A8D\u8A3C\u4E0D\u8981\uFF09: /login, /register, /auth/callback, /auth/magic"),
        codePara("2. \u672A\u30ED\u30B0\u30A4\u30F3 \u2192 /login \u30EA\u30C0\u30A4\u30EC\u30AF\u30C8"),
        codePara("3. \u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u672A\u4F5C\u6210 \u2192 /register \u30EA\u30C0\u30A4\u30EC\u30AF\u30C8"),
        codePara("4. \u30ED\u30FC\u30EB\u30D9\u30FC\u30B9\u30EB\u30FC\u30C6\u30A3\u30F3\u30B0:"),
        codePara("   trainer       \u2192 /home, /shifts, /my-shifts, /clock, /earnings, ..."),
        codePara("   store_manager \u2192 /store/*"),
        codePara("   hr            \u2192 /hr/*"),
        codePara("   admin         \u2192 /admin/*, /hr/*, /store/*\uFF08\u5168\u30A2\u30AF\u30BB\u30B9\u53EF\uFF09"),
        codePara("   employee      \u2192 /home, /resignation, /profile \u306E\u307F"),

        // === Future ===
        heading1("Future Improvements"),

        heading2("Phase 3\uFF08\u4E88\u5B9A\uFF09"),
        makeTable(
          ["\u6A5F\u80FD", "\u6982\u8981", "\u512A\u5148\u5EA6"],
          [
            ["LINE Bot\u53CC\u65B9\u5411", "\u30C8\u30EC\u30FC\u30CA\u30FC\u304CLINE\u304B\u3089\u30B7\u30D5\u30C8\u78BA\u8A8D\u30FB\u5FDC\u52DF", "High"],
            ["\u30D7\u30C3\u30B7\u30E5\u901A\u77E5 (Web)", "\u30D6\u30E9\u30A6\u30B6\u30D7\u30C3\u30B7\u30E5\u901A\u77E5", "Medium"],
            ["\u30EC\u30DD\u30FC\u30C8\u30FB\u5206\u6790", "\u6708\u6B21KPI\u30EC\u30DD\u30FC\u30C8\u81EA\u52D5\u751F\u6210", "Medium"],
            ["\u5730\u56F3\u8868\u793A", "\u5E97\u8217\u4E00\u89A7\u306E\u5730\u56F3UI", "Low"],
            ["E2E\u30C6\u30B9\u30C8", "Playwright\u306B\u3088\u308B\u5168\u30D5\u30ED\u30FC\u81EA\u52D5\u30C6\u30B9\u30C8", "Medium"],
            ["CI/CD", "GitHub Actions\u306B\u3088\u308B\u30D3\u30EB\u30C9\u30FB\u30C6\u30B9\u30C8\u81EA\u52D5\u5316", "Medium"],
          ],
          [2400, 4560, 2400]
        ),

        // === Questions ===
        heading1("Questions"),
        para("\u73FE\u6642\u70B9\u3067\u958B\u767A\u3092\u9032\u3081\u308B\u306B\u3042\u305F\u308A\u3001\u4EE5\u4E0B\u306E\u60C5\u5831\u304C\u4E0D\u8DB3\u3057\u3066\u3044\u308B\u3002"),
        bulletItem("\u30C6\u30B9\u30C8\u30A2\u30AB\u30A6\u30F3\u30C8\u60C5\u5831: seed-demo.js\u3067\u4F5C\u6210\u3055\u308C\u308B\u30C7\u30E2\u30A2\u30AB\u30A6\u30F3\u30C8\u306E\u30E1\u30FC\u30EB/\u30D1\u30B9\u30EF\u30FC\u30C9\u4E00\u89A7\u306F\uFF1F", "numbers"),
        bulletItem("LINE Bot\u8A2D\u8A08: \u30C8\u30EC\u30FC\u30CA\u30FC\u5074\u304B\u3089\u306E\u30B3\u30DE\u30F3\u30C9\u53D7\u4ED8\uFF08\u30B7\u30D5\u30C8\u78BA\u8A8D\u30FB\u5FDC\u52DF\u7B49\uFF09\u306E\u4ED5\u69D8\u306F\u6C7A\u307E\u3063\u3066\u3044\u308B\u304B\uFF1F", "numbers"),
        bulletItem("\u30E1\u30FC\u30EB\u914D\u4FE1: Resend\u306E\u9001\u4FE1\u30C9\u30E1\u30A4\u30F3\u8A2D\u5B9A\u306F\u5B8C\u4E86\u3057\u3066\u3044\u308B\u304B\uFF1F\uFF08SPF/DKIM/DMARC\uFF09", "numbers"),
        bulletItem("GPS\u7CBE\u5EA6\u8981\u4EF6: geofence_radius\u306E\u30C7\u30D5\u30A9\u30EB\u30C8\u5024\u3068\u8A31\u5BB9\u8AA4\u5DEE\u306F\uFF1F", "numbers"),
        bulletItem("\u6C7A\u6E08\u9023\u643A: \u30C8\u30EC\u30FC\u30CA\u30FC\u3078\u306E\u5831\u916C\u652F\u6255\u3044\uFF08\u9280\u884C\u632F\u8FBC\uFF09\u306E\u9023\u643A\u5148\u306F\u6C7A\u307E\u3063\u3066\u3044\u308B\u304B\uFF1F", "numbers"),
        bulletItem("\u30B9\u30B1\u30FC\u30EA\u30F3\u30B0: \u540C\u6642\u63A5\u7D9A\u30E6\u30FC\u30B6\u30FC\u6570\u306E\u60F3\u5B9A\u306F\uFF1F", "numbers"),
        bulletItem("\u30BB\u30AD\u30E5\u30EA\u30C6\u30A3\u76E3\u67FB: \u9280\u884C\u53E3\u5EA7\u60C5\u5831\u306E\u30AB\u30E9\u30E0\u6697\u53F7\u5316\uFF08pgcrypto\uFF09\u306F\u5FC5\u8981\u304B\uFF1F", "numbers"),
        bulletItem("\u30C7\u30FC\u30BF\u4FDD\u6301: notification_logs / attendance_records\u306E\u4FDD\u6301\u671F\u9593\u30DD\u30EA\u30B7\u30FC\u306F\uFF1F", "numbers"),
      ]
    }
  ]
});

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync("C:/Users/m-kur/dr-stretch-spot/SPEC.docx", buffer);
console.log("SPEC.docx created successfully");
