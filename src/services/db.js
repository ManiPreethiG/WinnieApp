import * as SQLite from "expo-sqlite";
import { triggerTableSync } from "./sheetsSync";

// ───────────── DATE HELPERS ─────────────
export function toISODate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
}

export function formatDayNumber(dateStr) {
  return String(Number(dateStr.split("-")[2]));
}

export function formatDayName(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
}

export function getMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

export function formatRupees(amount) {
  return "₹" + Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function calculateContinuousStreaks(dates) {
  if (!dates || dates.length === 0) return { current: 0, best: 0 };
  const sorted = [...new Set(dates)].sort();
  const todayStr = toISODate(new Date());
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  const yestStr = toISODate(yest);

  let best = 0;
  let curr = 0;
  let prevDate = null;

  for (let i = 0; i < sorted.length; i++) {
    const d = new Date(sorted[i]);
    if (!prevDate) {
      curr = 1;
    } else {
      const diff = Math.round((d - prevDate) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        curr += 1;
      } else if (diff > 1) {
        curr = 1;
      }
    }
    if (curr > best) best = curr;
    prevDate = d;
  }

  const lastDate = sorted[sorted.length - 1];
  let currentStreak = 0;
  if (lastDate === todayStr || lastDate === yestStr) {
    let checkDate = new Date(lastDate);
    currentStreak = 1;
    for (let i = sorted.length - 2; i >= 0; i--) {
      const d = new Date(sorted[i]);
      const diff = Math.round((checkDate - d) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        currentStreak++;
        checkDate = d;
      } else {
        break;
      }
    }
  }

  return { current: currentStreak, best };
}

export function calculateStreaks(checkinRows) {
  const dates = checkinRows.filter((r) => r.studied === 1).map((r) => r.date);
  return calculateContinuousStreaks(dates);
}

export function detectPeriodCycles(dates) {
  if (!dates || dates.length === 0) return [];
  const sorted = [...new Set(dates)].sort();
  const cycles = [];
  let start = null;
  let prev = null;
  for (const d of sorted) {
    if (!start) {
      start = d;
      prev = d;
    } else {
      const diff = Math.round((new Date(d) - new Date(prev)) / (1000 * 60 * 60 * 24));
      if (diff > 5) {
        cycles.push({ start, end: prev });
        start = d;
      }
      prev = d;
    }
  }
  if (start !== null) cycles.push({ start, end: prev });
  return cycles.reverse();
}

// ───────────── DATABASE INSTANCE & INIT ─────────────
let dbInstance = null;
export async function getDb() {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync("daybook.db");
  }
  return dbInstance;
}

const DEFAULT_RITUALS = [
  { name: "Exercise", emoji: "🏃", sort_order: 1 },
  { name: "Study", emoji: "📚", sort_order: 2 },
  { name: "Ate Healthy", emoji: "🥗", sort_order: 3 },
];

export async function initDatabase() {
  const db = await getDb();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      name TEXT NOT NULL,
      usage_count INTEGER NOT NULL DEFAULT 0,
      UNIQUE(kind, name)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
      category_id INTEGER,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      FOREIGN KEY (category_id) REFERENCES tags(id)
    );

    CREATE TABLE IF NOT EXISTS expense_breakdown_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_id INTEGER NOT NULL,
      label TEXT NOT NULL,
      amount REAL NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS period_days (
      date TEXT PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS rituals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      emoji TEXT NOT NULL DEFAULT '✨',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ritual_logs (
      date TEXT NOT NULL,
      ritual_id INTEGER NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (date, ritual_id),
      FOREIGN KEY (ritual_id) REFERENCES rituals(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS daily_checkins (
      date TEXT PRIMARY KEY,
      studied INTEGER NOT NULL DEFAULT 0,
      ate_healthy INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS learning_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS buy_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const ritualsCount = await db.getFirstAsync(`SELECT COUNT(*) as count FROM rituals`);
  if (!ritualsCount || ritualsCount.count === 0) {
    for (const r of DEFAULT_RITUALS) {
      await db.runAsync(`INSERT INTO rituals (name, emoji, sort_order) VALUES (?, ?, ?)`, [
        r.name,
        r.emoji,
        r.sort_order,
      ]);
    }
  }

  const starterTags = [
    ["expense", "Food"],
    ["expense", "Coffee"],
    ["expense", "Transport"],
    ["expense", "Shopping"],
    ["expense", "Bills"],
    ["expense", "Entertainment"],
    ["income", "Salary"],
    ["income", "Freelance"],
    ["income", "Investments"],
    ["income", "Gift"],
  ];
  for (const [kind, name] of starterTags) {
    await db.runAsync(`INSERT OR IGNORE INTO tags (kind, name, usage_count) VALUES (?, ?, 0)`, [kind, name]);
  }

  return db;
}

// ───────────── RITUAL QUERIES ─────────────
export async function listRituals() {
  const db = await getDb();
  return db.getAllAsync(`SELECT * FROM rituals ORDER BY sort_order ASC, id ASC`);
}

export async function addRitual(name, emoji) {
  const db = await getDb();
  const maxRow = await db.getFirstAsync(`SELECT MAX(sort_order) as maxOrder FROM rituals`);
  const sort_order = (maxRow?.maxOrder || 0) + 1;
  const res = await db.runAsync(`INSERT INTO rituals (name, emoji, sort_order) VALUES (?, ?, ?)`, [
    name.trim(),
    emoji.trim() || "✨",
    sort_order,
  ]);
  triggerTableSync("rituals");
  return res.lastInsertRowId;
}

export async function updateRitual(id, name, emoji) {
  const db = await getDb();
  await db.runAsync(`UPDATE rituals SET name = ?, emoji = ? WHERE id = ?`, [
    name.trim(),
    emoji.trim() || "✨",
    id,
  ]);
  triggerTableSync("rituals");
}

export async function deleteRitual(id) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM ritual_logs WHERE ritual_id = ?`, [id]);
  await db.runAsync(`DELETE FROM rituals WHERE id = ?`, [id]);
  triggerTableSync("rituals");
  triggerTableSync("ritual_logs");
}

export async function toggleRitualLog(date, ritualId) {
  const db = await getDb();
  const existing = await db.getFirstAsync(
    `SELECT completed FROM ritual_logs WHERE date = ? AND ritual_id = ?`,
    [date, ritualId]
  );

  let isCompleted = false;
  if (existing) {
    if (existing.completed) {
      await db.runAsync(`DELETE FROM ritual_logs WHERE date = ? AND ritual_id = ?`, [date, ritualId]);
      isCompleted = false;
    } else {
      await db.runAsync(`UPDATE ritual_logs SET completed = 1 WHERE date = ? AND ritual_id = ?`, [
        date,
        ritualId,
      ]);
      isCompleted = true;
    }
  } else {
    await db.runAsync(`INSERT INTO ritual_logs (date, ritual_id, completed) VALUES (?, ?, 1)`, [
      date,
      ritualId,
    ]);
    isCompleted = true;
  }

  const ritual = await db.getFirstAsync(`SELECT name FROM rituals WHERE id = ?`, [ritualId]);
  if (ritual) {
    const lower = ritual.name.toLowerCase();
    if (lower.includes("study")) {
      const cRow = await db.getFirstAsync(`SELECT studied FROM daily_checkins WHERE date = ?`, [date]);
      if (cRow) {
        await db.runAsync(`UPDATE daily_checkins SET studied = ? WHERE date = ?`, [
          isCompleted ? 1 : 0,
          date,
        ]);
      } else {
        await db.runAsync(
          `INSERT INTO daily_checkins (date, studied, ate_healthy) VALUES (?, ?, 0)`,
          [date, isCompleted ? 1 : 0]
        );
      }
    }
  }

  triggerTableSync("ritual_logs");
  triggerTableSync("daily_checkins");
  return isCompleted;
}

export async function getRitualLogsForDates(dates) {
  if (!dates || dates.length === 0) return [];
  const db = await getDb();
  const placeholders = dates.map(() => "?").join(",");
  return db.getAllAsync(
    `SELECT date, ritual_id, completed FROM ritual_logs WHERE date IN (${placeholders})`,
    dates
  );
}

export async function getContinuousRitualStreaks(ritualId) {
  const db = await getDb();
  const rows = await db.getAllAsync(
    `SELECT date FROM ritual_logs WHERE ritual_id = ? AND completed = 1 ORDER BY date ASC`,
    [ritualId]
  );
  const dates = rows.map((r) => r.date);
  return calculateContinuousStreaks(dates);
}

export async function getContinuousStudyStreaks() {
  const db = await getDb();
  const rows = await db.getAllAsync(`
    SELECT DISTINCT date FROM (
      SELECT rl.date
      FROM ritual_logs rl
      JOIN rituals r ON r.id = rl.ritual_id
      WHERE rl.completed = 1 AND LOWER(r.name) LIKE '%study%'
      UNION
      SELECT date FROM daily_checkins WHERE studied = 1
    ) ORDER BY date ASC
  `);
  const dates = rows.map((r) => r.date);
  return calculateContinuousStreaks(dates);
}

// ───────────── TAG QUERIES ─────────────
export async function listTags(kind) {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT id, kind, name, usage_count FROM tags WHERE kind = ? ORDER BY usage_count DESC, name COLLATE NOCASE ASC`,
    [kind]
  );
}

export async function searchTags(kind, query) {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT id, kind, name, usage_count FROM tags WHERE kind = ? AND name LIKE ? ORDER BY usage_count DESC, name COLLATE NOCASE ASC`,
    [kind, `%${query}%`]
  );
}

export async function getOrCreateTag(kind, name) {
  const db = await getDb();
  const trimmed = name.trim();
  const existing = await db.getFirstAsync(
    `SELECT id, kind, name, usage_count FROM tags WHERE kind = ? AND name = ? COLLATE NOCASE`,
    [kind, trimmed]
  );
  if (existing) return existing;
  const result = await db.runAsync(`INSERT INTO tags (kind, name, usage_count) VALUES (?, ?, 0)`, [
    kind,
    trimmed,
  ]);
  triggerTableSync("tags");
  return { id: result.lastInsertRowId, kind, name: trimmed, usage_count: 0 };
}

export async function bumpTagUsage(tagId) {
  const db = await getDb();
  await db.runAsync(`UPDATE tags SET usage_count = usage_count + 1 WHERE id = ?`, [tagId]);
  triggerTableSync("tags");
}

// ───────────── EXPENSE QUERIES ─────────────
export async function getEntriesForDate(date) {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT e.*, t.name AS category_name
     FROM expenses e
     LEFT JOIN tags t ON t.id = e.category_id
     WHERE e.date = ?
     ORDER BY e.id DESC`,
    [date]
  );
}

export async function getMonthlyTotals(year, month) {
  const db = await getDb();
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const row = await db.getFirstAsync(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense,
       COALESCE(SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END), 0) AS total_income
     FROM expenses
     WHERE date LIKE ?`,
    [`${prefix}-%`]
  );
  return {
    expense: row?.total_expense ?? 0,
    income: row?.total_income ?? 0,
  };
}

export async function getCategoryTotals(year, month) {
  const db = await getDb();
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  return db.getAllAsync(
    `SELECT COALESCE(t.name, 'Uncategorised') AS category, SUM(e.amount) AS total
     FROM expenses e LEFT JOIN tags t ON t.id=e.category_id
     WHERE e.type='expense' AND e.date LIKE ?
     GROUP BY category ORDER BY total DESC`,
    [`${prefix}-%`]
  );
}

export async function addExpense(entry) {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO expenses (date, type, category_id, title, amount) VALUES (?, ?, ?, ?, ?)`,
    [entry.date, entry.type, entry.categoryId, entry.title, entry.amount]
  );
  const expenseId = result.lastInsertRowId;
  if (entry.breakdown && entry.breakdown.length > 0) {
    for (let i = 0; i < entry.breakdown.length; i++) {
      const item = entry.breakdown[i];
      await db.runAsync(
        `INSERT INTO expense_breakdown_items (expense_id, label, amount, sort_order) VALUES (?, ?, ?, ?)`,
        [expenseId, item.label, item.amount, i]
      );
    }
  }
  if (entry.categoryId) await bumpTagUsage(entry.categoryId);
  triggerTableSync("expenses");
  triggerTableSync("expense_breakdown_items");
  return expenseId;
}

export async function updateExpense(id, entry) {
  const db = await getDb();
  await db.runAsync(`UPDATE expenses SET date=?, type=?, category_id=?, title=?, amount=? WHERE id=?`, [
    entry.date,
    entry.type,
    entry.categoryId,
    entry.title,
    entry.amount,
    id,
  ]);
  await db.runAsync(`DELETE FROM expense_breakdown_items WHERE expense_id=?`, [id]);
  if (entry.breakdown && entry.breakdown.length > 0) {
    for (let i = 0; i < entry.breakdown.length; i++) {
      const item = entry.breakdown[i];
      await db.runAsync(
        `INSERT INTO expense_breakdown_items (expense_id, label, amount, sort_order) VALUES (?, ?, ?, ?)`,
        [id, item.label, item.amount, i]
      );
    }
  }
  if (entry.categoryId) await bumpTagUsage(entry.categoryId);
  triggerTableSync("expenses");
  triggerTableSync("expense_breakdown_items");
}

export async function deleteExpense(id) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM expenses WHERE id = ?`, [id]);
  triggerTableSync("expenses");
  triggerTableSync("expense_breakdown_items");
}

// ───────────── PERIODS QUERIES ─────────────
export async function getAllPeriodDays() {
  const db = await getDb();
  return db.getAllAsync(`SELECT date FROM period_days ORDER BY date ASC`);
}

export async function togglePeriodDay(date) {
  const db = await getDb();
  const existing = await db.getFirstAsync(`SELECT date FROM period_days WHERE date=?`, [date]);
  if (existing) {
    await db.runAsync(`DELETE FROM period_days WHERE date=?`, [date]);
  } else {
    await db.runAsync(`INSERT INTO period_days (date) VALUES (?)`, [date]);
  }
  triggerTableSync("period_days");
}

// ───────────── BUY ITEMS QUERIES ─────────────
export async function listBuyItems() {
  const db = await getDb();
  return db.getAllAsync(`SELECT * FROM buy_items ORDER BY completed ASC, id DESC`);
}

export async function addBuyItem(title) {
  const db = await getDb();
  const result = await db.runAsync(`INSERT INTO buy_items (title, completed) VALUES (?, 0)`, [title.trim()]);
  triggerTableSync("buy_items");
  return result.lastInsertRowId;
}

export async function toggleBuyItem(id) {
  const db = await getDb();
  const item = await db.getFirstAsync(`SELECT completed FROM buy_items WHERE id=?`, [id]);
  if (item) {
    const nextVal = item.completed ? 0 : 1;
    await db.runAsync(`UPDATE buy_items SET completed=? WHERE id=?`, [nextVal, id]);
    triggerTableSync("buy_items");
  }
}

export async function deleteBuyItem(id) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM buy_items WHERE id=?`, [id]);
  triggerTableSync("buy_items");
}

// ───────────── DAILY LEARNING NOTES ─────────────
export async function listLearningNotes(date) {
  const db = await getDb();
  return db.getAllAsync(`SELECT * FROM learning_notes WHERE date=? ORDER BY id DESC`, [date]);
}

export async function saveLearningEntry(id, date, body) {
  const db = await getDb();
  let resultId = id;
  if (id) {
    await db.runAsync(`UPDATE learning_notes SET body=?, updated_at=datetime('now') WHERE id=?`, [body, id]);
  } else {
    const result = await db.runAsync(`INSERT INTO learning_notes (date, body) VALUES (?,?)`, [date, body]);
    resultId = result.lastInsertRowId;
  }
  triggerTableSync("learning_notes");
  return resultId;
}

export async function deleteLearningEntry(id) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM learning_notes WHERE id=?`, [id]);
  triggerTableSync("learning_notes");
}

// ───────────── NOTES QUERIES ─────────────
export async function listNotes() {
  const db = await getDb();
  return db.getAllAsync(`SELECT * FROM notes ORDER BY updated_at DESC, id DESC`);
}

export async function saveNote(note) {
  const db = await getDb();
  let resultId = note.id;
  if (note.id) {
    await db.runAsync(`UPDATE notes SET title=?, body=?, updated_at=datetime('now') WHERE id=?`, [note.title, note.body, note.id]);
  } else {
    const result = await db.runAsync(`INSERT INTO notes (title, body) VALUES (?,?)`, [note.title, note.body]);
    resultId = result.lastInsertRowId;
  }
  triggerTableSync("notes");
  return resultId;
}

export async function deleteNote(id) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM notes WHERE id=?`, [id]);
  triggerTableSync("notes");
}
