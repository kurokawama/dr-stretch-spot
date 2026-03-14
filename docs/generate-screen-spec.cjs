/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat,
  HeadingLevel, BorderStyle, WidthType, ShadingType,
  PageNumber, PageBreak, TableOfContents
} = require("docx");

// ── Constants ──
const PAGE_W = 11906; // A4
const PAGE_H = 16838;
const MARGIN = 1440;
const CONTENT_W = PAGE_W - MARGIN * 2; // 9026

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

const BLUE = "1B4F72";
const LIGHT_BLUE = "D6EAF8";
const LIGHT_GRAY = "F2F3F4";
const ACCENT = "2E86C1";

// ── Helpers ──
function heading1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 200 }, children: [new TextRun({ text, bold: true, size: 32, font: "Yu Gothic", color: BLUE })] });
}
function heading2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 160 }, children: [new TextRun({ text, bold: true, size: 26, font: "Yu Gothic", color: BLUE })] });
}
function heading3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 120 }, children: [new TextRun({ text, bold: true, size: 22, font: "Yu Gothic", color: ACCENT })] });
}
function para(text, opts = {}) {
  return new Paragraph({ spacing: { after: 80 }, ...opts, children: [new TextRun({ text, size: 20, font: "Yu Gothic", ...opts.run })] });
}
function boldPara(label, value) {
  return new Paragraph({ spacing: { after: 60 }, children: [
    new TextRun({ text: label, bold: true, size: 20, font: "Yu Gothic" }),
    new TextRun({ text: value, size: 20, font: "Yu Gothic" }),
  ]});
}

function makeCell(text, opts = {}) {
  const runs = Array.isArray(text) ? text : [new TextRun({ text: String(text), size: 18, font: "Yu Gothic", ...opts.run })];
  return new TableCell({
    borders, margins: cellMargins,
    width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    shading: opts.shading ? { fill: opts.shading, type: ShadingType.CLEAR } : undefined,
    children: [new Paragraph({ spacing: { after: 0 }, children: runs })],
  });
}

function headerCell(text, width) {
  return makeCell(text, { width, shading: BLUE, run: { color: "FFFFFF", bold: true } });
}

function makeTable(headers, rows, colWidths) {
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: totalW, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({ children: headers.map((h, i) => headerCell(h, colWidths[i])) }),
      ...rows.map(row => new TableRow({
        children: row.map((cell, i) => makeCell(cell, { width: colWidths[i] }))
      }))
    ]
  });
}

// ── Screen Data ──
const screens = {
  auth: [
    {
      id: "SCR-AUTH-001", name: "ログイン", route: "/login",
      desc: "OTPベースのメールログイン画面。2段階フォーム（メール入力 → OTPコード入力）。デモ用クイックログインボタンあり。",
      elements: [
        ["メールアドレス入力", "input[type=email]", "必須。バリデーション: メール形式"],
        ["ログインボタン", "button", "OTPメール送信。送信後はOTPコード入力に切替"],
        ["OTPコード入力", "input[type=text]", "6桁。メール送信後に表示"],
        ["確認ボタン", "button", "OTP検証。成功時はロール別リダイレクト"],
        ["デモログインボタン群", "button x5", "開発用。各ロール（trainer/store/hr/admin/employee）で即ログイン"],
      ],
      actions: ["Supabase Auth signInWithOtp → OTPメール送信", "verifyOtp → 認証トークン取得"],
      transitions: ["認証成功 → / (ロール判定) → 各ダッシュボード", "プロフィール未作成 → /register"],
    },
    {
      id: "SCR-AUTH-002", name: "プロフィール登録", route: "/register",
      desc: "初回ログイン時のプロフィール設定画面。トレーナーとして基本情報を登録する。",
      elements: [
        ["氏名", "input[type=text]", "必須"],
        ["氏名（カナ）", "input[type=text]", "必須"],
        ["電話番号", "input[type=tel]", "必須"],
        ["在籍年数", "select", "選択肢: 1-10年"],
        ["希望エリア", "checkbox群", "複数選択可"],
        ["希望時間帯", "checkbox群", "複数選択可"],
        ["自己紹介", "textarea", "任意。500文字以内"],
        ["登録ボタン", "button", "プロフィール作成 → /home へ遷移"],
      ],
      actions: ["profiles テーブルに role=trainer で INSERT", "alumni_trainers テーブルに INSERT"],
      transitions: ["登録完了 → /home"],
    },
    {
      id: "SCR-AUTH-003", name: "マジックリンク認証", route: "/auth/magic",
      desc: "マジックリンクからのコールバック処理。認証トークンを検証し、適切な画面にリダイレクトする。",
      elements: [
        ["ローディングスピナー", "div", "認証処理中の表示"],
      ],
      actions: ["URL パラメータからトークン取得", "Supabase Auth セッション確立"],
      transitions: ["認証成功 → / (ロール判定)", "認証失敗 → /login"],
    },
  ],
  trainer: [
    {
      id: "SCR-TR-001", name: "トレーナーホーム", route: "/home",
      desc: "トレーナーダッシュボード。SPOT状態（employee/registered/active）に応じて表示が切り替わる3モード構成。",
      elements: [
        ["ステータスバナー", "div", "現在のSPOT状態を表示（従業員/登録済み/アクティブ）"],
        ["[Employee] 退職申請CTA", "button", "退職フロー未開始の場合に表示"],
        ["[Employee] 退職状況カード", "card", "退職申請中の進捗表示"],
        ["[Registered] SPOT開始CTA", "button", "/spot-setup へ遷移"],
        ["[Active] 本日のシフトカード", "card", "今日の予定シフト一覧"],
        ["[Active] 募集中シフト一覧", "card群", "直近の募集中シフト（最大5件）"],
        ["[Active] 最近の応募状況", "card群", "直近の応募と承認状態"],
        ["[Active] ブランクアラート", "alert", "blank_status が ok 以外の場合に警告表示"],
      ],
      actions: ["getMyApplications() → 応募一覧取得", "searchShifts() → 募集中シフト取得"],
      transitions: ["/shifts → シフト検索", "/my-shifts → 応募管理", "/clock → QR打刻", "/spot-setup → SPOT開始", "/resignation → 退職申請"],
    },
    {
      id: "SCR-TR-002", name: "シフト検索", route: "/shifts",
      desc: "募集中シフトの検索・フィルタリング画面。チップ型フィルタと詳細フィルタの2段構成。",
      elements: [
        ["検索バー", "input[type=search]", "キーワード検索"],
        ["フィルタチップ", "chip群", "今週/エリア/時間帯/緊急 でクイックフィルタ"],
        ["詳細フィルタパネル", "drawer", "日付範囲・エリア複数選択・時給範囲"],
        ["シフトカード一覧", "card群", "店舗名/日時/時給/緊急マーク/残り枠数を表示"],
        ["ソートセレクト", "select", "日付順/時給順/距離順"],
      ],
      actions: ["searchShifts(filters) → フィルタ条件でシフト検索"],
      transitions: ["カードタップ → /shifts/[id] 詳細画面"],
    },
    {
      id: "SCR-TR-003", name: "シフト詳細", route: "/shifts/[id]",
      desc: "シフトの詳細情報と応募ボタンを表示。店舗情報・勤務条件・報酬の全情報を確認可能。",
      elements: [
        ["店舗名・エリア", "h2 + badge", "店舗名とエリアバッジ"],
        ["日時情報", "div", "日付/開始時間/終了時間/休憩時間"],
        ["報酬情報", "div", "基本時給 + 出勤ボーナス + 緊急ボーナス = 合計"],
        ["必要資格", "badge群", "必要な資格一覧"],
        ["募集状況", "progress", "充足数/必要数 のプログレスバー"],
        ["緊急マーク", "badge", "is_emergency=true の場合に赤バッジ表示"],
        ["応募ボタン", "button", "/shifts/[id]/apply へ遷移。ブランク状態で無効化"],
        ["戻るリンク", "link", "/shifts へ戻る"],
      ],
      actions: ["getShiftDetail(shiftId) → シフト詳細取得", "previewHourlyRate(shiftId) → 時給プレビュー"],
      transitions: ["応募ボタン → /shifts/[id]/apply", "戻る → /shifts"],
    },
    {
      id: "SCR-TR-004", name: "シフト応募確認", route: "/shifts/[id]/apply",
      desc: "応募前の最終確認画面。時給内訳（基本時給+出勤ボーナス+緊急ボーナス）をプレビュー表示し、確定ボタンで応募する。",
      elements: [
        ["シフト概要", "card", "店舗名/日時/勤務時間のサマリ"],
        ["時給内訳テーブル", "table", "基本時給/出勤ボーナス/緊急ボーナス/コスト上限/合計"],
        ["注意事項", "alert", "ブランク状態による制限がある場合の警告"],
        ["応募確定ボタン", "button", "applyToShift 実行。auto_confirm の場合は即承認"],
        ["キャンセルリンク", "link", "/shifts/[id] に戻る"],
      ],
      actions: ["applyToShift(shiftRequestId) → 応募作成 + 時給計算 + auto_confirm判定"],
      transitions: ["応募成功 → /my-shifts（トースト通知）", "キャンセル → /shifts/[id]"],
    },
    {
      id: "SCR-TR-005", name: "応募管理", route: "/my-shifts",
      desc: "自分の応募一覧をタブで管理する画面。予定/過去/キャンセル済みの3タブ構成。",
      elements: [
        ["タブ切替", "tabs", "予定（Upcoming）/ 過去（Past）/ キャンセル済み（Cancelled）"],
        ["応募カード一覧", "card群", "店舗名/日時/状態バッジ/時給"],
        ["キャンセルボタン", "button", "pending/approved 状態の応募をキャンセル"],
        ["キャンセル理由入力", "dialog + textarea", "キャンセル時の理由入力モーダル"],
      ],
      actions: ["getMyApplications() → 応募一覧取得", "cancelApplication(id, reason) → 応募キャンセル"],
      transitions: ["各カード → シフト詳細へのリンク"],
    },
    {
      id: "SCR-TR-006", name: "QR打刻", route: "/clock",
      desc: "QRコードベースの出退勤記録画面。出勤/退勤それぞれのQRコードを生成し、店舗のスキャナーに読み取らせる。",
      elements: [
        ["現在時刻表示", "div", "リアルタイム時計表示"],
        ["本日のシフト一覧", "card群", "本日のapproved応募一覧"],
        ["出勤QRコード", "QR image", "generateQrToken(id, 'clock_in') で生成。15分有効"],
        ["退勤QRコード", "QR image", "generateQrToken(id, 'clock_out') で生成。15分有効"],
        ["打刻状態バッジ", "badge", "scheduled/clocked_in/clocked_out"],
        ["位置情報取得", "hidden", "Geolocation API で位置取得（位置検証用）"],
      ],
      actions: ["getTodayAttendance() → 本日の勤怠取得", "generateQrToken() → QRトークン生成", "clockIn/clockOut → 打刻実行"],
      transitions: ["（ページ内完結。BottomNavで他画面へ遷移）"],
    },
    {
      id: "SCR-TR-007", name: "収入明細", route: "/earnings",
      desc: "月別の収入明細画面。月切替ナビゲーションでsearchParamsベースの月遷移。",
      elements: [
        ["月切替ナビ", "button群", "前月/次月ボタン。?month=YYYY-MM でURL遷移"],
        ["月間サマリカード", "card", "合計収入/合計勤務時間/シフト回数"],
        ["シフト別明細テーブル", "table", "日付/店舗/勤務時間/基本/ボーナス/合計"],
        ["ボーナス内訳", "expandable", "各シフトの出勤ボーナス・緊急ボーナスの内訳"],
      ],
      actions: ["shift_applications + attendance_records から月別集計"],
      transitions: ["月切替 → /earnings?month=YYYY-MM"],
    },
    {
      id: "SCR-TR-008", name: "プロフィール", route: "/profile",
      desc: "トレーナーの基本情報・銀行情報・LINE連携を管理する設定画面。",
      elements: [
        ["基本情報セクション", "form", "氏名/カナ/電話番号/メール（読取専用）"],
        ["銀行情報セクション", "form", "銀行名/支店名/口座種別/口座番号"],
        ["LINE連携セクション", "div", "連携状態表示 + 連携/解除ボタン"],
        ["LINE連携ボタン", "button", "generateLinkToken → LINE連携フロー開始"],
        ["LINE解除ボタン", "button", "unlinkLineAccount → 連携解除"],
        ["保存ボタン", "button", "プロフィール更新"],
      ],
      actions: ["getLineStatus() → LINE連携状態取得", "generateLinkToken() → LINEリンクトークン生成", "unlinkLineAccount() → LINE連携解除"],
      transitions: ["LINE連携 → 外部LINEアプリへ遷移"],
    },
    {
      id: "SCR-TR-009", name: "SPOT開始セットアップ", route: "/spot-setup",
      desc: "退職後のSPOTトレーナー登録を行う5ステップウィザード。",
      elements: [
        ["ステッププログレス", "stepper", "5ステップの進行状況表示"],
        ["Step1: 情報確認", "form", "現在のプロフィール情報を確認"],
        ["Step2: エリア選択", "checkbox群", "希望勤務エリアを選択"],
        ["Step3: 時間帯選択", "checkbox群", "希望勤務時間帯を選択"],
        ["Step4: 自己紹介", "textarea", "任意入力"],
        ["Step5: 完了確認", "summary + button", "入力内容のサマリ表示 + SPOT開始ボタン"],
      ],
      actions: ["activateSpot(formData) → spot_status を active に変更"],
      transitions: ["完了 → /home（SPOTアクティブ状態）"],
    },
    {
      id: "SCR-TR-010", name: "ブランクアラート", route: "/alerts",
      desc: "ブランク状態（最終シフトからの経過日数）を確認する画面。60/90/120日の閾値と必要アクションを表示。",
      elements: [
        ["ブランク状態バッジ", "badge", "ok/alert_60/skill_check_required/training_required"],
        ["最終シフト日", "text", "最後にシフトに入った日付"],
        ["経過日数", "text", "最終シフトからの日数"],
        ["閾値テーブル", "table", "60日→注意/90日→スキルチェック必須/120日→研修必須"],
        ["必要アクション", "alert", "現在のステータスに応じた必要アクションの説明"],
      ],
      actions: ["alumni_trainers.blank_status + blank_rule_config から表示"],
      transitions: ["（ページ内完結）"],
    },
    {
      id: "SCR-TR-011", name: "退職申請", route: "/resignation",
      desc: "従業員が退職を申請するフォーム画面。退職理由と詳細を記入し、SPOT登録の意向を表明する。",
      elements: [
        ["退職希望日", "date picker", "必須"],
        ["退職理由", "select", "career_change/family/health/independence/relocation/other"],
        ["詳細説明", "textarea", "任意"],
        ["SPOT登録意向", "radio", "退職後にSPOTトレーナーとして働く意向の有無"],
        ["申請ボタン", "button", "退職申請を提出"],
        ["申請状況表示", "card", "申請済みの場合は進捗を表示（draft→submitted→received→completed）"],
        ["キャンセルボタン", "button", "draft/submitted 状態でキャンセル可能"],
      ],
      actions: ["submitResignation() → 退職申請作成", "getMyResignation() → 自分の退職申請取得", "cancelResignation() → 申請キャンセル"],
      transitions: ["申請完了 → /home（ステータス更新）"],
    },
    {
      id: "SCR-TR-012", name: "稼働可能日登録", route: "/availability",
      desc: "トレーナーが稼働可能な日時を事前申告する画面。店舗からのオファーセクションも含む。",
      elements: [
        ["稼働可能日追加フォーム", "form", "日付/開始時間/終了時間/希望エリア"],
        ["登録済み稼働可能日一覧", "card群", "open/offered/matched の状態別表示"],
        ["キャンセルボタン", "button", "open 状態の稼働可能日をキャンセル"],
        ["オファー一覧セクション", "card群", "受信したオファー（pending/accepted/declined）"],
        ["オファー承諾/拒否ボタン", "button群", "respondToOffer で応答"],
      ],
      actions: ["submitAvailability() → 稼働可能日登録", "getMyAvailabilities() → 一覧取得", "getTrainerOffers() → オファー取得", "respondToOffer() → オファー応答"],
      transitions: ["オファー承諾 → シフト自動作成 → /my-shifts に反映"],
    },
    {
      id: "SCR-TR-013", name: "ランク・バッジ", route: "/rank",
      desc: "トレーナーのランク（Bronze/Silver/Gold/Platinum）と獲得バッジを表示する画面。",
      elements: [
        ["現在のランクバッジ", "badge(大)", "現在のランクをアイコンで表示"],
        ["次ランク進捗バー", "progress群", "シフト回数/評価平均の2軸進捗表示"],
        ["獲得バッジ一覧", "badge群", "獲得済みバッジをグリッド表示"],
        ["全バッジギャラリー", "grid", "全バッジ一覧（未獲得はグレーアウト）"],
        ["ランク基準テーブル", "table", "Bronze/Silver/Gold/Platinum の条件一覧"],
      ],
      actions: ["alumni_trainers.rank + badges[] から表示"],
      transitions: ["（ページ内完結）"],
    },
    {
      id: "SCR-TR-014", name: "評価履歴", route: "/evaluation-history",
      desc: "トレーナーが受けた過去の評価を一覧表示する画面。",
      elements: [
        ["評価平均", "stars + number", "全評価の平均点"],
        ["評価一覧", "card群", "日付/店舗名/評点/カテゴリ別スコア/コメント"],
      ],
      actions: ["getTrainerEvaluations(trainerId) → 評価一覧取得"],
      transitions: ["（ページ内完結）"],
    },
    {
      id: "SCR-TR-015", name: "通知センター", route: "/notifications",
      desc: "プッシュ通知・アプリ内通知の一覧画面。",
      elements: [
        ["未読バッジ", "badge", "未読通知数"],
        ["通知一覧", "list", "カテゴリアイコン/タイトル/本文/日時/既読状態"],
        ["全既読ボタン", "button", "全通知を既読にする"],
      ],
      actions: ["getNotifications() → 通知一覧取得", "markAllNotificationsRead() → 全既読"],
      transitions: ["通知タップ → 関連画面へ遷移"],
    },
  ],
  store: [
    {
      id: "SCR-ST-001", name: "店舗ダッシュボード", route: "/store",
      desc: "店舗管理者のメイン画面。KPIカード・本日のシフト・最近のアクティビティを表示。",
      elements: [
        ["カバー率KPIカード", "card", "今月のシフト充足率（%）"],
        ["保留応募KPIカード", "card", "承認待ち応募数"],
        ["月間利用KPIカード", "card", "今月の利用回数・金額"],
        ["本日のシフトテーブル", "table", "時間/タイトル/トレーナー/状態"],
        ["最近のアクティビティ", "feed", "応募・承認・打刻などの直近イベント"],
        ["クイックアクションボタン群", "button群", "シフト作成/応募確認へのショートカット"],
      ],
      actions: ["store固有のKPI集計クエリ"],
      transitions: ["/store/shifts → シフト管理", "/store/applications → 応募管理"],
    },
    {
      id: "SCR-ST-002", name: "シフト管理", route: "/store/shifts",
      desc: "シフトの作成と一覧管理画面。新規シフト作成フォームと既存シフト一覧のデュアル構成。",
      elements: [
        ["シフト作成フォーム", "form", "タイトル/日付/開始・終了時間/休憩/必要人数/必要資格/緊急フラグ/緊急ボーナス額"],
        ["テンプレート選択", "select", "保存済みテンプレートからの一括入力"],
        ["作成ボタン", "button", "createShiftRequest → シフト作成（status=pending_approval）"],
        ["今後のシフト一覧", "table", "日付/タイトル/状態/充足数/アクション"],
        ["キャンセルボタン", "button", "pending/open状態のシフトをキャンセル"],
      ],
      actions: ["createShiftRequest() → シフト作成", "cancelShiftRequest() → キャンセル", "getShiftTemplates() → テンプレート取得"],
      transitions: ["シフト作成 → HR承認待ち"],
    },
    {
      id: "SCR-ST-003", name: "応募管理", route: "/store/applications",
      desc: "トレーナーからの応募を確認・承認・拒否する画面。",
      elements: [
        ["応募一覧テーブル", "table", "トレーナー名/シフト/応募日/状態/アクション"],
        ["承認ボタン", "button", "approveApplication → 応募承認 + filled_count更新"],
        ["拒否ボタン", "button", "rejectApplication → 応募拒否"],
        ["トレーナー詳細プレビュー", "drawer", "応募者のプロフィール・評価・ランク情報"],
      ],
      actions: ["approveApplication() → 承認", "rejectApplication() → 拒否"],
      transitions: ["（ページ内完結）"],
    },
    {
      id: "SCR-ST-004", name: "勤怠管理", route: "/store/attendance",
      desc: "本日の出退勤記録を確認・検証する画面。",
      elements: [
        ["本日の勤怠テーブル", "table", "トレーナー名/予定時間/出勤時間/退勤時間/状態/位置検証"],
        ["検証ボタン", "button", "verifyAttendance → 勤怠を verified に変更"],
        ["備考入力", "textarea", "検証時のマネージャーメモ"],
      ],
      actions: ["verifyAttendance(id, note) → 勤怠検証"],
      transitions: ["（ページ内完結）"],
    },
    {
      id: "SCR-ST-005", name: "トレーナー稼働可能日", route: "/store/availability",
      desc: "トレーナーが登録した稼働可能日を確認し、オファーを送る画面。",
      elements: [
        ["稼働可能日一覧", "table", "トレーナー名/日付/時間帯/状態"],
        ["オファー送信ボタン", "button", "sendOffer → ダイレクトオファー作成"],
        ["オファー送信フォーム", "dialog", "シフトタイトル/時間/説明を入力"],
      ],
      actions: ["getStoreAvailabilities(storeId) → 稼働可能日取得", "sendOffer() → オファー送信"],
      transitions: ["オファー送信 → トレーナーに通知"],
    },
    {
      id: "SCR-ST-006", name: "トレーナー評価", route: "/store/evaluations",
      desc: "シフト完了後のトレーナー評価を行う画面。",
      elements: [
        ["評価対象一覧", "card群", "完了シフトで未評価のトレーナー一覧"],
        ["評価フォーム", "form", "総合評価(1-5星)/カテゴリ別評価(JSONB)/コメント"],
        ["送信ボタン", "button", "createEvaluation → 評価作成"],
      ],
      actions: ["createEvaluation() → 評価作成（application.status=completed に更新）"],
      transitions: ["（ページ内完結）"],
    },
    {
      id: "SCR-ST-007", name: "シフトテンプレート", route: "/store/templates",
      desc: "再利用可能なシフトテンプレートのCRUD画面。",
      elements: [
        ["テンプレート一覧", "card群", "名前/時間/必要人数/繰返し設定"],
        ["作成フォーム", "form", "名前/タイトル/開始・終了時間/休憩/必要人数/資格/繰返し日"],
        ["編集ボタン", "button", "テンプレート編集モーダル"],
        ["削除ボタン", "button", "テンプレート非活性化（ソフト削除）"],
        ["テンプレートからシフト作成", "button", "createShiftFromTemplate → 即シフト作成"],
      ],
      actions: ["createShiftTemplate()", "updateShiftTemplate()", "deleteShiftTemplate()", "createShiftFromTemplate()"],
      transitions: ["テンプレートからシフト作成 → /store/shifts に反映"],
    },
    {
      id: "SCR-ST-008", name: "利用統計", route: "/store/usage",
      desc: "月別のシフト・勤怠メトリクスを表示する統計画面。",
      elements: [
        ["月切替ナビ", "button群", "前月/次月切替"],
        ["利用サマリカード", "card群", "シフト回数/トレーナー数/総コスト/充足率"],
        ["詳細テーブル", "table", "日別のシフト・勤怠データ"],
      ],
      actions: ["shift_requests + attendance_records から月別集計"],
      transitions: ["（ページ内完結）"],
    },
    {
      id: "SCR-ST-009", name: "通知設定", route: "/store/notifications",
      desc: "店舗向け通知の設定画面。",
      elements: [
        ["通知一覧", "list", "受信通知一覧"],
        ["通知設定", "form", "各種通知のON/OFF切替"],
      ],
      actions: ["getNotifications()", "markNotificationRead()"],
      transitions: ["（ページ内完結）"],
    },
  ],
  hr: [
    {
      id: "SCR-HR-001", name: "HR ダッシュボード", route: "/hr",
      desc: "人事管理のメイン画面。KPIサマリ・データテーブル（フィルタ・ページネーション付き）を表示。",
      elements: [
        ["本日のマッチング数", "KPIカード", "今日のシフトマッチング件数"],
        ["承認待ち件数", "KPIカード", "pending_approval のシフト数"],
        ["本日の勤怠状況", "KPIカード", "本日の出勤/退勤/未打刻の状況"],
        ["明日の予定", "KPIカード", "明日のスケジュール件数"],
        ["データテーブル", "table", "全マッチングデータ。状態/エリア/期間でフィルタ可能"],
        ["ページネーション", "nav", "テーブルのページ切替"],
      ],
      actions: ["getAllMatchings(filters) → マッチング一覧", "getAllShiftRequests(filters) → シフト一覧"],
      transitions: ["サイドバーから各管理画面へ"],
    },
    {
      id: "SCR-HR-002", name: "トレーナー管理", route: "/hr/trainers",
      desc: "全トレーナーの一覧管理画面。ステータス・ブランク状態・エリアでフィルタ。",
      elements: [
        ["フィルタバー", "form", "ステータス/ブランク状態/エリア/検索テキスト"],
        ["トレーナーテーブル", "table", "氏名/ランク/状態/ブランク/エリア/最終シフト日"],
        ["一括操作", "button群", "選択トレーナーへの一括ステータス変更"],
        ["詳細パネル", "drawer", "トレーナーの全情報表示"],
      ],
      actions: ["getAllTrainers(filters) → フィルタ付きトレーナー一覧"],
      transitions: ["（ページ内完結）"],
    },
    {
      id: "SCR-HR-003", name: "シフトオファー管理", route: "/hr/shift-offers",
      desc: "HR主導のプロアクティブなシフトオファーを作成・管理する画面。",
      elements: [
        ["トレーナー検索", "form", "エリア/ランク/状態でトレーナー検索"],
        ["検索結果一覧", "table", "トレーナー名/ランク/推定時給/状態"],
        ["オファー作成フォーム", "dialog", "店舗/日時/時間/説明を入力"],
        ["送信済みオファー一覧", "table", "状態別の送信オファー一覧"],
      ],
      actions: ["hrSearchTrainers(filters) → トレーナー検索", "hrCreateOffer() → オファー作成", "getHrOffers() → オファー一覧"],
      transitions: ["（ページ内完結）"],
    },
    {
      id: "SCR-HR-004", name: "マッチング管理", route: "/hr/matchings",
      desc: "シフトとトレーナーのマッチング（応募）を管理する画面。",
      elements: [
        ["フィルタバー", "form", "状態/日付範囲/店舗/エリア"],
        ["マッチングテーブル", "table", "トレーナー/店舗/シフト/状態/時給/アクション"],
        ["キャンセルボタン", "button", "hrCancelMatching → HR権限でのキャンセル"],
      ],
      actions: ["getAllMatchings(filters) → マッチング一覧", "hrCancelMatching() → HRキャンセル（filled_count減少+attendance削除）"],
      transitions: ["（ページ内完結）"],
    },
    {
      id: "SCR-HR-005", name: "勤怠管理（HR）", route: "/hr/attendance",
      desc: "全店舗の勤怠を横断的に確認する画面。本日・明日の出勤状況をリアルタイム表示。",
      elements: [
        ["エリアフィルタ", "select", "エリアでフィルタ"],
        ["本日の勤怠テーブル", "table", "トレーナー/店舗/予定時間/出勤/退勤/状態"],
        ["明日の予定テーブル", "table", "明日のスケジュール一覧"],
        ["前日確認状態", "badge", "pre_day_confirmed の有無"],
      ],
      actions: ["getTodayAllAttendances(area) → 本日の全勤怠", "getTomorrowAttendances(area) → 明日の予定"],
      transitions: ["（ページ内完結）"],
    },
    {
      id: "SCR-HR-006", name: "退職管理", route: "/hr/resignations",
      desc: "従業員の退職申請を処理するワークフロー画面。",
      elements: [
        ["ステータスフィルタ", "tabs", "submitted/received/completed/cancelled"],
        ["退職申請テーブル", "table", "氏名/申請日/退職希望日/理由/状態/アクション"],
        ["受理ボタン", "button", "receiveResignation → submitted→received"],
        ["完了ボタン", "button", "completeResignation → alumni_trainers作成 + role変更"],
      ],
      actions: ["getAllResignations(filters)", "receiveResignation()", "completeResignation()"],
      transitions: ["完了 → トレーナーのspot_status=registered に自動変更"],
    },
    {
      id: "SCR-HR-007", name: "時給テーブル", route: "/hr/rates",
      desc: "在籍年数ベースの時給テーブルを管理する画面。",
      elements: [
        ["時給テーブル", "table", "在籍年数範囲/基本時給/出勤ボーナス閾値/出勤ボーナス額/有効期間"],
        ["編集ボタン", "button", "各行の編集モーダル"],
        ["追加ボタン", "button", "新しい年数ティアの追加"],
        ["削除ボタン", "button", "ティアの非活性化（ソフト削除）"],
        ["変更理由入力", "textarea", "変更時の理由（audit_log用）"],
      ],
      actions: ["getRateConfigs()", "updateRateConfig()", "createRateConfig()", "deleteRateConfig()"],
      transitions: ["（ページ内完結）"],
    },
    {
      id: "SCR-HR-008", name: "シミュレーション", route: "/hr/simulation",
      desc: "時給変更時のコストインパクトをシミュレーションする画面。What-if分析。",
      elements: [
        ["入力フォーム", "form", "新しい時給設定値を入力"],
        ["シミュレーション実行ボタン", "button", "simulateRateChange → コスト試算"],
        ["結果カード群", "card群", "影響トレーナー数/現在月額コスト/変更後月額コスト/差分"],
      ],
      actions: ["simulateRateChange(newConfigs[]) → コストインパクト算出"],
      transitions: ["（ページ内完結）"],
    },
    {
      id: "SCR-HR-009", name: "監査ログ", route: "/hr/audit-log",
      desc: "設定変更の履歴を一覧表示する監査画面。",
      elements: [
        ["フィルタ", "form", "変更種類/日付範囲でフィルタ"],
        ["監査ログテーブル", "table", "日時/変更者/変更種類/テーブル名/旧値/新値/理由"],
        ["影響範囲", "badge", "影響トレーナー数/推定コスト影響"],
      ],
      actions: ["getAuditLogs(filters) → 監査ログ一覧"],
      transitions: ["（ページ内完結）"],
    },
    {
      id: "SCR-HR-010", name: "ブランクルール設定", route: "/hr/blank-rules",
      desc: "ブランク日数閾値とアクションを設定する画面。",
      elements: [
        ["ルールテーブル", "table", "ルール種類/閾値日数/必要アクション/説明/有効状態"],
        ["編集ボタン", "button", "各ルールの閾値・アクション変更"],
        ["変更理由入力", "textarea", "変更理由（audit_log用）"],
        ["バッチ実行ボタン", "button", "runBlankStatusBatch → 即時ブランクステータス更新"],
      ],
      actions: ["getBlankRules()", "updateBlankRule()", "runBlankStatusBatch()"],
      transitions: ["（ページ内完結）"],
    },
    {
      id: "SCR-HR-011", name: "コスト上限設定", route: "/hr/cost-ceiling",
      desc: "時給上限・予算管理の設定画面。",
      elements: [
        ["コスト上限設定フォーム", "form", "最大時給/閾値/デフォルト月間予算"],
        ["店舗別予算テーブル", "table", "店舗名/月間予算/使用額/残り/アラート状態"],
        ["保存ボタン", "button", "updateCostCeilingConfig → 設定保存"],
      ],
      actions: ["getCostCeilingConfig()", "updateCostCeilingConfig()", "updateStoreEmergencyBudget()"],
      transitions: ["（ページ内完結）"],
    },
    {
      id: "SCR-HR-012", name: "ロールバック", route: "/hr/rollback",
      desc: "設定変更を過去のスナップショットに巻き戻す画面。",
      elements: [
        ["スナップショット種類フィルタ", "tabs", "rate_config/blank_rule_config/cost_ceiling"],
        ["スナップショット一覧", "table", "日時/説明/種類/作成者"],
        ["プレビューボタン", "button", "スナップショット内容のプレビュー表示"],
        ["ロールバック実行ボタン", "button", "rollbackToSnapshot → 設定復元（audit_log記録）"],
      ],
      actions: ["getConfigSnapshots(type)", "rollbackToSnapshot(snapshotId)"],
      transitions: ["ロールバック → 対象設定テーブルが復元"],
    },
  ],
  admin: [
    {
      id: "SCR-AD-001", name: "管理者ダッシュボード", route: "/admin",
      desc: "システム全体のKPIと管理機能へのクイックアクセスを提供する画面。",
      elements: [
        ["トレーナー数KPI", "card", "登録/アクティブトレーナー数と活動率"],
        ["充足率KPI", "card", "今月のシフト充足率"],
        ["月間コストKPI", "card", "今月の総コスト"],
        ["予算アラートKPI", "card", "予算超過アラート数"],
        ["ブランク分布チャート", "chart", "ok/alert_60/skill_check/training の分布"],
        ["予算アラート一覧", "list", "80%超過の店舗リスト"],
        ["クイックリンク", "button群", "各管理画面へのショートカット"],
      ],
      actions: ["getAdminKPIs() → 全KPI一括取得"],
      transitions: ["各リンク → /admin/trainers, /admin/stores, /admin/costs, /admin/skill-checks"],
    },
    {
      id: "SCR-AD-002", name: "トレーナー管理（Admin）", route: "/admin/trainers",
      desc: "全トレーナーの管理画面。ランク・ステータス・資格の変更権限あり。",
      elements: [
        ["検索・フィルタ", "form", "テキスト検索/状態/ランク/エリア"],
        ["トレーナーテーブル", "table", "全フィールド表示+編集アクション"],
        ["編集モーダル", "dialog", "ランク/状態/spot_status/資格/エリア/在籍年数の変更"],
        ["無効化ボタン", "button", "トレーナーの非活性化"],
      ],
      actions: ["getAllTrainers()", "updateTrainer()"],
      transitions: ["（ページ内完結）"],
    },
    {
      id: "SCR-AD-003", name: "店舗管理", route: "/admin/stores",
      desc: "店舗ネットワークの管理画面。店舗情報・予算・自動確認設定の変更。",
      elements: [
        ["店舗一覧テーブル", "table", "店舗名/エリア/住所/緊急予算/コスト上限/自動確認/状態"],
        ["編集モーダル", "dialog", "店舗情報・予算設定の変更"],
        ["マネージャー一覧", "sub-table", "各店舗のマネージャー一覧"],
      ],
      actions: ["getStoresWithManagers()", "updateStoreConfig()"],
      transitions: ["（ページ内完結）"],
    },
    {
      id: "SCR-AD-004", name: "コスト管理", route: "/admin/costs",
      desc: "月別の支出概況・予算追跡・傾向分析画面。",
      elements: [
        ["月間予算レポートテーブル", "table", "店舗別: 緊急予算/使用額/シフトコスト/シフト回数/トレーナー数"],
        ["月切替", "button群", "月単位でのデータ切替"],
        ["アラート一覧", "alert群", "予算超過店舗の警告"],
      ],
      actions: ["getMonthlyBudgetReport() → 店舗別月間予算レポート"],
      transitions: ["（ページ内完結）"],
    },
    {
      id: "SCR-AD-005", name: "スキルチェック管理", route: "/admin/skill-checks",
      desc: "スキルチェック・研修のスケジュール管理画面。",
      elements: [
        ["フィルタ", "form", "結果/チェック種類でフィルタ"],
        ["スキルチェックテーブル", "table", "トレーナー名/種類/日付/結果/スコア"],
        ["スケジュール作成ボタン", "button", "新しいスキルチェックをスケジュール"],
        ["結果更新ボタン", "button", "pass/fail の結果を記録"],
        ["チェック必要者一覧", "section", "blank_status が skill_check/training_required のトレーナー"],
      ],
      actions: ["getSkillCheckSchedule()", "createSkillCheck()", "updateSkillCheckResult()", "getTrainersRequiringChecks()"],
      transitions: ["結果更新 → blank_status が ok に変更される場合あり"],
    },
  ],
};

// ── Build Document ──
function buildScreenSection(title, screenList) {
  const children = [heading1(title)];
  for (const s of screenList) {
    children.push(heading2(`${s.id}: ${s.name}`));
    children.push(boldPara("ルート: ", s.route));
    children.push(para(s.desc));
    children.push(new Paragraph({ spacing: { before: 120 } }));

    // Elements table
    children.push(heading3("画面要素"));
    const elemRows = s.elements.map(e => [e[0], e[1], e[2]]);
    children.push(makeTable(["要素名", "種類", "仕様"], elemRows, [2500, 1800, 4726]));
    children.push(new Paragraph({ spacing: { after: 120 } }));

    // Actions
    children.push(heading3("Server Actions / データ操作"));
    for (const a of s.actions) {
      children.push(new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 40 },
        children: [new TextRun({ text: a, size: 18, font: "Yu Gothic" })]
      }));
    }

    // Transitions
    children.push(heading3("画面遷移"));
    for (const t of s.transitions) {
      children.push(new Paragraph({
        numbering: { reference: "bullets", level: 0 },
        spacing: { after: 40 },
        children: [new TextRun({ text: t, size: 18, font: "Yu Gothic" })]
      }));
    }
    children.push(new Paragraph({ spacing: { after: 200 } }));
  }
  return children;
}

async function main() {
  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Yu Gothic", size: 20 } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 32, bold: true, font: "Yu Gothic", color: BLUE },
          paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 26, bold: true, font: "Yu Gothic", color: BLUE },
          paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 22, bold: true, font: "Yu Gothic", color: ACCENT },
          paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
      ]
    },
    numbering: {
      config: [{
        reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }]
      }]
    },
    sections: [
      // ── Cover Page ──
      {
        properties: {
          page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } }
        },
        children: [
          new Paragraph({ spacing: { before: 4000 } }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [
            new TextRun({ text: "Dr.Stretch SPOT", size: 56, bold: true, font: "Montserrat", color: BLUE })
          ]}),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [
            new TextRun({ text: "退職トレーナー副業マッチングプラットフォーム", size: 28, font: "Yu Gothic", color: "555555" })
          ]}),
          new Paragraph({ spacing: { before: 600 }, alignment: AlignmentType.CENTER, children: [
            new TextRun({ text: "画面仕様書", size: 48, bold: true, font: "Yu Gothic", color: BLUE })
          ]}),
          new Paragraph({ spacing: { before: 800 }, alignment: AlignmentType.CENTER, children: [
            new TextRun({ text: "Screen Specification Document", size: 24, font: "Montserrat", color: "888888" })
          ]}),
          new Paragraph({ spacing: { before: 2000 }, alignment: AlignmentType.CENTER, children: [
            new TextRun({ text: "文書バージョン: 1.0", size: 20, font: "Yu Gothic" })
          ]}),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [
            new TextRun({ text: "作成日: 2026年3月12日", size: 20, font: "Yu Gothic" })
          ]}),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [
            new TextRun({ text: "技術スタック: Next.js 16 + Supabase + shadcn/ui", size: 20, font: "Yu Gothic", color: "666666" })
          ]}),
          new Paragraph({ children: [new PageBreak()] }),
        ]
      },
      // ── TOC + Overview ──
      {
        properties: {
          page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } }
        },
        headers: {
          default: new Header({ children: [new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 1 } }, children: [
            new TextRun({ text: "Dr.Stretch SPOT  |  画面仕様書  v1.0", size: 16, font: "Yu Gothic", color: "999999" })
          ]})] })
        },
        footers: {
          default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
            new TextRun({ text: "Page ", size: 16, font: "Yu Gothic", color: "999999" }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, font: "Yu Gothic", color: "999999" }),
          ]})] })
        },
        children: [
          heading1("目次"),
          new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
          new Paragraph({ children: [new PageBreak()] }),

          // ── System Overview ──
          heading1("1. システム概要"),
          para("Dr.Stretch SPOT は、Dr.Stretch を退職したトレーナーが副業として店舗シフトにマッチングするプラットフォームです。退職申請からSPOT登録、シフト検索・応募、QR打刻、収入管理までを一元管理します。"),
          new Paragraph({ spacing: { after: 120 } }),
          boldPara("技術スタック: ", "Next.js 16 (App Router) + Supabase (PostgreSQL + Auth + RLS) + shadcn/ui + Tailwind CSS"),
          boldPara("デプロイ: ", "Vercel (プロジェクト名: dr-stretch-spot)"),
          boldPara("Supabase URL: ", "https://wpliqlgrsfpymypgeqky.supabase.co"),
          boldPara("GitHub: ", "https://github.com/kurokawama/dr-stretch-spot"),
          boldPara("Cron: ", "/api/cron/reminders (毎日 22:00 UTC)"),
          new Paragraph({ spacing: { after: 200 } }),

          // ── Role definitions ──
          heading1("2. ユーザーロール定義"),
          makeTable(
            ["ロール", "説明", "アクセス範囲", "初期導線"],
            [
              ["trainer", "SPOTアクティブトレーナー", "シフト検索・応募・打刻・収入・評価", "/home"],
              ["employee", "退職前の現役従業員", "退職申請・SPOT登録準備", "/home"],
              ["store_manager", "店舗管理者", "自店舗のシフト・応募・勤怠・評価管理", "/store"],
              ["hr", "人事担当者", "全店舗横断管理・設定変更・オファー", "/hr"],
              ["area_manager", "エリアマネージャー", "担当エリアの管理（HR相当）", "/hr"],
              ["admin", "システム管理者", "全機能アクセス", "/hr/rates"],
            ],
            [1800, 2200, 3000, 2026]
          ),
          new Paragraph({ spacing: { after: 200 } }),

          // ── Screen list summary ──
          heading1("3. 画面一覧サマリ"),
          para("本システムは全44画面で構成されています。"),
          new Paragraph({ spacing: { after: 100 } }),
          makeTable(
            ["グループ", "画面数", "ルートグループ", "レイアウト特徴"],
            [
              ["認証", "3", "(auth)", "ヘッダーなし"],
              ["トレーナー", "15", "(trainer)", "Header + BottomNav(モバイル) + サイドバー(デスクトップ)"],
              ["店舗管理", "9", "(store)", "Header + BottomNav(モバイル) + サイドバー(デスクトップ)"],
              ["HR・エリア管理", "12", "(hr)", "Header + サイドバー(デスクトップのみ)"],
              ["管理者", "5", "(admin)", "Header + サイドバー(デスクトップのみ)"],
            ],
            [1800, 1200, 2500, 3526]
          ),
          new Paragraph({ children: [new PageBreak()] }),

          // ── Middleware ──
          heading1("4. ミドルウェア（認証・ルーティング）"),
          boldPara("ファイル: ", "src/middleware.ts"),
          para("全リクエストを傍受し、認証状態とロールに基づいてルーティングを制御します。"),
          new Paragraph({ spacing: { after: 100 } }),
          heading3("パブリックルート（認証不要）"),
          para("/login, /register, /auth/callback, /auth/magic"),
          heading3("ロール別リダイレクト"),
          makeTable(
            ["ロール", "リダイレクト先", "アクセス可能ルートグループ"],
            [
              ["trainer", "/home", "(trainer)"],
              ["employee", "/home", "(trainer) の一部"],
              ["store_manager", "/store", "(store)"],
              ["hr", "/hr", "(hr)"],
              ["area_manager", "/hr", "(hr)"],
              ["admin", "/hr/rates", "(hr) + (admin) + 全グループ"],
            ],
            [2000, 2500, 4526]
          ),
          new Paragraph({ children: [new PageBreak()] }),

          // ── Screen Details ──
          ...buildScreenSection("5. 認証画面", screens.auth),
          new Paragraph({ children: [new PageBreak()] }),
          ...buildScreenSection("6. トレーナー画面", screens.trainer),
          new Paragraph({ children: [new PageBreak()] }),
          ...buildScreenSection("7. 店舗管理画面", screens.store),
          new Paragraph({ children: [new PageBreak()] }),
          ...buildScreenSection("8. HR・エリア管理画面", screens.hr),
          new Paragraph({ children: [new PageBreak()] }),
          ...buildScreenSection("9. 管理者画面", screens.admin),
          new Paragraph({ children: [new PageBreak()] }),

          // ── Navigation Flow ──
          heading1("10. 画面遷移フロー"),
          heading2("10.1 認証フロー"),
          para("未認証 → /login → OTP入力 → / (ランディング) → ロール判定 → 各ダッシュボード"),
          para("プロフィール未作成の場合: / → /register → プロフィール登録 → /home"),
          new Paragraph({ spacing: { after: 200 } }),

          heading2("10.2 退職→SPOTフロー"),
          para("employee: /home → /resignation → 退職申請提出"),
          para("HR: /hr/resignations → 受理 → 完了処理（alumni_trainers作成 + role変更）"),
          para("trainer: /home → /spot-setup → 5ステップウィザード → SPOTアクティブ"),
          new Paragraph({ spacing: { after: 200 } }),

          heading2("10.3 シフトマッチングフロー"),
          para("店舗: /store/shifts → シフト作成（pending_approval）"),
          para("HR: /hr → シフト承認（open）→ トレーナーに通知"),
          para("トレーナー: /shifts → /shifts/[id] → /shifts/[id]/apply → 応募"),
          para("auto_confirm=true: 即承認 + 勤怠レコード作成"),
          para("auto_confirm=false: 店舗管理者が /store/applications で承認"),
          new Paragraph({ spacing: { after: 200 } }),

          heading2("10.4 ダイレクトオファーフロー"),
          para("トレーナー: /availability → 稼働可能日登録"),
          para("店舗: /store/availability → オファー送信"),
          para("トレーナー: /availability → オファー承諾 → シフト自動作成"),
          new Paragraph({ spacing: { after: 200 } }),

          heading2("10.5 HRオファーフロー"),
          para("HR: /hr/shift-offers → トレーナー検索 → オファー作成"),
          para("トレーナー: /availability → オファー承諾 → シフト自動作成"),
          new Paragraph({ spacing: { after: 200 } }),

          heading2("10.6 打刻フロー"),
          para("トレーナー: /clock → QRコード生成（15分有効）→ 店舗スキャナーで読取"),
          para("店舗: /store/attendance → 勤怠検証"),
          para("打刻完了 → last_shift_date更新 → blank_status=ok"),
          new Paragraph({ children: [new PageBreak()] }),

          // ── Responsive Design ──
          heading1("11. レスポンシブデザイン仕様"),
          makeTable(
            ["ブレークポイント", "レイアウト", "対象グループ"],
            [
              ["< 768px (モバイル)", "BottomNav表示 + サイドバー非表示", "(trainer), (store)"],
              [">= 768px (デスクトップ)", "サイドバー表示 + BottomNav非表示", "(trainer), (store)"],
              ["全サイズ", "サイドバーのみ（モバイルナビなし）", "(hr), (admin)"],
            ],
            [2500, 3500, 3026]
          ),
          new Paragraph({ spacing: { after: 200 } }),
          para("注意: HR・Admin画面はデスクトップ利用を前提としており、モバイルナビゲーションは提供されていません。"),

          new Paragraph({ children: [new PageBreak()] }),

          // ── Appendix ──
          heading1("12. 付録: 状態遷移表"),
          heading2("12.1 シフト申請ステータス"),
          makeTable(
            ["状態", "説明", "遷移先", "トリガー"],
            [
              ["pending_approval", "HR承認待ち", "open / cancelled", "店舗がシフト作成"],
              ["open", "募集中", "closed / cancelled / completed", "HR承認"],
              ["closed", "募集終了（充足）", "completed", "filled_count >= required_count"],
              ["cancelled", "キャンセル済み", "（終了状態）", "店舗/HRがキャンセル"],
              ["completed", "完了", "（終了状態）", "全勤怠検証完了"],
            ],
            [2200, 2000, 2500, 2326]
          ),
          new Paragraph({ spacing: { after: 200 } }),

          heading2("12.2 応募ステータス"),
          makeTable(
            ["状態", "説明", "遷移先", "トリガー"],
            [
              ["pending", "承認待ち", "approved / rejected / cancelled", "トレーナーが応募"],
              ["approved", "承認済み", "completed / cancelled / no_show", "店舗/自動承認"],
              ["rejected", "拒否", "（終了状態）", "店舗が拒否"],
              ["cancelled", "キャンセル", "（終了状態）", "トレーナー/HRがキャンセル"],
              ["completed", "完了", "（終了状態）", "勤怠検証+評価完了"],
              ["no_show", "欠勤", "（終了状態）", "出勤なし"],
            ],
            [2200, 2000, 2500, 2326]
          ),
          new Paragraph({ spacing: { after: 200 } }),

          heading2("12.3 勤怠ステータス"),
          makeTable(
            ["状態", "説明", "遷移先", "トリガー"],
            [
              ["scheduled", "予定", "clocked_in", "応募承認時に自動作成"],
              ["clocked_in", "出勤済み", "clocked_out", "QR打刻（出勤）"],
              ["clocked_out", "退勤済み", "verified / disputed", "QR打刻（退勤）"],
              ["verified", "検証済み", "（終了状態）", "店舗管理者が検証"],
              ["disputed", "異議あり", "verified", "問題があった場合"],
            ],
            [2200, 2000, 2500, 2326]
          ),
          new Paragraph({ spacing: { after: 200 } }),

          heading2("12.4 退職申請ステータス"),
          makeTable(
            ["状態", "説明", "遷移先", "トリガー"],
            [
              ["draft", "下書き", "submitted / cancelled", "従業員が作成"],
              ["submitted", "提出済み", "received / cancelled", "従業員が提出"],
              ["received", "受理済み", "accepted / completed", "HRが受理"],
              ["accepted", "承認済み", "completed", "HRが承認"],
              ["completed", "完了", "（終了状態）", "alumni_trainers作成+role変更"],
              ["cancelled", "取消", "（終了状態）", "従業員がキャンセル"],
            ],
            [2200, 2000, 2500, 2326]
          ),
          new Paragraph({ spacing: { after: 200 } }),

          heading2("12.5 ブランクステータス"),
          makeTable(
            ["状態", "閾値", "必要アクション", "解除条件"],
            [
              ["ok", "60日未満", "なし", "---"],
              ["alert_60", "60日以上", "シフトに入ることを推奨", "シフト完了で打刻"],
              ["skill_check_required", "90日以上", "スキルチェック受験必須", "スキルチェック合格"],
              ["training_required", "120日以上", "研修受講必須", "研修完了"],
            ],
            [2800, 1500, 2800, 1926]
          ),
        ]
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync("C:\\Users\\m-kur\\dr-stretch-spot\\docs\\画面仕様書_DrStretch_SPOT.docx", buffer);
  console.log("Generated: 画面仕様書_DrStretch_SPOT.docx");
}

main().catch(console.error);
