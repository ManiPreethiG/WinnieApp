// ─────────────────────────────────────────────────────────────
// Winnie — Daily Rhythm & Life Tracker
//
// Highlights:
//   - HOME: Custom character banner + scattered anime artwork & emojis.
//   - PROGRESS: Flaming motivation cards, high-def character banners, scattered emojis.
//   - HEALTH: Character-themed period tracker header + scattered mood emojis.
//   - HEAD BATH: Shower/Winnie banner + scattered refreshing emojis.
//   - EXPENSES: Wallet & piggy bank visuals, anime-styled finance cards + scattered emojis.
//   - REPORTS: Wealth overview visuals + scattered financial emojis.
//   - MENU: Home -> Expenses -> Reports -> Progress -> Notes -> Period Tracker -> Head Bath.
//   - NOTES: Collapsible "Buy" checklist section with anime note cards + scattered emojis.
//   - Ready for Snack Expo Dev (snack.expo.dev) & Expo SDK 51+.
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
  PanResponder,
  StatusBar,
  Alert,
  Image,
} from "react-native";
import * as SQLite from "expo-sqlite";
import Svg, { Circle } from "react-native-svg";

// ───────────── LOCAL ASSETS MAP ─────────────
const LOCAL_ASSETS = {
  food: require("./assets/food.png"),
  hi: require("./assets/hi.png"),
  inosuke: require("./assets/inosuke.png"),
  jiraiya: require("./assets/jiraiya.png"),
  luffy: require("./assets/luffy.png"),
  luffyAngry: require("./assets/luffy_angry.png"),
  minato: require("./assets/minato.png"),
  naruto: require("./assets/naruto.png"),
  tanjiro: require("./assets/tanjiro.png"),
  uzui: require("./assets/uzui.png"),
  nezuko: require("./assets/nezuko.png"),
  shinobu: require("./assets/shinobu.png"),
  winnie: require("./assets/winnie.jpeg"),
  logo: require("./assets/winnie.jpeg"),
};

// ───────────── ASSET / ICON MAP ─────────────
const APP_ICONS = {
  home: { uri: "https://img.icons8.com/color/48/home--v1.png" },
  expenses: { uri: "https://img.icons8.com/color/48/wallet--v1.png" },
  reports: { uri: "https://img.icons8.com/color/48/analytics.png" },
  progress: { uri: "https://img.icons8.com/color/48/fire-element.png" },
  notes: { uri: "https://img.icons8.com/color/48/notepad.png" },
  health: { uri: "https://img.icons8.com/color/48/like--v1.png" },
  headbath: { uri: "https://img.icons8.com/color/48/shower.png" },
  empty: { uri: "https://img.icons8.com/color/48/box--v1.png" },
  buy: { uri: "https://img.icons8.com/color/48/shopping-cart--v1.png" },
};

// ───────────── THEME & PALETTE ─────────────
const colors = {
  bg: "#120F0D",
  surface: "#1C1714",
  surfaceRaised: "#26201B",
  surfaceHighlight: "#332A24",
  border: "#362C26",
  borderLight: "#4A3D35",
  text: "#F7F3EE",
  textMuted: "#ABA095",
  textFaint: "#73685E",
  habitGreen: "#22C55E",
  habitGreenGlow: "rgba(34, 197, 94, 0.25)",
  streakOrange: "#FF6B35",
  streakOrangeGlow: "rgba(255, 107, 53, 0.25)",
  streakGold: "#FBBF24",
  positive: "#22C55E",
  negative: "#EF4444",
  expense: "#E5983B",
  progress: "#FF6B35",
  headbath: "#38BDF8",
  periods: "#F472B6",
  periodsDark: "#831843",
  notes: "#818CF8",
  reminders: "#C084FC",
};

const TOP_INSET = Platform.OS === "android" ? (StatusBar.currentHeight || 26) : 48;
const BOTTOM_INSET = 28;

const cardShadow = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.35,
  shadowRadius: 16,
  elevation: 6,
};

// ───────────── DATE HELPERS ─────────────
function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDays(dateStr, delta) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + delta);
  return toISODate(date);
}
function formatDisplayDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return {
    day: String(d),
    monthYear: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    weekday: date.toLocaleDateString("en-US", { weekday: "long" }),
  };
}
function todayISO() {
  return toISODate(new Date());
}
function relativeDayLabel(dateStr) {
  const today = todayISO();
  const yesterday = addDays(today, -1);
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function shortDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function getMonthGrid(year, month) {
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}
function getCurrentWeekDays() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const sun = new Date(today);
  sun.setDate(today.getDate() - dayOfWeek);
  const week = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sun);
    d.setDate(sun.getDate() + i);
    week.push(toISODate(d));
  }
  return week;
}
function computeCycles(sortedDates) {
  const cycles = [];
  let start = null,
    prev = null;
  for (const d of sortedDates) {
    if (start === null) {
      start = d;
      prev = d;
      continue;
    }
    if (addDays(prev, 1) === d) {
      prev = d;
    } else {
      cycles.push({ start, end: prev });
      start = d;
      prev = d;
    }
  }
  if (start !== null) cycles.push({ start, end: prev });
  return cycles.reverse();
}

// ───────────── DATABASE ─────────────
let dbInstance = null;
async function getDb() {
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

async function initDatabase() {
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
      type TEXT NOT NULL,
      category_id INTEGER,
      title TEXT NOT NULL,
      amount REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expense_breakdown_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_id INTEGER NOT NULL,
      label TEXT NOT NULL,
      amount REAL NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS period_days (
      date TEXT PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS headbath_days (
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
      completed INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (date, ritual_id)
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
      title TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
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

  const countRow = await db.getFirstAsync(`SELECT COUNT(*) as count FROM rituals`);
  if (!countRow || countRow.count === 0) {
    for (const r of DEFAULT_RITUALS) {
      await db.runAsync(`INSERT INTO rituals (name, emoji, sort_order) VALUES (?, ?, ?)`, [
        r.name,
        r.emoji,
        r.sort_order,
      ]);
    }
  }

  const starterTags = [
    ["expense", "Food & Drinks"],
    ["expense", "Transport"],
    ["expense", "Groceries"],
    ["expense", "Shopping"],
    ["expense", "Bills"],
    ["expense", "Health"],
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
async function listRituals() {
  const db = await getDb();
  return db.getAllAsync(`SELECT * FROM rituals ORDER BY sort_order ASC, id ASC`);
}
async function addRitual(name, emoji) {
  const db = await getDb();
  const maxRow = await db.getFirstAsync(`SELECT MAX(sort_order) as maxOrder FROM rituals`);
  const sort_order = (maxRow?.maxOrder || 0) + 1;
  const res = await db.runAsync(`INSERT INTO rituals (name, emoji, sort_order) VALUES (?, ?, ?)`, [
    name.trim(),
    emoji.trim() || "✨",
    sort_order,
  ]);
  return res.lastInsertRowId;
}
async function updateRitual(id, name, emoji) {
  const db = await getDb();
  await db.runAsync(`UPDATE rituals SET name = ?, emoji = ? WHERE id = ?`, [
    name.trim(),
    emoji.trim() || "✨",
    id,
  ]);
}
async function deleteRitual(id) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM ritual_logs WHERE ritual_id = ?`, [id]);
  await db.runAsync(`DELETE FROM rituals WHERE id = ?`, [id]);
}
async function toggleRitualLog(date, ritualId) {
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

  return isCompleted;
}
async function getRitualLogsForDates(dates) {
  const db = await getDb();
  const placeholders = dates.map(() => "?").join(",");
  const rows = await db.getAllAsync(
    `SELECT date, ritual_id FROM ritual_logs WHERE date IN (${placeholders}) AND completed = 1`,
    dates
  );
  const map = {};
  dates.forEach((d) => {
    map[d] = new Set();
  });
  rows.forEach((r) => {
    if (!map[r.date]) map[r.date] = new Set();
    map[r.date].add(r.ritual_id);
  });
  return map;
}

// ───────────── STREAK QUERIES ─────────────
function calculateContinuousStreaks(allActiveDates) {
  const sorted = Array.from(new Set(allActiveDates)).sort();
  const set = new Set(sorted);
  const today = todayISO();
  const yesterday = addDays(today, -1);

  let currentStreak = 0;
  let checkDate = today;
  if (set.has(today)) {
    while (set.has(checkDate)) {
      currentStreak++;
      checkDate = addDays(checkDate, -1);
    }
  } else if (set.has(yesterday)) {
    checkDate = yesterday;
    while (set.has(checkDate)) {
      currentStreak++;
      checkDate = addDays(checkDate, -1);
    }
  } else {
    currentStreak = 0;
  }

  let highestStreak = 0;
  let currentRun = 0;
  let prev = null;
  for (const d of sorted) {
    if (prev === null) {
      currentRun = 1;
    } else if (addDays(prev, 1) === d) {
      currentRun++;
    } else {
      currentRun = 1;
    }
    if (currentRun > highestStreak) {
      highestStreak = currentRun;
    }
    prev = d;
  }

  if (currentStreak > highestStreak) {
    highestStreak = currentStreak;
  }

  return { currentStreak, highestStreak, activeSet: set };
}

async function getProgressStreakStats() {
  const db = await getDb();
  const rows = await db.getAllAsync(`
    SELECT DISTINCT date FROM (
      SELECT rl.date FROM ritual_logs rl
      JOIN rituals r ON r.id = rl.ritual_id
      WHERE LOWER(r.name) LIKE '%study%' AND rl.completed = 1
      UNION
      SELECT date FROM daily_checkins WHERE studied = 1
    ) ORDER BY date ASC
  `);
  const dates = rows.map((r) => r.date);
  return calculateContinuousStreaks(dates);
}

// ───────────── TAG QUERIES ─────────────
async function listTags(kind) {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT id, kind, name, usage_count FROM tags WHERE kind = ? ORDER BY usage_count DESC, name COLLATE NOCASE ASC`,
    [kind]
  );
}
async function searchTags(kind, query) {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT id, kind, name, usage_count FROM tags WHERE kind = ? AND name LIKE ? ORDER BY usage_count DESC, name COLLATE NOCASE ASC`,
    [kind, `%${query}%`]
  );
}
async function getOrCreateTag(kind, name) {
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
  return { id: result.lastInsertRowId, kind, name: trimmed, usage_count: 0 };
}
async function bumpTagUsage(tagId) {
  const db = await getDb();
  await db.runAsync(`UPDATE tags SET usage_count = usage_count + 1 WHERE id = ?`, [tagId]);
}

// ───────────── EXPENSE QUERIES ─────────────
async function getEntriesForDate(date) {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT e.id, e.date, e.type, e.category_id, t.name as category_name, e.title, e.amount,
            (SELECT COUNT(*) FROM expense_breakdown_items b WHERE b.expense_id = e.id) as breakdown_count
     FROM expenses e LEFT JOIN tags t ON t.id = e.category_id
     WHERE e.date = ? ORDER BY e.id DESC`,
    [date]
  );
}
async function getBreakdownItems(expenseId) {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT id, label, amount FROM expense_breakdown_items WHERE expense_id = ? ORDER BY sort_order ASC`,
    [expenseId]
  );
}
async function getCarriedForwardBalance(date) {
  const db = await getDb();
  const row = await db.getFirstAsync(
    `SELECT SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as total FROM expenses WHERE date < ?`,
    [date]
  );
  return row?.total ?? 0;
}
async function getDayTotals(date) {
  const db = await getDb();
  const row = await db.getFirstAsync(
    `SELECT SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
            SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
     FROM expenses WHERE date = ?`,
    [date]
  );
  return { income: row?.income ?? 0, expense: row?.expense ?? 0 };
}
async function getMonthlySummary(year, month) {
  const db = await getDb();
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const row = await db.getFirstAsync(
    `SELECT SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as income,
            SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as expense
     FROM expenses WHERE date LIKE ?`,
    [`${prefix}-%`]
  );
  return { income: row?.income ?? 0, expense: row?.expense ?? 0 };
}
async function getMonthlyExpenseReport(year, month) {
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
async function addExpense(entry) {
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
  return expenseId;
}
async function updateExpense(id, entry) {
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
}
async function deleteExpense(id) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM expenses WHERE id = ?`, [id]);
}

// ───────────── PERIODS QUERIES ─────────────
async function getAllPeriodDays() {
  const db = await getDb();
  return db.getAllAsync(`SELECT date FROM period_days ORDER BY date ASC`);
}
async function togglePeriodDay(date) {
  const db = await getDb();
  const existing = await db.getFirstAsync(`SELECT date FROM period_days WHERE date=?`, [date]);
  if (existing) {
    await db.runAsync(`DELETE FROM period_days WHERE date=?`, [date]);
  } else {
    await db.runAsync(`INSERT INTO period_days (date) VALUES (?)`, [date]);
  }
}

// ───────────── HEAD BATH QUERIES ─────────────
async function getAllHeadbathDays() {
  const db = await getDb();
  return db.getAllAsync(`SELECT date FROM headbath_days ORDER BY date ASC`);
}
async function toggleHeadbathDay(date) {
  const db = await getDb();
  const existing = await db.getFirstAsync(`SELECT date FROM headbath_days WHERE date=?`, [date]);
  if (existing) {
    await db.runAsync(`DELETE FROM headbath_days WHERE date=?`, [date]);
  } else {
    await db.runAsync(`INSERT INTO headbath_days (date) VALUES (?)`, [date]);
  }
}

// ───────────── BUY ITEMS QUERIES ─────────────
async function listBuyItems() {
  const db = await getDb();
  return db.getAllAsync(`SELECT * FROM buy_items ORDER BY completed ASC, id DESC`);
}
async function addBuyItem(title) {
  const db = await getDb();
  const result = await db.runAsync(`INSERT INTO buy_items (title, completed) VALUES (?, 0)`, [title.trim()]);
  return result.lastInsertRowId;
}
async function toggleBuyItem(id) {
  const db = await getDb();
  const item = await db.getFirstAsync(`SELECT completed FROM buy_items WHERE id=?`, [id]);
  if (item) {
    const nextVal = item.completed ? 0 : 1;
    await db.runAsync(`UPDATE buy_items SET completed=? WHERE id=?`, [nextVal, id]);
  }
}
async function deleteBuyItem(id) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM buy_items WHERE id=?`, [id]);
}

// ───────────── DAILY LEARNING NOTES ─────────────
async function listLearningNotes(date) {
  const db = await getDb();
  return db.getAllAsync(`SELECT * FROM learning_notes WHERE date=? ORDER BY id DESC`, [date]);
}
async function saveLearningEntry(id, date, body) {
  const db = await getDb();
  if (id) {
    await db.runAsync(`UPDATE learning_notes SET body=?, updated_at=datetime('now') WHERE id=?`, [body, id]);
    return id;
  }
  const result = await db.runAsync(`INSERT INTO learning_notes (date, body) VALUES (?,?)`, [date, body]);
  return result.lastInsertRowId;
}
async function deleteLearningEntry(id) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM learning_notes WHERE id=?`, [id]);
}

// ───────────── NOTES QUERIES ─────────────
async function listNotes() {
  const db = await getDb();
  return db.getAllAsync(`SELECT * FROM notes ORDER BY updated_at DESC, id DESC`);
}
async function saveNote(note) {
  const db = await getDb();
  if (note.id) {
    await db.runAsync(`UPDATE notes SET title=?, body=?, updated_at=datetime('now') WHERE id=?`, [note.title, note.body, note.id]);
    return note.id;
  }
  const result = await db.runAsync(`INSERT INTO notes (title, body) VALUES (?,?)`, [note.title, note.body]);
  return result.lastInsertRowId;
}
async function deleteNote(id) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM notes WHERE id=?`, [id]);
}

// ───────────── HEADER & MENU BUTTON ─────────────
function ScreenHeader({ title, onMenuPress, iconKey }) {
  return (
    <View style={s.headerContainer}>
      <Pressable onPress={onMenuPress} style={s.menuBtnInline} hitSlop={10}>
        <View style={s.menuLine} />
        <View style={s.menuLine} />
        <View style={s.menuLine} />
      </Pressable>
      {iconKey && APP_ICONS[iconKey] && (
        <Image source={APP_ICONS[iconKey]} style={s.headerIcon} />
      )}
      <Text style={s.headerTitleText}>{title}</Text>
    </View>
  );
}

// ───────────── DRAWER NAVIGATION ─────────────
function Drawer({ visible, onClose, activeTab, onSelectTab, tabs }) {
  const translateX = useRef(new Animated.Value(-320)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, { toValue: -320, duration: 200, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  if (!mounted) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}>
        <Pressable style={[StyleSheet.absoluteFill, s.backdrop]} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[s.drawer, { transform: [{ translateX }] }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Image source={LOCAL_ASSETS.winnie} style={s.drawerAvatar} />
          <Text style={s.drawerBrand}>Winnie 🐾</Text>
        </View>

        <View style={{ marginTop: 32, gap: 6 }}>
          {tabs.map((t) => {
            const active = activeTab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => {
                  onSelectTab(t.key);
                  onClose();
                }}
                style={[s.drawerItem, active && { backgroundColor: colors.surface }]}
              >
                {APP_ICONS[t.key] ? (
                  <Image source={APP_ICONS[t.key]} style={s.drawerIcon} />
                ) : (
                  <View style={[s.dot, { backgroundColor: active ? t.accent : "transparent", borderColor: t.accent }]} />
                )}
                <Text style={[s.drawerItemText, active && { color: colors.text, fontWeight: "600" }]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

// ───────────── TAG DROPDOWN ─────────────
function TagDropdown({ kind, value, onChange, accentColor, placeholder, containerStyle }) {
  const [query, setQuery] = useState(value?.name ?? "");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);

  useEffect(() => {
    setQuery(value?.name ?? "");
  }, [value?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = query.trim() ? await searchTags(kind, query.trim()) : await listTags(kind);
      if (!cancelled) setResults(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [query, kind, open]);

  const exactMatch = results.some((r) => r.name.toLowerCase() === query.trim().toLowerCase());

  async function handleSelect(tag) {
    onChange(tag);
    setQuery(tag.name);
    setOpen(false);
  }
  async function handleCreate() {
    const tag = await getOrCreateTag(kind, query.trim());
    await handleSelect(tag);
  }

  return (
    <View style={containerStyle}>
      <View style={[s.inputWrap, open && { borderColor: accentColor }]}>
        <TextInput
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder ?? "Category"}
          placeholderTextColor={colors.textFaint}
          style={s.input}
        />
      </View>
      {open && (
        <View style={s.dropdown}>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 180 }}>
            {results.map((tag) => (
              <Pressable key={tag.id} onPress={() => handleSelect(tag)} style={s.row}>
                <View style={[s.rowDot, { backgroundColor: accentColor }]} />
                <Text style={s.rowText}>{tag.name}</Text>
              </Pressable>
            ))}
            {query.trim().length > 0 && !exactMatch && (
              <Pressable onPress={handleCreate} style={s.row}>
                <Text style={[s.addNew, { color: accentColor }]}>+ Add "{query.trim()}"</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ───────────── BREAKDOWN TABLE (AUTO-SUM) ─────────────
function BreakdownTable({ items, onChange, accentColor }) {
  const [draftLabel, setDraftLabel] = useState("");
  const [draftAmount, setDraftAmount] = useState("");
  const total = items.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  function addRow() {
    const amountNum = Number(draftAmount);
    if (!draftLabel.trim() || !amountNum) return;
    onChange([...items, { label: draftLabel.trim(), amount: amountNum }]);
    setDraftLabel("");
    setDraftAmount("");
  }
  function removeRow(index) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <View>
      <View style={s.bdHeaderRow}>
        <Text style={s.bdHeaderLabel}>Item</Text>
        <Text style={[s.bdHeaderLabel, { textAlign: "right" }]}>Amount (₹)</Text>
      </View>
      {items.map((item, index) => (
        <View key={index} style={s.bdRow}>
          <Text style={s.bdItemText} numberOfLines={1}>
            {item.label}
          </Text>
          <View style={s.bdAmountRow}>
            <Text style={s.bdAmountText}>₹{item.amount.toFixed(0)}</Text>
            <Pressable onPress={() => removeRow(index)} hitSlop={8}>
              <Text style={s.bdRemove}>×</Text>
            </Pressable>
          </View>
        </View>
      ))}
      <View style={s.bdAddRow}>
        <TextInput
          value={draftLabel}
          onChangeText={setDraftLabel}
          placeholder="Item name"
          placeholderTextColor={colors.textFaint}
          style={[s.bdAddInput, { flex: 1.4 }]}
        />
        <TextInput
          value={draftAmount}
          onChangeText={setDraftAmount}
          placeholder="0"
          placeholderTextColor={colors.textFaint}
          keyboardType="numeric"
          style={[s.bdAddInput, { flex: 0.8, textAlign: "right" }]}
        />
        <Pressable onPress={addRow} style={[s.bdAddBtn, { backgroundColor: accentColor }]}>
          <Text style={s.bdAddBtnText}>+</Text>
        </Pressable>
      </View>
      {items.length > 0 && (
        <View style={s.bdTotalRow}>
          <Text style={s.bdTotalLabel}>Breakdown Total</Text>
          <Text style={[s.bdTotalValue, { color: accentColor }]}>₹{total.toFixed(0)}</Text>
        </View>
      )}
    </View>
  );
}

// ───────────── SVG CIRCULAR PROGRESS RING ─────────────
function HabitProgressRing({ completed = 0, total = 3, size = 38, strokeWidth = 3.2, dayNum = "", isToday = false }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const isComplete = total > 0 && completed >= total;
  const fraction = total > 0 ? Math.min(completed / total, 1) : 0;
  const strokeDashoffset = circumference * (1 - fraction);

  if (isComplete) {
    return (
      <View
        style={[
          s.weekRingFilled,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.habitGreen,
            borderColor: isToday ? colors.text : colors.habitGreen,
          },
        ]}
      >
        <Text style={s.weekRingCheck}>✓</Text>
      </View>
    );
  }

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isToday ? colors.borderLight : colors.border}
          strokeWidth={strokeWidth}
          fill={isToday ? "rgba(255,255,255,0.03)" : "none"}
        />
        {fraction > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.habitGreen}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        )}
      </Svg>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text
            style={[
              s.weekRingDayNum,
              {
                color: isToday ? colors.text : fraction > 0 ? colors.text : colors.textMuted,
                fontWeight: isToday ? "700" : "500",
              },
            ]}
          >
            {dayNum}
          </Text>
        </View>
      </View>
      {isToday && <View style={s.todayActiveDot} />}
    </View>
  );
}

// ───────────── WEEK STREAK BAR (HOME) ─────────────
const DAY_ABBR = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function WeekStreakBar({ weekDays, logsMap, totalRituals, todayStr }) {
  const todayCompleted = logsMap[todayStr]?.size || 0;
  const allDoneToday = totalRituals > 0 && todayCompleted >= totalRituals;

  return (
    <View style={[s.weekStreakCard, cardShadow]}>
      <View style={s.weekStreakHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Image source={APP_ICONS.progress} style={{ width: 22, height: 22 }} />
          <View>
            <Text style={s.weekStreakTitle}>Weekly Consistency 📈</Text>
            <Text style={s.weekStreakSub}>
              {allDoneToday
                ? "All rituals completed today! 🌟 🎉"
                : `${todayCompleted} of ${totalRituals} completed today ⏱️`}
            </Text>
          </View>
        </View>
        <View style={s.weekStreakBadge}>
          <Text style={s.weekStreakBadgeText}>
            {todayCompleted}/{totalRituals}
          </Text>
        </View>
      </View>

      <View style={s.weekStreakRow}>
        {weekDays.map((d, index) => {
          const isToday = d === todayStr;
          const completedCount = logsMap[d]?.size || 0;
          const dayNum = parseInt(d.split("-")[2], 10);
          const dayLabel = DAY_ABBR[index];
          const isAllDone = totalRituals > 0 && completedCount >= totalRituals;

          return (
            <View key={d} style={[s.weekStreakDayCol, isToday && s.weekStreakTodayCol]}>
              <Text style={[s.weekStreakDayLabel, isToday && { color: colors.streakOrange, fontWeight: "700" }]}>
                {dayLabel}
              </Text>
              <HabitProgressRing
                completed={completedCount}
                total={totalRituals}
                size={40}
                strokeWidth={3.2}
                dayNum={String(dayNum)}
                isToday={isToday}
              />
              <View style={s.weekStreakDotSlot}>
                {isAllDone && <Text style={{ fontSize: 9 }}>🔥</Text>}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ───────────── DYNAMIC RITUAL CIRCLE (HOME) ─────────────
function DynamicRitualCircle({ ritual, completed, onPress, onLongPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(scaleAnim, { toValue: 0.93, useNativeDriver: true, speed: 20 }).start();
  }
  function handlePressOut() {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, bounciness: 8 }).start();
  }

  return (
    <View style={s.habitCircleWrap}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable
          onPress={onPress}
          onLongPress={onLongPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            s.habitCircleBtn,
            completed ? s.habitCircleBtnActive : s.habitCircleBtnInactive,
          ]}
        >
          <Text style={s.habitEmoji}>{ritual.emoji}</Text>
          {completed && (
            <View style={s.habitCheckmarkBadge}>
              <Text style={s.habitCheckmarkText}>✓</Text>
            </View>
          )}
        </Pressable>
      </Animated.View>
      <Text style={[s.habitLabel, completed && { color: colors.text, fontWeight: "700" }]} numberOfLines={1}>
        {ritual.name}
      </Text>
    </View>
  );
}

// ───────────── RITUAL MODAL (ADD & EDIT) ─────────────
const EMOJI_SUGGESTIONS = ["🏃", "📚", "🥗", "💧", "🧘", "🚶", "💊", "📖", "🎯", "🛌", "✨", "🏋️", "🍵", "🎨"];

function RitualModal({ visible, editingRitual, onClose, onSaved, onDeleted }) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("✨");
  const isEditing = !!editingRitual;

  useEffect(() => {
    if (visible) {
      if (editingRitual) {
        setName(editingRitual.name);
        setEmoji(editingRitual.emoji);
      } else {
        setName("");
        setEmoji("✨");
      }
    }
  }, [visible, editingRitual]);

  async function handleSave() {
    if (!name.trim()) return;
    if (isEditing) {
      await updateRitual(editingRitual.id, name.trim(), emoji.trim());
    } else {
      await addRitual(name.trim(), emoji.trim());
    }
    onSaved();
    onClose();
  }

  function handleDelete() {
    Alert.alert("Delete ritual?", `Are you sure you want to remove "${editingRitual.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteRitual(editingRitual.id);
          onDeleted();
          onClose();
        },
      },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.modalBackdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.sheetWrap}>
        <View style={s.sheet}>
          <View style={s.grabber} />
          <Text style={s.modalHeaderTitle}>{isEditing ? "Edit Ritual ✏️" : "New Daily Ritual ✨"}</Text>

          <Text style={s.label}>Ritual Name 📝</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Drink 2L Water, Read 20 mins"
            placeholderTextColor={colors.textFaint}
            style={s.input}
          />

          <Text style={s.label}>Icon / Emoji 🎨</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={[s.emojiPreviewBox, cardShadow]}>
              <Text style={{ fontSize: 30 }}>{emoji || "✨"}</Text>
            </View>
            <TextInput
              value={emoji}
              onChangeText={setEmoji}
              placeholder="Type any emoji"
              placeholderTextColor={colors.textFaint}
              style={[s.input, { flex: 1 }]}
              maxLength={4}
            />
          </View>

          <Text style={s.label}>Quick suggestions 💡</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: "row", marginVertical: 6 }}>
            {EMOJI_SUGGESTIONS.map((em) => (
              <Pressable
                key={em}
                onPress={() => setEmoji(em)}
                style={[s.emojiPill, emoji === em && { borderColor: colors.habitGreen, backgroundColor: colors.surfaceHighlight }]}
              >
                <Text style={{ fontSize: 20 }}>{em}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Pressable onPress={handleSave} style={[s.saveBtn, { backgroundColor: colors.habitGreen }]}>
            <Text style={s.saveBtnText}>{isEditing ? "Update Ritual 🚀" : "Add Ritual ➕"}</Text>
          </Pressable>

          {isEditing && (
            <Pressable onPress={handleDelete} style={{ marginTop: 12, alignItems: "center", paddingVertical: 10 }}>
              <Text style={{ color: colors.negative, fontWeight: "600" }}>Delete this ritual 🗑️</Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ───────────── HOME SCREEN ─────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning ☀️";
  if (h < 17) return "Good afternoon 🌤️";
  return "Good evening 🌙";
}

function HomeScreen({ onMenuPress }) {
  const todayStr = todayISO();
  const weekDays = getCurrentWeekDays();
  const [rituals, setRituals] = useState([]);
  const [logsMap, setLogsMap] = useState({});
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRitual, setEditingRitual] = useState(null);

  const loadData = useCallback(async () => {
    const [allRituals, weekLogs, recent] = await Promise.all([
      listRituals(),
      getRitualLogsForDates(weekDays),
      getEntriesForDate(todayStr),
    ]);
    setRituals(allRituals);
    setLogsMap(weekLogs);
    setRecentExpenses(recent);
  }, [todayStr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleToggle(ritualId) {
    await toggleRitualLog(todayStr, ritualId);
    loadData();
  }

  function handleAddRitual() {
    setEditingRitual(null);
    setModalVisible(true);
  }

  function handleEditRitual(r) {
    setEditingRitual(r);
    setModalVisible(true);
  }

  const todayCompletedSet = logsMap[todayStr] || new Set();
  const formattedToday = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <View style={s.screen}>
      <ScreenHeader title={getGreeting()} onMenuPress={onMenuPress} iconKey="home" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: BOTTOM_INSET + 30 }}>
        {/* HERO BANNER WITH CHARACTER IMAGE */}
        <View style={s.bannerCard}>
          <Image source={LOCAL_ASSETS.hi} style={s.bannerImage} />
          <View style={s.bannerOverlay}>
            <Text style={s.bannerTitle}>Welcome Back, Champ! ⚡</Text>
            <Text style={s.bannerSub}>Let's smash today's goals with Winnie 🐾</Text>
          </View>
        </View>

        {/* Date Subtitle */}
        <View style={s.homeGreetingRow}>
          <Text style={s.todayDate}>📅 {formattedToday}</Text>
        </View>

        {/* 1. WEEK STREAK BAR */}
        <WeekStreakBar
          weekDays={weekDays}
          logsMap={logsMap}
          totalRituals={rituals.length}
          todayStr={todayStr}
        />

        {/* 2. DYNAMIC DAILY RITUALS SECTION */}
        <View style={[s.habitsSectionCard, cardShadow]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={s.sectionHeaderTitle}>Today's Daily Rituals 🎯</Text>
              <Text style={s.sectionHeaderSub}>Tap to complete · Long-press to edit or delete 💡</Text>
            </View>
            <Pressable onPress={handleAddRitual} style={s.addRitualTopBtn}>
              <Text style={s.addRitualTopBtnText}>+ Add ➕</Text>
            </Pressable>
          </View>

          <View style={s.habitsRow}>
            {rituals.map((r) => (
              <DynamicRitualCircle
                key={r.id}
                ritual={r}
                completed={todayCompletedSet.has(r.id)}
                onPress={() => handleToggle(r.id)}
                onLongPress={() => handleEditRitual(r)}
              />
            ))}
            <View style={s.habitCircleWrap}>
              <Pressable onPress={handleAddRitual} style={[s.habitCircleBtn, s.addCircleBtn]}>
                <Text style={{ fontSize: 24, color: colors.textMuted }}>+</Text>
              </Pressable>
              <Text style={s.habitLabel}>Add ➕</Text>
            </View>
          </View>
        </View>

        {/* 3. TODAY'S RECENT ENTRIES */}
        <Text style={s.listLabel}>Today's Logged Activity 📊</Text>
        {recentExpenses.length === 0 ? (
          <View style={s.emptyStateContainer}>
            <Image source={APP_ICONS.empty} style={s.emptyIcon} />
            <Text style={s.emptyText}>No activity logged for today yet. ✨</Text>
          </View>
        ) : (
          recentExpenses.map((entry) => (
            <EntryCard key={entry.id} entry={entry} interactive={false} showDate onDeleted={loadData} />
          ))
        )}
      </ScrollView>

      <RitualModal
        visible={modalVisible}
        editingRitual={editingRitual}
        onClose={() => setModalVisible(false)}
        onSaved={loadData}
        onDeleted={loadData}
      />
    </View>
  );
}

// ───────────── PROGRESS SCREEN ─────────────
function ProgressScreen({ onMenuPress }) {
  const [streakStats, setStreakStats] = useState({ currentStreak: 0, highestStreak: 0, activeSet: new Set() });
  const [monthDate, setMonthDate] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const [learningNotes, setLearningNotes] = useState([]);
  const [learningNote, setLearningNote] = useState("");
  const [learningOpen, setLearningOpen] = useState(false);
  const [editingLearningId, setEditingLearningId] = useState(null);
  const [savedNote, setSavedNote] = useState(false);

  const progressDate = todayISO();

  const loadData = useCallback(async () => {
    const [stats, notes] = await Promise.all([
      getProgressStreakStats(),
      listLearningNotes(progressDate),
    ]);
    setStreakStats(stats);
    setLearningNotes(notes);
  }, [progressDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const cells = getMonthGrid(year, month);
  const monthLabel = monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  async function handleToggleDay(day) {
    if (!day) return;
    const dateStr = toISODate(new Date(year, month, day));
    const db = await getDb();
    const studyRitual = await db.getFirstAsync(
      `SELECT id FROM rituals WHERE LOWER(name) LIKE '%study%' LIMIT 1`
    );
    if (studyRitual) {
      await toggleRitualLog(dateStr, studyRitual.id);
    } else {
      const cRow = await db.getFirstAsync(`SELECT studied FROM daily_checkins WHERE date=?`, [dateStr]);
      const newVal = cRow?.studied ? 0 : 1;
      await db.runAsync(
        `INSERT INTO daily_checkins (date, studied, ate_healthy) VALUES (?, ?, 0)
         ON CONFLICT(date) DO UPDATE SET studied = ?`,
        [dateStr, newVal, newVal]
      );
    }
    loadData();
  }

  async function saveLearningNote() {
    if (!learningNote.trim()) return;
    await saveLearningEntry(editingLearningId, progressDate, learningNote.trim());
    setLearningNote("");
    setEditingLearningId(null);
    await loadData();
    setSavedNote(true);
    setLearningOpen(false);
    setTimeout(() => setSavedNote(false), 1800);
  }

  const { currentStreak, highestStreak, activeSet } = streakStats;
  const isTodayActive = activeSet.has(todayISO());

  return (
    <View style={s.screen}>
      <ScreenHeader title="Progress" onMenuPress={onMenuPress} iconKey="progress" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: BOTTOM_INSET + 40 }}>
        {/* MOTIVATION ART BANNER */}
        <View style={s.bannerCard}>
          <Image source={LOCAL_ASSETS.inosuke} style={s.bannerImage} />
          <View style={s.bannerOverlay}>
            <Text style={s.bannerTitle}>Never Give Up! 🔥</Text>
            <Text style={s.bannerSub}>Push past your limits and build unwavering consistency ⭐</Text>
          </View>
        </View>

        {/* HERO STREAK CELEBRATION */}
        <View style={[s.heroStreakCard, cardShadow, { marginTop: 16 }]}>
          <View style={s.flameGlowWrap}>
            <View style={s.flameGlowEffect} />
            <Text style={s.heroFlameIcon}>🔥</Text>
          </View>
          <Text style={s.heroStreakNumber}>{currentStreak}</Text>
          <Text style={s.heroStreakTitle}>Day Streak! ⚡</Text>
          <Text style={s.heroStreakSubtitle}>
            {isTodayActive
              ? "You kept the streak alive today! Outstanding work 🎉."
              : currentStreak > 0
              ? "Complete today's study session to keep your streak! 🎯"
              : "Start your streak today by logging your study ritual 🚀."}
          </Text>

          {/* DUAL METRICS */}
          <View style={s.dualStreakContainer}>
            <View style={s.streakMetricCard}>
              <View style={s.streakMetricHeader}>
                <Text style={{ fontSize: 18 }}>🔥</Text>
                <Text style={s.streakMetricLabel}>CURRENT</Text>
              </View>
              <View style={s.streakMetricValueRow}>
                <Text style={s.streakMetricValue}>{currentStreak}</Text>
                <Text style={s.streakMetricUnit}>days</Text>
              </View>
              <Text style={s.streakMetricSub}>Active streak ⏱️</Text>
            </View>

            <View style={s.streakMetricDivider} />

            <View style={s.streakMetricCard}>
              <View style={s.streakMetricHeader}>
                <Text style={{ fontSize: 18 }}>🏆</Text>
                <Text style={s.streakMetricLabel}>HIGHEST</Text>
              </View>
              <View style={s.streakMetricValueRow}>
                <Text style={[s.streakMetricValue, { color: colors.streakGold }]}>{highestStreak}</Text>
                <Text style={s.streakMetricUnit}>days</Text>
              </View>
              <Text style={s.streakMetricSub}>All-time record 🌟</Text>
            </View>
          </View>
        </View>

        {/* CALENDAR */}
        <View style={[s.summaryCard, cardShadow, { marginTop: 18 }]}>
          <View style={s.monthNav}>
            <Pressable onPress={() => setMonthDate(new Date(year, month - 1, 1))} hitSlop={12}>
              <Text style={s.arrow}>‹</Text>
            </Pressable>
            <View style={{ alignItems: "center" }}>
              <Text style={s.monthLabel}>{monthLabel}</Text>
              <Text style={s.dateSub}>Streak History 📅</Text>
            </View>
            <Pressable onPress={() => setMonthDate(new Date(year, month + 1, 1))} hitSlop={12}>
              <Text style={s.arrow}>›</Text>
            </Pressable>
          </View>

          <View style={s.weekRow}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <Text key={i} style={s.weekLabel}>
                {d}
              </Text>
            ))}
          </View>

          <View style={s.calendarGrid}>
            {cells.map((day, i) => {
              const dateStr = day ? toISODate(new Date(year, month, day)) : null;
              const hasStreak = dateStr && activeSet.has(dateStr);
              const isToday = dateStr === todayISO();

              return (
                <Pressable
                  key={i}
                  disabled={!day}
                  onPress={() => handleToggleDay(day)}
                  style={s.dayCell}
                >
                  {day ? (
                    <View
                      style={[
                        s.dayCircleRound,
                        hasStreak && s.streakDayCellActive,
                        isToday && s.squareMarker,
                        isToday && !hasStreak && s.todayCalendarBorder,
                      ]}
                    >
                      {hasStreak ? (
                        <>
                          <Text style={s.streakDayFireIcon}>🔥</Text>
                          <Text style={s.streakDayNumText}>{day}</Text>
                        </>
                      ) : (
                        <Text style={[s.dayText, isToday && { color: colors.text, fontWeight: "700" }]}>
                          {day}
                        </Text>
                      )}
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <View style={s.cardDivider} />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ fontSize: 16 }}>🔥</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>Streak day</Text>
            </View>
            <Text style={{ color: colors.textFaint, fontSize: 11 }}>Tap date to toggle study streak ⚡</Text>
          </View>
        </View>

        {/* LEARNING NOTES SECTION UNDER THE CALENDAR */}
        <Text style={[s.listLabel, { marginTop: 22 }]}>Daily Learning Notes 💡</Text>

        {/* SAVED NOTES */}
        {learningNotes.map((note) => (
          <View key={note.id} style={s.learningEntry}>
            <Pressable
              onPress={() => {
                setEditingLearningId(note.id);
                setLearningNote(note.body);
                setLearningOpen(true);
              }}
              style={{ flex: 1 }}
            >
              <Text style={s.learningEntryText}>{note.body}</Text>
              <Text style={s.learningEntryHint}>Tap to edit ✏️</Text>
            </Pressable>
            <Pressable
              onPress={async () => {
                await deleteLearningEntry(note.id);
                if (editingLearningId === note.id) {
                  setEditingLearningId(null);
                  setLearningNote("");
                }
                loadData();
              }}
              hitSlop={10}
            >
              <Text style={s.entryDeleteX}>×</Text>
            </Pressable>
          </View>
        ))}

        {/* INPUT FORM FOR TODAY'S LEARNING */}
        <View style={[s.learningCard, cardShadow, { marginBottom: 14 }]}>
          <Pressable onPress={() => setLearningOpen((o) => !o)} style={s.learningHeader}>
            <View style={{ flex: 1 }}>
              <Text style={s.learningTitle}>
                {editingLearningId ? "Edit Learning Note ✏️" : "Capture Today's Learnings 🧠"}
              </Text>
              {!learningOpen && <Text style={s.learningCollapsedText}>+ Write or edit a key insight 📝</Text>}
            </View>
            <Text style={[s.learningToggle, { color: colors.streakOrange }]}>{learningOpen ? "−" : "+"}</Text>
          </Pressable>
          {learningOpen && (
            <>
              <TextInput
                value={learningNote}
                onChangeText={setLearningNote}
                placeholder="What did you learn or accomplish today?"
                placeholderTextColor={colors.textFaint}
                multiline
                style={s.learningInput}
              />
              <Pressable
                onPress={saveLearningNote}
                style={[s.learningSave, { backgroundColor: colors.streakOrange }]}
              >
                <Text style={s.saveBtnText}>
                  {savedNote ? "Saved ✓ 🎉" : editingLearningId ? "Update Note 🔄" : "Save Learning Note 💾"}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ───────────── HEAD BATH SCREEN ─────────────
function HeadbathScreen({ onMenuPress }) {
  const [monthDate, setMonthDate] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const [markedDays, setMarkedDays] = useState(new Set());

  const loadData = useCallback(async () => {
    const rows = await getAllHeadbathDays();
    const dates = rows.map((r) => r.date);
    setMarkedDays(new Set(dates));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const cells = getMonthGrid(year, month);
  const monthLabel = monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  async function handleDayPress(day) {
    if (!day) return;
    const dateStr = toISODate(new Date(year, month, day));
    await toggleHeadbathDay(dateStr);
    loadData();
  }

  return (
    <View style={s.screen}>
      <ScreenHeader title="Head Bath" onMenuPress={onMenuPress} iconKey="headbath" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: BOTTOM_INSET + 40 }}>
        {/* BANNER ART FOR HEADBATH */}
        <View style={s.bannerCard}>
          <Image source={LOCAL_ASSETS.jiraiya} style={s.bannerImage} />
          <View style={s.bannerOverlay}>
            <Text style={s.bannerTitle}>Stay Fresh & Clean 🧼</Text>
            <Text style={s.bannerSub}>Track your hair washing schedule effortlessly 💦</Text>
          </View>
        </View>

        <View style={[s.summaryCard, cardShadow, { marginTop: 18 }]}>
          <View style={s.monthNav}>
            <Pressable onPress={() => setMonthDate(new Date(year, month - 1, 1))} hitSlop={12}>
              <Text style={s.arrow}>‹</Text>
            </Pressable>
            <View style={{ alignItems: "center" }}>
              <Text style={s.monthLabel}>{monthLabel}</Text>
              <Text style={s.dateSub}>Head Bath Calendar 🚿</Text>
            </View>
            <Pressable onPress={() => setMonthDate(new Date(year, month + 1, 1))} hitSlop={12}>
              <Text style={s.arrow}>›</Text>
            </Pressable>
          </View>

          <View style={s.weekRow}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <Text key={i} style={s.weekLabel}>
                {d}
              </Text>
            ))}
          </View>

          <View style={s.calendarGrid}>
            {cells.map((day, i) => {
              const dateStr = day ? toISODate(new Date(year, month, day)) : null;
              const marked = dateStr && markedDays.has(dateStr);
              const isToday = dateStr === todayISO();

              return (
                <Pressable
                  key={i}
                  disabled={!day}
                  onPress={() => handleDayPress(day)}
                  style={s.dayCell}
                >
                  {day ? (
                    <View
                      style={[
                        s.dayCircleRound,
                        marked && s.headbathCircleMarked,
                        isToday && s.squareMarker,
                        isToday && !marked && s.todayCalendarBorder,
                      ]}
                    >
                      <Text
                        style={[
                          s.dayText,
                          marked && { color: "#FFFFFF", fontWeight: "700" },
                        ]}
                      >
                        {day}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <View style={s.cardDivider} />
          <Text style={s.hint}>
            Tap a date to mark or unmark a head bath day 🚿.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ───────────── HEALTH SCREEN (PERIOD TRACKER) ─────────────
function HealthScreen({ onMenuPress }) {
  const [monthDate, setMonthDate] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  const [markedDays, setMarkedDays] = useState(new Set());
  const [allDates, setAllDates] = useState([]);

  const loadData = useCallback(async () => {
    const rows = await getAllPeriodDays();
    const dates = rows.map((r) => r.date);
    setAllDates(dates);
    setMarkedDays(new Set(dates));
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const cells = getMonthGrid(year, month);
  const monthLabel = monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  async function handleDayPress(day) {
    if (!day) return;
    const dateStr = toISODate(new Date(year, month, day));
    if (markedDays.has(dateStr)) {
      await togglePeriodDay(dateStr);
    } else {
      for (let i = 0; i < 5; i++) {
        const d = addDays(dateStr, i);
        if (!markedDays.has(d)) await togglePeriodDay(d);
      }
    }
    loadData();
  }

  const cycles = computeCycles(allDates);

  return (
    <View style={s.screen}>
      <ScreenHeader title="Period Tracker" onMenuPress={onMenuPress} iconKey="health" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: BOTTOM_INSET + 40 }}>
        {/* BANNER ART FOR PERIOD TRACKER */}
        <View style={s.bannerCard}>
          <Image source={LOCAL_ASSETS.shinobu} style={s.bannerImage} />
          <View style={s.bannerOverlay}>
            <Text style={s.bannerTitle}>Self Care First 💖</Text>
            <Text style={s.bannerSub}>Monitor your cycle with comfort & balance 🌸</Text>
          </View>
        </View>

        <View style={[s.summaryCard, cardShadow, { marginTop: 18 }]}>
          <View style={s.monthNav}>
            <Pressable onPress={() => setMonthDate(new Date(year, month - 1, 1))} hitSlop={12}>
              <Text style={s.arrow}>‹</Text>
            </Pressable>
            <View style={{ alignItems: "center" }}>
              <Text style={s.monthLabel}>{monthLabel}</Text>
              <Text style={s.dateSub}>Cycle Calendar 🗓️</Text>
            </View>
            <Pressable onPress={() => setMonthDate(new Date(year, month + 1, 1))} hitSlop={12}>
              <Text style={s.arrow}>›</Text>
            </Pressable>
          </View>

          <View style={s.weekRow}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <Text key={i} style={s.weekLabel}>
                {d}
              </Text>
            ))}
          </View>

          <View style={s.calendarGrid}>
            {cells.map((day, i) => {
              const dateStr = day ? toISODate(new Date(year, month, day)) : null;
              const marked = dateStr && markedDays.has(dateStr);
              const isToday = dateStr === todayISO();

              return (
                <Pressable
                  key={i}
                  disabled={!day}
                  onPress={() => handleDayPress(day)}
                  style={s.dayCell}
                >
                  {day ? (
                    <View
                      style={[
                        s.dayCircleRound,
                        marked && s.periodCircleMarked,
                        isToday && s.squareMarker,
                        isToday && !marked && s.todayCalendarBorder,
                      ]}
                    >
                      <Text
                        style={[
                          s.dayText,
                          marked && { color: "#FFFFFF", fontWeight: "700" },
                        ]}
                      >
                        {day}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Cycle History Logs */}
        <Text style={[s.listLabel, { marginTop: 26 }]}>Cycle History 📖</Text>
        {cycles.length === 0 ? (
          <View style={s.emptyStateContainer}>
            <Image source={APP_ICONS.empty} style={s.emptyIcon} />
            <Text style={s.emptyText}>No cycle history logged yet. 🌸</Text>
          </View>
        ) : (
          cycles.map((c, i) => (
            <View key={i} style={s.cycleRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={[s.dotSolid, { backgroundColor: colors.periods }]} />
                <Text style={s.cycleRange}>
                  {c.start === c.end ? shortDate(c.start) : `${shortDate(c.start)} – ${shortDate(c.end)}`}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ───────────── ADD / EDIT EXPENSE MODAL ─────────────
function AddExpenseModal({ visible, date, editingEntry, onClose, onSaved }) {
  const [entryType, setEntryType] = useState("expense");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(null);
  const [amount, setAmount] = useState("");
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [breakdown, setBreakdown] = useState([]);
  const [saving, setSaving] = useState(false);
  const isEditing = !!editingEntry;
  const accent = entryType === "income" ? colors.positive : colors.expense;

  useEffect(() => {
    if (!visible) return;
    if (editingEntry) {
      setEntryType(editingEntry.type);
      setTitle(editingEntry.title);
      setCategory(editingEntry.category);
      setAmount(String(editingEntry.amount));
      setBreakdown(editingEntry.breakdown || []);
      setShowBreakdown((editingEntry.breakdown || []).length > 0);
    } else {
      setEntryType("expense");
      setTitle("");
      setCategory(null);
      setAmount("");
      setShowBreakdown(false);
      setBreakdown([]);
    }
  }, [visible, editingEntry]);

  function handleBreakdownChange(items) {
    setBreakdown(items);
    const total = items.reduce((sum, i) => sum + i.amount, 0);
    if (items.length > 0) setAmount(String(total));
  }

  async function handleSave() {
    const amountNum = Number(amount);
    if (!title.trim() || !amountNum) return;
    setSaving(true);
    try {
      const payload = {
        date,
        type: entryType,
        categoryId: category?.id ?? null,
        title: title.trim(),
        amount: amountNum,
        breakdown: breakdown.length > 0 ? breakdown : undefined,
      };
      if (isEditing) {
        await updateExpense(editingEntry.id, payload);
      } else {
        await addExpense(payload);
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.modalBackdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.sheetWrap}>
        <View style={s.sheet}>
          <View style={s.grabber} />

          <View style={s.segment}>
            <Pressable
              onPress={() => setEntryType("income")}
              style={[s.segmentBtn, entryType === "income" && { backgroundColor: colors.positive }]}
            >
              <Text style={[s.segmentText, entryType === "income" && s.segmentTextActive]}>Income 💰</Text>
            </Pressable>
            <Pressable
              onPress={() => setEntryType("expense")}
              style={[s.segmentBtn, entryType === "expense" && { backgroundColor: colors.expense }]}
            >
              <Text style={[s.segmentText, entryType === "expense" && s.segmentTextActive]}>Expense 💳</Text>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={s.label}>Category / Title 🏷️</Text>
            <View style={s.quickEntryRow}>
              <TagDropdown
                kind={entryType}
                value={category}
                onChange={(tag) => {
                  setCategory(tag);
                  setTitle(tag.name);
                }}
                accentColor={accent}
                placeholder="Search or add category"
                containerStyle={s.quickTitleInput}
              />
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="Amount (₹)"
                placeholderTextColor={colors.textFaint}
                keyboardType="numeric"
                editable={breakdown.length === 0}
                style={[s.input, s.quickAmountInput, breakdown.length > 0 && { opacity: 0.6 }]}
              />
            </View>

            {breakdown.length > 0 && <Text style={s.hint}>Auto-filled from breakdown below 🧮</Text>}

            <Pressable onPress={() => setShowBreakdown((v) => !v)} style={{ marginTop: 14, marginBottom: 6 }}>
              <Text style={{ color: accent, fontWeight: "600" }}>
                {showBreakdown ? "− Hide breakdown 📜" : "+ Add a breakdown 📋"}
              </Text>
            </Pressable>

            {showBreakdown && (
              <View style={s.breakdownBox}>
                <BreakdownTable items={breakdown} onChange={handleBreakdownChange} accentColor={accent} />
              </View>
            )}

            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={[s.saveBtn, { backgroundColor: accent, opacity: saving ? 0.6 : 1 }]}
            >
              <Text style={s.saveBtnText}>{isEditing ? "Update Entry 🔄" : "Save Entry 💾"}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ───────────── ENTRY CARD & SWIPEABLE ROW ─────────────
function SwipeableRow({ onSwipeDelete, children }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_, g) => {
        translateX.setValue(Math.max(0, Math.min(g.dx, 110)));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx > 80) {
          Animated.timing(translateX, { toValue: 500, duration: 180, useNativeDriver: true }).start(() => {
            onSwipeDelete();
          });
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  const backdropOpacity = translateX.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <View style={s.swipeWrap}>
      <Animated.View style={[s.swipeBackdrop, { opacity: backdropOpacity }]}>
        <Text style={s.swipeDeleteLabel}>Delete 🗑️</Text>
      </Animated.View>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

function EntryCard({ entry, onDeleted, onEdit, interactive = true, showDate = false }) {
  const [expanded, setExpanded] = useState(false);
  const [breakdown, setBreakdown] = useState(null);
  const isIncome = entry.type === "income";
  const hasBreakdown = entry.breakdown_count > 0;

  async function toggleExpand() {
    if (!hasBreakdown) return;
    if (!expanded && breakdown === null) {
      setBreakdown(await getBreakdownItems(entry.id));
    }
    setExpanded((e) => !e);
  }

  async function handleLongPress() {
    if (!interactive || !onEdit) return;
    const items = hasBreakdown ? await getBreakdownItems(entry.id) : [];
    onEdit({
      id: entry.id,
      type: entry.type,
      title: entry.title,
      category: entry.category_id
        ? { id: entry.category_id, name: entry.category_name, kind: entry.type, usage_count: 0 }
        : null,
      amount: entry.amount,
      breakdown: items,
    });
  }

  function handleDelete() {
    Alert.alert("Delete this entry?", `${entry.title} — ₹${entry.amount.toFixed(0)}`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteExpense(entry.id);
          onDeleted();
        },
      },
    ]);
  }

  const cardContent = (
    <View style={s.entryCard}>
      <Pressable onPress={toggleExpand} onLongPress={handleLongPress} style={s.entryRow}>
        <Image 
          source={entry.title.toLowerCase().includes("food") ? LOCAL_ASSETS.food : LOCAL_ASSETS.nezuko} 
          style={s.entryCardThumb} 
        />
        <View style={s.entryLeft}>
          <View style={[s.dotSolid, { backgroundColor: isIncome ? colors.positive : colors.expense }]} />
          <View style={{ flexShrink: 1 }}>
            <Text style={s.entryTitle}>{entry.title}</Text>
            <Text style={s.entryCategory} numberOfLines={1}>
              {[entry.category_name, showDate ? relativeDayLabel(entry.date) : null].filter(Boolean).join(" · ")}
            </Text>
          </View>
        </View>
        <View style={s.entryRight}>
          <Text style={[s.entryAmount, { color: isIncome ? colors.positive : colors.text }]}>
            {isIncome ? "+" : "−"}₹{entry.amount.toFixed(0)}
          </Text>
          {interactive && (
            <Pressable onPress={handleDelete} hitSlop={8}>
              <Text style={s.entryDeleteX}>×</Text>
            </Pressable>
          )}
        </View>
      </Pressable>
      {expanded && breakdown && (
        <View style={s.entryBreakdownWrap}>
          {breakdown.map((item, i) => (
            <View key={i} style={s.entryBreakdownRow}>
              <Text style={s.entryBreakdownLabel}>{item.label}</Text>
              <Text style={s.entryBreakdownAmount}>₹{item.amount.toFixed(0)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  if (!interactive) return cardContent;
  return (
    <SwipeableRow onSwipeDelete={async () => { await deleteExpense(entry.id); onDeleted(); }}>
      {cardContent}
    </SwipeableRow>
  );
}

// ───────────── EXPENSES SCREEN ─────────────
function ExpensesScreen({ focusKey, onMenuPress }) {
  const [date, setDate] = useState(todayISO());
  const [entries, setEntries] = useState([]);
  const [carriedForward, setCarriedForward] = useState(0);
  const [totals, setTotals] = useState({ income: 0, expense: 0 });
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  const load = useCallback(async () => {
    const [rows, cf, dayTotals] = await Promise.all([
      getEntriesForDate(date),
      getCarriedForwardBalance(date),
      getDayTotals(date),
    ]);
    setEntries(rows);
    setCarriedForward(cf);
    setTotals(dayTotals);
  }, [date]);

  useEffect(() => {
    load();
  }, [load, focusKey]);

  function handleAddNew() {
    setEditingEntry(null);
    setModalVisible(true);
  }
  function handleEditRequest(editPayload) {
    setEditingEntry(editPayload);
    setModalVisible(true);
  }

  const { day, monthYear, weekday } = formatDisplayDate(date);
  const runningBalance = carriedForward + totals.income - totals.expense;

  return (
    <View style={s.screen}>
      <ScreenHeader title="Expenses" onMenuPress={onMenuPress} iconKey="expenses" />
      <FlatList
        data={entries}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <EntryCard entry={item} onDeleted={load} onEdit={handleEditRequest} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: BOTTOM_INSET + 90 }}
        ListHeaderComponent={
          <View>
            {/* HERO BANNER FOR EXPENSES */}
            <View style={s.bannerCard}>
              <Image source={LOCAL_ASSETS.luffy} style={s.bannerImage} />
              <View style={s.bannerOverlay}>
                <Text style={s.bannerTitle}>Smart Spending 💵</Text>
                <Text style={s.bannerSub}>Keep your treasure safe and budget like a king 🏴‍☠️</Text>
              </View>
            </View>

            <View style={[s.summaryCard, cardShadow, { marginTop: 16 }]}>
              <View style={s.dateRow}>
                <Pressable onPress={() => setDate((d) => addDays(d, -1))} hitSlop={12}>
                  <Text style={s.arrow}>‹</Text>
                </Pressable>
                <View style={{ alignItems: "center" }}>
                  <Text style={s.dateDay}>{day}</Text>
                  <Text style={s.dateSub}>
                    {monthYear} · {weekday} 🗓️
                  </Text>
                </View>
                <Pressable onPress={() => setDate((d) => addDays(d, 1))} hitSlop={12}>
                  <Text style={s.arrow}>›</Text>
                </Pressable>
              </View>

              <View style={s.cardDivider} />

              <View style={s.balanceRow}>
                <View>
                  <Text style={s.balanceLabel}>Carried forward 📥</Text>
                  <Text style={s.balanceValueSm}>₹{carriedForward.toFixed(0)}</Text>
                </View>
                <View>
                  <Text style={s.balanceLabel}>Spent today 💸</Text>
                  <Text style={s.balanceValueSm}>₹{totals.expense.toFixed(0)}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={s.balanceLabel}>Balance today 👛</Text>
                  <Text style={s.balanceValueLg}>₹{runningBalance.toFixed(0)}</Text>
                </View>
              </View>
            </View>

            <Text style={s.listLabel}>Today's entries · swipe right or long-press 👆</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={s.emptyStateContainer}>
            <Image source={APP_ICONS.empty} style={s.emptyIcon} />
            <Text style={s.emptyText}>No expenses logged for this date yet. 💳</Text>
          </View>
        }
      />

      <Pressable style={[s.fab, cardShadow]} onPress={handleAddNew}>
        <Text style={s.fabText}>+</Text>
      </Pressable>

      <AddExpenseModal
        visible={modalVisible}
        date={date}
        editingEntry={editingEntry}
        onClose={() => setModalVisible(false)}
        onSaved={load}
      />
    </View>
  );
}

// ───────────── EXPENSE REPORTS ─────────────
function DonutChart({ rows, colorsForRows }) {
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let completed = 0;
  return (
    <View style={s.donutWrap}>
      <Svg width={142} height={142} viewBox="0 0 142 142">
        <Circle cx="71" cy="71" r={radius} stroke={colors.bg} strokeWidth="22" fill="none" />
        {rows.map((row, index) => {
          const length = total ? (row.total / total) * circumference : 0;
          const segment = (
            <Circle
              key={row.category}
              cx="71"
              cy="71"
              r={radius}
              stroke={colorsForRows[index % colorsForRows.length]}
              strokeWidth="22"
              fill="none"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-completed}
              strokeLinecap="butt"
              rotation="-90"
              origin="71,71"
            />
          );
          completed += length;
          return segment;
        })}
      </Svg>
      <View style={s.donutCenter}>
        <Text style={s.donutTotal}>₹{total.toFixed(0)}</Text>
        <Text style={s.donutCaption}>spent 📊</Text>
      </View>
    </View>
  );
}

function ExpenseReportsScreen({ onMenuPress }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0 });
  const [loading, setLoading] = useState(true);
  const chartColors = [colors.expense, colors.habitGreen, colors.notes, colors.reminders, colors.periods, colors.streakOrange];

  const load = useCallback(async () => {
    setLoading(true);
    const [monthSummary, reportRows] = await Promise.all([
      getMonthlySummary(month.getFullYear(), month.getMonth()),
      getMonthlyExpenseReport(month.getFullYear(), month.getMonth()),
    ]);
    setSummary(monthSummary);
    setRows(reportRows);
    setLoading(false);
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const max = Math.max(...rows.map((row) => row.total), 1);
  const monthName = month.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const nextMonth = () => setMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const prevMonth = () => setMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const netSavings = summary.income - summary.expense;

  return (
    <View style={s.screen}>
      <ScreenHeader title="Reports" onMenuPress={onMenuPress} iconKey="reports" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: BOTTOM_INSET + 30 }}>
        {/* HERO BANNER FOR REPORTS */}
        <View style={s.bannerCard}>
          <Image source={LOCAL_ASSETS.minato} style={s.bannerImage} />
          <View style={s.bannerOverlay}>
            <Text style={s.bannerTitle}>Financial Mastery 📈</Text>
            <Text style={s.bannerSub}>Analyze your cashflow with flash precision ⚡</Text>
          </View>
        </View>

        <View style={[s.summaryCard, cardShadow, { marginTop: 16 }]}>
          <View style={s.dateRow}>
            <Pressable onPress={prevMonth} hitSlop={12}>
              <Text style={s.arrow}>‹</Text>
            </Pressable>
            <View style={{ alignItems: "center" }}>
              <Text style={s.monthLabel}>{monthName}</Text>
              <Text style={s.dateSub}>Monthly Balance & Overview 📑</Text>
            </View>
            <Pressable onPress={nextMonth} hitSlop={12}>
              <Text style={s.arrow}>›</Text>
            </Pressable>
          </View>

          <View style={s.cardDivider} />

          <View style={s.reportMetricsRow}>
            <View style={s.reportMetricCol}>
              <Text style={s.balanceLabel}>Total Income 💵</Text>
              <Text style={[s.reportMetricValue, { color: colors.positive }]}>
                +₹{summary.income.toFixed(0)}
              </Text>
            </View>
            <View style={s.reportMetricCol}>
              <Text style={s.balanceLabel}>Total Expense 🛍️</Text>
              <Text style={[s.reportMetricValue, { color: colors.expense }]}>
                −₹{summary.expense.toFixed(0)}
              </Text>
            </View>
            <View style={[s.reportMetricCol, { alignItems: "flex-end" }]}>
              <Text style={s.balanceLabel}>Net Savings 🏦</Text>
              <Text
                style={[
                  s.reportMetricValue,
                  { color: netSavings >= 0 ? colors.positive : colors.negative },
                ]}
              >
                ₹{netSavings.toFixed(0)}
              </Text>
            </View>
          </View>
        </View>

        {loading ? (
          <Text style={s.emptyText}>Loading report… ⏳</Text>
        ) : rows.length === 0 ? (
          <View style={s.emptyStateContainer}>
            <Image source={APP_ICONS.empty} style={s.emptyIcon} />
            <Text style={s.emptyText}>No expenses recorded for this month yet 📈.</Text>
          </View>
        ) : (
          <>
            <Text style={s.listLabel}>By Category 🏷️</Text>
            <View style={[s.reportCard, cardShadow]}>
              {rows.map((row, index) => {
                const pct = summary.expense ? Math.round((row.total / summary.expense) * 100) : 0;
                return (
                  <View key={row.category} style={s.reportRow}>
                    <View style={s.reportRowLabel}>
                      <View style={[s.dotSolid, { backgroundColor: chartColors[index % chartColors.length] }]} />
                      <Text style={s.entryTitle}>{row.category}</Text>
                    </View>
                    <Text style={s.entryAmount}>
                      ₹{row.total.toFixed(0)} · {pct}%
                    </Text>
                  </View>
                );
              })}
            </View>

            <Text style={s.listLabel}>Spending Bars 📊</Text>
            <View style={[s.reportCard, cardShadow]}>
              {rows.map((row, index) => (
                <View key={row.category} style={s.barChartRow}>
                  <Text style={s.barChartLabel} numberOfLines={1}>
                    {row.category}
                  </Text>
                  <View style={s.barTrack}>
                    <View
                      style={[
                        s.barFill,
                        {
                          width: `${(row.total / max) * 100}%`,
                          backgroundColor: chartColors[index % chartColors.length],
                        },
                      ]}
                    />
                  </View>
                  <Text style={s.barAmount}>₹{row.total.toFixed(0)}</Text>
                </View>
              ))}
            </View>

            <Text style={s.listLabel}>Share of Spending 🍩</Text>
            <View style={[s.reportCard, cardShadow]}>
              <DonutChart rows={rows} colorsForRows={chartColors} />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ───────────── BUY SECTION ─────────────
function BuySection() {
  const [minimized, setMinimized] = useState(true);
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState("");

  const loadItems = useCallback(async () => {
    const data = await listBuyItems();
    setItems(data);
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  async function handleAdd() {
    if (!newItem.trim()) return;
    await addBuyItem(newItem);
    setNewItem("");
    loadItems();
  }

  async function handleToggle(id) {
    await toggleBuyItem(id);
    loadItems();
  }

  async function handleDelete(id) {
    await deleteBuyItem(id);
    loadItems();
  }

  return (
    <View style={[s.buyCard, cardShadow]}>
      <View style={s.buyHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Image source={APP_ICONS.buy} style={{ width: 18, height: 18 }} />
          <Text style={s.buyTitle}>Buy List 🛒</Text>
        </View>
        <Pressable
          onPress={() => setMinimized((prev) => !prev)}
          hitSlop={10}
          style={s.buyToggleBtn}
        >
          <Text style={s.buyToggleIcon}>{minimized ? "+" : "−"}</Text>
        </Pressable>
      </View>

      {!minimized && (
        <View style={{ marginTop: 10 }}>
          <View style={s.buyInputRow}>
            <TextInput
              value={newItem}
              onChangeText={setNewItem}
              placeholder="Add item to buy..."
              placeholderTextColor={colors.textFaint}
              style={s.buyInput}
              onSubmitEditing={handleAdd}
            />
            <Pressable onPress={handleAdd} style={s.buyAddBtn}>
              <Text style={s.buyAddBtnText}>+</Text>
            </Pressable>
          </View>

          {items.map((item) => (
            <View key={item.id} style={s.buyItemRow}>
              <Text
                style={[
                  s.buyItemText,
                  item.completed && s.buyItemTextCompleted,
                ]}
              >
                {item.title}
              </Text>
              <Pressable
                onPress={() => handleToggle(item.id)}
                onLongPress={() => handleDelete(item.id)}
                style={[
                  s.buyCheckbox,
                  item.completed && s.buyCheckboxCompleted,
                ]}
              >
                {item.completed && <Text style={s.buyCheckmark}>✓</Text>}
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ───────────── NOTES SCREEN ─────────────
function NoteEditor({ visible, note, onClose, onSaved }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  useEffect(() => {
    if (visible) {
      setTitle(note?.title || "");
      setBody(note?.body || "");
    }
  }, [visible, note]);
  async function save() {
    if (!title.trim() && !body.trim()) return;
    await saveNote({ id: note?.id, title: title.trim() || "Untitled note", body: body.trim() });
    onSaved();
    onClose();
  }
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.modalBackdrop} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.sheetWrap}>
        <View style={s.noteSheet}>
          <View style={s.grabber} />
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Title ✏️"
            placeholderTextColor={colors.textFaint}
            style={s.noteTitleInput}
          />
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Start writing… 💭"
            placeholderTextColor={colors.textFaint}
            multiline
            textAlignVertical="top"
            style={s.noteBodyInput}
          />
          <Pressable onPress={save} style={[s.saveBtn, { backgroundColor: colors.notes }]}>
            <Text style={s.saveBtnText}>Save note 💾</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function NotesScreen({ onMenuPress }) {
  const [notes, setNotes] = useState([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const load = useCallback(async () => setNotes(await listNotes()), []);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={s.screen}>
      <ScreenHeader title="Notes" onMenuPress={onMenuPress} iconKey="notes" />
      <FlatList
        data={notes}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: BOTTOM_INSET + 90 }}
        ListHeaderComponent={
          <View style={{ paddingTop: 10 }}>
            {/* HERO BANNER FOR NOTES */}
            <View style={s.bannerCard}>
              <Image source={LOCAL_ASSETS.naruto} style={s.bannerImage} />
              <View style={s.bannerOverlay}>
                <Text style={s.bannerTitle}>Ninja Scrolls 📜</Text>
                <Text style={s.bannerSub}>Capture your grand thoughts & secret plans ✨</Text>
              </View>
            </View>

            {/* Minimizable Buy Section at Top of Notes */}
            <BuySection />

            <Text style={[s.listLabel, { marginTop: 18 }]}>Your Notes 📝</Text>
          </View>
        }
        renderItem={({ item }) => {
          const preview = (item.body || "").split("\n")[0].trim();
          return (
            <Pressable
              onPress={() => {
                setSelected(item);
                setEditorOpen(true);
              }}
              onLongPress={() => {
                Alert.alert("Delete note?", item.title, [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                      await deleteNote(item.id);
                      load();
                    },
                  },
                ]);
              }}
              style={s.noteCard}
            >
              <Image source={LOCAL_ASSETS.jiraiya} style={s.noteCardBanner} />
              <Text style={s.noteCardTitle} numberOfLines={1}>
                {item.title || "Untitled note"}
              </Text>
              <Text style={s.notePreview} numberOfLines={1}>
                {preview || "No additional text"}
              </Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={s.emptyStateContainer}>
            <Image source={APP_ICONS.empty} style={s.emptyIcon} />
            <Text style={s.emptyText}>No notes created yet. 📝</Text>
          </View>
        }
      />
      <Pressable
        style={[s.fab, cardShadow, { backgroundColor: colors.notes }]}
        onPress={() => {
          setSelected(null);
          setEditorOpen(true);
        }}
      >
        <Text style={s.fabText}>+</Text>
      </Pressable>
      <NoteEditor visible={editorOpen} note={selected} onClose={() => setEditorOpen(false)} onSaved={load} />
    </View>
  );
}

// ───────────── ROOT APP TABS ─────────────
const TABS = [
  { key: "home", label: "Home", accent: colors.habitGreen },
  { key: "expenses", label: "Expenses", accent: colors.expense },
  { key: "reports", label: "Reports", accent: colors.expense },
  { key: "progress", label: "Progress", accent: colors.streakOrange },
  { key: "notes", label: "Notes", accent: colors.notes },
  { key: "health", label: "Period Tracker", accent: colors.periods },
  { key: "headbath", label: "Head Bath", accent: colors.headbath },
];

export default function App() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("home");
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    initDatabase().then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View style={[s.screen, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: colors.textMuted }}>Loading Winnie… 🐾</Text>
      </View>
    );
  }

  const openMenu = () => setDrawerOpen(true);

  return (
    <View style={s.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      {tab === "home" && <HomeScreen onMenuPress={openMenu} />}
      {tab === "expenses" && <ExpensesScreen focusKey={tab} onMenuPress={openMenu} />}
      {tab === "reports" && <ExpenseReportsScreen onMenuPress={openMenu} />}
      {tab === "progress" && <ProgressScreen onMenuPress={openMenu} />}
      {tab === "notes" && <NotesScreen onMenuPress={openMenu} />}
      {tab === "health" && <HealthScreen onMenuPress={openMenu} />}
      {tab === "headbath" && <HeadbathScreen onMenuPress={openMenu} />}

      <Drawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeTab={tab}
        onSelectTab={setTab}
        tabs={TABS}
      />
    </View>
  );
}

// ───────────── STYLESHEET ─────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: TOP_INSET + 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  drawerIcon: {
    width: 20,
    height: 20,
  },
  drawerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.streakOrange,
  },
  bannerCard: {
    width: "100%",
    backgroundColor: '#000000',
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    marginVertical: 12,
    backgroundColor: colors.surfaceRaised,
    padding: 12,
    ...cardShadow,
  },
  bannerImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    resizeMode: "contain",
  },
  bannerTextContainer: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "center",
  },
  bannerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  bannerSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    marginBottom: 8,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
  },
  menuBtnInline: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginRight: 14,
    ...cardShadow,
  },
  headerTitleText: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  todayDate: { color: colors.textMuted, fontSize: 14, fontWeight: "500" },
  homeGreetingRow: { marginBottom: 10 },
  menuLine: { width: 18, height: 2, borderRadius: 1, backgroundColor: colors.textMuted },
  backdrop: { backgroundColor: "rgba(0,0,0,0.65)" },
  drawer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: 280,
    backgroundColor: colors.surfaceRaised,
    paddingTop: TOP_INSET + 20,
    paddingHorizontal: 20,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    ...cardShadow,
  },
  drawerBrand: { color: colors.text, fontSize: 20, fontWeight: "800" },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  drawerItemText: { color: colors.textMuted, fontSize: 15 },
  dot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5 },
  dotSolid: { width: 8, height: 8, borderRadius: 4 },
  
  // Weekly Streak
  weekStreakCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  weekStreakHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  weekStreakTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  weekStreakSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  weekStreakBadge: {
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  weekStreakBadgeText: { color: colors.habitGreen, fontSize: 12, fontWeight: "700" },
  weekStreakRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  weekStreakDayCol: { alignItems: "center", gap: 6, flex: 1 },
  weekStreakTodayCol: { backgroundColor: "rgba(255, 107, 53, 0.08)", borderRadius: 12, paddingVertical: 4 },
  weekStreakDayLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "500" },
  weekStreakDotSlot: { height: 12, justifyContent: "center", alignItems: "center" },
  weekRingFilled: { alignItems: "center", justifyContent: "center", borderWidth: 1.5 },
  weekRingCheck: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  weekRingDayNum: { fontSize: 12 },
  todayActiveDot: {
    position: "absolute",
    bottom: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.streakOrange,
  },

  // Daily Rituals
  habitsSectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  sectionHeaderTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  sectionHeaderSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  addRitualTopBtn: {
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  addRitualTopBtnText: { color: colors.text, fontSize: 12, fontWeight: "600" },
  habitsRow: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 14 },
  habitCircleWrap: { alignItems: "center", gap: 6, width: 62 },
  habitCircleBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  habitCircleBtnInactive: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
  },
  habitCircleBtnActive: {
    backgroundColor: colors.habitGreenGlow,
    borderColor: colors.habitGreen,
  },
  addCircleBtn: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  habitEmoji: { fontSize: 24 },
  habitCheckmarkBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.habitGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  habitCheckmarkText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
  habitLabel: { color: colors.textMuted, fontSize: 11, textAlign: "center" },

  // List & Section Headers
  listLabel: { color: colors.textMuted, fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 },
  
  // Expenses Entry Cards
  swipeWrap: { marginBottom: 10 },
  swipeBackdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.negative,
    borderRadius: 14,
    justifyContent: "center",
    paddingLeft: 20,
  },
  swipeDeleteLabel: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  entryCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    justifyContent: "space-between",
  },
  entryCardThumb: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  entryLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  entryTitle: { color: colors.text, fontSize: 15, fontWeight: "600" },
  entryCategory: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  entryRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  entryAmount: { fontSize: 15, fontWeight: "700" },
  entryDeleteX: { color: colors.textFaint, fontSize: 20, fontWeight: "300", paddingHorizontal: 4 },
  entryBreakdownWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  entryBreakdownRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  entryBreakdownLabel: { color: colors.textMuted, fontSize: 12 },
  entryBreakdownAmount: { color: colors.text, fontSize: 12, fontWeight: "600" },

  // Summary & Cards
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  dateRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dateDay: { color: colors.text, fontSize: 24, fontWeight: "800" },
  dateSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  arrow: { color: colors.textMuted, fontSize: 28, fontWeight: "300", paddingHorizontal: 12 },
  cardDivider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
  balanceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  balanceLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "500" },
  balanceValueSm: { color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 2 },
  balanceValueLg: { color: colors.habitGreen, fontSize: 20, fontWeight: "800", marginTop: 2 },

  // Hero Streak (Progress)
  heroStreakCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  flameGlowWrap: { width: 54, height: 54, alignItems: "center", justifyContent: "center" },
  flameGlowEffect: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.streakOrangeGlow,
  },
  heroFlameIcon: { fontSize: 32 },
  heroStreakNumber: { color: colors.text, fontSize: 44, fontWeight: "900", marginTop: 4 },
  heroStreakTitle: { color: colors.streakOrange, fontSize: 16, fontWeight: "800" },
  heroStreakSubtitle: { color: colors.textMuted, fontSize: 12, textAlign: "center", marginTop: 6, lineHeight: 18 },
  dualStreakContainer: {
    flexDirection: "row",
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    width: "100%",
  },
  streakMetricCard: { flex: 1, alignItems: "center" },
  streakMetricHeader: { flexDirection: "row", alignItems: "center", gap: 4 },
  streakMetricLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  streakMetricValueRow: { flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 4 },
  streakMetricValue: { color: colors.text, fontSize: 22, fontWeight: "800" },
  streakMetricUnit: { color: colors.textMuted, fontSize: 12 },
  streakMetricSub: { color: colors.textFaint, fontSize: 11, marginTop: 2 },
  streakMetricDivider: { width: 1, backgroundColor: colors.border, marginHorizontal: 8 },

  // Calendar
  monthNav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  monthLabel: { color: colors.text, fontSize: 16, fontWeight: "700" },
  weekRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 8 },
  weekLabel: { color: colors.textFaint, fontSize: 12, fontWeight: "600", width: 32, textAlign: "center" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: { width: `${100 / 7}%`, height: 42, alignItems: "center", justifyContent: "center" },
  dayCircleRound: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  dayText: { color: colors.textMuted, fontSize: 13 },
  todayCalendarBorder: { borderWidth: 1.5, borderColor: colors.streakOrange },
  squareMarker: { borderRadius: 8 },
  streakDayCellActive: { backgroundColor: colors.streakOrange },
  streakDayFireIcon: { fontSize: 10, position: "absolute", top: 2 },
  streakDayNumText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800", marginTop: 8 },
  headbathCircleMarked: { backgroundColor: colors.headbath },
  periodCircleMarked: { backgroundColor: colors.periods },
  hint: { color: colors.textMuted, fontSize: 12, textAlign: "center" },

  // Daily Learning Notes
  learningEntry: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  learningEntryText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  learningEntryHint: { color: colors.textFaint, fontSize: 11, marginTop: 4 },
  learningCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  learningHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  learningTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  learningCollapsedText: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  learningToggle: { fontSize: 22, fontWeight: "300" },
  learningInput: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 10,
    padding: 12,
    color: colors.text,
    fontSize: 14,
    minHeight: 80,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  learningSave: { borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 12 },

  // Period Tracker Cycle Rows
  cycleRow: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  cycleRange: { color: colors.text, fontSize: 14, fontWeight: "600" },

  // Reports
  reportMetricsRow: { flexDirection: "row", justifyContent: "space-between" },
  reportMetricCol: { flex: 1 },
  reportMetricValue: { fontSize: 16, fontWeight: "800", marginTop: 4 },
  reportCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  reportRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  reportRowLabel: { flexDirection: "row", alignItems: "center", gap: 10 },
  barChartRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 6 },
  barChartLabel: { color: colors.text, fontSize: 12, width: 80 },
  barTrack: { flex: 1, height: 8, backgroundColor: colors.surfaceRaised, borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },
  barAmount: { color: colors.textMuted, fontSize: 12, fontWeight: "600", width: 50, textAlign: "right" },
  donutWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 10 },
  donutCenter: { position: "absolute", alignItems: "center" },
  donutTotal: { color: colors.text, fontSize: 18, fontWeight: "800" },
  donutCaption: { color: colors.textMuted, fontSize: 11 },

  // Buy Section
  buyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
  },
  buyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  buyTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  buyToggleBtn: { paddingHorizontal: 8, paddingVertical: 2 },
  buyToggleIcon: { color: colors.textMuted, fontSize: 20, fontWeight: "300" },
  buyInputRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  buyInput: {
    flex: 1,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buyAddBtn: {
    backgroundColor: colors.notes,
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  buyAddBtnText: { color: "#FFFFFF", fontSize: 20, fontWeight: "600" },
  buyItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  buyItemText: { color: colors.text, fontSize: 14 },
  buyItemTextCompleted: { textDecorationLine: "line-through", color: colors.textFaint },
  buyCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  buyCheckboxCompleted: { backgroundColor: colors.habitGreen, borderColor: colors.habitGreen },
  buyCheckmark: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },

  // Notes Cards
  noteCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    ...cardShadow,
  },
  noteCardBanner: { width: "100%", height: 60, borderRadius: 10, marginBottom: 10, resizeMode: "cover" },
  noteCardTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
  notePreview: { color: colors.textMuted, fontSize: 13, marginTop: 4 },

  // Modals & Bottom Sheets
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)" },
  sheetWrap: { justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    height: "80%",
    borderWidth: 1,
    borderColor: colors.border,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeaderTitle: { color: colors.text, fontSize: 18, fontWeight: "800", marginBottom: 16 },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: "600", textTransform: "uppercase", marginTop: 12, marginBottom: 6 },
  inputWrap: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { color: colors.text, fontSize: 14, paddingHorizontal: 14, paddingVertical: 10 },
  dropdown: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
    overflow: "hidden",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowDot: { width: 6, height: 6, borderRadius: 3 },
  rowText: { color: colors.text, fontSize: 14 },
  addNew: { fontWeight: "600", fontSize: 14 },
  quickEntryRow: { flexDirection: "row", gap: 10 },
  quickTitleInput: { flex: 1.4 },
  quickAmountInput: { flex: 0.8 },
  breakdownBox: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 12,
    padding: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bdHeaderRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  bdHeaderLabel: { color: colors.textFaint, fontSize: 11, fontWeight: "600" },
  bdRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  bdItemText: { color: colors.text, fontSize: 13, flex: 1 },
  bdAmountRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  bdAmountText: { color: colors.text, fontSize: 13, fontWeight: "600" },
  bdRemove: { color: colors.textFaint, fontSize: 18, fontWeight: "300" },
  bdAddRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  bdAddInput: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: colors.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bdAddBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  bdAddBtnText: { color: "#FFFFFF", fontSize: 18, fontWeight: "600" },
  bdTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bdTotalLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  bdTotalValue: { fontSize: 14, fontWeight: "800" },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 18 },
  saveBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.surfaceRaised,
    borderRadius: 12,
    padding: 4,
    marginBottom: 10,
  },
  segmentBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8 },
  segmentText: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  segmentTextActive: { color: "#FFFFFF", fontWeight: "700" },
  emojiPreviewBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },

  // Note Editor Specific
  noteTitleInput: { color: colors.text, fontSize: 20, fontWeight: "800", marginBottom: 12 },
  noteBodyInput: { color: colors.text, fontSize: 15, flex: 1, lineHeight: 22 },

  // Floating Action Button
  fab: {
    position: "absolute",
    bottom: BOTTOM_INSET + 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.expense,
    alignItems: "center",
    justifyContent: "center",
  },
  fabText: { color: "#FFFFFF", fontSize: 28, fontWeight: "300", marginTop: -2 },
});