// ─────────────────────────────────────────────────────────────
// Winnie — Daily Rhythm & Life Tracker
//
// Highlights:
//   - HOME: Custom character banner + scattered anime artwork & emojis.
//   - PROGRESS: Flaming motivation cards, high-def character banners, scattered emojis.
//   - HEALTH: Character-themed period tracker header + scattered mood emojis.
//   - EXPENSES: Wallet & piggy bank visuals, anime-styled finance cards + scattered emojis.
//   - REPORTS: Wealth overview visuals + ritual consistency monthly calendars.
//   - MENU: Home -> Expenses -> Reports -> Progress -> Notes -> Period Tracker.
//   - NOTES: Collapsible "Buy" checklist section with anime note cards + scattered emojis.
//   - 📚 IMAGE LIBRARY: Customize any section's artwork from your gallery.
//   - 🔍 UNIVERSAL ZOOM: Pinch to zoom anywhere, double-tap to reset.
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
  Keyboard,
  Platform,
  Animated,
  PanResponder,
  StatusBar,
  Alert,
  Image,
  AppState,
  Switch,
} from "react-native";
import * as SQLite from "expo-sqlite";
import Svg, { Circle } from "react-native-svg";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants, { AppOwnership } from "expo-constants";

// Modular imports
import ZoomContainer from "./src/components/ZoomContainer";
import EditableImage from "./src/components/EditableImage";
import { setThemeColors as setSharedThemeColors } from "./src/constants/theme";

try {
  WebBrowser.maybeCompleteAuthSession();
} catch (authSessionError) {
  console.log("[GoogleAuth] Could not complete the popup session:", authSessionError?.message || authSessionError);
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.removeItem("ExpoWebBrowserRedirectHandle");
  }
}

function readWebOAuthHash() {
  if (Platform.OS !== "web" || typeof window === "undefined") return { token: null, error: null };
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
  if (!hash) return { token: null, error: null };
  const params = new URLSearchParams(hash);
  const token = params.get("access_token");
  const error = params.get("error_description") || params.get("error");
  if (token || error) {
    const cleanPath = `${window.location.pathname}${window.location.search}` || "/";
    window.history.replaceState(null, "", cleanPath);
  }
  return { token, error };
}

const webOAuthHash = readWebOAuthHash();
let authDecisionLocked = false;
let googleSignInToken = null;

// ───────────── LOCAL ASSETS MAP ─────────────
const LOCAL_ASSETS = {
  a: require("./assets/a.png"),
  b: require("./assets/b.png"),
  c: require("./assets/c.png"),
  d: require("./assets/d.png"),
  e: require("./assets/e.png"),
  f: require("./assets/f.png"),
  hi: require("./assets/hi.png"),
  dolphin: require("./assets/dolphin.png"),
  inosuke: require("./assets/inosuke.png"),
  jiraiya: require("./assets/jiraiya.png"),
  luffy: require("./assets/luffy.png"),
  minato: require("./assets/minato.png"),
  naruto: require("./assets/naruto.png"),
  shinobu: require("./assets/shinobu.png"),
  note1: require("./assets/note1.jpg"),
  note2: require("./assets/note2.jpg"),
  note3: require("./assets/note3.jpg"),
  note4: require("./assets/note4.jpg"),
  note5: require("./assets/note5.jpg"),
  winnie: require("./assets/winnie.jpeg"),
  logo: require("./assets/winnie.jpeg"),
  uzui: require("./assets/uzui.png"),
};

const NOTE_IMAGES = [
  LOCAL_ASSETS.note1,
  LOCAL_ASSETS.note2,
  LOCAL_ASSETS.note3,
  LOCAL_ASSETS.note4,
  LOCAL_ASSETS.note5,
];

const EXPENSE_IMAGES = [
  LOCAL_ASSETS.d,
  LOCAL_ASSETS.a,
  LOCAL_ASSETS.b,
  LOCAL_ASSETS.c,
  LOCAL_ASSETS.dolphin,
  LOCAL_ASSETS.f,
];

// ───────────── ASSET / ICON MAP ─────────────
const APP_ICONS = {
  home: { uri: "https://img.icons8.com/color/48/home--v1.png" },
  tasks: { uri: "https://img.icons8.com/color/48/task--v1.png" },
  expenses: { uri: "https://img.icons8.com/color/48/wallet--v1.png" },
  reports: { uri: "https://img.icons8.com/color/48/analytics.png" },
  progress: { uri: "https://img.icons8.com/color/48/fire-element.png" },
  notes: { uri: "https://img.icons8.com/color/48/notepad.png" },
  health: { uri: "https://img.icons8.com/color/48/like--v1.png" },
  empty: { uri: "https://img.icons8.com/color/48/box--v1.png" },
  buy: { uri: "https://img.icons8.com/color/48/shopping-cart--v1.png" },
  calendar: { uri: "https://img.icons8.com/color/48/google-calendar--v2.png" },
  settle: { uri: "https://img.icons8.com/color/48/money-transfer.png" },
};

// ───────────── THEME & PALETTE ─────────────
const darkColors = {
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
  periods: "#F472B6",
  periodsDark: "#831843",
  notes: "#818CF8",
  reminders: "#C084FC",
};

const lightColors = {
  bg: "#F8F6F2",
  surface: "#FFFFFF",
  surfaceRaised: "#F1EBE3",
  surfaceHighlight: "#E6DFD4",
  border: "#DDD6CB",
  borderLight: "#CDC4B5",
  text: "#1C1714",
  textMuted: "#6B6055",
  textFaint: "#9C9287",
  habitGreen: "#16A34A",
  habitGreenGlow: "rgba(22, 163, 74, 0.25)",
  streakOrange: "#EA580C",
  streakOrangeGlow: "rgba(234, 88, 12, 0.25)",
  streakGold: "#D97706",
  positive: "#16A34A",
  negative: "#DC2626",
  expense: "#D97706",
  progress: "#EA580C",
  periods: "#DB2777",
  periodsDark: "#9D174D",
  notes: "#6366F1",
  reminders: "#9333EA",
};

const colors = { ...darkColors };

function applyTheme(mode) {
  const target = mode === "light" ? lightColors : darkColors;
  Object.assign(colors, target);
  setSharedThemeColors(mode);
  s = createAppStyles(colors);
}

function hslToHex(h, satPercent, lightPercent) {
  const sat = satPercent / 100;
  const light = lightPercent / 100;
  const a = sat * Math.min(light, 1 - light);
  const channel = (n) => {
    const k = (n + h / 30) % 12;
    const value = light - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * value).toString(16).padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}

const CHART_COLORS = [
  "#F4B6C2", "#F6C9A8", "#F6E3A1", "#D5E7A3", "#B7E0C2", "#A9DDD4",
  "#A9D4EA", "#B7C6F0", "#D0B8F0", "#E7C2EA", "#F3B7D4", "#F2C1B0",
  "#E6D4A8", "#C9DDB4", "#A8D8C8", "#A8CDE4", "#C2B6E8", "#E8C4D8",
  "#F0D0B4", "#DDE6B0", "#B8E0D4", "#C4D4F2", "#E0C8F0", "#F6D6C8",
];

function chartColorAt(index) {
  if (index < CHART_COLORS.length) return CHART_COLORS[index];
  const hue = (index * 24) % 360;
  return hslToHex(hue, 42, 78);
}

function isFutureDate(dateStr) {
  return dateStr > todayISO();
}

const TOP_INSET = Platform.OS === "android" ? StatusBar.currentHeight || 26 : 48;
const BOTTOM_INSET = 28;
const TAB_BAR_HEIGHT = 62;

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
function getWeekDaysForDate(centerDateStr) {
  const [y, m, d] = centerDateStr.split("-").map(Number);
  const baseDate = new Date(y, m - 1, d);
  const dayOfWeek = baseDate.getDay();
  const sun = new Date(baseDate);
  sun.setDate(baseDate.getDate() - dayOfWeek);
  const week = [];
  for (let i = 0; i < 7; i++) {
    const temp = new Date(sun);
    temp.setDate(sun.getDate() + i);
    week.push(toISODate(temp));
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

// ───────────── GOOGLE OAUTH & SHEETS CLOUD SYNC ─────────────
export const GOOGLE_CONFIG = {
  // Google Cloud Console OAuth 2.0 Client IDs
  webClientId: "938746787260-8oujjq047r5ut4h43mj1sltu0m9fes3g.apps.googleusercontent.com",
  androidClientId: "938746787260-ljedj551hbtgf36ohdtgpvpdlu441q90.apps.googleusercontent.com",
  iosClientId: "938746787260-8oujjq047r5ut4h43mj1sltu0m9fes3g.apps.googleusercontent.com",
};

const STORAGE_KEYS = {
  TOKEN: "@winnie_auth_token",
  USER: "@winnie_user_profile",
  GENDER: "@winnie_user_gender",
  SHEET_ID: "@winnie_sheet_id",
  THEME: "@winnie_theme_mode",
  NOTIFICATIONS: "@winnie_notifications",
  NOTIFIED_SLOTS: "@winnie_notified_slots",
  INCLUDE_DEBTS: "@winnie_include_debts",
};

export async function getStoredAuth() {
  try {
    const [token, userStr, gender, sheetId] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.TOKEN),
      AsyncStorage.getItem(STORAGE_KEYS.USER),
      AsyncStorage.getItem(STORAGE_KEYS.GENDER),
      AsyncStorage.getItem(STORAGE_KEYS.SHEET_ID),
    ]);
    return {
      token,
      user: userStr ? JSON.parse(userStr) : null,
      gender,
      sheetId,
    };
  } catch {
    return { token: null, user: null, gender: null, sheetId: null };
  }
}

export async function saveAuthData({ token, user, gender, sheetId }) {
  try {
    const pairs = [];
    if (token !== undefined) pairs.push([STORAGE_KEYS.TOKEN, token || ""]);
    if (user !== undefined) pairs.push([STORAGE_KEYS.USER, user ? JSON.stringify(user) : ""]);
    if (gender !== undefined) pairs.push([STORAGE_KEYS.GENDER, gender || ""]);
    if (sheetId !== undefined) pairs.push([STORAGE_KEYS.SHEET_ID, sheetId || ""]);
    if (pairs.length > 0) {
      await AsyncStorage.multiSet(pairs);
    }
  } catch (e) {
    console.log("[Auth] Error saving auth data:", e);
  }
}

export async function clearAuthData() {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.TOKEN,
      STORAGE_KEYS.USER,
      STORAGE_KEYS.GENDER,
      STORAGE_KEYS.SHEET_ID,
    ]);
    activeToken = null;
    activeSheetId = null;
  } catch (e) {
    console.log("[Auth] Error clearing auth data:", e);
  }
}

const SHEETS_SPREADSHEET_NAME = "WinnieApp_Data";
let activeToken = null;
let activeSheetId = null;

export function setSheetsContext(token, sheetId) {
  activeToken = token;
  activeSheetId = sheetId;
}

const TABLE_COLUMNS = {
  profile: ["email", "name", "gender", "updated_at"],
  expenses: ["id", "date", "type", "category_id", "title", "amount"],
  expense_breakdown_items: ["id", "expense_id", "label", "amount", "sort_order"],
  tags: ["id", "kind", "name", "usage_count"],
  rituals: ["id", "name", "emoji", "sort_order"],
  ritual_logs: ["date", "ritual_id", "completed"],
  daily_checkins: ["date", "studied", "ate_healthy"],
  period_days: ["date"],
  learning_notes: ["id", "date", "body", "created_at", "updated_at"],
  notes: ["id", "title", "body", "created_at", "updated_at"],
  buy_items: ["id", "title", "completed", "price_min", "price_max", "sort_order", "created_at"],
  tasks: ["id", "title", "description", "due_date", "due_time", "priority", "category", "repeat", "completed", "google_event_id", "created_at"],
  settlements: ["id", "direction", "person", "amount", "note", "settled", "created_at"],
};

export async function createOrFindSpreadsheet(token) {
  if (!token) return null;
  try {
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name%3D'${SHEETS_SPREADSHEET_NAME}'%20and%20trashed%3Dfalse&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
      }
    }

    const sheetTitles = Object.keys(TABLE_COLUMNS);
    const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: { title: SHEETS_SPREADSHEET_NAME },
        sheets: sheetTitles.map((title) => ({
          properties: { title },
        })),
      }),
    });

    if (!createRes.ok) {
      return null;
    }

    const createData = await createRes.json();
    const newSheetId = createData.spreadsheetId;

    const dataUpdates = sheetTitles.map((title) => ({
      range: `${title}!A1`,
      majorDimension: "ROWS",
      values: [TABLE_COLUMNS[title]],
    }));

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${newSheetId}/values:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          valueInputOption: "USER_ENTERED",
          data: dataUpdates,
        }),
      }
    );

    return newSheetId;
  } catch (err) {
    console.log("[SheetsSync] Error creating/finding spreadsheet:", err);
    return null;
  }
}

export async function syncTableToSheet(tableName) {
  if (!activeToken || !activeSheetId) return;
  const columns = TABLE_COLUMNS[tableName];
  if (!columns) return;

  try {
    const db = await getDb();
    let rows = [];
    if (tableName === "profile") {
      const auth = await getStoredAuth();
      if (auth.user) {
        rows = [[auth.user.email || "", auth.user.name || "", auth.gender || "", new Date().toISOString()]];
      }
    } else {
      const colsSql = columns.join(", ");
      rows = await db.getAllAsync(`SELECT ${colsSql} FROM ${tableName}`);
      rows = rows.map((r) => columns.map((col) => (r[col] !== undefined && r[col] !== null ? String(r[col]) : "")));
    }

    const values = [columns, ...rows];

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${activeSheetId}/values/${encodeURIComponent(tableName)}:clear`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${activeToken}` },
      }
    ).catch(() => {});

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${activeSheetId}/values/${encodeURIComponent(tableName)}!A1?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${activeToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          range: `${tableName}!A1`,
          majorDimension: "ROWS",
          values,
        }),
      }
    );
  } catch (err) {
    console.log(`[SheetsSync] Sync error for ${tableName}:`, err?.message || err);
  }
}

const syncDebounceTimers = {};
export function triggerTableSync(tableName, delay = 800) {
  if (syncDebounceTimers[tableName]) {
    clearTimeout(syncDebounceTimers[tableName]);
  }
  syncDebounceTimers[tableName] = setTimeout(() => {
    syncTableToSheet(tableName).catch(() => {});
  }, delay);
}

export async function restoreAllFromSheets(token, sheetId) {
  if (!token || !sheetId) return null;
  try {
    const ranges = Object.keys(TABLE_COLUMNS)
      .map((t) => `ranges=${encodeURIComponent(t)}!A1:Z`)
      .join("&");
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet?${ranges}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.valueRanges) return null;

    const db = await getDb();
    let restoredGender = null;

    for (const vr of data.valueRanges) {
      const title = (vr.range || "").split("!")[0].replace(/'/g, "");
      const values = vr.values || [];
      if (values.length <= 1) continue;
      const header = values[0];
      const dataRows = values.slice(1);

      if (title === "profile") {
        const genderIdx = header.indexOf("gender");
        if (genderIdx !== -1 && dataRows[0] && dataRows[0][genderIdx]) {
          restoredGender = dataRows[0][genderIdx];
        }
        continue;
      }

      const countRes = await db.getFirstAsync(`SELECT COUNT(*) as c FROM ${title}`);
      if (!countRes || countRes.c === 0) {
        const cols = header.join(", ");
        const placeholders = header.map(() => "?").join(", ");
        for (const row of dataRows) {
          const rowVals = header.map((_, i) => (row[i] !== undefined ? row[i] : ""));
          await db.runAsync(`INSERT OR REPLACE INTO ${title} (${cols}) VALUES (${placeholders})`, rowVals);
        }
      }
    }

    return { gender: restoredGender };
  } catch (e) {
    console.log("[SheetsSync] Error restoring data:", e);
    return null;
  }
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
      price_min REAL DEFAULT 0,
      price_max REAL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      due_date TEXT NOT NULL,
      due_time TEXT DEFAULT '09:00',
      priority TEXT NOT NULL DEFAULT 'medium',
      category TEXT NOT NULL DEFAULT 'General',
      repeat TEXT NOT NULL DEFAULT 'none',
      completed INTEGER NOT NULL DEFAULT 0,
      google_event_id TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settlements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      direction TEXT NOT NULL CHECK (direction IN ('give', 'get')),
      person TEXT NOT NULL,
      amount REAL NOT NULL,
      note TEXT DEFAULT '',
      settled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await db.runAsync(`ALTER TABLE buy_items ADD COLUMN price_min REAL DEFAULT 0`).catch(() => {});
  await db.runAsync(`ALTER TABLE buy_items ADD COLUMN price_max REAL DEFAULT 0`).catch(() => {});
  await db.runAsync(`ALTER TABLE buy_items ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`).catch(() => {});
  await db.runAsync(`ALTER TABLE tasks ADD COLUMN google_event_id TEXT DEFAULT NULL`).catch(() => {});

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
    ["expense", "Food"],
    ["expense", "Transport"],
    ["expense", "Groceries"],
    ["expense", "Shopping"],
    ["expense", "Bills"],
    ["expense", "Health"],
    ["income", "Salary"],
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
  triggerTableSync("rituals");
  return res.lastInsertRowId;
}
async function updateRitual(id, name, emoji) {
  const db = await getDb();
  await db.runAsync(`UPDATE rituals SET name = ?, emoji = ? WHERE id = ?`, [
    name.trim(),
    emoji.trim() || "✨",
    id,
  ]);
  triggerTableSync("rituals");
}
async function deleteRitual(id) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM ritual_logs WHERE ritual_id = ?`, [id]);
  await db.runAsync(`DELETE FROM rituals WHERE id = ?`, [id]);
  triggerTableSync("rituals");
  triggerTableSync("ritual_logs");
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

  triggerTableSync("ritual_logs");
  triggerTableSync("daily_checkins");
  return isCompleted;
}
async function getRitualLogsForDates(dates) {
  const db = await getDb();
  if (dates.length === 0) return {};
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

async function getRitualLogsForMonth(ritualId, year, month) {
  const db = await getDb();
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const rows = await db.getAllAsync(
    `SELECT date FROM ritual_logs WHERE ritual_id = ? AND completed = 1 AND date LIKE ?`,
    [ritualId, `${prefix}-%`]
  );
  return new Set(rows.map((r) => r.date));
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
  const existing = await db.getFirstAsync(
    `SELECT id, kind, name, usage_count FROM tags WHERE kind = ? AND LOWER(name) = LOWER(?)`,
    [kind, name]
  );
  if (existing) return existing;
  const res = await db.runAsync(`INSERT INTO tags (kind, name, usage_count) VALUES (?, ?, 0)`, [kind, name]);
  triggerTableSync("tags");
  return { id: res.lastInsertRowId, kind, name, usage_count: 0 };
}
async function bumpTagUsage(tagId) {
  const db = await getDb();
  await db.runAsync(`UPDATE tags SET usage_count = usage_count + 1 WHERE id = ?`, [tagId]);
  triggerTableSync("tags");
}

// ───────────── LEARNING NOTES QUERIES ─────────────
async function listLearningNotes(date) {
  const db = await getDb();
  return db.getAllAsync(`SELECT * FROM learning_notes WHERE date = ? ORDER BY created_at DESC`, [date]);
}
async function saveLearningEntry(id, date, body) {
  const db = await getDb();
  if (id) {
    await db.runAsync(`UPDATE learning_notes SET body=?, updated_at=datetime('now') WHERE id=?`, [body, id]);
  } else {
    await db.runAsync(`INSERT INTO learning_notes (date, body) VALUES (?,?)`, [date, body]);
  }
  triggerTableSync("learning_notes");
}
async function deleteLearningEntry(id) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM learning_notes WHERE id=?`, [id]);
  triggerTableSync("learning_notes");
}

// ───────────── BUY ITEMS QUERIES ─────────────
async function listBuyItems() {
  const db = await getDb();
  return db.getAllAsync(`SELECT * FROM buy_items ORDER BY completed ASC, sort_order ASC, id ASC`);
}
async function addBuyItem(title, priceMin = 0, priceMax = 0) {
  const db = await getDb();
  const maxRow = await db.getFirstAsync(`SELECT MAX(sort_order) as maxOrder FROM buy_items`);
  const sort_order = (maxRow?.maxOrder || 0) + 1;
  const res = await db.runAsync(
    `INSERT INTO buy_items (title, completed, price_min, price_max, sort_order) VALUES (?, 0, ?, ?, ?)`,
    [title.trim(), Number(priceMin) || 0, Number(priceMax) || 0, sort_order]
  );
  triggerTableSync("buy_items");
  return res.lastInsertRowId;
}
async function swapBuyItemsOrder(itemA, itemB) {
  const db = await getDb();
  const orderA = itemA.sort_order ?? 0;
  const orderB = itemB.sort_order ?? 0;
  await db.runAsync(`UPDATE buy_items SET sort_order = ? WHERE id = ?`, [orderB, itemA.id]);
  await db.runAsync(`UPDATE buy_items SET sort_order = ? WHERE id = ?`, [orderA, itemB.id]);
  triggerTableSync("buy_items");
}
async function reorderBuyItems(orderedPending) {
  const db = await getDb();
  for (let i = 0; i < orderedPending.length; i++) {
    await db.runAsync(`UPDATE buy_items SET sort_order = ? WHERE id = ?`, [i + 1, orderedPending[i].id]);
  }
  triggerTableSync("buy_items");
}
async function updateBuyItemOrder(id, newOrder) {
  const db = await getDb();
  await db.runAsync(`UPDATE buy_items SET sort_order = ? WHERE id = ?`, [newOrder, id]);
  triggerTableSync("buy_items");
}
async function toggleBuyItem(id) {
  const db = await getDb();
  await db.runAsync(`UPDATE buy_items SET completed = CASE WHEN completed = 0 THEN 1 ELSE 0 END WHERE id = ?`, [id]);
  triggerTableSync("buy_items");
}
async function deleteBuyItem(id) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM buy_items WHERE id = ?`, [id]);
  triggerTableSync("buy_items");
}
async function getTotalAccountBalance() {
  const db = await getDb();
  const row = await db.getFirstAsync(
    `SELECT SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as total FROM expenses`
  );
  return row?.total ?? 0;
}

// ───────────── GOOGLE CALENDAR API HELPERS ─────────────
export async function syncTaskToGoogleCalendar(token, task) {
  if (!token || token === "demo-token") return null;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const dateStr = task.due_date || todayISO();
    const timeStr = task.due_time || "09:00";
    const startDateTime = new Date(`${dateStr}T${timeStr}:00`);
    const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000);

    const body = {
      summary: task.title,
      description: `${task.description ? task.description + "\n\n" : ""}Winnie App Reminder · Category: ${task.category || "General"} · Priority: ${task.priority || "medium"}`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: tz,
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: tz,
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 15 },
          { method: "popup", minutes: 0 },
          { method: "email", minutes: 15 },
          { method: "email", minutes: 0 },
        ],
      },
    };

    if (task.repeat === "daily") {
      body.recurrence = ["RRULE:FREQ=DAILY"];
    } else if (task.repeat === "weekly") {
      body.recurrence = ["RRULE:FREQ=WEEKLY"];
    }

    let url = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
    let method = "POST";
    if (task.google_event_id) {
      url += `/${encodeURIComponent(task.google_event_id)}`;
      method = "PATCH";
    }

    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      return data.id;
    } else {
      console.log("[Calendar] Error syncing task to calendar:", res.status);
      return null;
    }
  } catch (err) {
    console.log("[Calendar] Exception syncing task:", err);
    return null;
  }
}

export async function deleteGoogleCalendarEvent(token, eventId) {
  if (!token || !eventId || token === "demo-token") return;
  try {
    await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    console.log("[Calendar] Exception deleting event:", err);
  }
}

// ───────────── TASKS QUERIES ─────────────
async function listTasks() {
  const db = await getDb();
  return db.getAllAsync(`SELECT * FROM tasks ORDER BY completed ASC, due_date ASC, due_time ASC, id ASC`);
}

async function addTask({ title, description = "", dueDate = todayISO(), dueTime = "09:00", priority = "medium", category = "General", repeat = "none" }) {
  const db = await getDb();
  if (await notificationsAreEnabled()) {
    requestNotificationPermission().catch(() => {});
  }
  let googleEventId = null;
  if (activeToken) {
    googleEventId = await syncTaskToGoogleCalendar(activeToken, {
      title,
      description,
      due_date: dueDate,
      due_time: dueTime,
      priority,
      category,
      repeat,
    });
  }
  const res = await db.runAsync(
    `INSERT INTO tasks (title, description, due_date, due_time, priority, category, repeat, completed, google_event_id) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [title.trim(), description.trim(), dueDate, dueTime, priority, category, repeat, googleEventId]
  );
  triggerTableSync("tasks");
  checkTaskReminders().catch(() => {});
  return res.lastInsertRowId;
}

async function updateTask(id, { title, description, dueDate, dueTime, priority, category, repeat, googleEventId }) {
  const db = await getDb();
  let newGoogleId = googleEventId;
  if (activeToken) {
    newGoogleId = await syncTaskToGoogleCalendar(activeToken, {
      title,
      description,
      due_date: dueDate,
      due_time: dueTime,
      priority,
      category,
      repeat,
      google_event_id: googleEventId,
    });
  }
  await db.runAsync(
    `UPDATE tasks SET title = ?, description = ?, due_date = ?, due_time = ?, priority = ?, category = ?, repeat = ?, google_event_id = ? WHERE id = ?`,
    [title.trim(), description.trim(), dueDate, dueTime, priority, category, repeat, newGoogleId || googleEventId, id]
  );
  triggerTableSync("tasks");
  checkTaskReminders().catch(() => {});
}

async function toggleTask(id) {
  const db = await getDb();
  const task = await db.getFirstAsync(`SELECT * FROM tasks WHERE id = ?`, [id]);
  if (!task) return;
  if (task.completed === 0 && (task.repeat === "daily" || task.repeat === "day_by_day")) {
    // When completing a daily repeating task, advance due date to tomorrow so it repeats day by day!
    const baseDate = task.due_date >= todayISO() ? task.due_date : todayISO();
    const nextDate = addDays(baseDate, 1);
    await db.runAsync(`UPDATE tasks SET due_date = ?, completed = 0 WHERE id = ?`, [nextDate, id]);
  } else {
    await db.runAsync(`UPDATE tasks SET completed = CASE WHEN completed = 0 THEN 1 ELSE 0 END WHERE id = ?`, [id]);
  }
  triggerTableSync("tasks");
  checkTaskReminders().catch(() => {});
}

async function deleteTask(id, googleEventId) {
  const db = await getDb();
  if (googleEventId && activeToken) {
    deleteGoogleCalendarEvent(activeToken, googleEventId).catch(() => {});
  }
  await db.runAsync(`DELETE FROM tasks WHERE id = ?`, [id]);
  triggerTableSync("tasks");
}

async function notificationsAreEnabled() {
  try {
    const flag = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    return flag !== "off";
  } catch {
    return true;
  }
}

async function setNotificationsEnabled(enabled) {
  await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, enabled ? "on" : "off");
  if (enabled) await requestNotificationPermission();
}

async function requestNotificationPermission() {
  if (Platform.OS !== "web" || typeof Notification === "undefined") return false;
  try {
    if (navigator.serviceWorker) {
      await navigator.serviceWorker.register("/reminder-sw.js");
    }
  } catch (err) {
    console.log("[Reminders] Service worker registration failed:", err);
  }
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

async function showReminder(title, body) {
  if (Platform.OS === "web" && typeof Notification !== "undefined" && Notification.permission === "granted") {
    try {
      const registration = navigator.serviceWorker ? await navigator.serviceWorker.getRegistration() : null;
      if (registration?.showNotification) {
        await registration.showNotification(title, { body, icon: "/favicon.png" });
        return;
      }
    } catch (err) {
      console.log("[Reminders] Service worker notification failed:", err);
    }
    try {
      new Notification(title, { body });
      return;
    } catch (err) {
      console.log("[Reminders] Notification failed:", err);
    }
  }
  if (Platform.OS !== "web") {
    Alert.alert(title, body);
  }
}

const reminderTimers = new Map();
const REMINDER_CATCH_UP_MS = 7 * 24 * 60 * 60 * 1000;

function appIsForeground() {
  if (Platform.OS === "web") {
    return typeof document === "undefined" || document.visibilityState !== "hidden";
  }
  return AppState.currentState === "active";
}

function taskDueMs(task) {
  const time = String(task.due_time || "09:00").slice(0, 5);
  const [hour, minute] = time.split(":").map((part) => Number(part));
  const [year, month, day] = String(task.due_date || "").split("-").map((part) => Number(part));
  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) return NaN;
  return new Date(year, month - 1, day, hour, minute, 0, 0).getTime();
}

function clearReminderTimers() {
  for (const timer of reminderTimers.values()) clearTimeout(timer);
  reminderTimers.clear();
}

async function rememberNotified(notified) {
  await AsyncStorage.setItem(STORAGE_KEYS.NOTIFIED_SLOTS, JSON.stringify(notified));
}

async function checkTaskReminders() {
  if (!(await notificationsAreEnabled())) return;
  if (Platform.OS === "web") requestNotificationPermission().catch(() => {});
  let tasks = [];
  try {
    tasks = await listTasks();
  } catch {
    return;
  }
  const now = Date.now();
  let notified = {};
  try {
    notified = JSON.parse((await AsyncStorage.getItem(STORAGE_KEYS.NOTIFIED_SLOTS)) || "{}");
  } catch {
    notified = {};
  }
  clearReminderTimers();
  let changed = false;
  const pending = [];
  for (const task of tasks) {
    if (task.completed) continue;
    const due = taskDueMs(task);
    if (Number.isNaN(due)) continue;
    const slots = [
      { id: `${task.id}:${task.due_date}:15`, at: due - 15 * 60 * 1000, title: "In 15 minutes", body: task.title },
      { id: `${task.id}:${task.due_date}:0`, at: due, title: task.title, body: "It's time for this reminder." },
    ];
    for (const slot of slots) {
      if (notified[slot.id]) continue;
      const delay = slot.at - now;
      if (delay <= 0 && now - slot.at < REMINDER_CATCH_UP_MS) {
        pending.push(slot);
      } else if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
        const timer = setTimeout(() => {
          if (!appIsForeground()) return;
          showReminder(slot.title, slot.body);
          notified[slot.id] = Date.now();
          rememberNotified(notified).catch(() => {});
        }, delay);
        reminderTimers.set(slot.id, timer);
      }
    }
  }
  if (pending.length && appIsForeground()) {
    if (pending.length === 1) {
      await showReminder(pending[0].title, pending[0].body);
    } else {
      await showReminder(
        "Reminders",
        pending
          .map((slot) => (slot.body && slot.body !== slot.title ? `${slot.title} — ${slot.body}` : slot.title))
          .join("\n")
      );
    }
    for (const slot of pending) notified[slot.id] = now;
    changed = true;
  }
  if (changed) await rememberNotified(notified);
}

async function listSettlements() {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT * FROM settlements ORDER BY settled ASC, direction ASC, person COLLATE NOCASE ASC, id ASC`
  );
}

async function toggleSettlement(id) {
  const db = await getDb();
  await db.runAsync(
    `UPDATE settlements SET settled = CASE WHEN settled = 0 THEN 1 ELSE 0 END WHERE id = ?`,
    [id]
  );
  triggerTableSync("settlements");
}

async function addSettlement({ direction, person, amount, note = "" }) {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO settlements (direction, person, amount, note, settled) VALUES (?, ?, ?, ?, 0)`,
    [direction, person.trim(), amount, note.trim()]
  );
  triggerTableSync("settlements");
  return result.lastInsertRowId;
}

async function deleteSettlement(id) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM settlements WHERE id = ?`, [id]);
  triggerTableSync("settlements");
}

// ───────────── NOTES QUERIES ─────────────
async function listNotes() {
  const db = await getDb();
  return db.getAllAsync(`SELECT * FROM notes ORDER BY updated_at DESC, id DESC`);
}
async function saveNote(note) {
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
async function deleteNote(id) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM notes WHERE id=?`, [id]);
  triggerTableSync("notes");
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
async function getCategorySpendHistory(category, monthPrefix) {
  const db = await getDb();
  if (monthPrefix) {
    return db.getAllAsync(
      `SELECT e.id, e.date, e.title, e.amount
       FROM expenses e LEFT JOIN tags t ON t.id = e.category_id
       WHERE e.type = 'expense' AND COALESCE(t.name, 'Uncategorised') = ? AND e.date LIKE ?
       ORDER BY e.date DESC, e.id DESC`,
      [category, `${monthPrefix}-%`]
    );
  }
  return db.getAllAsync(
    `SELECT e.id, e.date, e.title, e.amount
     FROM expenses e LEFT JOIN tags t ON t.id = e.category_id
     WHERE e.type = 'expense' AND COALESCE(t.name, 'Uncategorised') = ?
     ORDER BY e.date DESC, e.id DESC`,
    [category]
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
  triggerTableSync("expenses");
  triggerTableSync("expense_breakdown_items");
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
  triggerTableSync("expenses");
  triggerTableSync("expense_breakdown_items");
}
async function deleteExpense(id) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM expenses WHERE id = ?`, [id]);
  triggerTableSync("expenses");
  triggerTableSync("expense_breakdown_items");
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
  triggerTableSync("period_days");
}
const PERIOD_SPAN_DAYS = 5;

async function markPeriodFromStart(startDate) {
  const db = await getDb();
  const range = Array.from({ length: PERIOD_SPAN_DAYS }, (_, i) => addDays(startDate, i));
  const months = [...new Set(range.map((d) => d.slice(0, 7)))];

  for (const monthPrefix of months) {
    const existing = await db.getAllAsync(`SELECT date FROM period_days WHERE date LIKE ?`, [`${monthPrefix}%`]);
    const incoming = range.filter((d) => d.startsWith(monthPrefix));
    const union = new Set([...existing.map((row) => row.date), ...incoming]);
    if (union.size > PERIOD_SPAN_DAYS) {
      await db.runAsync(`DELETE FROM period_days WHERE date LIKE ?`, [`${monthPrefix}%`]);
    }
  }

  for (const date of range) {
    await db.runAsync(`INSERT OR IGNORE INTO period_days (date) VALUES (?)`, [date]);
  }
  triggerTableSync("period_days");
}

async function clearPeriodRun(date) {
  const db = await getDb();
  const rows = await db.getAllAsync(`SELECT date FROM period_days ORDER BY date ASC`);
  const marked = new Set(rows.map((row) => row.date));
  let start = date;
  while (marked.has(addDays(start, -1))) start = addDays(start, -1);

  const toDelete = [];
  let cursor = start;
  while (marked.has(cursor)) {
    toDelete.push(cursor);
    cursor = addDays(cursor, 1);
  }
  for (const day of toDelete) {
    await db.runAsync(`DELETE FROM period_days WHERE date=?`, [day]);
  }
  triggerTableSync("period_days");
}
async function setMonthPeriodDays(monthPrefix, newDates) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM period_days WHERE date LIKE ?`, [`${monthPrefix}%`]);
  for (const d of newDates.slice(0, 5)) {
    await db.runAsync(`INSERT INTO period_days (date) VALUES (?)`, [d]);
  }
  triggerTableSync("period_days");
}

// ───────────── GLOBAL APP CONTEXT ─────────────
const AppContext = React.createContext({
  openProfile: () => {},
  userProfile: null,
});

// ───────────── HEADER & MENU BUTTON ─────────────
function ScreenHeader({ title, iconKey, onProfilePress, userProfile }) {
  const ctx = React.useContext(AppContext);
  const handleProfilePress = onProfilePress || ctx.openProfile;
  const profile = userProfile || ctx.userProfile;

  return (
    <View style={s.headerContainer}>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
        {iconKey && APP_ICONS[iconKey] && (
          <Image source={APP_ICONS[iconKey]} style={s.headerIcon} />
        )}
        <Text style={s.headerTitleText} numberOfLines={1}>{title}</Text>
      </View>
      <TouchableOpacity
        onPress={handleProfilePress}
        style={s.profileHeaderBtn}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        activeOpacity={0.7}
      >
        {profile?.picture ? (
          <Image source={{ uri: profile.picture }} style={s.profileHeaderAvatar} />
        ) : (
          <View style={s.profileHeaderPlaceholder}>
            <Text style={s.profileHeaderInitial}>
              {(profile?.name || "W")[0].toUpperCase()}
            </Text>
          </View>
        )}
      </TouchableOpacity>
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
          cursorColor={colors.text}
          selectionColor={accentColor}
          style={[s.input, { color: colors.text }]}
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
          cursorColor={colors.text}
          selectionColor={accentColor}
          style={[s.bdAddInput, { flex: 1.4, color: colors.text }]}
        />
        <TextInput
          value={draftAmount}
          onChangeText={setDraftAmount}
          placeholder="0"
          placeholderTextColor={colors.textFaint}
          keyboardType="numeric"
          cursorColor={colors.text}
          selectionColor={accentColor}
          style={[s.bdAddInput, { flex: 0.8, textAlign: "right", color: colors.text }]}
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

function WeekStreakBar({ selectedDate, setSelectedDate, weekDays, logsMap, totalRituals, todayStr }) {
  const selectedCompleted = logsMap[selectedDate]?.size || 0;
  const allDoneSelected = totalRituals > 0 && selectedCompleted >= totalRituals;
  const label = relativeDayLabel(selectedDate);

  return (
    <View style={[s.weekStreakCard, cardShadow]}>
      <View style={s.weekStreakHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable onPress={() => setSelectedDate((prev) => addDays(prev, -7))} hitSlop={12}>
            <Text style={s.arrow}>‹</Text>
          </Pressable>
          <Image source={APP_ICONS.progress} style={{ width: 22, height: 22 }} />
          <View>
            <Text style={s.weekStreakTitle}>Weekly Consistency 📈</Text>
            <Text style={s.weekStreakSub}>
              {allDoneSelected
                ? `All rituals completed ${label.toLowerCase()}! 🌟 🎉`
                : `${selectedCompleted} of ${totalRituals} completed ${label.toLowerCase()} ⏱️`}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={s.weekStreakBadge}>
            <Text style={s.weekStreakBadgeText}>
              {selectedCompleted}/{totalRituals}
            </Text>
          </View>
          <Pressable
            onPress={() =>
              setSelectedDate((prev) => {
                const next = addDays(prev, 7);
                return next > todayStr ? todayStr : next;
              })
            }
            hitSlop={12}
            disabled={selectedDate >= todayStr}
            style={{ opacity: selectedDate >= todayStr ? 0.3 : 1 }}
          >
            <Text style={s.arrow}>›</Text>
          </Pressable>
        </View>
      </View>

      <View style={s.weekStreakRow}>
        {weekDays.map((d, index) => {
          const isSelected = d === selectedDate;
          const isToday = d === todayStr;
          const completedCount = logsMap[d]?.size || 0;
          const dayNum = parseInt(d.split("-")[2], 10);
          const dayLabel = DAY_ABBR[index];
          const isAllDone = totalRituals > 0 && completedCount >= totalRituals;
          const isFuture = d > todayStr;

          return (
            <Pressable
              key={d}
              onPress={() => {
                if (isFuture) return;
                setSelectedDate(d);
              }}
              disabled={isFuture}
              style={[s.weekStreakDayCol, isSelected && s.weekStreakTodayCol, isFuture && { opacity: 0.35 }]}
            >
              <Text style={[s.weekStreakDayLabel, isSelected && { color: colors.streakOrange, fontWeight: "700" }]}>
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
            </Pressable>
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
  const [keyboardHeight, setKeyboardHeight] = useState(0);
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
    } else {
      setKeyboardHeight(0);
    }
  }, [visible, editingRitual]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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
      <View style={{ flex: 1, justifyContent: "flex-end", paddingBottom: keyboardHeight }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <ScrollView
          style={{ maxHeight: keyboardHeight ? "78%" : "88%", flexGrow: 0 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          nestedScrollEnabled
          contentContainerStyle={{ paddingBottom: 4 }}
        >
          <View style={[s.sheet, { paddingBottom: BOTTOM_INSET + 16 }]}>
            <View style={s.grabber} />
            <Text style={s.modalHeaderTitle}>{isEditing ? "Edit Ritual ✏️" : "New Daily Ritual ✨"}</Text>

            <Text style={s.label}>Ritual Name 📝</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Drink 2L Water, Read 20 mins"
              placeholderTextColor={colors.textFaint}
              cursorColor={colors.text}
              selectionColor={colors.habitGreen}
              style={[s.input, { color: colors.text }]}
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
                cursorColor={colors.text}
                selectionColor={colors.habitGreen}
                style={[s.input, { flex: 1, color: colors.text }]}
                maxLength={4}
              />
            </View>

            <Text style={s.label}>Quick suggestions 💡</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginVertical: 6 }}>
              {EMOJI_SUGGESTIONS.map((em) => (
                <Pressable
                  key={em}
                  onPress={() => setEmoji(em)}
                  style={[s.emojiPill, emoji === em && { borderColor: colors.habitGreen, backgroundColor: colors.surfaceHighlight }]}
                >
                  <Text style={{ fontSize: 20 }}>{em}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable onPress={handleSave} style={[s.saveBtn, { backgroundColor: colors.habitGreen }]}>
              <Text style={s.saveBtnText}>{isEditing ? "Update Ritual 🚀" : "Add Ritual ➕"}</Text>
            </Pressable>

            {isEditing && (
              <Pressable onPress={handleDelete} style={{ marginTop: 12, alignItems: "center", paddingVertical: 10 }}>
                <Text style={{ color: colors.negative, fontWeight: "600" }}>Delete this ritual 🗑️</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </View>
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

function HomeScreen({ onRitualTapped }) {
  const todayStr = todayISO();
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const weekDays = getWeekDaysForDate(selectedDate);
  const [rituals, setRituals] = useState([]);
  const [logsMap, setLogsMap] = useState({});
  const [dayTotals, setDayTotals] = useState({ income: 0, expense: 0 });
  const [hasActivity, setHasActivity] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRitual, setEditingRitual] = useState(null);

  const loadData = useCallback(async () => {
    const [allRituals, weekLogs, recent, totals] = await Promise.all([
      listRituals(),
      getRitualLogsForDates(weekDays),
      getEntriesForDate(selectedDate),
      getDayTotals(selectedDate),
    ]);
    setRituals(allRituals);
    setLogsMap(weekLogs);
    setHasActivity(recent.length > 0);
    setDayTotals({ income: totals.income ?? 0, expense: totals.expense ?? 0 });
  }, [selectedDate, weekDays]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleToggle(ritual) {
    if (isFutureDate(selectedDate)) return;
    await toggleRitualLog(selectedDate, ritual.id);
    if (onRitualTapped) {
      onRitualTapped(ritual);
    }
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

  const selectedCompletedSet = logsMap[selectedDate] || new Set();
  const formattedSelected = relativeDayLabel(selectedDate);

  return (
    <View style={s.screen}>
      <ScreenHeader title={getGreeting()} iconKey="home" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: BOTTOM_INSET + 30 + TAB_BAR_HEIGHT }}>
        {/* HERO BANNER WITH CHARACTER IMAGE */}
        <View style={s.bannerCard}>
          <EditableImage
            imageKey="banner_home"
            defaultSource={LOCAL_ASSETS.hi}
            style={s.bannerImage}
            resizeMode="contain"
          />
          <View style={s.bannerOverlay}>
            <Text style={s.bannerTitle}>Welcome Back, Champ! ⚡</Text>
            <Text style={s.bannerSub}>Let's smash today's goals with Winnie 🐾</Text>
          </View>
        </View>

        {/* Date Subtitle */}
        <View style={s.homeGreetingRow}>
          <Text style={s.todayDate}>📅 Showing: {formattedSelected} ({selectedDate})</Text>
        </View>

        {/* 1. WEEK STREAK BAR */}
        <WeekStreakBar
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          weekDays={weekDays}
          logsMap={logsMap}
          totalRituals={rituals.length}
          todayStr={todayStr}
        />

        {/* 2. DYNAMIC DAILY RITUALS SECTION */}
        <View style={[s.habitsSectionCard, cardShadow]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={s.sectionHeaderTitle}>Daily Rituals ({formattedSelected}) 🎯</Text>
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
                completed={selectedCompletedSet.has(r.id)}
                onPress={() => handleToggle(r)}
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

        {/* 3. TODAY'S ACTIVITY SUMMARY */}
        <Text style={s.listLabel}>Logged Activity ({formattedSelected}) 📊</Text>
        {!hasActivity ? (
          <View style={s.emptyStateContainer}>
            <Image source={APP_ICONS.empty} style={s.emptyIcon} />
            <Text style={s.emptyText}>No activity logged for {formattedSelected.toLowerCase()} yet. ✨</Text>
          </View>
        ) : (
          <View style={[s.summaryCard, cardShadow, { marginBottom: 10 }]}>
            <View style={s.reportMetricsRow}>
              <View style={s.reportMetricCol}>
                <Text style={s.balanceLabel}>Income 💵</Text>
                <Text style={[s.reportMetricValue, { color: colors.positive }]}>
                  +₹{(dayTotals.income || 0).toFixed(0)}
                </Text>
              </View>
              <View style={[s.reportMetricCol, { alignItems: "flex-end" }]}>
                <Text style={s.balanceLabel}>Expense 🛍️</Text>
                <Text style={[s.reportMetricValue, { color: colors.expense }]}>
                  −₹{(dayTotals.expense || 0).toFixed(0)}
                </Text>
              </View>
            </View>
          </View>
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
function ProgressScreen() {
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
  const [rituals, setRituals] = useState([]);

  const progressDate = todayISO();

  const loadData = useCallback(async () => {
    const [stats, notes, allRituals] = await Promise.all([
      getProgressStreakStats(),
      listLearningNotes(progressDate),
      listRituals(),
    ]);
    setStreakStats(stats);
    setLearningNotes(notes);
    setRituals(allRituals);
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
    if (isFutureDate(dateStr)) return;
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
      <ScreenHeader title="Progress" iconKey="progress" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: BOTTOM_INSET + 40 + TAB_BAR_HEIGHT }}>
          {/* MOTIVATION ART BANNER */}
          <View style={s.bannerCard}>
            <EditableImage
              imageKey="banner_progress"
              defaultSource={LOCAL_ASSETS.inosuke}
              style={s.bannerImage}
              resizeMode="contain"
            />
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
                const isFuture = dateStr && isFutureDate(dateStr);

                return (
                  <Pressable
                    key={i}
                    disabled={!day || isFuture}
                    onPress={() => handleToggleDay(day)}
                    style={[s.dayCell, isFuture && { opacity: 0.32 }]}
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
              <Text style={{ color: colors.textFaint, fontSize: 11 }}>⚡</Text>
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

          {/* RITUAL CONSISTENCY REPORTS SECTION */}
          {rituals.length > 0 && (
            <>
              <Text style={[s.listLabel, { marginTop: 22 }]}>Ritual Consistency Reports 🗓️</Text>
              {rituals.map((r) => (
                <RitualReportCalendar key={r.id} ritual={r} monthDate={monthDate} onToggleDay={loadData} />
              ))}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ───────────── HEALTH SCREEN (PERIOD TRACKER) ─────────────
function HealthScreen() {
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
      await clearPeriodRun(dateStr);
    } else {
      await markPeriodFromStart(dateStr);
    }
    loadData();
  }

  const cycles = computeCycles(allDates);

  return (
    <View style={s.screen}>
      <ScreenHeader title="Period Tracker" iconKey="health" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: BOTTOM_INSET + 40 + TAB_BAR_HEIGHT }}>
        {/* BANNER ART FOR PERIOD TRACKER */}
        <View style={s.bannerCard}>
          <EditableImage
            imageKey="banner_health"
            defaultSource={LOCAL_ASSETS.shinobu}
            style={s.bannerImage}
            resizeMode="contain"
          />
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
              <Text style={s.dateSub}>Tap one day · the next 4 mark with it 🗓️</Text>
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
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: "flex-end" }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <ScrollView
          style={{ maxHeight: "88%", flexGrow: 0 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          nestedScrollEnabled
          contentContainerStyle={{ paddingBottom: 4 }}
        >
          <View style={[s.sheetCompact, { paddingBottom: BOTTOM_INSET + 20 }]}>
            <View style={s.grabber} />
            {/* Income / Expense Segment Selector */}
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

            {/* ADD EXPENSE FORM SECTION */}
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
                cursorColor={colors.text}
                selectionColor={accent}
                style={[
                  s.input,
                  s.quickAmountInput,
                  { color: colors.text },
                  breakdown.length > 0 && { opacity: 0.6 },
                ]}
              />
            </View>

            {breakdown.length > 0 && <Text style={s.hint}>Auto-filled from breakdown below 🧮</Text>}

            {/* BREAKDOWN SECTION */}
            <Pressable onPress={() => setShowBreakdown((v) => !v)} style={{ marginTop: 10, marginBottom: 4 }}>
              <Text style={{ color: accent, fontWeight: "600" }}>
                {showBreakdown ? "− Hide breakdown 📜" : "+ Add a breakdown 📋"}
              </Text>
            </Pressable>

            {showBreakdown && (
              <View style={s.breakdownBox}>
                <BreakdownTable items={breakdown} onChange={handleBreakdownChange} accentColor={accent} />
              </View>
            )}

            {/* SAVE BUTTON */}
            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={[s.saveBtn, { backgroundColor: accent, opacity: saving ? 0.6 : 1, marginTop: 14 }]}
            >
              <Text style={s.saveBtnText}>{isEditing ? "Update Entry 🔄" : "Save Entry 💾"}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SwipeableRow({ onSwipeDelete, children }) {
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, g) => {
        // Capture horizontal movements that are clearly intentional
        return Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5;
      },
      onMoveShouldSetPanResponderCapture: () => false,
      onPanResponderGrant: () => {
        translateX.setOffset(0);
      },
      onPanResponderMove: (_, g) => {
        // Smoothly follow finger in either direction, clamped to max 130px
        const clamped = Math.max(-130, Math.min(130, g.dx));
        translateX.setValue(clamped);
      },
      onPanResponderRelease: (_, g) => {
        translateX.flattenOffset();
        const swipedLeft = g.dx < -65 || (g.dx < -30 && g.vx < -0.3);
        const swipedRight = g.dx > 65 || (g.dx > 30 && g.vx > 0.3);

        if (swipedLeft || swipedRight) {
          // Animate smoothly off-screen in the swiped direction
          const targetValue = swipedLeft ? -400 : 400;
          Animated.timing(translateX, {
            toValue: targetValue,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            onSwipeDelete();
            translateX.setValue(0);
          });
        } else {
          // Snap back smoothly
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
            speed: 16,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        translateX.flattenOffset();
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 2 }).start();
      },
    })
  ).current;

  const backdropOpacity = translateX.interpolate({
    inputRange: [-80, -20, 0, 20, 80],
    outputRange: [1, 0.5, 0, 0.5, 1],
    extrapolate: "clamp",
  });

  return (
    <View style={s.swipeWrap}>
      <Animated.View style={[s.swipeBackdrop, { opacity: backdropOpacity }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, width: "100%" }}>
          <Text style={s.swipeDeleteLabel}>🗑️ Delete</Text>
          <Text style={s.swipeDeleteLabel}>🗑️ Delete</Text>
        </View>
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
  const expenseIndex = (entry.id || 0) % EXPENSE_IMAGES.length;
  const expenseImage = EXPENSE_IMAGES[expenseIndex];

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
        <EditableImage
          imageKey={`expense_thumb_${expenseIndex}`}
          defaultSource={expenseImage}
          style={s.entryCardThumb}
          resizeMode="cover"
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
function ExpensesScreen({ focusKey }) {
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
      <ScreenHeader title="Expenses" iconKey="expenses" />
      <FlatList
        data={entries}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <EntryCard entry={item} onDeleted={load} onEdit={handleEditRequest} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: BOTTOM_INSET + 90 + TAB_BAR_HEIGHT }}
        ListHeaderComponent={
          <View>
            {/* HERO BANNER FOR EXPENSES */}
            <View style={s.bannerCard}>
              <EditableImage
                imageKey="banner_expenses"
                defaultSource={LOCAL_ASSETS.luffy}
                style={s.bannerImage}
                resizeMode="contain"
              />
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

      <Pressable style={[s.fab, cardShadow, { bottom: BOTTOM_INSET + 20 + TAB_BAR_HEIGHT }]} onPress={handleAddNew}>
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
function DonutChart({ rows, selectedCategory = null, onSelectCategory }) {
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const selectedIdxRaw = rows.findIndex((row) => row.category === selectedCategory);
  const selectedIdx = selectedIdxRaw >= 0 ? selectedIdxRaw : null;

  // Progressive loading animation: chart segments fill up smoothly from 0 to 100%
  const [loadProgress, setLoadProgress] = useState(0);

  useEffect(() => {
    setLoadProgress(0);
    let start = null;
    let animId;
    const duration = 750; // smooth 750ms loading fill

    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min(1, (timestamp - start) / duration);
      // easeOutCubic curve
      const eased = 1 - Math.pow(1 - progress, 3);
      setLoadProgress(eased);
      if (progress < 1) {
        animId = requestAnimationFrame(step);
      }
    };
    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [rows]);

  const segments = rows.map((row) => {
    const fraction = total ? row.total / total : 0;
    const sliceLength = fraction * circumference;
    const animatedSlice = sliceLength * loadProgress;
    const drawnLength = rows.length > 1 && animatedSlice > 0 ? animatedSlice + 1.6 : animatedSlice;
    return { ...row, fraction, sliceLength: animatedSlice, drawnLength };
  });

  let cumulativeOffset = 0;
  const selectedRow = selectedIdx !== null ? rows[selectedIdx] : null;
  const selectedPct = selectedRow && total ? ((selectedRow.total / total) * 100).toFixed(1) : null;
  const animatedTotal = Math.round(total * loadProgress);

  return (
    <View style={{ alignItems: "center" }}>
      <View style={s.donutWrap}>
        <Svg width={170} height={170} viewBox="0 0 142 142">
          {/* Background track ring */}
          <Circle cx="71" cy="71" r={radius} stroke={colors.surfaceRaised} strokeWidth="20" fill="none" />
          {segments.map((seg, index) => {
            const offset = -cumulativeOffset;
            cumulativeOffset += seg.sliceLength;
            const isSelected = selectedIdx === index;
            const strokeColor = chartColorAt(index);
            return (
              <Circle
                key={seg.category}
                cx="71"
                cy="71"
                r={radius}
                stroke={strokeColor}
                strokeWidth={isSelected ? 26 : 20}
                fill="none"
                strokeDasharray={`${seg.drawnLength} ${circumference}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
                rotation="-90"
                origin="71,71"
                opacity={selectedIdx === null || isSelected ? 1 : 0.35}
              />
            );
          })}
        </Svg>

        {/* Center info */}
        <Pressable style={s.donutCenter} onPress={() => onSelectCategory?.(null)}>
          {selectedRow ? (
            <View style={{ alignItems: "center", paddingHorizontal: 12 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "800",
                  color: chartColorAt(selectedIdx),
                  textAlign: "center",
                }}
                numberOfLines={1}
              >
                {selectedRow.category}
              </Text>
              <Text style={[s.donutTotal, { fontSize: 16, marginTop: 2 }]}>
                ₹{selectedRow.total.toFixed(0)}
              </Text>
              <Text style={[s.donutCaption, { color: colors.textMuted, fontSize: 11, fontWeight: "700" }]}>
                {selectedPct}% of total
              </Text>
            </View>
          ) : (
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 14 }}>📊</Text>
              <Text style={[s.donutTotal, { fontSize: 18, marginTop: 1 }]}>
                ₹{animatedTotal.toLocaleString("en-IN")}
              </Text>
              <Text style={[s.donutCaption, { color: colors.textMuted, fontSize: 10 }]}>Total Spent</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Interactive Legend with amount & % share */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 14, width: "100%" }}>
        {rows.map((row, index) => {
          const color = chartColorAt(index);
          const isSelected = selectedIdx === index;
          const sharePct = total ? ((row.total / total) * 100).toFixed(0) : 0;
          return (
            <Pressable
              key={row.category}
              onPress={() => onSelectCategory?.(isSelected ? null : row.category)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 14,
                backgroundColor: isSelected ? color + "25" : colors.surface,
                borderWidth: 1.5,
                borderColor: isSelected ? color : colors.border,
              }}
            >
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
              <Text
                style={{
                  color: isSelected ? colors.text : colors.textMuted,
                  fontSize: 12,
                  fontWeight: isSelected ? "700" : "500",
                }}
                numberOfLines={1}
              >
                {row.category}
              </Text>
              <Text style={{ color, fontSize: 11, fontWeight: "800" }}>
                ₹{row.total.toFixed(0)} ({sharePct}%)
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function RitualReportCalendar({ ritual, monthDate, onToggleDay }) {
  const [minimized, setMinimized] = useState(true);
  const [loggedDates, setLoggedDates] = useState(new Set());

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  const loadData = useCallback(async () => {
    const dates = await getRitualLogsForMonth(ritual.id, year, month);
    setLoggedDates(dates);
  }, [ritual.id, year, month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const cells = getMonthGrid(year, month);
  const monthLabel = monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const completedDaysCount = loggedDates.size;

  async function handleDayPress(day) {
    if (!day) return;
    const dateStr = toISODate(new Date(year, month, day));
    await toggleRitualLog(dateStr, ritual.id);
    if (onToggleDay) onToggleDay();
    loadData();
  }

  return (
    <View style={[s.reportCard, cardShadow, { marginBottom: 12 }]}>
      <Pressable
        onPress={() => setMinimized((prev) => !prev)}
        style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={{ fontSize: 22 }}>{ritual.emoji}</Text>
          <View>
            <Text style={s.entryTitle}>{ritual.name}</Text>
            <Text style={s.dateSub}>
              {completedDaysCount} days completed in {monthLabel}
            </Text>
          </View>
        </View>
        <Text style={[s.learningToggle, { color: colors.habitGreen }]}>{minimized ? "+" : "−"}</Text>
      </Pressable>

      {!minimized && (
        <View style={{ marginTop: 14 }}>
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
              const isLogged = dateStr && loggedDates.has(dateStr);
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
                        isLogged && s.streakDayCellActive,
                        isToday && s.squareMarker,
                        isToday && !isLogged && s.todayCalendarBorder,
                      ]}
                    >
                      <Text style={[s.dayText, isLogged && { color: "#FFFFFF", fontWeight: "700" }]}>
                        {day}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

function ExpenseReportsScreen() {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0, carriedForward: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryHistory, setCategoryHistory] = useState([]);
  const [settleItems, setSettleItems] = useState([]);
  const [settleFormOpen, setSettleFormOpen] = useState(false);
  const [settlePerson, setSettlePerson] = useState("");
  const [settleAmount, setSettleAmount] = useState("");
  const [settleDirection, setSettleDirection] = useState("give");
  const [accountBalance, setAccountBalance] = useState(0);
  const [includeDebts, setIncludeDebts] = useState(false);

  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (loading) {
      const spinLoop = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        })
      );
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.95, duration: 600, useNativeDriver: true }),
        ])
      );
      spinLoop.start();
      pulseLoop.start();
      return () => {
        spinLoop.stop();
        pulseLoop.stop();
        spinAnim.setValue(0);
        pulseAnim.setValue(1);
      };
    }
  }, [loading]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const load = useCallback(async () => {
    setLoading(true);
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const monthStart = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
    const [monthSummary, reportRows, carriedForward, settlements, balance] = await Promise.all([
      getMonthlySummary(year, monthIndex),
      getMonthlyExpenseReport(year, monthIndex),
      getCarriedForwardBalance(monthStart),
      listSettlements(),
      getTotalAccountBalance(),
    ]);
    setSummary({ ...monthSummary, carriedForward });
    setRows(reportRows);
    setSettleItems(settlements);
    setAccountBalance(balance || 0);
    setLoading(false);
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setSelectedCategory(null);
  }, [month]);

  const monthPrefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;

  useEffect(() => {
    if (!selectedCategory) {
      setCategoryHistory([]);
      return;
    }
    let cancelled = false;
    getCategorySpendHistory(selectedCategory, monthPrefix).then((history) => {
      if (!cancelled) setCategoryHistory(history);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedCategory, monthPrefix]);

  const monthName = month.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const nextMonth = () => setMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const prevMonth = () => setMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const netSavings = summary.income - summary.expense;

  const giveItems = settleItems.filter((item) => item.direction === "give" && !item.settled);
  const getItems = settleItems.filter((item) => item.direction === "get" && !item.settled);
  const doneSettleItems = settleItems.filter((item) => item.settled);
  const giveTotal = giveItems.reduce((sum, item) => sum + Number(item.amount), 0);
  const getTotal = getItems.reduce((sum, item) => sum + Number(item.amount), 0);
  const balanceAfterDebts = accountBalance - giveTotal + getTotal;

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.INCLUDE_DEBTS)
      .then((value) => setIncludeDebts(value === "on"))
      .catch(() => {});
  }, []);

  async function handleSettleAdd() {
    const amountNum = Number(settleAmount);
    if (!settlePerson.trim() || !amountNum) return;
    await addSettlement({ direction: settleDirection, person: settlePerson.trim(), amount: amountNum });
    setSettlePerson("");
    setSettleAmount("");
    setSettleFormOpen(false);
    const updated = await listSettlements();
    setSettleItems(updated);
  }

  async function refreshSettlements() {
    const [updated, balance] = await Promise.all([listSettlements(), getTotalAccountBalance()]);
    setSettleItems(updated);
    setAccountBalance(balance || 0);
  }

  function renderSettleGroup(title, groupRows, tint) {
    return (
      <View style={{ marginTop: 4 }}>
        <Text style={[s.balanceLabel, { marginBottom: 6, marginTop: 12 }]}>{title}</Text>
        {groupRows.length === 0 ? (
          <Text style={s.dateSub}>Nothing here yet.</Text>
        ) : (
          groupRows.map((item) => (
            <View key={item.id} style={[s.summaryCard, { marginBottom: 8, paddingVertical: 12 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Pressable
                  onPress={async () => {
                    await toggleSettlement(item.id);
                    refreshSettlements();
                  }}
                  style={[s.buyCheckbox, item.settled && s.buyCheckboxCompleted]}
                >
                  {!!item.settled && <Text style={s.buyCheckmark}>✓</Text>}
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      s.entryTitle,
                      item.settled && { color: colors.textFaint, textDecorationLine: "line-through" },
                    ]}
                  >
                    {item.person}
                  </Text>
                  {item.note ? <Text style={s.dateSub}>{item.note}</Text> : null}
                </View>
                <Text
                  style={{
                    color: item.settled ? colors.textFaint : tint,
                    fontWeight: "800",
                    fontSize: 16,
                    textDecorationLine: item.settled ? "line-through" : "none",
                  }}
                >
                  ₹{Number(item.amount).toFixed(0)}
                </Text>
                <Pressable
                  onPress={async () => {
                    await deleteSettlement(item.id);
                    refreshSettlements();
                  }}
                  hitSlop={8}
                >
                  <Text style={s.entryDeleteX}>×</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>
    );
  }

  return (
    <View style={s.screen}>
      <ScreenHeader title="Reports" iconKey="reports" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: BOTTOM_INSET + 30 + TAB_BAR_HEIGHT }}>
        {/* HERO BANNER FOR REPORTS */}
        <View style={s.bannerCard}>
          <EditableImage
            imageKey="banner_reports"
            defaultSource={LOCAL_ASSETS.minato}
            style={s.bannerImage}
            resizeMode="contain"
          />
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
              <Text style={s.balanceLabel}>C/F last</Text>
              <Text style={[s.reportMetricValue, { color: colors.text }]}>
                ₹{(summary.carriedForward || 0).toFixed(0)}
              </Text>
            </View>
            <View style={s.reportMetricCol}>
              <Text style={s.balanceLabel}>Income 💵</Text>
              <Text style={[s.reportMetricValue, { color: colors.positive }]}>
                +₹{summary.income.toFixed(0)}
              </Text>
            </View>
            <View style={s.reportMetricCol}>
              <Text style={s.balanceLabel}>Expense 🛍️</Text>
              <Text style={[s.reportMetricValue, { color: colors.expense }]}>
                −₹{summary.expense.toFixed(0)}
              </Text>
            </View>
            <View style={[s.reportMetricCol, { alignItems: "flex-end" }]}>
              <Text style={s.balanceLabel}>Net 🏦</Text>
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

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18 }}>
          <Text style={[s.listLabel, { marginTop: 0, marginBottom: 0 }]}>Give & Get</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={s.balanceLabel}>In balance</Text>
            <Switch
              value={includeDebts}
              onValueChange={async (next) => {
                setIncludeDebts(next);
                await AsyncStorage.setItem(STORAGE_KEYS.INCLUDE_DEBTS, next ? "on" : "off");
              }}
              trackColor={{ false: colors.border, true: colors.notes }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>
        {includeDebts ? (
          <View style={[s.summaryCard, cardShadow, { marginTop: 10, marginBottom: 4 }]}>
            <Text style={s.balanceLabel}>Balance after all debts</Text>
            <Text style={[s.reportMetricValue, { color: balanceAfterDebts >= 0 ? colors.positive : colors.negative, fontSize: 22 }]}>
              ₹{balanceAfterDebts.toFixed(0)}
            </Text>
            <Text style={[s.dateSub, { marginTop: 4 }]}>
              Now ₹{accountBalance.toFixed(0)} · give −₹{giveTotal.toFixed(0)} · get +₹{getTotal.toFixed(0)}
            </Text>
          </View>
        ) : null}

        {renderSettleGroup("Give", giveItems, colors.negative)}
        {renderSettleGroup("Get", getItems, colors.positive)}
        {doneSettleItems.length > 0 ? renderSettleGroup("Done", doneSettleItems, colors.textFaint) : null}

        {settleFormOpen && (
          <View style={[s.summaryCard, cardShadow, { marginTop: 16 }]}>
            <View style={s.segment}>
              <Pressable
                onPress={() => setSettleDirection("give")}
                style={[s.segmentBtn, settleDirection === "give" && { backgroundColor: colors.negative }]}
              >
                <Text style={[s.segmentText, settleDirection === "give" && s.segmentTextActive]}>Give</Text>
              </Pressable>
              <Pressable
                onPress={() => setSettleDirection("get")}
                style={[s.segmentBtn, settleDirection === "get" && { backgroundColor: colors.positive }]}
              >
                <Text style={[s.segmentText, settleDirection === "get" && s.segmentTextActive]}>Get</Text>
              </Pressable>
            </View>
            <Text style={s.label}>Person</Text>
            <TextInput
              value={settlePerson}
              onChangeText={setSettlePerson}
              placeholder="Friend's name"
              placeholderTextColor={colors.textFaint}
              cursorColor={colors.text}
              style={[s.input, { color: colors.text }]}
            />
            <Text style={s.label}>Amount (₹)</Text>
            <TextInput
              value={settleAmount}
              onChangeText={setSettleAmount}
              placeholder="0"
              placeholderTextColor={colors.textFaint}
              keyboardType="numeric"
              cursorColor={colors.text}
              style={[s.input, { color: colors.text }]}
            />
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <Pressable
                onPress={() => setSettleFormOpen(false)}
                style={[s.saveBtn, { flex: 1, marginTop: 0, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border }]}
              >
                <Text style={{ color: colors.textMuted, fontWeight: "700" }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleSettleAdd} style={[s.saveBtn, { flex: 2, marginTop: 0, backgroundColor: colors.notes }]}>
                <Text style={s.saveBtnText}>Save</Text>
              </Pressable>
            </View>
          </View>
        )}
        {!settleFormOpen && (
          <Pressable
            style={[s.saveBtn, { backgroundColor: colors.notes, marginTop: 12, marginBottom: 4 }]}
            onPress={() => setSettleFormOpen(true)}
          >
            <Text style={s.saveBtnText}>+ Add Give/Get Entry</Text>
          </Pressable>
        )}

        {loading ? (
          <View style={s.reportLoadingContainer}>
            <Animated.View style={[s.reportLoadingIconWrap, { transform: [{ rotate: spin }, { scale: pulseAnim }] }]}>
              <Text style={{ fontSize: 38 }}>📊</Text>
            </Animated.View>
            <Text style={s.reportLoadingTitle}>Summoning your financial insights... ✨</Text>
            <Text style={s.reportLoadingSub}>Crunching numbers & baking your charts 🥧</Text>
          </View>
        ) : rows.length === 0 ? (
          <View style={s.emptyStateContainer}>
            <Image source={APP_ICONS.empty} style={s.emptyIcon} />
            <Text style={s.emptyText}>No expenses recorded for this month yet 📈.</Text>
          </View>
        ) : (
          <>
            <Text style={s.listLabel}>Share of Spending 🍩</Text>
            <View style={[s.reportCard, cardShadow]}>
              <DonutChart
                rows={rows}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />
              {selectedCategory ? (
                <View style={{ marginTop: 16, width: "100%" }}>
                  <Text style={[s.entryTitle, { marginBottom: 4 }]}>
                    {selectedCategory} — {monthName}
                  </Text>
                  <Text style={[s.dateSub, { marginBottom: 8 }]}>
                    Total: ₹{rows.find((r) => r.category === selectedCategory)?.total?.toFixed(0) ?? "0"}
                  </Text>
                  {categoryHistory.length === 0 ? (
                    <Text style={s.dateSub}>No spending recorded for this category this month.</Text>
                  ) : (
                    categoryHistory.map((entry) => (
                      <View
                        key={entry.id}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingVertical: 8,
                          borderTopWidth: 1,
                          borderTopColor: colors.border,
                          gap: 10,
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={s.entryTitle} numberOfLines={1}>{entry.title}</Text>
                          <Text style={s.dateSub}>{shortDate(entry.date)}</Text>
                        </View>
                        <Text style={[s.barAmount, { width: "auto" }]}>₹{Number(entry.amount).toFixed(0)}</Text>
                      </View>
                    ))
                  )}
                </View>
              ) : (
                <Text style={[s.dateSub, { marginTop: 12, textAlign: "center" }]}>
                  Tap a category to see every date and amount for {monthName}.
                </Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ───────────── BUY SCREEN ─────────────
function BuyScreen() {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState("");
  const [newPriceMin, setNewPriceMin] = useState("");
  const [newPriceMax, setNewPriceMax] = useState("");
  const [currentBalance, setCurrentBalance] = useState(0);
  const [addOpen, setAddOpen] = useState(false);

  const loadData = useCallback(async () => {
    const [data, bal] = await Promise.all([
      listBuyItems(),
      getTotalAccountBalance(),
    ]);
    setItems(data);
    setCurrentBalance(bal);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleAdd() {
    if (!newItem.trim()) return;
    await addBuyItem(newItem.trim(), parseFloat(newPriceMin) || 0, parseFloat(newPriceMax) || 0);
    setNewItem("");
    setNewPriceMin("");
    setNewPriceMax("");
    setAddOpen(false);
    loadData();
  }

  async function handleToggle(id) {
    await toggleBuyItem(id);
    loadData();
  }

  async function handleDelete(id) {
    await deleteBuyItem(id);
    loadData();
  }

  async function moveItem(index, direction) {
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= items.length) return;
    await swapBuyItemsOrder(items[index], items[swapIndex]);
    loadData();
  }

  const pendingItems = items.filter((item) => !item.completed);
  const doneItems = items.filter((item) => !!item.completed);
  const balanceColor = currentBalance >= 0 ? colors.positive : colors.negative;

  // Cumulative Priority Budgeting: higher priority items consume the balance first!
  const affordMap = new Map();
  let remainingBudget = currentBalance;
  for (const item of pendingItems) {
    const cost = item.price_max > 0 ? item.price_max : item.price_min > 0 ? item.price_min : 0;
    if (cost === 0) {
      affordMap.set(item.id, "none");
    } else if (remainingBudget >= cost) {
      affordMap.set(item.id, "green");
      remainingBudget -= cost;
    } else if (item.price_min > 0 && remainingBudget >= item.price_min) {
      affordMap.set(item.id, "yellow");
      remainingBudget = Math.max(0, remainingBudget - item.price_min);
    } else {
      // Prior items in queue used up the budget! Even if within original balance, it's red here!
      affordMap.set(item.id, "red");
    }
  }

  function GlidableBuyCard({ item, realIndex, isCompleted, onMoveItem, onToggleItem, onDeleteItem }) {
    const translateY = useRef(new Animated.Value(0)).current;
    const [isGliding, setIsGliding] = useState(false);
    const lastMovedOffset = useRef(0);

    const glideResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          setIsGliding(true);
          lastMovedOffset.current = 0;
        },
        onPanResponderMove: (_, g) => {
          translateY.setValue(g.dy);
          // If dragged down past ~42px, move down in priority
          if (g.dy - lastMovedOffset.current > 42) {
            onMoveItem(realIndex, 1);
            lastMovedOffset.current = g.dy;
          }
          // If dragged up past -42px, move up in priority
          else if (g.dy - lastMovedOffset.current < -42) {
            onMoveItem(realIndex, -1);
            lastMovedOffset.current = g.dy;
          }
        },
        onPanResponderRelease: () => {
          setIsGliding(false);
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
        },
        onPanResponderTerminate: () => {
          setIsGliding(false);
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        },
      })
    ).current;

    const status = isCompleted ? "none" : (affordMap.get(item.id) || "none");
    const borderColor = status === "green" ? "#22C55E50" : status === "red" ? "#EF444450" : status === "yellow" ? "#FBBF2450" : colors.border;
    const textColor = status === "green" ? "#22C55E" : status === "red" ? "#EF4444" : status === "yellow" ? "#FBBF24" : colors.text;

    return (
      <Animated.View
        style={{
          transform: [{ translateY }, { scale: isGliding ? 1.02 : 1 }],
          zIndex: isGliding ? 999 : 1,
          marginBottom: 8,
        }}
      >
        <SwipeableRow onSwipeDelete={() => onDeleteItem(item.id)}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: isGliding ? colors.surfaceHighlight : colors.surface,
              borderRadius: 14,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderWidth: 1.5,
              borderColor: isGliding ? colors.streakOrange : borderColor,
              gap: 8,
              elevation: isGliding ? 8 : 0,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: isGliding ? 6 : 0 },
              shadowOpacity: isGliding ? 0.35 : 0,
              shadowRadius: isGliding ? 10 : 0,
            }}
          >
            {/* Spotify-style Glide Handle */}
            {!isCompleted && (
              <View
                {...glideResponder.panHandlers}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 6,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: isGliding ? colors.streakOrange : colors.textMuted,
                    fontSize: 22,
                    fontWeight: "900",
                    lineHeight: 22,
                    letterSpacing: -1,
                  }}
                >
                  ≡
                </Text>
              </View>
            )}

            {/* Item Info */}
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: isCompleted ? colors.textFaint : textColor,
                  fontSize: 14,
                  fontWeight: "700",
                  textDecorationLine: isCompleted ? "line-through" : "none",
                }}
              >
                {item.title}
              </Text>
              {(item.price_min > 0 || item.price_max > 0) && (
                <Text style={{ color: colors.textFaint, fontSize: 11, marginTop: 2, fontWeight: "600" }}>
                  {item.price_min > 0 && item.price_max > 0
                    ? `₹${item.price_min} – ₹${item.price_max}`
                    : item.price_max > 0
                    ? `Up to ₹${item.price_max}`
                    : `From ₹${item.price_min}`}
                </Text>
              )}
            </View>

            {/* Affordability Badge Indicator */}
            {status !== "none" && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                <Text style={{ fontSize: 14 }}>
                  {status === "green" ? "🟢" : status === "red" ? "🔴" : "🟡"}
                </Text>
                {status === "red" && (
                  <Text style={{ color: colors.negative, fontSize: 10, fontWeight: "700" }}>Out of budget</Text>
                )}
              </View>
            )}

            {/* Checkbox */}
            <Pressable
              onPress={() => onToggleItem(item.id)}
              style={[s.buyCheckbox, isCompleted && s.buyCheckboxCompleted]}
            >
              {isCompleted && <Text style={s.buyCheckmark}>✓</Text>}
            </Pressable>

            {/* Delete button */}
            <Pressable onPress={() => onDeleteItem(item.id)} hitSlop={10}>
              <Text style={s.entryDeleteX}>×</Text>
            </Pressable>
          </View>
        </SwipeableRow>
      </Animated.View>
    );
  }

  return (
    <View style={s.screen}>
      <ScreenHeader title="Buy List 🛒" iconKey="buy" />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: BOTTOM_INSET + 100 + TAB_BAR_HEIGHT }}
        keyboardShouldPersistTaps="handled"
      >
        {/* HERO BANNER FOR BUY LIST */}
        <View style={s.bannerCard}>
          <EditableImage
            imageKey="banner_buy"
            defaultSource={LOCAL_ASSETS.uzui}
            style={s.bannerImage}
            resizeMode="contain"
          />
          <View style={s.bannerOverlay}>
            <Text style={s.bannerTitle}>Flashy Shopping ✨</Text>
            <Text style={s.bannerSub}>Prioritize your wishlist in extravagant style 💎</Text>
          </View>
        </View>

        {/* Balance card */}
        <View style={[s.summaryCard, cardShadow, { marginTop: 16, marginBottom: 4 }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={s.balanceLabel}>ACCOUNT BALANCE 💳</Text>
              <Text style={[s.balanceValueLg, { color: balanceColor, marginTop: 2 }]}>
                ₹{currentBalance.toFixed(0)}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <Text style={{ color: colors.positive, fontSize: 10, fontWeight: "700" }}>🟢 Can afford</Text>
              <Text style={{ color: colors.streakGold, fontSize: 10, fontWeight: "700" }}>🟡 Partial range</Text>
              <Text style={{ color: colors.negative, fontSize: 10, fontWeight: "700" }}>🔴 Priority depleted</Text>
            </View>
          </View>
        </View>

        {/* Pending items */}
        {pendingItems.length > 0 && (
          <Text style={[s.listLabel, { marginTop: 14 }]}>Priority Queue 📋 · glide ≡ to reorder</Text>
        )}
        {pendingItems.map((item, idx) => (
          <GlidableBuyCard
            key={item.id}
            item={item}
            realIndex={items.indexOf(item)}
            isCompleted={false}
            onMoveItem={moveItem}
            onToggleItem={handleToggle}
            onDeleteItem={handleDelete}
          />
        ))}

        {/* Done items */}
        {doneItems.length > 0 && (
          <>
            <Text style={[s.listLabel, { marginTop: 14 }]}>Done ✅</Text>
            {doneItems.map((item, idx) => (
              <GlidableBuyCard
                key={item.id}
                item={item}
                realIndex={items.indexOf(item)}
                isCompleted={true}
                onMoveItem={moveItem}
                onToggleItem={handleToggle}
                onDeleteItem={handleDelete}
              />
            ))}
          </>
        )}

        {items.length === 0 && (
          <View style={[s.emptyStateContainer, { marginTop: 30 }]}>
            <Image source={APP_ICONS.buy} style={s.emptyIcon} />
            <Text style={s.emptyText}>No items in your buy list yet! 🛒{"\n"}Tap + to add your first item.</Text>
          </View>
        )}

        {/* Add form */}
        {addOpen && (
          <View style={[s.summaryCard, cardShadow, { marginTop: 16 }]}>
            <Text style={[s.label, { marginTop: 0 }]}>Item name</Text>
            <TextInput
              value={newItem}
              onChangeText={setNewItem}
              placeholder="e.g. AirPods, Running Shoes..."
              placeholderTextColor={colors.textFaint}
              style={s.input}
              autoFocus
              onSubmitEditing={handleAdd}
            />
            <Text style={s.label}>Price range (₹)</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                value={newPriceMin}
                onChangeText={setNewPriceMin}
                placeholder="Min ₹"
                placeholderTextColor={colors.textFaint}
                keyboardType="numeric"
                style={[s.input, { flex: 1 }]}
              />
              <TextInput
                value={newPriceMax}
                onChangeText={setNewPriceMax}
                placeholder="Max ₹"
                placeholderTextColor={colors.textFaint}
                keyboardType="numeric"
                style={[s.input, { flex: 1 }]}
              />
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <Pressable
                onPress={() => setAddOpen(false)}
                style={[s.saveBtn, { flex: 1, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border }]}
              >
                <Text style={{ color: colors.textMuted, fontWeight: "700" }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleAdd}
                style={[s.saveBtn, { flex: 2, backgroundColor: "#4ADE80" }]}
              >
                <Text style={s.saveBtnText}>Add to List ✅</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      {!addOpen && (
        <Pressable
          style={[s.fab, cardShadow, { backgroundColor: "#4ADE80", bottom: BOTTOM_INSET + 20 + TAB_BAR_HEIGHT }]}
          onPress={() => setAddOpen(true)}
        >
          <Text style={s.fabText}>+</Text>
        </Pressable>
      )}
    </View>
  );
}

// ───────────── PRESET AVATARS ─────────────
const PRESET_AVATARS = [
  { id: "nova", name: "Nova", uri: "https://api.dicebear.com/7.x/lorelei/png?seed=Nova&backgroundColor=ff6b6b&radius=50" },
  { id: "milo", name: "Milo", uri: "https://api.dicebear.com/7.x/lorelei/png?seed=Milo&backgroundColor=4dabf7&radius=50" },
  { id: "asha", name: "Asha", uri: "https://api.dicebear.com/7.x/lorelei/png?seed=Asha&backgroundColor=ffd43b&radius=50" },
  { id: "kai", name: "Kai", uri: "https://api.dicebear.com/7.x/micah/png?seed=Kai&backgroundColor=69db7c&radius=50" },
  { id: "remy", name: "Remy", uri: "https://api.dicebear.com/7.x/micah/png?seed=Remy&backgroundColor=845ef7&radius=50" },
  { id: "sora", name: "Sora", uri: "https://api.dicebear.com/7.x/lorelei/png?seed=Sora&backgroundColor=ff922b&radius=50" },
  { id: "jules", name: "Jules", uri: "https://api.dicebear.com/7.x/notionists/png?seed=Jules&backgroundColor=f06595&radius=50" },
  { id: "noor", name: "Noor", uri: "https://api.dicebear.com/7.x/notionists/png?seed=Noor&backgroundColor=20c997&radius=50" },
  { id: "theo", name: "Theo", uri: "https://api.dicebear.com/7.x/micah/png?seed=Theo&backgroundColor=fab005&radius=50" },
  { id: "indi", name: "Indi", uri: "https://api.dicebear.com/7.x/lorelei/png?seed=Indi&backgroundColor=228be6&radius=50" },
  { id: "marlow", name: "Marlow", uri: "https://api.dicebear.com/7.x/notionists/png?seed=Marlow&backgroundColor=e8590c&radius=50" },
  { id: "pia", name: "Pia", uri: "https://api.dicebear.com/7.x/lorelei/png?seed=Pia&backgroundColor=9c36b5&radius=50" },
];

// ───────────── PROFILE & SETTINGS MODAL ─────────────
function ProfileModal({ visible, onClose, authData, onUpdateUser, onSignOut, themeMode, onToggleTheme }) {
  const user = authData?.user || { name: "Friend", email: "" };
  const [activeTab, setActiveTab] = useState("avatar");
  const [customUrl, setCustomUrl] = useState("");
  const [notificationsEnabled, setNotificationsFlag] = useState(true);

  useEffect(() => {
    if (!visible) return;
    notificationsAreEnabled().then(setNotificationsFlag).catch(() => {});
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.modalBackdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.sheetWrap}
        keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
        pointerEvents="box-none"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={[s.sheetCompact, { maxHeight: "90%" }]}>
            <View style={s.grabber} />

            {/* Profile Overview Card */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 18 }}>
              <View style={s.profileLargeAvatarWrap}>
                {user.picture ? (
                  <Image source={{ uri: user.picture }} style={s.profileLargeAvatar} />
                ) : (
                  <View style={s.profileLargeAvatarPlaceholder}>
                    <Text style={s.profileLargeAvatarInitial}>{(user.name || "W")[0].toUpperCase()}</Text>
                  </View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.profileUserName} numberOfLines={1}>{user.name || "Explorer"}</Text>
                <Text style={s.profileUserEmail} numberOfLines={1}>{user.email || "No email"}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <View style={[s.dotSolid, { backgroundColor: authData?.token ? colors.habitGreen : colors.notes }]} />
                  <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: "600" }}>
                    {authData?.token ? "Google Account Connected" : "Demo Account"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Navigation Options List */}
            <View style={s.profileOptionsContainer}>
              {/* Option 1: Profile & Avatar */}
              <TouchableOpacity
                onPress={() => setActiveTab(activeTab === "avatar" ? null : "avatar")}
                style={[s.profileOptionCard, activeTab === "avatar" && s.profileOptionCardActive]}
                activeOpacity={0.8}
              >
                <View style={s.profileOptionIconWrap}>
                  <Text style={{ fontSize: 20 }}>🖼️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.profileOptionTitle}>Profile Picture</Text>
                  <Text style={s.profileOptionSub}>Choose an avatar or paste custom photo URL</Text>
                </View>
                <Text style={{ color: colors.textMuted, fontSize: 16 }}>{activeTab === "avatar" ? "▲" : "▼"}</Text>
              </TouchableOpacity>

              {/* Avatar Selector Dropdown */}
              {activeTab === "avatar" && (
                <View style={s.avatarSelectionBox}>
                  <Text style={[s.label, { marginTop: 0 }]}>Select Character Avatar:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
                    {PRESET_AVATARS.map((av) => (
                      <TouchableOpacity
                        key={av.id}
                        onPress={() => {
                          onUpdateUser({ ...user, picture: av.uri });
                        }}
                        style={[s.avatarThumbnailWrap, user.picture === av.uri && s.avatarThumbnailWrapSelected]}
                      >
                        <Image source={{ uri: av.uri }} style={s.avatarThumbnail} />
                        <Text style={s.avatarLabel}>{av.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={[s.label, { marginTop: 10 }]}>Or Paste Custom Image URL:</Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TextInput
                      value={customUrl}
                      onChangeText={setCustomUrl}
                      placeholder="https://example.com/avatar.png"
                      placeholderTextColor={colors.textFaint}
                      style={[s.input, { flex: 1 }]}
                    />
                    <Pressable
                      onPress={() => {
                        if (customUrl.trim()) {
                          onUpdateUser({ ...user, picture: customUrl.trim() });
                          setCustomUrl("");
                        }
                      }}
                      style={[s.saveBtn, { marginTop: 0, paddingHorizontal: 16, backgroundColor: colors.streakOrange }]}
                    >
                      <Text style={s.saveBtnText}>Apply</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Option 2: Theme */}
              <TouchableOpacity
                onPress={() => setActiveTab(activeTab === "theme" ? null : "theme")}
                style={[s.profileOptionCard, activeTab === "theme" && s.profileOptionCardActive]}
                activeOpacity={0.8}
              >
                <View style={s.profileOptionIconWrap}>
                  <Text style={{ fontSize: 20 }}>{themeMode === "light" ? "☀️" : "🌙"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.profileOptionTitle}>Theme</Text>
                  <Text style={s.profileOptionSub}>
                    {themeMode === "light" ? "Light theme · warm paper" : "Dark theme · OLED"}
                  </Text>
                </View>
                <View style={s.themeBadge}>
                  <Text style={s.themeBadgeText}>{themeMode === "light" ? "Light ✓" : "Dark ✓"}</Text>
                </View>
              </TouchableOpacity>

              {activeTab === "theme" && (
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                  <Pressable
                    onPress={() => onToggleTheme("light")}
                    style={[
                      s.saveBtn,
                      {
                        flex: 1,
                        marginTop: 0,
                        backgroundColor: themeMode === "light" ? colors.streakOrange : colors.surface,
                        borderWidth: 1,
                        borderColor: themeMode === "light" ? colors.streakOrange : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ color: themeMode === "light" ? "#FFF" : colors.text, fontWeight: "800" }}>
                      Light
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onToggleTheme("dark")}
                    style={[
                      s.saveBtn,
                      {
                        flex: 1,
                        marginTop: 0,
                        backgroundColor: themeMode === "dark" ? colors.notes : colors.surface,
                        borderWidth: 1,
                        borderColor: themeMode === "dark" ? colors.notes : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ color: themeMode === "dark" ? "#FFF" : colors.text, fontWeight: "800" }}>
                      Dark
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* Option 3: Notifications */}
              <TouchableOpacity
                onPress={async () => {
                  const next = !notificationsEnabled;
                  setNotificationsFlag(next);
                  await setNotificationsEnabled(next);
                  if (next) checkTaskReminders().catch(() => {});
                  if (next && Platform.OS === "web" && typeof Notification !== "undefined" && Notification.permission === "denied") {
                    Alert.alert("Notifications are blocked", "Allow notifications for this site in Safari settings, then turn this on again.");
                  }
                }}
                style={s.profileOptionCard}
                activeOpacity={0.8}
              >
                <View style={s.profileOptionIconWrap}>
                  <Text style={{ fontSize: 20 }}>🔔</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.profileOptionTitle}>Notifications & Reminders</Text>
                  <Text style={s.profileOptionSub}>15 minutes before, and again at the due time</Text>
                </View>
                <View style={[s.notificationTogglePill, notificationsEnabled ? s.notificationToggleActive : s.notificationToggleInactive]}>
                  <Text style={{ color: "#FFF", fontSize: 11, fontWeight: "800" }}>{notificationsEnabled ? "ON" : "OFF"}</Text>
                </View>
              </TouchableOpacity>

              {/* Option 4: Logout */}
              <TouchableOpacity
                onPress={() => {
                  Alert.alert("Sign Out", "Are you sure you want to log out of Winnie?", [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Log Out",
                      style: "destructive",
                      onPress: () => {
                        onClose();
                        onSignOut();
                      },
                    },
                  ]);
                }}
                style={[s.profileOptionCard, { borderColor: "rgba(239, 68, 68, 0.3)", marginTop: 6 }]}
                activeOpacity={0.8}
              >
                <View style={[s.profileOptionIconWrap, { backgroundColor: "rgba(239, 68, 68, 0.15)" }]}>
                  <Text style={{ fontSize: 20 }}>🚪</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.profileOptionTitle, { color: colors.negative }]}>Log Out</Text>
                  <Text style={s.profileOptionSub}>Sign out and clear session cache</Text>
                </View>
              </TouchableOpacity>
            </View>

            <Pressable onPress={onClose} style={[s.saveBtn, { backgroundColor: colors.surfaceHighlight, marginTop: 16 }]}>
              <Text style={{ color: colors.text, fontWeight: "700" }}>Done</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ───────────── TASK EDITOR MODAL ─────────────
function TaskEditorModal({ visible, task, onClose, onSaved }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(todayISO());
  const [dueTime, setDueTime] = useState("09:00");
  const [priority, setPriority] = useState("medium");
  const [category, setCategory] = useState("General");
  const [repeat, setRepeat] = useState("none");
  const [saving, setSaving] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  // Calendar navigation month
  const [calMonth, setCalMonth] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });
  // Time picker drum state
  const [pickerHour, setPickerHour] = useState(9);
  const [pickerMinute, setPickerMinute] = useState(0);

  useEffect(() => {
    if (visible) {
      if (task) {
        setTitle(task.title || "");
        setDescription(task.description || "");
        setDueDate(task.due_date || todayISO());
        setDueTime(task.due_time || "09:00");
        setPriority(task.priority || "medium");
        setCategory(task.category || "General");
        setRepeat(task.repeat || "none");
      } else {
        setTitle("");
        setDescription("");
        setDueDate(todayISO());
        setDueTime("09:00");
        setPriority("medium");
        setCategory("General");
        setRepeat("none");
      }
      setShowCalendar(false);
      setShowTimePicker(false);
    }
  }, [visible, task]);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (task?.id) {
        await updateTask(task.id, {
          title: title.trim(),
          description: description.trim(),
          dueDate,
          dueTime,
          priority,
          category,
          repeat,
          googleEventId: task.google_event_id,
        });
      } else {
        await addTask({
          title: title.trim(),
          description: description.trim(),
          dueDate,
          dueTime,
          priority,
          category,
          repeat,
        });
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  // Calendar helpers
  const calYear = calMonth.getFullYear();
  const calMonthIdx = calMonth.getMonth();
  const calCells = getMonthGrid(calYear, calMonthIdx);
  const calLabel = calMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  function selectCalDate(day) {
    if (!day) return;
    const d = new Date(calYear, calMonthIdx, day);
    setDueDate(toISODate(d));
    setShowCalendar(false);
  }

  // Time picker confirm
  function confirmTime() {
    const hh = String(pickerHour).padStart(2, "0");
    const mm = String(pickerMinute).padStart(2, "0");
    setDueTime(`${hh}:${mm}`);
    setShowTimePicker(false);
  }

  const CATEGORIES = ["General", "Work", "Personal", "Health", "Shopping"];
  const PRIORITIES = [
    { key: "high", label: "High 🔴", color: colors.negative },
    { key: "medium", label: "Medium 🟡", color: colors.streakGold },
    { key: "low", label: "Low 🟢", color: colors.habitGreen },
  ];
  const DATE_PRESETS = [
    { label: "Today", date: todayISO() },
    { label: "Tomorrow", date: addDays(todayISO(), 1) },
    { label: "+3 Days", date: addDays(todayISO(), 3) },
    { label: "Next Week", date: addDays(todayISO(), 7) },
  ];
  const TIME_PRESETS = ["09:00", "13:00", "18:00", "21:00"];
  const REPEAT_OPTIONS = [
    { key: "none", label: "Do Not Repeat" },
    { key: "daily", label: "Day by Day (Daily) 🔁" },
    { key: "weekly", label: "Every Week 📅" },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.modalBackdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, justifyContent: "flex-end" }}
        pointerEvents="box-none"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end" }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={s.sheetCompact}>
            <View style={s.grabber} />
            <Text style={s.modalHeaderTitle}>{task ? "Edit Task / Reminder ✏️" : "New Task & Reminder ⏰"}</Text>
            <Text style={[s.label, { marginTop: 0 }]}>Task Title *</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="What do you need to do?"
              placeholderTextColor={colors.textFaint}
              style={s.input}
              autoFocus={!task}
            />

            {/* Due Date */}
            <Text style={s.label}>Due Date 📅</Text>
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
              {DATE_PRESETS.map((p) => (
                <TouchableOpacity
                  key={p.label}
                  onPress={() => { setDueDate(p.date); setShowCalendar(false); }}
                  style={[s.presetPill, dueDate === p.date && s.presetPillActive]}
                >
                  <Text style={[s.presetPillText, dueDate === p.date && s.presetPillTextActive]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Date input + calendar icon */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <TextInput
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textFaint}
                style={[s.input, { flex: 1, marginBottom: 0 }]}
              />
              <TouchableOpacity
                onPress={() => {
                  // Navigate calendar to the selected date's month
                  const parts = dueDate.split("-");
                  if (parts.length === 3) {
                    setCalMonth(new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1));
                  }
                  setShowCalendar((v) => !v);
                  setShowTimePicker(false);
                }}
                style={{
                  width: 42, height: 42,
                  backgroundColor: showCalendar ? "#38BDF8" : colors.surface,
                  borderRadius: 10, borderWidth: 1,
                  borderColor: showCalendar ? "#38BDF8" : colors.border,
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 20 }}>📅</Text>
              </TouchableOpacity>
            </View>

            {/* Inline Calendar Picker */}
            {showCalendar && (
              <View style={{
                backgroundColor: colors.surface, borderRadius: 14,
                padding: 12, marginTop: 8,
                borderWidth: 1, borderColor: colors.border,
              }}>
                {/* Month navigation */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <TouchableOpacity onPress={() => setCalMonth(new Date(calYear, calMonthIdx - 1, 1))} hitSlop={12}>
                    <Text style={[s.arrow, { fontSize: 20 }]}>‹</Text>
                  </TouchableOpacity>
                  <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}>{calLabel}</Text>
                  <TouchableOpacity onPress={() => setCalMonth(new Date(calYear, calMonthIdx + 1, 1))} hitSlop={12}>
                    <Text style={[s.arrow, { fontSize: 20 }]}>›</Text>
                  </TouchableOpacity>
                </View>
                {/* Day labels */}
                <View style={s.weekRow}>
                  {["S","M","T","W","T","F","S"].map((d, i) => (
                    <Text key={i} style={s.weekLabel}>{d}</Text>
                  ))}
                </View>
                {/* Day grid */}
                <View style={s.calendarGrid}>
                  {calCells.map((day, i) => {
                    const dateStr = day ? toISODate(new Date(calYear, calMonthIdx, day)) : null;
                    const isSelected = dateStr === dueDate;
                    const isToday = dateStr === todayISO();
                    return (
                      <Pressable key={i} disabled={!day} onPress={() => selectCalDate(day)} style={s.dayCell}>
                        {day ? (
                          <View style={[
                            s.dayCircleRound,
                            isSelected && { backgroundColor: "#38BDF8" },
                            isToday && !isSelected && s.todayCalendarBorder,
                          ]}>
                            <Text style={[s.dayText, isSelected && { color: "#000", fontWeight: "700" }]}>{day}</Text>
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Due Time */}
            <Text style={[s.label, { marginTop: 12 }]}>Due Time ⏰</Text>
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
              {TIME_PRESETS.map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => { setDueTime(t); setShowTimePicker(false); }}
                  style={[s.presetPill, dueTime === t && s.presetPillActive]}
                >
                  <Text style={[s.presetPillText, dueTime === t && s.presetPillTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Time input + clock icon */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <TextInput
                value={dueTime}
                onChangeText={setDueTime}
                placeholder="HH:mm (e.g. 14:30)"
                placeholderTextColor={colors.textFaint}
                style={[s.input, { flex: 1, marginBottom: 0 }]}
                keyboardType="numeric"
              />
              <TouchableOpacity
                onPress={() => {
                  // Pre-set drum to current time value
                  const parts = dueTime.split(":");
                  setPickerHour(parseInt(parts[0]) || 9);
                  setPickerMinute(parseInt(parts[1]) || 0);
                  setShowTimePicker((v) => !v);
                  setShowCalendar(false);
                }}
                style={{
                  width: 42, height: 42,
                  backgroundColor: showTimePicker ? "#38BDF8" : colors.surface,
                  borderRadius: 10, borderWidth: 1,
                  borderColor: showTimePicker ? "#38BDF8" : colors.border,
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 20 }}>🕐</Text>
              </TouchableOpacity>
            </View>

            {/* Inline Time Picker */}
            {showTimePicker && (
              <View style={{
                backgroundColor: colors.surface, borderRadius: 14,
                padding: 12, marginTop: 8,
                borderWidth: 1, borderColor: colors.border,
              }}>
                <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: "center", marginBottom: 8 }}>
                  Set Alarm Time
                </Text>
                {/* Hour + Minute scroll columns */}
                <View style={{ flexDirection: "row", gap: 12, justifyContent: "center", marginBottom: 12 }}>
                  {/* Hours */}
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 4 }}>Hour</Text>
                    <ScrollView
                      style={{ height: 120, width: 56 }}
                      showsVerticalScrollIndicator={false}
                      snapToInterval={36}
                      decelerationRate="fast"
                      contentContainerStyle={{ paddingVertical: 42 }}
                    >
                      {Array.from({ length: 24 }, (_, h) => (
                        <TouchableOpacity
                          key={h}
                          onPress={() => setPickerHour(h)}
                          style={{
                            height: 36, alignItems: "center", justifyContent: "center",
                            backgroundColor: pickerHour === h ? "#38BDF820" : "transparent",
                            borderRadius: 8,
                          }}
                        >
                          <Text style={{
                            color: pickerHour === h ? "#38BDF8" : colors.text,
                            fontWeight: pickerHour === h ? "800" : "400",
                            fontSize: pickerHour === h ? 18 : 14,
                          }}>{String(h).padStart(2, "0")}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  <Text style={{ color: colors.text, fontSize: 28, fontWeight: "700", alignSelf: "center" }}>:</Text>
                  {/* Minutes */}
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 4 }}>Min</Text>
                    <ScrollView
                      style={{ height: 120, width: 56 }}
                      showsVerticalScrollIndicator={false}
                      snapToInterval={36}
                      decelerationRate="fast"
                      contentContainerStyle={{ paddingVertical: 42 }}
                    >
                      {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                        <TouchableOpacity
                          key={m}
                          onPress={() => setPickerMinute(m)}
                          style={{
                            height: 36, alignItems: "center", justifyContent: "center",
                            backgroundColor: pickerMinute === m ? "#38BDF820" : "transparent",
                            borderRadius: 8,
                          }}
                        >
                          <Text style={{
                            color: pickerMinute === m ? "#38BDF8" : colors.text,
                            fontWeight: pickerMinute === m ? "800" : "400",
                            fontSize: pickerMinute === m ? 18 : 14,
                          }}>{String(m).padStart(2, "0")}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
                {/* Selected time preview */}
                <Text style={{ color: "#38BDF8", textAlign: "center", fontSize: 22, fontWeight: "800", marginBottom: 10 }}>
                  {String(pickerHour).padStart(2, "0")}:{String(pickerMinute).padStart(2, "0")}
                </Text>
                <TouchableOpacity
                  onPress={confirmTime}
                  style={[s.saveBtn, { backgroundColor: "#38BDF8", marginTop: 0 }]}
                >
                  <Text style={s.saveBtnText}>Set Time ✓</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Repeat */}
            <Text style={[s.label, { marginTop: 12 }]}>Repeat 🔁</Text>
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              {REPEAT_OPTIONS.map((r) => (
                <TouchableOpacity
                  key={r.key}
                  onPress={() => setRepeat(r.key)}
                  style={[s.presetPill, repeat === r.key && s.presetPillActive]}
                >
                  <Text style={[s.presetPillText, repeat === r.key && s.presetPillTextActive]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={[s.saveBtn, { backgroundColor: "#38BDF8", opacity: saving ? 0.6 : 1, marginTop: 16 }]}
            >
              <Text style={s.saveBtnText}>{saving ? "Saving..." : task ? "Update Task 🔄" : "Save Task & Reminder 🚀"}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ───────────── TASKS SCREEN ─────────────
function TasksScreen() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const loadData = useCallback(async () => {
    const list = await listTasks();
    setTasks(list);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleToggle(task) {
    await toggleTask(task.id);
    loadData();
  }

  async function handleDelete(task) {
    Alert.alert("Delete Task?", `Remove "${task.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteTask(task.id, task.google_event_id);
          loadData();
        },
      },
    ]);
  }

  const today = todayISO();
  const filteredTasks = tasks.filter((t) => {
    if (filter === "today") {
      if (t.completed) return false;
      return t.due_date <= today;
    }
    if (filter === "upcoming") {
      if (t.completed) return false;
      return t.due_date > today;
    }
    if (filter === "completed") {
      return t.completed;
    }
    return true;
  }).filter((t) => {
    if (categoryFilter === "All") return true;
    return t.category === categoryFilter;
  });

  const pendingCount = tasks.filter((t) => !t.completed).length;
  const todayCount = tasks.filter((t) => !t.completed && t.due_date <= today).length;

  return (
    <View style={s.screen}>
      <ScreenHeader title="Tasks & Reminders" iconKey="tasks" />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: BOTTOM_INSET + 90 + TAB_BAR_HEIGHT }}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner */}
        <View style={s.bannerCard}>
          <EditableImage
                      imageKey="banner_tasks"
                      defaultSource={LOCAL_ASSETS.jiraiya}
            style={s.bannerImage}
            resizeMode="contain"
          />
          <View style={s.bannerOverlay}>
            <Text style={s.bannerTitle}>Focus & Achieve 🎯</Text>
            <Text style={s.bannerSub}>Alerts 15 minutes before, and again when it's due ⚡</Text>
          </View>
        </View>

        {/* Stats card */}
        <View style={[s.summaryCard, cardShadow, { marginTop: 14 }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={s.balanceLabel}>PENDING TASKS 📋</Text>
              <Text style={[s.balanceValueLg, { color: "#38BDF8", marginTop: 2 }]}>
                {pendingCount} Tasks
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={s.balanceLabel}>DUE TODAY ⏰</Text>
              <Text style={[s.balanceValueLg, { color: todayCount > 0 ? colors.streakOrange : colors.habitGreen, marginTop: 2 }]}>
                {todayCount} Today
              </Text>
            </View>
          </View>
          <View style={s.cardDivider} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Image source={APP_ICONS.calendar} style={{ width: 16, height: 16 }} />
            <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: "600" }}>
              Calendar Reminders: 15m before & at due time 🔔
            </Text>
          </View>
        </View>

        {/* Filter Switcher */}
        <View style={[s.segment, { marginTop: 14 }]}>
          {[
            { key: "all", label: "All 📋" },
            { key: "today", label: "Today 📅" },
            { key: "upcoming", label: "Upcoming 🗓️" },
            { key: "completed", label: "Done ✅" },
          ].map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[s.segmentBtn, filter === f.key && { backgroundColor: "#38BDF8" }]}
            >
              <Text style={[s.segmentText, filter === f.key && s.segmentTextActive]}>{f.label}</Text>
            </Pressable>
          ))}
        </View>


        {/* Task Cards */}
        {filteredTasks.length === 0 ? (
          <View style={[s.emptyStateContainer, { marginTop: 24 }]}>
            <Image source={APP_ICONS.empty} style={s.emptyIcon} />
            <Text style={s.emptyText}>No tasks found in this view 🎯{"\n"}Tap + below to schedule a reminder!</Text>
          </View>
        ) : (
          filteredTasks.map((t) => {
            const isOverdue = !t.completed && t.due_date < today;
            const isDueToday = !t.completed && t.due_date === today;
            const priorityColor = t.priority === "high" ? colors.negative : t.priority === "medium" ? colors.streakGold : colors.habitGreen;

            return (
              <View
                key={t.id}
                style={[
                  s.taskCard,
                  cardShadow,
                  t.completed && { opacity: 0.65 },
                  isOverdue && { borderColor: "rgba(239, 68, 68, 0.4)" },
                ]}
              >
                {/* Priority left stripe */}
                <View style={[s.taskPriorityStripe, { backgroundColor: priorityColor }]} />

                <View style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => handleToggle(t)}
                      style={[s.buyCheckbox, t.completed && { backgroundColor: "#38BDF8", borderColor: "#38BDF8" }]}
                    >
                      {t.completed && <Text style={s.buyCheckmark}>✓</Text>}
                    </TouchableOpacity>

                    <View style={{ flex: 1 }}>
                      <Text style={[s.taskTitle, t.completed && s.taskTitleCompleted]}>
                        {t.title}
                      </Text>
                      {t.description ? (
                        <Text style={s.taskDescription} numberOfLines={2}>
                          {t.description}
                        </Text>
                      ) : null}

                      {/* Badges Row */}
                      <View style={s.taskBadgesRow}>
                        <View style={[s.taskBadge, isOverdue && s.taskBadgeOverdue]}>
                          <Text style={[s.taskBadgeText, isOverdue && { color: colors.negative }]}>
                            {isDueToday ? `⏰ Today at ${t.due_time}` : isOverdue ? `⚠️ Overdue (${t.due_date})` : `⏰ ${t.due_date} ${t.due_time}`}
                          </Text>
                        </View>

                        <View style={s.taskBadge}>
                          <Text style={s.taskBadgeText}>{t.category}</Text>
                        </View>

                        {t.repeat !== "none" && (
                          <View style={s.taskBadge}>
                            <Text style={s.taskBadgeText}>
                              🔁 {t.repeat === "daily" ? "Day by Day" : t.repeat === "weekly" ? "Weekly" : t.repeat}
                            </Text>
                          </View>
                        )}

                        {t.google_event_id ? (
                          <View style={[s.taskBadge, { borderColor: "rgba(56, 189, 248, 0.4)" }]}>
                            <Text style={[s.taskBadgeText, { color: "#38BDF8" }]}>📅 Synced (15m alert)</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>
                </View>

                {/* Actions */}
                <View style={s.taskActionsCol}>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingTask(t);
                      setEditorOpen(true);
                    }}
                    hitSlop={8}
                    style={{ padding: 4 }}
                  >
                    <Text style={{ fontSize: 14 }}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(t)}
                    hitSlop={8}
                    style={{ padding: 4 }}
                  >
                    <Text style={{ color: colors.textFaint, fontSize: 16, fontWeight: "700" }}>×</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable
        style={[s.fab, cardShadow, { backgroundColor: "#38BDF8", bottom: BOTTOM_INSET + 20 + TAB_BAR_HEIGHT }]}
        onPress={() => {
          setEditingTask(null);
          setEditorOpen(true);
        }}
      >
        <Text style={s.fabText}>+</Text>
      </Pressable>

      <TaskEditorModal
        visible={editorOpen}
        task={editingTask}
        onClose={() => setEditorOpen(false)}
        onSaved={loadData}
      />
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

function NotesScreen() {
  const [notes, setNotes] = useState([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const load = useCallback(async () => setNotes(await listNotes()), []);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={s.screen}>
      <ScreenHeader title="Notes" iconKey="notes" />
      <FlatList
        data={notes}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: BOTTOM_INSET + 90 + TAB_BAR_HEIGHT }}
        ListHeaderComponent={
          <View style={{ paddingTop: 10 }}>
            {/* HERO BANNER FOR NOTES */}
            <View style={s.bannerCard}>
              <EditableImage
                imageKey="banner_notes"
                defaultSource={LOCAL_ASSETS.naruto}
                style={s.bannerImage}
                resizeMode="contain"
              />
              <View style={s.bannerOverlay}>
                <Text style={s.bannerTitle}>Ninja Scrolls 📜</Text>
                <Text style={s.bannerSub}>Capture your grand thoughts & secret plans ✨</Text>
              </View>
            </View>

            <Text style={[s.listLabel, { marginTop: 18 }]}>Your Notes 📝</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const preview = (item.body || "").split("\n")[0].trim();
          const noteIndex = index % NOTE_IMAGES.length;
          const noteImage = NOTE_IMAGES[noteIndex];
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
              style={s.noteBannerCard}
            >
              <EditableImage
                imageKey={`note_thumb_${noteIndex}`}
                defaultSource={noteImage}
                style={s.noteBannerImage}
                resizeMode="cover"
              />
              <View style={s.noteBannerContent}>
                <Text style={s.noteBannerTitle} numberOfLines={1}>
                  {item.title || "Untitled note"}
                </Text>
                <Text style={s.noteBannerPreview} numberOfLines={2}>
                  {preview || "No additional text"}
                </Text>
              </View>
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
        style={[s.fab, cardShadow, { backgroundColor: colors.notes, bottom: BOTTOM_INSET + 20 + TAB_BAR_HEIGHT }]}
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
  { key: "tasks", label: "Tasks", accent: "#38BDF8" },
  { key: "notes", label: "Notes", accent: colors.notes },
  { key: "buy", label: "Buy", accent: "#4ADE80" },
  { key: "health", label: "Health", accent: colors.periods },
];

// ───────────── LOGIN SCREEN ─────────────
function LoginScreen({ onGoogleLogin, onDemoLogin, loading, authError }) {
  return (
    <View style={s.authScreen}>
      <ScrollView contentContainerStyle={s.authScrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.authLogoBox}>
          <EditableImage
            imageKey="logo_winnie"
            defaultSource={LOCAL_ASSETS.winnie}
            style={s.authLogoImage}
            resizeMode="cover"
          />
        </View>

        <Text style={s.authTitle}>Winnie 🐾</Text>
        <Text style={s.authTagline}>Daily Rhythm & Life Tracker</Text>

        <View style={[s.authFeatureCard, cardShadow]}>
          <View style={s.authFeatureRow}>
            <Text style={{ fontSize: 20 }}>🔥</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.authFeatureTitle}>Habits & Streaks</Text>
              <Text style={s.authFeatureSub}>Build unbreakable consistency with daily rituals</Text>
            </View>
          </View>
          <View style={s.authFeatureRow}>
            <Text style={{ fontSize: 20 }}>💳</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.authFeatureTitle}>Smart Finance</Text>
              <Text style={s.authFeatureSub}>Track daily expenses, incomes & cashflow breakdowns</Text>
            </View>
          </View>
          <View style={s.authFeatureRow}>
            <Text style={{ fontSize: 20 }}>📊</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.authFeatureTitle}>Google Sheets Cloud Sync</Text>
              <Text style={s.authFeatureSub}>Safe & permanent storage in your personal Google account</Text>
            </View>
          </View>
        </View>

        {authError ? (
          <View style={s.authErrorBanner}>
            <Text style={s.authErrorText}>{authError}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          onPress={onGoogleLogin}
          disabled={loading}
          style={[s.googleBtn, loading && { opacity: 0.7 }]}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 20 }}>🔑</Text>
          <Text style={s.googleBtnText}>
            {loading ? "Connecting to Google… ⏳" : "Sign in with Google"}
          </Text>
        </TouchableOpacity>

        <Text style={s.authPrivacyNote}>
          Your data lives privately in your Google Drive spreadsheet. No third-party servers. 🔒
        </Text>

        <TouchableOpacity
          onPress={onDemoLogin}
          style={s.demoBtn}
          activeOpacity={0.7}
        >
          <Text style={s.demoBtnText}>⚡ Continue as Guest / Demo</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ───────────── GENDER SELECTION SCREEN ─────────────
function GenderSelectScreen({ userName, onSelectGender }) {
  const [selected, setSelected] = useState(null);

  return (
    <View style={s.authScreen}>
      <ScrollView contentContainerStyle={s.authScrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.genderHeaderBox}>
          <Text style={s.genderGreeting}>Welcome, {userName || "Champ"}! 👋</Text>
          <Text style={s.genderSub}>
            Please select your gender to personalize your trackers & experience:
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setSelected("male")}
          style={[
            s.genderOptionCard,
            cardShadow,
            selected === "male" && s.genderOptionCardSelected,
          ]}
          activeOpacity={0.85}
        >
          <View style={s.genderOptionEmojiWrap}>
            <Text style={{ fontSize: 36 }}>👦</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={s.genderOptionTitle}>Male</Text>
              {selected === "male" && <Text style={{ color: colors.streakOrange, fontWeight: "800" }}>✓ Selected</Text>}
            </View>
            <Text style={s.genderOptionDesc}>
              Tailored layout for daily habits, study streaks, expenses & personal notes.
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setSelected("female")}
          style={[
            s.genderOptionCard,
            cardShadow,
            selected === "female" && s.genderOptionCardSelectedFemale,
          ]}
          activeOpacity={0.85}
        >
          <View style={s.genderOptionEmojiWrap}>
            <Text style={{ fontSize: 36 }}>👧</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={[s.genderOptionTitle, selected === "female" && { color: colors.periods }]}>Female</Text>
              {selected === "female" && <Text style={{ color: colors.periods, fontWeight: "800" }}>✓ Selected</Text>}
            </View>
            <Text style={s.genderOptionDesc}>
              Includes full Cycle & Period Health Tracker 🌸 alongside habits & expenses.
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => selected && onSelectGender(selected)}
          disabled={!selected}
          style={[
            s.genderContinueBtn,
            !selected && { opacity: 0.4 },
          ]}
          activeOpacity={0.8}
        >
          <Text style={s.genderContinueBtnText}>Confirm & Launch Winnie 🚀</Text>
        </TouchableOpacity>

        <Text style={s.genderNote}>
          This setting can also be switched anytime in your drawer profile.
        </Text>
      </ScrollView>
    </View>
  );
}

// ───────────── ROOT APP ─────────────
export default function App() {
  const [ready, setReady] = useState(false);
  const [authStep, setAuthStep] = useState("loading"); // "loading" | "login" | "gender" | "main"
  const [authData, setAuthData] = useState(null); // { token, user, gender, sheetId }
  const [tab, setTab] = useState("home");
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [themeMode, setThemeMode] = useState("dark");

  const isExpoGo =
    Constants.appOwnership === AppOwnership?.Expo ||
    Constants.appOwnership === "expo" ||
    Constants.executionEnvironment === "storeClient";

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CONFIG.webClientId,
    webClientId: GOOGLE_CONFIG.webClientId,
    androidClientId: isExpoGo ? undefined : GOOGLE_CONFIG.androidClientId,
    iosClientId: isExpoGo ? undefined : GOOGLE_CONFIG.iosClientId,
    scopes: [
      "openid",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/calendar.events",
    ],
    selectAccount: true,
  });

  useEffect(() => {
    if (request?.redirectUri) {
      console.log("[GoogleAuth] Active Redirect URI:", request.redirectUri);
    }
  }, [request]);

  useEffect(() => {
    if (webOAuthHash.error && !webOAuthHash.token) {
      setAuthLoading(false);
      setAuthError(`Google sign-in did not finish (${webOAuthHash.error}). Add ${request?.redirectUri || "this site URL"} as an authorized redirect URI in Google Cloud.`);
    }
    if (response?.type === "success") {
      const { authentication, params } = response;
      const token = authentication?.accessToken || params?.access_token;
      if (token) {
        authDecisionLocked = true;
        handleGoogleToken(token);
      }
    } else if (response?.type === "error") {
      setAuthLoading(false);
      setAuthError(response.error?.message || "Google sign-in was cancelled or failed.");
    }
  }, [response, request?.redirectUri]);

  async function handleGoogleToken(token) {
    if (!token || googleSignInToken === token) return;
    googleSignInToken = token;
    authDecisionLocked = true;
    setAuthLoading(true);
    setAuthError(null);
    try {
      await saveAuthData({ token });
      activeToken = token;

      let userInfo = { name: "User", email: "" };
      try {
        const userRes = await fetch("https://www.googleapis.com/userinfo/v2/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (userRes.ok) userInfo = await userRes.json();
      } catch (err) {
        console.log("[Auth] Could not load Google profile:", err);
      }

      let sheetId = null;
      let resolvedGender = null;
      try {
        sheetId = await createOrFindSpreadsheet(token);
        if (sheetId) setSheetsContext(token, sheetId);
        const restoreRes = sheetId ? await restoreAllFromSheets(token, sheetId) : null;
        const stored = await getStoredAuth();
        resolvedGender = restoreRes?.gender || stored.gender || null;
      } catch (err) {
        console.log("[Auth] Sheets sync failed, continuing with this device:", err);
        const stored = await getStoredAuth();
        resolvedGender = stored.gender || null;
      }

      const newAuth = {
        token,
        user: userInfo,
        gender: resolvedGender,
        sheetId,
      };

      await saveAuthData(newAuth);
      setAuthData(newAuth);
      setAuthStep(resolvedGender ? "main" : "gender");
    } catch (e) {
      console.log("[Auth] Error handling Google sign-in:", e);
      setAuthError("Google sign-in could not be saved in this browser. Allow site data, then try again.");
      setAuthStep("login");
    } finally {
      setAuthLoading(false);
      setReady(true);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
      } catch (err) {
        console.warn("[AppInit] Database init error (fallback mode):", err);
      }
      // Load persisted theme
      try {
        const savedTheme = await AsyncStorage.getItem(STORAGE_KEYS.THEME);
        if (savedTheme === "light" || savedTheme === "dark") {
          applyTheme(savedTheme);
          setThemeMode(savedTheme);
        }
      } catch (_) {}
      if (webOAuthHash.token) {
        authDecisionLocked = true;
        await handleGoogleToken(webOAuthHash.token);
        return;
      }
      if (authDecisionLocked) {
        setReady(true);
        return;
      }
      try {
        const stored = await getStoredAuth();
        if (authDecisionLocked) {
          setReady(true);
          return;
        }
        if (stored.token || stored.user) {
          if (stored.token && stored.sheetId) {
            setSheetsContext(stored.token, stored.sheetId);
          }
          setAuthData(stored);
          if (stored.gender) {
            setAuthStep("main");
          } else if (stored.token) {
            setAuthStep("gender");
          } else {
            setAuthStep("login");
          }
        } else {
          setAuthStep("login");
        }
      } catch (err) {
        console.warn("[AppInit] Stored auth error:", err);
        if (!authDecisionLocked) setAuthStep("login");
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready || authStep !== "main") return;
    checkTaskReminders();
    const timer = setInterval(checkTaskReminders, 30000);
    const onVisible = () => {
      if (typeof document === "undefined" || document.visibilityState === "visible") checkTaskReminders();
    };
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisible);
    }
    const appStateSub = AppState.addEventListener("change", (next) => {
      if (next === "active") checkTaskReminders();
    });
    return () => {
      clearInterval(timer);
      appStateSub.remove();
      if (Platform.OS === "web" && typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisible);
      }
    };
  }, [ready, authStep]);

  async function handleUpdateUserProfile(updatedUser) {
    const updated = {
      ...(authData || {}),
      user: updatedUser,
    };
    await saveAuthData(updated);
    setAuthData(updated);
    triggerTableSync("profile", 100);
  }

  async function handleSelectGender(chosenGender) {
    const updated = {
      ...(authData || {}),
      gender: chosenGender,
    };
    await saveAuthData(updated);
    setAuthData(updated);
    triggerTableSync("profile", 100);
    setAuthStep("main");
  }

  async function handleSignOut() {
    googleSignInToken = null;
    authDecisionLocked = false;
    await clearAuthData();
    setAuthData(null);
    setTab("home");
    setAuthStep("login");
  }

  function handleDemoLogin() {
    const demoUser = {
      name: "Adventurer",
      email: "explorer@winnie.app",
      id: "demo-user",
    };
    const newAuth = {
      token: "demo-token",
      user: demoUser,
      gender: null,
      sheetId: "demo-sheet",
    };
    saveAuthData(newAuth);
    setAuthData(newAuth);
    setAuthStep("gender");
  }

  const statusBarStyle = themeMode === "light" ? "dark-content" : "light-content";

  if (!ready || authStep === "loading") {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar barStyle={statusBarStyle} backgroundColor={colors.bg} />
        <View style={[s.screen, { alignItems: "center", justifyContent: "center" }]}>
          <Text style={{ color: colors.textMuted }}>Loading Winnie… 🐾</Text>
        </View>
      </GestureHandlerRootView>
    );
  }

  if (authStep === "login") {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar barStyle={statusBarStyle} backgroundColor={colors.bg} />
        <LoginScreen
          onGoogleLogin={() => {
            setAuthError(null);
            if (GOOGLE_CONFIG.webClientId.includes("YOUR_WEB_CLIENT_ID")) {
              setAuthError("Google OAuth Client ID is not configured yet. Add your Client ID to GOOGLE_CONFIG in App.js or use Demo Login.");
              return;
            }
            if (Platform.OS === "web") {
              if (!request?.url) {
                setAuthError("Google sign-in is still starting. Wait a moment and try again.");
                return;
              }
              window.location.assign(request.url);
              return;
            }
            setAuthLoading(true);
            promptAsync();
          }}
          onDemoLogin={handleDemoLogin}
          loading={authLoading}
          authError={authError}
        />
      </GestureHandlerRootView>
    );
  }

  if (authStep === "gender") {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar barStyle={statusBarStyle} backgroundColor={colors.bg} />
        <GenderSelectScreen
          userName={authData?.user?.name || "Friend"}
          onSelectGender={handleSelectGender}
        />
      </GestureHandlerRootView>
    );
  }

  const userGender = authData?.gender || "female";
  const currentTabs = TABS.filter((t) => {
    if (t.key === "health" && userGender === "male") return false;
    return true;
  });

  const openProfile = () => setProfileModalOpen(true);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppContext.Provider
        value={{
          openProfile,
          userProfile: authData?.user,
        }}
      >
        <ZoomContainer key={themeMode}>
          <View style={s.screen}>
            <StatusBar barStyle={statusBarStyle} backgroundColor={colors.bg} />
            {tab === "home" && <HomeScreen />}
            {tab === "tasks" && <TasksScreen />}
            {tab === "expenses" && <ExpensesScreen focusKey={tab} />}
            {tab === "reports" && <ExpenseReportsScreen />}
            {tab === "progress" && <ProgressScreen />}
            {tab === "notes" && <NotesScreen />}
            {tab === "buy" && <BuyScreen />}
            {tab === "health" && userGender === "female" && <HealthScreen />}

            {/* ── BOTTOM TAB BAR (WhatsApp-style) ── */}
            <View style={s.bottomTabBar}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.bottomTabScrollContent}
              >
                {currentTabs.map((t) => {
                  const isActive = tab === t.key;
                  return (
                    <Pressable
                      key={t.key}
                      onPress={() => setTab(t.key)}
                      style={s.bottomTabItem}
                      android_ripple={{ color: "rgba(255,255,255,0.08)", borderless: true }}
                    >
                      {APP_ICONS[t.key] ? (
                        <Image
                          source={APP_ICONS[t.key]}
                          style={[s.bottomTabIcon, { opacity: isActive ? 1 : 0.35 }]}
                        />
                      ) : (
                        <Text style={{ fontSize: 18, opacity: isActive ? 1 : 0.35 }}>•</Text>
                      )}
                      <Text
                        style={[
                          s.bottomTabLabel,
                          { color: isActive ? t.accent : colors.textFaint, fontWeight: isActive ? "700" : "400" },
                        ]}
                        numberOfLines={1}
                      >
                        {t.label}
                      </Text>
                      {isActive && (
                        <View style={[s.bottomTabActiveDot, { backgroundColor: t.accent }]} />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <ProfileModal
              visible={profileModalOpen}
              onClose={() => setProfileModalOpen(false)}
              authData={authData}
              onUpdateUser={handleUpdateUserProfile}
              onSignOut={handleSignOut}
              themeMode={themeMode}
              onToggleTheme={async (nextMode) => {
                applyTheme(nextMode);
                setThemeMode(nextMode);
                try {
                  await AsyncStorage.setItem(STORAGE_KEYS.THEME, nextMode);
                } catch (_) {}
              }}
            />
          </View>
        </ZoomContainer>
      </AppContext.Provider>
    </GestureHandlerRootView>
  );
}

// ───────────── STYLESHEET ─────────────
function createAppStyles(colors) {
  return StyleSheet.create({
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
  },
  bannerCard: {
    width: "100%",
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
  bannerOverlay: {
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
  menuLine: {
    width: 16,
    height: 2,
    backgroundColor: colors.text,
    borderRadius: 1,
  },
  headerTitleText: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  todayDate: { color: colors.textMuted, fontSize: 14, fontWeight: "500" },
  homeGreetingRow: { marginVertical: 4 },

  backdrop: { backgroundColor: "rgba(0,0,0,0.6)" },
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 280,
    backgroundColor: colors.surfaceRaised,
    paddingTop: TOP_INSET + 20,
    paddingHorizontal: 20,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  drawerBrand: { color: colors.text, fontSize: 20, fontWeight: "800" },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 12,
  },
  drawerItemText: { color: colors.textMuted, fontSize: 15 },

  dot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5 },
  dotSolid: { width: 8, height: 8, borderRadius: 4 },

  weekStreakCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weekStreakHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  weekStreakTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  weekStreakSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  weekStreakBadge: {
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  weekStreakBadgeText: { color: colors.habitGreen, fontSize: 12, fontWeight: "700" },
  weekStreakRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  weekStreakDayCol: { alignItems: "center", flex: 1 },
  weekStreakTodayCol: { backgroundColor: "rgba(255,107,53,0.08)", borderRadius: 10, paddingVertical: 4 },
  weekStreakDayLabel: { color: colors.textFaint, fontSize: 11, marginBottom: 6, fontWeight: "600" },
  weekStreakDotSlot: { height: 12, justifyContent: "center", alignItems: "center", marginTop: 4 },
  weekRingFilled: { justifyContent: "center", alignItems: "center", borderWidth: 1 },
  weekRingCheck: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  weekRingDayNum: { fontSize: 12 },
  todayActiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.streakOrange,
    position: "absolute",
    bottom: 2,
  },

  habitsSectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeaderTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
  sectionHeaderSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  addRitualTopBtn: {
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  addRitualTopBtnText: { color: colors.habitGreen, fontSize: 12, fontWeight: "700" },
  habitsRow: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 14 },
  habitCircleWrap: { alignItems: "center", width: 64 },
  habitCircleBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  habitCircleBtnActive: {
    backgroundColor: colors.surfaceHighlight,
    borderColor: colors.habitGreen,
  },
  habitCircleBtnInactive: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
  },
  addCircleBtn: {
    borderStyle: "dashed",
    borderColor: colors.textFaint,
    backgroundColor: "transparent",
  },
  habitEmoji: { fontSize: 26 },
  habitCheckmarkBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: colors.habitGreen,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  habitCheckmarkText: { color: "#FFF", fontSize: 11, fontWeight: "800" },
  habitLabel: { color: colors.textMuted, fontSize: 11, marginTop: 6, textAlign: "center" },

  listLabel: { color: colors.textMuted, fontSize: 13, fontWeight: "600", marginTop: 18, marginBottom: 8 },

  heroStreakCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  flameGlowWrap: { width: 50, height: 50, alignItems: "center", justifyContent: "center" },
  flameGlowEffect: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.streakOrangeGlow,
  },
  heroFlameIcon: { fontSize: 32 },
  heroStreakNumber: { color: colors.text, fontSize: 44, fontWeight: "900", marginTop: -4 },
  heroStreakTitle: { color: colors.streakOrange, fontSize: 16, fontWeight: "800", marginTop: -2 },
  heroStreakSubtitle: { color: colors.textMuted, fontSize: 12, textAlign: "center", marginTop: 6, paddingHorizontal: 10 },
  dualStreakContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    width: "100%",
  },
  streakMetricCard: { flex: 1, alignItems: "center" },
  streakMetricHeader: { flexDirection: "row", alignItems: "center", gap: 4 },
  streakMetricLabel: { color: colors.textFaint, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  streakMetricValueRow: { flexDirection: "row", alignItems: "baseline", gap: 2, marginTop: 2 },
  streakMetricValue: { color: colors.streakOrange, fontSize: 22, fontWeight: "900" },
  streakMetricUnit: { color: colors.textMuted, fontSize: 11 },
  streakMetricSub: { color: colors.textFaint, fontSize: 10, marginTop: 2 },
  streakMetricDivider: { width: 1, height: 36, backgroundColor: colors.border },

  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthNav: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  monthLabel: { color: colors.text, fontSize: 17, fontWeight: "800" },
  dateSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  arrow: { color: colors.textMuted, fontSize: 24, paddingHorizontal: 8 },
  weekRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 14, marginBottom: 8 },
  weekLabel: { color: colors.textFaint, fontSize: 11, fontWeight: "700", width: 32, textAlign: "center" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: { width: "14.28%", aspectRatio: 1, padding: 2, alignItems: "center", justifyContent: "center" },
  dayCircleRound: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  streakDayCellActive: { backgroundColor: colors.streakOrange },
  periodCircleMarked: { backgroundColor: colors.periods },
  streakDayFireIcon: { fontSize: 12 },
  streakDayNumText: { color: "#FFF", fontSize: 10, fontWeight: "800", marginTop: -2 },
  dayText: { color: colors.textMuted, fontSize: 12 },
  squareMarker: { borderRadius: 8 },
  todayCalendarBorder: { borderWidth: 1, borderColor: colors.streakOrange },
  cardDivider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  hint: { color: colors.textFaint, fontSize: 11, textAlign: "center" },

  learningCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  learningHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  learningTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  learningCollapsedText: { color: colors.textFaint, fontSize: 11, marginTop: 2 },
  learningToggle: { fontSize: 20, fontWeight: "800" },
  learningInput: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 12,
    padding: 12,
    color: colors.text,
    fontSize: 14,
    minHeight: 80,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  learningSave: { borderRadius: 12, paddingVertical: 10, alignItems: "center", marginTop: 12 },
  learningEntry: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: colors.border,
  },
  learningEntryText: { color: colors.text, fontSize: 13, flex: 1, lineHeight: 18 },
  learningEntryHint: { color: colors.textFaint, fontSize: 10, marginTop: 4 },

  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  sheetWrap: { justifyContent: "flex-end", flex: 1 },
  sheet: {
    backgroundColor: colors.surfaceRaised,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  sheetCompact: {
    backgroundColor: colors.surfaceRaised,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  grabber: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 16 },
  modalHeaderTitle: { color: colors.text, fontSize: 18, fontWeight: "800", marginBottom: 14 },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: "600", marginTop: 10, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emojiPreviewBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  emojiPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginRight: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveBtn: { borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 16 },
  saveBtnText: { color: "#FFF", fontSize: 14, fontWeight: "700" },

  inputWrap: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dropdown: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
    maxHeight: 180,
    overflow: "hidden",
  },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  rowDot: { width: 6, height: 6, borderRadius: 3 },
  rowText: { color: colors.text, fontSize: 13 },
  addNew: { fontSize: 13, fontWeight: "600" },

  bdHeaderRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  bdHeaderLabel: { color: colors.textFaint, fontSize: 11, fontWeight: "700" },
  bdRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  bdItemText: { color: colors.text, fontSize: 13, flex: 1 },
  bdAmountRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  bdAmountText: { color: colors.textMuted, fontSize: 13 },
  bdRemove: { color: colors.negative, fontSize: 18, fontWeight: "700" },
  bdAddRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  bdAddInput: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: colors.text,
    fontSize: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bdAddBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  bdAddBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  bdTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bdTotalLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  bdTotalValue: { fontSize: 14, fontWeight: "800" },

  cycleRow: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cycleRange: { color: colors.text, fontSize: 14, fontWeight: "600" },

  segment: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  segmentBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  segmentText: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  segmentTextActive: { color: "#FFF", fontWeight: "800" },
  quickEntryRow: { flexDirection: "row", gap: 10 },
  quickTitleInput: { flex: 1.5 },
  quickAmountInput: { flex: 1 },
  breakdownBox: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },

  swipeWrap: { marginBottom: 8, overflow: "hidden", borderRadius: 14 },
  swipeBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.negative,
    justifyContent: "center",
    paddingLeft: 20,
    borderRadius: 14,
  },
  swipeDeleteLabel: { color: "#FFF", fontSize: 13, fontWeight: "800" },
  entryCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  entryRow: { flexDirection: "row", alignItems: "center", padding: 12 },
  entryCardThumb: { width: 36, height: 36, borderRadius: 8, marginRight: 10 },
  entryLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  entryTitle: { color: colors.text, fontSize: 14, fontWeight: "700" },
  entryCategory: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  entryRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  entryAmount: { fontSize: 14, fontWeight: "800" },
  entryDeleteX: { color: colors.textFaint, fontSize: 18, fontWeight: "700", paddingHorizontal: 4 },
  entryBreakdownWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 12,
    backgroundColor: colors.surfaceRaised,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  entryBreakdownRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  entryBreakdownLabel: { color: colors.textMuted, fontSize: 12 },
  entryBreakdownAmount: { color: colors.text, fontSize: 12, fontWeight: "600" },

  dateRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dateDay: { color: colors.text, fontSize: 26, fontWeight: "900" },
  balanceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  balanceLabel: { color: colors.textFaint, fontSize: 10, fontWeight: "700" },
  balanceValueSm: { color: colors.textMuted, fontSize: 14, fontWeight: "700", marginTop: 2 },
  balanceValueLg: { color: colors.expense, fontSize: 18, fontWeight: "900", marginTop: 2 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: BOTTOM_INSET + 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.expense,
    alignItems: "center",
    justifyContent: "center",
  },
  fabText: { color: "#FFF", fontSize: 28, fontWeight: "800", marginTop: -2 },

  donutWrap: { alignItems: "center", justifyContent: "center", marginVertical: 10 },
  donutCenter: { position: "absolute", alignItems: "center" },
  donutTotal: { color: colors.text, fontSize: 18, fontWeight: "900" },
  donutCaption: { color: colors.textMuted, fontSize: 10 },

  reportMetricsRow: { flexDirection: "row", justifyContent: "space-between" },
  reportMetricCol: { flex: 1 },
  reportMetricValue: { fontSize: 13, fontWeight: "800", marginTop: 4 },
  reportCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reportRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  reportRowLabel: { flexDirection: "row", alignItems: "center", gap: 8 },
  reportCategoryText: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  barChartRow: { flexDirection: "row", alignItems: "center", marginVertical: 6, gap: 10 },
  barChartLabel: { color: colors.textMuted, fontSize: 12, width: 90 },
  barTrack: { flex: 1, height: 8, backgroundColor: colors.surfaceRaised, borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },
  barAmount: { color: colors.text, fontSize: 12, fontWeight: "700", width: 50, textAlign: "right" },

  buyCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  buyTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  buyToggleBtn: { padding: 4 },
  buyToggleIcon: { color: colors.notes, fontSize: 20, fontWeight: "800" },
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
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.notes,
    alignItems: "center",
    justifyContent: "center",
  },
  buyAddBtnText: { color: "#FFF", fontSize: 18, fontWeight: "800" },
  buyItemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  buyItemText: { color: colors.text, fontSize: 13, flex: 1 },
  buyItemTextCompleted: { color: colors.textFaint, textDecorationLine: "line-through" },
  buyCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  buyCheckboxCompleted: { backgroundColor: colors.notes, borderColor: colors.notes },
  buyCheckmark: { color: "#FFF", fontSize: 12, fontWeight: "800" },

  noteSheet: {
    backgroundColor: colors.surfaceRaised,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    height: "80%",
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  noteTitleInput: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 12,
    paddingVertical: 4,
  },
  noteBodyInput: { color: colors.text, fontSize: 14, flex: 1, lineHeight: 20 },
  noteBannerCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginVertical: 6,
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteBannerImage: { width: 80, height: 80 },
  noteBannerContent: { flex: 1, padding: 12, justifyContent: "center" },
  noteBannerTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  noteBannerPreview: { color: colors.textMuted, fontSize: 12, marginTop: 4 },

  // Auth & Gender Selection Styles
  authScreen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  authScrollContent: {
    paddingHorizontal: 24,
    paddingTop: TOP_INSET + 24,
    paddingBottom: BOTTOM_INSET + 32,
    alignItems: "center",
  },
  authLogoBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.streakOrange,
    marginBottom: 16,
    ...cardShadow,
  },
  authLogoImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  authTitle: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  authTagline: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "500",
    marginTop: 4,
    marginBottom: 24,
  },
  authFeatureCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
    gap: 16,
  },
  authFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  authFeatureTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  authFeatureSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  authErrorBanner: {
    width: "100%",
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 1,
    borderColor: colors.negative,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  authErrorText: {
    color: colors.negative,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  googleBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: colors.text,
    borderRadius: 14,
    paddingVertical: 14,
    ...cardShadow,
  },
  googleBtnText: {
    color: colors.bg,
    fontSize: 15,
    fontWeight: "800",
  },
  authPrivacyNote: {
    color: colors.textFaint,
    fontSize: 11,
    textAlign: "center",
    marginTop: 14,
    lineHeight: 16,
    paddingHorizontal: 12,
  },
  demoBtn: {
    marginTop: 18,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoBtnText: {
    color: colors.streakOrange,
    fontSize: 13,
    fontWeight: "700",
  },
  genderHeaderBox: {
    alignItems: "center",
    marginBottom: 28,
  },
  genderGreeting: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
  },
  genderSub: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  genderOptionCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 2,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  genderOptionCardSelected: {
    borderColor: colors.streakOrange,
    backgroundColor: colors.surfaceRaised,
  },
  genderOptionCardSelectedFemale: {
    borderColor: colors.periods,
    backgroundColor: colors.surfaceRaised,
  },
  genderOptionEmojiWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  genderOptionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
  },
  genderOptionDesc: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  genderContinueBtn: {
    width: "100%",
    backgroundColor: colors.habitGreen,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    ...cardShadow,
  },
  genderContinueBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
  },
  genderNote: {
    color: colors.textFaint,
    fontSize: 11,
    textAlign: "center",
    marginTop: 16,
  },
  drawerAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Bottom Tab Bar ──
  bottomTabBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: TAB_BAR_HEIGHT,
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: Platform.OS === "ios" ? 12 : 4,
    paddingTop: 4,
    ...cardShadow,
  },
  bottomTabItem: {
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    position: "relative",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  bottomTabIcon: {
    width: 22,
    height: 22,
    resizeMode: "contain",
  },
  bottomTabLabel: {
    fontSize: 9,
    letterSpacing: 0.2,
  },
  bottomTabActiveDot: {
    position: "absolute",
    top: 0,
    width: 24,
    height: 2,
    borderRadius: 1,
  },

  // ── Reports Loading ──
  reportLoadingContainer: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
  },
  reportLoadingIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  reportLoadingTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  reportLoadingSub: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
  },

  // ── Header Profile Button ──
  profileHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: colors.streakOrange,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceRaised,
    marginLeft: 10,
    ...cardShadow,
  },
  profileHeaderAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 19,
  },
  profileHeaderPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceHighlight,
  },
  profileHeaderInitial: {
    color: colors.streakOrange,
    fontSize: 16,
    fontWeight: "900",
  },

  // ── Bottom Tab Bar Scroll Content ──
  bottomTabScrollContent: {
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 6,
  },

  // ── Profile Modal ──
  profileLargeAvatarWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: colors.streakOrange,
    overflow: "hidden",
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    ...cardShadow,
  },
  profileLargeAvatar: {
    width: "100%",
    height: "100%",
  },
  profileLargeAvatarPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceHighlight,
  },
  profileLargeAvatarInitial: {
    color: colors.streakOrange,
    fontSize: 28,
    fontWeight: "900",
  },
  profileUserName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  profileUserEmail: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  profileOptionsContainer: {
    gap: 10,
    marginTop: 6,
  },
  profileOptionCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  profileOptionCardActive: {
    borderColor: colors.streakOrange,
  },
  profileOptionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
  profileOptionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  profileOptionSub: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  avatarSelectionBox: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarThumbnailWrap: {
    alignItems: "center",
    padding: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  avatarThumbnailWrapSelected: {
    borderColor: colors.streakOrange,
    backgroundColor: "rgba(255, 107, 53, 0.15)",
  },
  avatarThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.surface,
  },
  avatarLabel: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 4,
    fontWeight: "600",
  },
  themeBadge: {
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  themeBadgeText: {
    color: colors.habitGreen,
    fontSize: 11,
    fontWeight: "800",
  },
  notificationTogglePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  notificationToggleActive: {
    backgroundColor: colors.habitGreen,
  },
  notificationToggleInactive: {
    backgroundColor: colors.textFaint,
  },

  // ── Tasks Screen Styles ──
  taskCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    overflow: "hidden",
  },
  taskPriorityStripe: {
    width: 5,
  },
  taskTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  taskTitleCompleted: {
    color: colors.textFaint,
    textDecorationLine: "line-through",
  },
  taskDescription: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  taskBadgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  taskBadge: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  taskBadgeOverdue: {
    borderColor: "rgba(239, 68, 68, 0.5)",
    backgroundColor: "rgba(239, 68, 68, 0.12)",
  },
  taskBadgeText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "600",
  },
  taskActionsCol: {
    justifyContent: "space-around",
    alignItems: "center",
    paddingRight: 10,
    paddingVertical: 10,
  },
  categoryFilterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryFilterPillActive: {
    backgroundColor: "#38BDF8",
    borderColor: "#38BDF8",
  },
  categoryFilterText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  categoryFilterTextActive: {
    color: "#FFF",
    fontWeight: "800",
  },
  presetPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetPillActive: {
    backgroundColor: "#38BDF8",
    borderColor: "#38BDF8",
  },
  presetPillText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  presetPillTextActive: {
    color: "#FFF",
    fontWeight: "800",
  },
  prioritySelectBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  calendarNoticeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
  },
  calendarNoticeText: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },
  });
}

let s = createAppStyles(colors);