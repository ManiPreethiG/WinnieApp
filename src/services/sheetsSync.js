import AsyncStorage from "@react-native-async-storage/async-storage";
import { getDb } from "./db";

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
  buy_items: ["id", "title", "completed", "created_at"],
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
