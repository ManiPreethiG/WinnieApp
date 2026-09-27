// ───────────── LOCAL ASSETS MAP ─────────────
export const LOCAL_ASSETS = {
  a: require("../../assets/a.png"),
  b: require("../../assets/b.png"),
  c: require("../../assets/c.png"),
  d: require("../../assets/d.png"),
  e: require("../../assets/e.png"),
  f: require("../../assets/f.png"),
  food: require("../../assets/food.png"),
  hi: require("../../assets/hi.png"),
  dolphin: require("../../assets/dolphin.png"),
  inosuke: require("../../assets/inosuke.png"),
  sanemi: require("../../assets/sanemi.png"),
  jiraiya: require("../../assets/jiraiya.png"),
  shikamaru: require("../../assets/shikamaru.jpg"),
  luffy: require("../../assets/luffy.png"),
  luffyAngry: require("../../assets/luffy_angry.png"),
  minato: require("../../assets/minato.png"),
  naruto: require("../../assets/naruto.png"),
  tanjiro: require("../../assets/tanjiro.png"),
  uzui: require("../../assets/uzui.png"),
  nezuko: require("../../assets/nezuko.png"),
  shinobu: require("../../assets/shinobu.png"),
  note1: require("../../assets/note1.jpg"),
  note2: require("../../assets/note2.jpg"),
  note3: require("../../assets/note3.jpg"),
  note4: require("../../assets/note4.jpg"),
  note5: require("../../assets/note5.jpg"),
  winnie: require("../../assets/winnie.jpeg"),
  logo: require("../../assets/winnie.jpeg"),
};

export const NOTE_IMAGES = [
  LOCAL_ASSETS.note1,
  LOCAL_ASSETS.note2,
  LOCAL_ASSETS.note3,
  LOCAL_ASSETS.note4,
  LOCAL_ASSETS.note5,
];

export const EXPENSE_IMAGES = [
  LOCAL_ASSETS.d,
  LOCAL_ASSETS.a,
  LOCAL_ASSETS.b,
  LOCAL_ASSETS.c,
  LOCAL_ASSETS.dolphin,
  LOCAL_ASSETS.f,
];

// ───────────── ASSET / ICON MAP ─────────────
export const APP_ICONS = {
  home: { uri: "https://img.icons8.com/color/48/home--v1.png" },
  expenses: { uri: "https://img.icons8.com/color/48/wallet--v1.png" },
  reports: { uri: "https://img.icons8.com/color/48/analytics.png" },
  progress: { uri: "https://img.icons8.com/color/48/fire-element.png" },
  notes: { uri: "https://img.icons8.com/color/48/notepad.png" },
  health: { uri: "https://img.icons8.com/color/48/like--v1.png" },
  empty: { uri: "https://img.icons8.com/color/48/box--v1.png" },
  buy: { uri: "https://img.icons8.com/color/48/shopping-cart--v1.png" },
};

// ───────────── SECTION-WISE LIBRARY REGISTRY ─────────────
export const LIBRARY_SECTIONS = [
  {
    key: "home",
    title: "Home Screen",
    description: "Welcome character header & greeting visuals",
    defaultSource: LOCAL_ASSETS.hi,
    images: [
      { id: "hi", name: "Welcome Banner", source: LOCAL_ASSETS.hi },
      { id: "food", name: "Foodie Character", source: LOCAL_ASSETS.food },
      { id: "winnie", name: "Winnie Avatar", source: LOCAL_ASSETS.winnie },
    ],
  },
  {
    key: "expenses",
    title: "Expenses & Wallets",
    description: "Header mascot & transaction category icons",
    defaultSource: LOCAL_ASSETS.d,
    images: [
      { id: "d", name: "Wallet Mascot", source: LOCAL_ASSETS.d },
      { id: "a", name: "Expense Category A", source: LOCAL_ASSETS.a },
      { id: "b", name: "Expense Category B", source: LOCAL_ASSETS.b },
      { id: "c", name: "Expense Category C", source: LOCAL_ASSETS.c },
      { id: "dolphin", name: "Dolphin Mascot", source: LOCAL_ASSETS.dolphin },
      { id: "f", name: "Expense Category F", source: LOCAL_ASSETS.f },
    ],
  },
  {
    key: "reports",
    title: "Reports & Analytics",
    description: "Monthly analytics cards & wealth banners",
    defaultSource: LOCAL_ASSETS.sanemi,
    images: [
      { id: "sanemi", name: "Sanemi Banner", source: LOCAL_ASSETS.sanemi },
      { id: "inosuke", name: "Inosuke Banner", source: LOCAL_ASSETS.inosuke },
    ],
  },
  {
    key: "progress",
    title: "Progress & Streaks",
    description: "Flaming motivation cards & streak banners",
    defaultSource: LOCAL_ASSETS.luffy,
    images: [
      { id: "luffy", name: "Luffy Focused", source: LOCAL_ASSETS.luffy },
      { id: "luffyAngry", name: "Luffy Gear Rage", source: LOCAL_ASSETS.luffyAngry },
      { id: "naruto", name: "Naruto Power", source: LOCAL_ASSETS.naruto },
      { id: "minato", name: "Minato Hokage", source: LOCAL_ASSETS.minato },
      { id: "shikamaru", name: "Shikamaru IQ", source: LOCAL_ASSETS.shikamaru },
      { id: "jiraiya", name: "Jiraiya Sensei", source: LOCAL_ASSETS.jiraiya },
    ],
  },
  {
    key: "notes",
    title: "Notes & Buy Section",
    description: "Background cards for notes & shopping lists",
    defaultSource: LOCAL_ASSETS.note1,
    images: [
      { id: "note1", name: "Note Canvas 1", source: LOCAL_ASSETS.note1 },
      { id: "note2", name: "Note Canvas 2", source: LOCAL_ASSETS.note2 },
      { id: "note3", name: "Note Canvas 3", source: LOCAL_ASSETS.note3 },
      { id: "note4", name: "Note Canvas 4", source: LOCAL_ASSETS.note4 },
      { id: "note5", name: "Note Canvas 5", source: LOCAL_ASSETS.note5 },
    ],
  },
  {
    key: "health",
    title: "Period Tracker & Health",
    description: "Cycle tracker character headers & mood visuals",
    defaultSource: LOCAL_ASSETS.nezuko,
    images: [
      { id: "nezuko", name: "Nezuko Gentle", source: LOCAL_ASSETS.nezuko },
      { id: "shinobu", name: "Shinobu Butterfly", source: LOCAL_ASSETS.shinobu },
      { id: "tanjiro", name: "Tanjiro Determination", source: LOCAL_ASSETS.tanjiro },
      { id: "uzui", name: "Uzui Flamboyant", source: LOCAL_ASSETS.uzui },
    ],
  },
];
