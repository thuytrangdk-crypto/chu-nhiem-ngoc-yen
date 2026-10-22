// backend/app.ts
import express from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
dotenv.config();
var app = express();
app.use(express.json({ limit: "50mb" }));
var defaultSubjects = [
  { id: "sub_math", name: "To\xE1n", code: "TOAN", type: "score", order: 1 },
  { id: "sub_lit", name: "Ng\u1EEF v\u0103n", code: "VAN", type: "score", order: 2 },
  { id: "sub_eng", name: "Ti\u1EBFng Anh", code: "ANH", type: "score", order: 3 },
  { id: "sub_sci", name: "KHTN", code: "KHTN", type: "score", order: 4 },
  { id: "sub_his_geo", name: "LS&\u0110L", code: "LSDL", type: "score", order: 5 },
  { id: "sub_civic", name: "GDCD", code: "GDCD", type: "score", order: 6 },
  { id: "sub_it", name: "Tin h\u1ECDc", code: "TIN", type: "score", order: 7 },
  { id: "sub_tech", name: "C\xF4ng ngh\u1EC7", code: "CN", type: "score", order: 8 },
  { id: "sub_pe", name: "Th\u1EC3 d\u1EE5c", code: "TD", type: "comment", order: 9 },
  { id: "sub_art", name: "Ngh\u1EC7 thu\u1EADt", code: "NT", type: "comment", order: 10 },
  { id: "sub_exp", name: "H\u0110TN-HN", code: "HDTN", type: "comment", order: 11 }
];
var defaultConductSettings = {
  initialScore: 200,
  thresholdGood: 190,
  // A
  thresholdFair: 160,
  // B
  thresholdPass: 130,
  // C
  rules: [
    { id: "rule_v1", code: "V01", name: "N\xF3i chuy\u1EC7n ri\xEAng trong gi\u1EDD h\u1ECDc", category: "violation", points: 2, isActive: true },
    { id: "rule_v2", code: "V02", name: "Kh\xF4ng l\xE0m b\xE0i t\u1EADp / kh\xF4ng ch\xE9p b\xE0i", category: "violation", points: 3, isActive: true },
    { id: "rule_v3", code: "V03", name: "\u0110i h\u1ECDc mu\u1ED9n", category: "violation", points: 2, isActive: true },
    { id: "rule_v4", code: "V04", name: "Ngh\u1EC9 h\u1ECDc kh\xF4ng ph\xE9p", category: "violation", points: 5, isActive: true },
    { id: "rule_v5", code: "V05", name: "Kh\xF4ng \u0111\xFAng trang ph\u1EE5c / t\xE1c phong", category: "violation", points: 2, isActive: true },
    { id: "rule_v6", code: "V06", name: "S\u1EED d\u1EE5ng \u0111i\u1EC7n tho\u1EA1i tr\xE1i quy \u0111\u1ECBnh", category: "violation", points: 5, isActive: true },
    { id: "rule_v7", code: "V07", name: "M\u1EA5t tr\u1EADt t\u1EF1, g\xE2y r\u1ED1i", category: "violation", points: 5, isActive: true },
    { id: "rule_r1", code: "R01", name: "Ph\xE1t bi\u1EC3u x\xE2y d\u1EF1ng b\xE0i t\xEDch c\u1EF1c", category: "reward", points: 2, isActive: true },
    { id: "rule_r2", code: "R02", name: "\u0110\u1EA1t \u0111i\u1EC3m t\u1ED1t (9, 10) ki\u1EC3m tra", category: "reward", points: 5, isActive: true },
    { id: "rule_r3", code: "R03", name: "Vi\u1EC7c t\u1ED1t / gi\xFAp \u0111\u1EE1 b\u1EA1n b\xE8", category: "reward", points: 3, isActive: true },
    { id: "rule_r4", code: "R04", name: "\u0110\u1EA1t gi\u1EA3i phong tr\xE0o / thi \u0111ua", category: "reward", points: 10, isActive: true }
  ]
};
function generateDefaultSeatingSlots() {
  const slots = [];
  for (let col = 1; col <= 4; col++) {
    for (let desk = 1; desk <= 7; desk++) {
      slots.push({ column: col, desk, position: 1, studentId: null });
      slots.push({ column: col, desk, position: 2, studentId: null });
    }
  }
  return slots;
}
var INITIAL_TEACHER_PASSWORD = process.env.INITIAL_TEACHER_PASSWORD || crypto.randomBytes(32).toString("hex");
var INITIAL_TEACHER_HASH = bcrypt.hashSync(INITIAL_TEACHER_PASSWORD, 10);
var defaultDb = {
  config: {
    id: "class_main",
    appName: "Tr\u1EE3 l\xFD ch\u1EE7 nhi\u1EC7m",
    schoolName: "Tr\u01B0\u1EDDng THCS \u0110\u1ED3ng Kh\u1EDFi",
    className: "8A3",
    teacherName: "Nguy\u1EC5n Th\u1ECB Th\xF9y Trang",
    schoolYear: "2026-2027",
    adminPasswordHash: INITIAL_TEACHER_HASH,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    attentionThreshold: {
      absenceDays: 2,
      violationsCount: 2
    },
    autoConductFromAttendance: {
      enabled: false,
      unexcusedAbsenceRuleId: "rule_v4",
      lateRuleId: "rule_v3"
    }
  },
  students: [],
  // No fake students!
  subjects: defaultSubjects,
  conductSettings: defaultConductSettings,
  attendance: [],
  scores: [],
  incidents: [],
  bulletin: [
    {
      id: "post_welcome",
      title: "Ch\xE0o m\u1EEBng n\u0103m h\u1ECDc m\u1EDBi 2026-2027",
      content: "Ch\xE0o m\u1EEBng qu\xFD ph\u1EE5 huynh v\xE0 c\xE1c em h\u1ECDc sinh \u0111\u1EBFn v\u1EDBi trang th\xF4ng tin c\u1EE7a l\u1EDBp. Ch\xFAc t\u1EADp th\u1EC3 l\u1EDBp ch\xFAng ta m\u1ED9t n\u0103m h\u1ECDc ch\u0103m ngoan, \u0111o\xE0n k\u1EBFt v\xE0 \u0111\u1EA1t nhi\u1EC1u th\xE0nh t\xEDch xu\u1EA5t s\u1EAFc!",
      category: "announcement",
      isPinned: true,
      isPublished: true,
      publishedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  ],
  seating: {
    id: "seating_main",
    title: "S\u01A1 \u0111\u1ED3 l\u1EDBp ch\xEDnh th\u1EE9c",
    isPublished: false,
    slots: generateDefaultSeatingSlots(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  },
  honorBoards: {},
  scoreBackups: {}
};
var db = structuredClone(defaultDb);
var dirty = false;
var revision = 0;
var scope = process.env.APP_DATA_SCOPE || "";
var supabaseUrl = process.env.SUPABASE_URL || "";
var supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
var supabaseClient = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
function saveDatabase() {
  dirty = true;
}
var sessions = {
  get: (token) => db._sessions?.[token],
  set: (token, session) => {
    (db._sessions ||= {})[token] = session;
    dirty = true;
  },
  delete: (token) => {
    if (db._sessions?.[token]) {
      delete db._sessions[token];
      dirty = true;
    }
  },
  entries: () => Object.entries(db._sessions || {})
};
var failedLoginAttempts = {
  get: (key) => db._attempts?.[key],
  set: (key, value) => {
    (db._attempts ||= {})[key] = value;
    dirty = true;
  },
  delete: (key) => {
    if (db._attempts?.[key]) {
      delete db._attempts[key];
      dirty = true;
    }
  }
};
var queue = Promise.resolve();
app.use("/api", async (req, res, next) => {
  const previous = queue;
  let release;
  queue = new Promise((resolve) => {
    release = resolve;
  });
  await previous;
  let released = false;
  const unlock = () => {
    if (!released) {
      released = true;
      release();
    }
  };
  res.once("finish", unlock);
  res.once("close", unlock);
  res.setHeader("Cache-Control", "no-store");
  try {
    if (!supabaseClient) throw new Error("C\u1EA7n \u0111\u1EB7t SUPABASE_URL v\xE0 SUPABASE_SECRET_KEY tr\xEAn m\xE1y ch\u1EE7.");
    if (!/^[a-zA-Z0-9_-]{8,120}$/.test(scope)) throw new Error("C\u1EA7n \u0111\u1EB7t APP_DATA_SCOPE ri\xEAng cho l\u1EDBp (8\u2013120 k\xFD t\u1EF1).");
    const read = await supabaseClient.from("ngoc_yen_app_state").select("payload,revision").eq("scope", scope).maybeSingle();
    if (read.error) throw new Error("Ch\u01B0a \u0111\u1ECDc \u0111\u01B0\u1EE3c c\u01A1 s\u1EDF d\u1EEF li\u1EC7u. Ki\u1EC3m tra kh\xF3a Supabase v\xE0 ch\u1EA1y schema.sql.");
    let row = read.data;
    if (!row) {
      if ((process.env.INITIAL_TEACHER_PASSWORD || "").length < 12) throw new Error("L\u1EDBp m\u1EDBi c\u1EA7n INITIAL_TEACHER_PASSWORD d\xE0i \xEDt nh\u1EA5t 12 k\xFD t\u1EF1.");
      const insert = await supabaseClient.from("ngoc_yen_app_state").upsert({ scope, payload: defaultDb }, { onConflict: "scope", ignoreDuplicates: true });
      if (insert.error) throw new Error("Kh\xF4ng th\u1EC3 kh\u1EDFi t\u1EA1o l\u1EDBp tr\xEAn Supabase.");
      const reread = await supabaseClient.from("ngoc_yen_app_state").select("payload,revision").eq("scope", scope).single();
      if (reread.error) throw new Error("Kh\xF4ng th\u1EC3 \u0111\u1ECDc d\u1EEF li\u1EC7u l\u1EDBp v\u1EEBa kh\u1EDFi t\u1EA1o.");
      row = reread.data;
    }
    db = row.payload;
    revision = row.revision;
    dirty = false;
    for (const [token, session] of sessions.entries()) if (session.expiresAt < Date.now()) sessions.delete(token);
    const originalJson = res.json.bind(res);
    let sending = false;
    res.json = ((body) => {
      if (sending) return res;
      sending = true;
      void (async () => {
        if (dirty) {
          const saved = await supabaseClient.rpc("ngoc_yen_save_state", { p_scope: scope, p_revision: revision, p_payload: db });
          if (saved.error) throw new Error("Ch\u01B0a l\u01B0u \u0111\u01B0\u1EE3c d\u1EEF li\u1EC7u l\xEAn Supabase. Vui l\xF2ng th\u1EED l\u1EA1i.");
          if (saved.data === false) {
            res.status(409);
            originalJson({ error: "D\u1EEF li\u1EC7u v\u1EEBa \u0111\u01B0\u1EE3c thay \u0111\u1ED5i \u1EDF phi\xEAn kh\xE1c. H\xE3y t\u1EA3i l\u1EA1i trang v\xE0 th\u1EED l\u1EA1i." });
            return;
          }
        }
        originalJson(body);
      })().catch(() => {
        res.status(503);
        originalJson({ error: "Ch\u01B0a l\u01B0u \u0111\u01B0\u1EE3c d\u1EEF li\u1EC7u l\xEAn Supabase. Vui l\xF2ng th\u1EED l\u1EA1i." });
      });
      return res;
    });
    next();
  } catch (error) {
    res.status(503).json({ error: error.message });
  }
});
function checkRateLimit(key) {
  const attempt = failedLoginAttempts.get(key);
  if (!attempt) return true;
  if (attempt.lockedUntil > Date.now()) {
    return false;
  }
  if (attempt.lockedUntil <= Date.now() && attempt.count >= 5) {
    failedLoginAttempts.delete(key);
    return true;
  }
  return true;
}
function recordFailedAttempt(key) {
  const cur = failedLoginAttempts.get(key) || { count: 0, lockedUntil: 0 };
  cur.count += 1;
  if (cur.count >= 5) {
    cur.lockedUntil = Date.now() + 5 * 60 * 1e3;
  }
  failedLoginAttempts.set(key, cur);
}
function clearFailedAttempt(key) {
  failedLoginAttempts.delete(key);
}
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : req.headers["x-session-token"];
  if (!token) {
    res.status(401).json({ error: "Ch\u01B0a \u0111\u0103ng nh\u1EADp ho\u1EB7c phi\xEAn l\xE0m vi\u1EC7c \u0111\xE3 h\u1EBFt h\u1EA1n" });
    return;
  }
  const session = sessions.get(token);
  if (!session || session.expiresAt < Date.now() || session.role === "student" && !db.students.some((s) => s.id === session.studentId && s.status === "active")) {
    sessions.delete(token);
    res.status(401).json({ error: "Phi\xEAn \u0111\u0103ng nh\u1EADp kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c \u0111\xE3 h\u1EBFt h\u1EA1n" });
    return;
  }
  req.user = session;
  next();
}
function teacherOnly(req, res, next) {
  const user = req.user;
  if (!user || user.role !== "teacher") {
    res.status(403).json({ error: "Truy c\u1EADp b\u1ECB t\u1EEB ch\u1ED1i: Y\xEAu c\u1EA7u quy\u1EC1n Gi\xE1o vi\xEAn ch\u1EE7 nhi\u1EC7m" });
    return;
  }
  next();
}
app.get("/api/status", (req, res) => {
  const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
  res.json({
    appVersion: "ngoc-yen-pastel-2",
    appName: db.config.appName,
    schoolName: db.config.schoolName,
    className: db.config.className,
    teacherName: db.config.teacherName,
    schoolYear: db.config.schoolYear,
    totalStudents: db.students.filter((s) => s.status === "active").length,
    supabase: {
      isConfigured: isSupabaseConfigured,
      isConnected: true,
      supabaseUrl: isSupabaseConfigured ? supabaseUrl.replace(/^(https?:\/\/[^/]+).*$/, "$1") : void 0
    },
    serverTime: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.post("/api/auth/login", (req, res) => {
  const { role, password, username } = req.body;
  const ipKey = crypto.createHash("sha256").update(String(req.headers["x-forwarded-for"] || req.ip || "unknown")).digest("hex");
  if (!checkRateLimit(ipKey)) {
    const attempt = failedLoginAttempts.get(ipKey);
    const remainingSec = Math.ceil(((attempt?.lockedUntil || Date.now()) - Date.now()) / 1e3);
    res.status(429).json({
      error: `B\u1EA1n \u0111\xE3 th\u1EED sai qu\xE1 5 l\u1EA7n. Vui l\xF2ng th\u1EED l\u1EA1i sau ${remainingSec} gi\xE2y \u0111\u1EC3 b\u1EA3o v\u1EC7 an to\xE0n.`
    });
    return;
  }
  if (role === "teacher") {
    const adminHash = db.config.adminPasswordHash || INITIAL_TEACHER_HASH;
    const isMatch = bcrypt.compareSync(password || "", adminHash);
    if (!isMatch) {
      recordFailedAttempt(ipKey);
      res.status(401).json({ error: "M\u1EADt kh\u1EA9u qu\u1EA3n tr\u1ECB kh\xF4ng ch\xEDnh x\xE1c" });
      return;
    }
    clearFailedAttempt(ipKey);
    const token = crypto.randomBytes(32).toString("hex");
    const session = {
      token,
      role: "teacher",
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1e3
      // 7 days
    };
    sessions.set(token, session);
    res.json({
      token,
      role: "teacher",
      appName: db.config.appName,
      className: db.config.className,
      teacherName: db.config.teacherName
    });
    return;
  }
  if (role === "student") {
    const cleanUsername = String(username || "").trim();
    const cleanPass = String(password || "").trim();
    if (!cleanUsername || !cleanPass) {
      res.status(400).json({ error: "Vui l\xF2ng nh\u1EADp t\xEAn \u0111\u0103ng nh\u1EADp v\xE0 m\u1EADt kh\u1EA9u" });
      return;
    }
    const student = db.students.find((s) => s.username === cleanUsername && s.status === "active");
    if (!student) {
      recordFailedAttempt(ipKey);
      res.status(401).json({ error: "T\xEAn \u0111\u0103ng nh\u1EADp ho\u1EB7c m\u1EADt kh\u1EA9u kh\xF4ng ch\xEDnh x\xE1c" });
      return;
    }
    const isMatch = bcrypt.compareSync(cleanPass, student.passwordHash);
    if (!isMatch) {
      recordFailedAttempt(ipKey);
      res.status(401).json({ error: "T\xEAn \u0111\u0103ng nh\u1EADp ho\u1EB7c m\u1EADt kh\u1EA9u kh\xF4ng ch\xEDnh x\xE1c" });
      return;
    }
    clearFailedAttempt(ipKey);
    const token = crypto.randomBytes(32).toString("hex");
    const session = {
      token,
      role: "student",
      studentId: student.id,
      studentName: student.fullName,
      studentCode: student.code,
      mustChangePassword: student.mustChangePassword,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1e3
    };
    sessions.set(token, session);
    res.json({
      token,
      role: "student",
      studentId: student.id,
      studentName: student.fullName,
      studentCode: student.code,
      mustChangePassword: student.mustChangePassword
    });
    return;
  }
  res.status(400).json({ error: "Vai tr\xF2 \u0111\u0103ng nh\u1EADp kh\xF4ng h\u1EE3p l\u1EC7" });
});
app.post("/api/auth/change-password", authMiddleware, (req, res) => {
  const user = req.user;
  const { currentPassword, newPassword, confirmPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: "M\u1EADt kh\u1EA9u m\u1EDBi ph\u1EA3i c\xF3 \xEDt nh\u1EA5t 6 k\xFD t\u1EF1" });
    return;
  }
  if (newPassword !== confirmPassword) {
    res.status(400).json({ error: "X\xE1c nh\u1EADn m\u1EADt kh\u1EA9u m\u1EDBi kh\xF4ng kh\u1EDBp" });
    return;
  }
  if (user.role === "teacher") {
    const adminHash = db.config.adminPasswordHash || INITIAL_TEACHER_HASH;
    if (!bcrypt.compareSync(currentPassword || "", adminHash)) {
      res.status(401).json({ error: "M\u1EADt kh\u1EA9u hi\u1EC7n t\u1EA1i kh\xF4ng ch\xEDnh x\xE1c" });
      return;
    }
    db.config.adminPasswordHash = bcrypt.hashSync(newPassword, 10);
    db.config.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    saveDatabase();
    for (const [t, s] of sessions.entries()) {
      if (s.role === "teacher" && t !== user.token) {
        sessions.delete(t);
      }
    }
    res.json({ success: true, message: "\u0110\u1ED5i m\u1EADt kh\u1EA9u gi\xE1o vi\xEAn th\xE0nh c\xF4ng" });
    return;
  }
  if (user.role === "student" && user.studentId) {
    const student = db.students.find((s) => s.id === user.studentId);
    if (!student) {
      res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y h\u1ED3 s\u01A1 h\u1ECDc sinh" });
      return;
    }
    if (!bcrypt.compareSync(currentPassword || "", student.passwordHash)) {
      res.status(401).json({ error: "M\u1EADt kh\u1EA9u hi\u1EC7n t\u1EA1i kh\xF4ng ch\xEDnh x\xE1c" });
      return;
    }
    student.passwordHash = bcrypt.hashSync(newPassword, 10);
    student.mustChangePassword = false;
    student.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    user.mustChangePassword = false;
    for (const [t, session] of sessions.entries()) {
      if (session.studentId === student.id && t !== user.token) sessions.delete(t);
    }
    saveDatabase();
    res.json({ success: true, message: "\u0110\u1ED5i m\u1EADt kh\u1EA9u h\u1ECDc sinh th\xE0nh c\xF4ng" });
    return;
  }
  res.status(400).json({ error: "Y\xEAu c\u1EA7u kh\xF4ng h\u1EE3p l\u1EC7" });
});
app.post("/api/auth/reset-student-password", authMiddleware, teacherOnly, (req, res) => {
  const { studentId, customPassword } = req.body;
  const student = db.students.find((s) => s.id === studentId);
  if (!student) {
    res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y h\u1ECDc sinh" });
    return;
  }
  let newPlain = customPassword;
  if (!newPlain) {
    const bParts = student.birthDate.split("-");
    newPlain = bParts.length === 3 ? `${bParts[2]}${bParts[1]}${bParts[0]}` : "123456";
  }
  student.passwordHash = bcrypt.hashSync(newPlain, 10);
  student.mustChangePassword = true;
  for (const [token, session] of sessions.entries()) {
    if (session.studentId === student.id) sessions.delete(token);
  }
  student.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  saveDatabase();
  res.json({
    success: true,
    message: `\u0110\xE3 \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u cho h\u1ECDc sinh ${student.fullName}. M\u1EADt kh\u1EA9u m\u1EDBi: ${newPlain}`,
    newPassword: newPlain
  });
});
app.get("/api/config", (req, res) => {
  const { adminPasswordHash, ...safeConfig } = db.config;
  res.json(safeConfig);
});
app.post("/api/config", authMiddleware, teacherOnly, (req, res) => {
  const { appName, schoolName, className, teacherName, schoolYear, logoUrl, attentionThreshold, autoConductFromAttendance } = req.body;
  if (appName) db.config.appName = String(appName).trim();
  if (schoolName !== void 0) db.config.schoolName = String(schoolName).trim();
  if (className) db.config.className = String(className).trim();
  if (teacherName) db.config.teacherName = String(teacherName).trim();
  if (schoolYear) db.config.schoolYear = String(schoolYear).trim();
  if (logoUrl !== void 0) db.config.logoUrl = logoUrl;
  if (attentionThreshold) {
    db.config.attentionThreshold = {
      absenceDays: Number(attentionThreshold.absenceDays) || 2,
      violationsCount: Number(attentionThreshold.violationsCount) || 2
    };
  }
  if (autoConductFromAttendance) {
    db.config.autoConductFromAttendance = {
      enabled: Boolean(autoConductFromAttendance.enabled),
      unexcusedAbsenceRuleId: autoConductFromAttendance.unexcusedAbsenceRuleId,
      lateRuleId: autoConductFromAttendance.lateRuleId
    };
  }
  db.config.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  saveDatabase();
  const { adminPasswordHash, ...safeConfig } = db.config;
  res.json({ success: true, config: safeConfig });
});
function createStudentCredentials(code, birthDate) {
  const cleanCode = code.padStart(2, "0");
  const bParts = birthDate.split("-");
  const ddmmyyyy = bParts.length === 3 ? `${bParts[2]}${bParts[1]}${bParts[0]}` : "01012013";
  const username = `${cleanCode}${ddmmyyyy}`;
  const initialPassword = ddmmyyyy;
  const passwordHash = bcrypt.hashSync(initialPassword, 10);
  return { username, initialPassword, passwordHash };
}
app.get("/api/students", authMiddleware, (req, res) => {
  const user = req.user;
  if (user.role === "student") {
    const minimalList = db.students.filter((s) => s.status === "active").map((s) => ({
      id: s.id,
      code: s.code,
      fullName: s.fullName,
      gender: s.gender
    }));
    res.json(minimalList);
    return;
  }
  const safeList = db.students.map((s) => {
    const { passwordHash, ...safe } = s;
    return safe;
  });
  res.json(safeList);
});
app.get("/api/students/:id", authMiddleware, (req, res) => {
  const user = req.user;
  const { id } = req.params;
  if (user.role === "student" && user.studentId !== id) {
    res.status(403).json({ error: "B\u1EA1n kh\xF4ng c\xF3 quy\u1EC1n truy c\u1EADp h\u1ED3 s\u01A1 c\u1EE7a h\u1ECDc sinh kh\xE1c" });
    return;
  }
  const student = db.students.find((s) => s.id === id);
  if (!student) {
    res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y h\u1ECDc sinh" });
    return;
  }
  const { passwordHash, ...safeStudent } = student;
  if (user.role === "student") {
    delete safeStudent.notes;
  }
  res.json(safeStudent);
});
app.post("/api/students", authMiddleware, teacherOnly, (req, res) => {
  const { code, fullName, gender, birthDate, parentPhone, parentName, address, notes, avatarUrl } = req.body;
  if (!code || !fullName || !gender || !birthDate) {
    res.status(400).json({ error: "Vui l\xF2ng nh\u1EADp \u0111\u1EA7y \u0111\u1EE7 m\xE3 s\u1ED1, h\u1ECD t\xEAn, gi\u1EDBi t\xEDnh v\xE0 ng\xE0y sinh" });
    return;
  }
  const cleanCode = String(code).trim().padStart(2, "0");
  const existingWithCode = db.students.find((s) => s.code === cleanCode && s.status === "active");
  if (existingWithCode) {
    res.status(400).json({ error: `M\xE3 s\u1ED1 "${cleanCode}" \u0111\xE3 c\xF3 h\u1ECDc sinh "${existingWithCode.fullName}" s\u1EED d\u1EE5ng` });
    return;
  }
  const { username, passwordHash } = createStudentCredentials(cleanCode, birthDate);
  const newStudent = {
    id: `stu_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    code: cleanCode,
    fullName: String(fullName).trim(),
    gender: gender === "N\u1EEF" ? "N\u1EEF" : "Nam",
    birthDate: String(birthDate).trim(),
    parentPhone: parentPhone ? String(parentPhone).trim() : "",
    parentName: parentName ? String(parentName).trim() : "",
    address: address ? String(address).trim() : "",
    notes: notes ? String(notes).trim() : "",
    avatarUrl: avatarUrl || "",
    status: "active",
    username,
    passwordHash,
    mustChangePassword: true,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.students.push(newStudent);
  saveDatabase();
  const { passwordHash: _, ...safe } = newStudent;
  res.json({ success: true, student: safe });
});
app.put("/api/students/:id", authMiddleware, teacherOnly, (req, res) => {
  const { id } = req.params;
  const { code, fullName, gender, birthDate, parentPhone, parentName, address, notes, avatarUrl, status } = req.body;
  const student = db.students.find((s) => s.id === id);
  if (!student) {
    res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y h\u1ECDc sinh" });
    return;
  }
  if (code) {
    const cleanCode = String(code).trim().padStart(2, "0");
    const conflict = db.students.find((s) => s.code === cleanCode && s.id !== id && s.status === "active");
    if (conflict) {
      res.status(400).json({ error: `M\xE3 s\u1ED1 "${cleanCode}" \u0111\xE3 tr\xF9ng v\u1EDBi h\u1ECDc sinh "${conflict.fullName}"` });
      return;
    }
    student.code = cleanCode;
  }
  if (fullName) student.fullName = String(fullName).trim();
  if (gender) student.gender = gender === "N\u1EEF" ? "N\u1EEF" : "Nam";
  if (birthDate) student.birthDate = String(birthDate).trim();
  if (parentPhone !== void 0) student.parentPhone = String(parentPhone).trim();
  if (parentName !== void 0) student.parentName = String(parentName).trim();
  if (address !== void 0) student.address = String(address).trim();
  if (notes !== void 0) student.notes = String(notes).trim();
  if (avatarUrl !== void 0) student.avatarUrl = avatarUrl;
  if (status) student.status = status;
  student.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  saveDatabase();
  const { passwordHash, ...safe } = student;
  res.json({ success: true, student: safe });
});
app.delete("/api/students/:id", authMiddleware, teacherOnly, (req, res) => {
  const { id } = req.params;
  const { permanent } = req.query;
  const index = db.students.findIndex((s) => s.id === id);
  if (index === -1) {
    res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y h\u1ECDc sinh" });
    return;
  }
  const student = db.students[index];
  if (permanent === "true") {
    db.students.splice(index, 1);
    db.seating.slots.forEach((slot) => {
      if (slot.studentId === id) slot.studentId = null;
    });
  } else {
    student.status = "archived";
    student.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  }
  saveDatabase();
  res.json({ success: true, message: `\u0110\xE3 ${permanent === "true" ? "x\xF3a ho\xE0n to\xE0n" : "chuy\u1EC3n v\xE0o l\u01B0u tr\u1EEF"} h\u1ECDc sinh ${student.fullName}` });
});
app.post("/api/students/batch-import", authMiddleware, teacherOnly, (req, res) => {
  const { mode, students: incomingList } = req.body;
  if (!Array.isArray(incomingList) || incomingList.length === 0) {
    res.status(400).json({ error: "Danh s\xE1ch h\u1ECDc sinh kh\xF4ng h\u1EE3p l\u1EC7 ho\u1EB7c r\u1ED7ng" });
    return;
  }
  if (mode === "replace_all") {
    const backupKey = `replace_${Date.now()}`;
    db.scoreBackups[backupKey] = {
      backupTime: (/* @__PURE__ */ new Date()).toISOString(),
      month: "full_student_backup",
      data: [...db.scores]
    };
    db.students = [];
    db.seating.slots.forEach((slot) => slot.studentId = null);
  }
  let addedCount = 0;
  let updatedCount = 0;
  for (const item of incomingList) {
    const code = String(item.code || "").trim().padStart(2, "0");
    const existing = db.students.find((s) => s.code === code && s.status === "active");
    if (existing) {
      if (item.fullName) existing.fullName = String(item.fullName).trim();
      if (item.gender) existing.gender = item.gender === "N\u1EEF" ? "N\u1EEF" : "Nam";
      if (item.birthDate) existing.birthDate = item.birthDate;
      if (item.parentPhone) existing.parentPhone = String(item.parentPhone).trim();
      if (item.parentName) existing.parentName = String(item.parentName).trim();
      if (item.address) existing.address = String(item.address).trim();
      if (item.notes) existing.notes = String(item.notes).trim();
      existing.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      updatedCount++;
    } else {
      const birthDate = item.birthDate || "2013-01-01";
      const { username, passwordHash } = createStudentCredentials(code, birthDate);
      const newStu = {
        id: `stu_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        code,
        fullName: String(item.fullName).trim(),
        gender: item.gender === "N\u1EEF" ? "N\u1EEF" : "Nam",
        birthDate,
        parentPhone: item.parentPhone ? String(item.parentPhone).trim() : "",
        parentName: item.parentName ? String(item.parentName).trim() : "",
        address: item.address ? String(item.address).trim() : "",
        notes: item.notes ? String(item.notes).trim() : "",
        status: "active",
        username,
        passwordHash,
        mustChangePassword: true,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      db.students.push(newStu);
      addedCount++;
    }
  }
  db.students.sort((a, b) => a.code.localeCompare(b.code, void 0, { numeric: true }));
  saveDatabase();
  res.json({
    success: true,
    addedCount,
    updatedCount,
    totalCount: db.students.length,
    message: `\u0110\xE3 nh\u1EADp th\xE0nh c\xF4ng: ${addedCount} h\u1ECDc sinh m\u1EDBi, c\u1EADp nh\u1EADt ${updatedCount} h\u1ECDc sinh`
  });
});
app.post("/api/students/clean-class", authMiddleware, teacherOnly, (req, res) => {
  const { confirmationCode } = req.body;
  if (confirmationCode !== "XAC_NHAN_LAM_SACH_LOP") {
    res.status(400).json({ error: 'M\xE3 x\xE1c nh\u1EADn kh\xF4ng \u0111\xFAng. Nh\u1EADp ch\xEDnh x\xE1c "XAC_NHAN_LAM_SACH_LOP" \u0111\u1EC3 th\u1EF1c hi\u1EC7n.' });
    return;
  }
  db._snapshots = { beforeReset: JSON.parse(JSON.stringify({ ...db, _snapshots: void 0 })) };
  db.students = [];
  db.attendance = [];
  db.scores = [];
  db.incidents = [];
  db.honorBoards = {};
  db.seating.slots.forEach((s) => s.studentId = null);
  saveDatabase();
  res.json({
    success: true,
    message: "\u0110\xE3 l\xE0m s\u1EA1ch d\u1EEF li\u1EC7u h\u1ECDc sinh th\xE0nh c\xF4ng. B\u1EA3n sao l\u01B0u t\u1EF1 \u0111\u1ED9ng \u0111\xE3 \u0111\u01B0\u1EE3c l\u01B0u l\u1EA1i an to\xE0n."
  });
});
app.get("/api/attendance", authMiddleware, (req, res) => {
  const user = req.user;
  const { date, month, studentId } = req.query;
  let records = db.attendance;
  if (date) {
    records = records.filter((r) => r.date === date);
  } else if (month) {
    records = records.filter((r) => r.date.startsWith(String(month)));
  }
  if (user.role === "student") {
    records = records.filter((r) => r.studentId === user.studentId);
  } else if (studentId) {
    records = records.filter((r) => r.studentId === studentId);
  }
  res.json(records);
});
app.post("/api/attendance", authMiddleware, teacherOnly, (req, res) => {
  const { date, records } = req.body;
  if (!date || !Array.isArray(records)) {
    res.status(400).json({ error: "D\u1EEF li\u1EC7u \u0111i\u1EC3m danh kh\xF4ng h\u1EE3p l\u1EC7" });
    return;
  }
  db.attendance = db.attendance.filter((r) => r.date !== date);
  const newRecords = [];
  const autoConduct = db.config.autoConductFromAttendance;
  for (const item of records) {
    const record = {
      id: `att_${date}_${item.studentId}`,
      date,
      studentId: item.studentId,
      status: item.status,
      note: item.note || "",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    newRecords.push(record);
    if (autoConduct?.enabled) {
      const student = db.students.find((s) => s.id === item.studentId);
      if (student) {
        if (item.status === "unexcused" && autoConduct.unexcusedAbsenceRuleId) {
          const rule = db.conductSettings.rules.find((r) => r.id === autoConduct.unexcusedAbsenceRuleId);
          if (rule) {
            const existingInc = db.incidents.find((inc) => inc.studentId === item.studentId && inc.date === date && inc.ruleId === rule.id);
            if (!existingInc) {
              db.incidents.push({
                id: `inc_auto_att_${date}_${item.studentId}`,
                studentId: item.studentId,
                date,
                ruleId: rule.id,
                ruleName: rule.name,
                category: "violation",
                points: rule.points,
                content: `T\u1EF1 \u0111\u1ED9ng ghi nh\u1EADn t\u1EEB \u0111i\u1EC3m danh: Ngh\u1EC9 h\u1ECDc kh\xF4ng ph\xE9p ng\xE0y ${date}`,
                note: "T\u1EF1 \u0111\u1ED9ng t\u1EA1o t\u1EEB h\u1EC7 th\u1ED1ng",
                recordedBy: db.config.teacherName,
                createdAt: (/* @__PURE__ */ new Date()).toISOString()
              });
            }
          }
        } else if (item.status === "late" && autoConduct.lateRuleId) {
          const rule = db.conductSettings.rules.find((r) => r.id === autoConduct.lateRuleId);
          if (rule) {
            const existingInc = db.incidents.find((inc) => inc.studentId === item.studentId && inc.date === date && inc.ruleId === rule.id);
            if (!existingInc) {
              db.incidents.push({
                id: `inc_auto_att_late_${date}_${item.studentId}`,
                studentId: item.studentId,
                date,
                ruleId: rule.id,
                ruleName: rule.name,
                category: "violation",
                points: rule.points,
                content: `T\u1EF1 \u0111\u1ED9ng ghi nh\u1EADn t\u1EEB \u0111i\u1EC3m danh: \u0110i h\u1ECDc mu\u1ED9n ng\xE0y ${date}`,
                note: "T\u1EF1 \u0111\u1ED9ng t\u1EA1o t\u1EEB h\u1EC7 th\u1ED1ng",
                recordedBy: db.config.teacherName,
                createdAt: (/* @__PURE__ */ new Date()).toISOString()
              });
            }
          }
        }
      }
    }
  }
  db.attendance.push(...newRecords);
  saveDatabase();
  res.json({ success: true, count: newRecords.length, message: `\u0110\xE3 l\u01B0u \u0111i\u1EC3m danh ng\xE0y ${date} th\xE0nh c\xF4ng` });
});
app.get("/api/subjects", (req, res) => {
  res.json(db.subjects);
});
app.post("/api/subjects", authMiddleware, teacherOnly, (req, res) => {
  const { subjects } = req.body;
  if (!Array.isArray(subjects)) {
    res.status(400).json({ error: "Danh s\xE1ch m\xF4n h\u1ECDc kh\xF4ng h\u1EE3p l\u1EC7" });
    return;
  }
  db.subjects = subjects;
  saveDatabase();
  res.json({ success: true, subjects: db.subjects });
});
app.get("/api/scores", authMiddleware, (req, res) => {
  const user = req.user;
  const { month, studentId } = req.query;
  let records = db.scores;
  if (month) {
    records = records.filter((r) => r.yearMonth === String(month));
  }
  if (user.role === "student") {
    records = records.filter((r) => r.studentId === user.studentId);
  } else if (studentId) {
    records = records.filter((r) => r.studentId === String(studentId));
  }
  res.json(records);
});
app.post("/api/scores", authMiddleware, teacherOnly, (req, res) => {
  const { month, records } = req.body;
  if (!month || !Array.isArray(records)) {
    res.status(400).json({ error: "D\u1EEF li\u1EC7u b\u1EA3ng \u0111i\u1EC3m kh\xF4ng h\u1EE3p l\u1EC7" });
    return;
  }
  const scoredSubjectIds = new Set(
    db.subjects.filter((s) => s.type === "score").map((s) => s.id)
  );
  for (const item of records) {
    const existingIndex = db.scores.findIndex((r) => r.yearMonth === month && r.studentId === item.studentId);
    let totalScore = 0;
    let scoredCount = 0;
    const scores = item.scores || {};
    for (const [subId, scoreObj] of Object.entries(scores)) {
      if (scoredSubjectIds.has(subId) && scoreObj && typeof scoreObj.score === "number" && !isNaN(scoreObj.score)) {
        totalScore += scoreObj.score;
        scoredCount += 1;
      }
    }
    const gpa = scoredCount > 0 ? totalScore / scoredCount : null;
    const record = {
      id: existingIndex !== -1 ? db.scores[existingIndex].id : `score_${month}_${item.studentId}`,
      yearMonth: month,
      studentId: item.studentId,
      scores,
      gpa,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (existingIndex !== -1) {
      db.scores[existingIndex] = record;
    } else {
      db.scores.push(record);
    }
  }
  if (db.honorBoards[month]?.isPublished) {
    db.honorBoards[month].requiresRepublish = true;
  }
  saveDatabase();
  res.json({ success: true, message: `\u0110\xE3 l\u01B0u b\u1EA3ng \u0111i\u1EC3m th\xE1ng ${month} th\xE0nh c\xF4ng` });
});
app.delete("/api/scores", authMiddleware, teacherOnly, (req, res) => {
  const { month } = req.query;
  if (!month) {
    res.status(400).json({ error: "Thi\u1EBFu th\xF4ng tin th\xE1ng c\u1EA7n x\xF3a" });
    return;
  }
  const monthStr = String(month);
  const targetScores = db.scores.filter((r) => r.yearMonth === monthStr);
  if (targetScores.length === 0) {
    res.status(404).json({ error: `Kh\xF4ng c\xF3 d\u1EEF li\u1EC7u \u0111i\u1EC3m th\xE1ng ${monthStr} \u0111\u1EC3 x\xF3a` });
    return;
  }
  const backupId = `backup_${monthStr}_${Date.now()}`;
  db.scoreBackups[backupId] = {
    backupTime: (/* @__PURE__ */ new Date()).toISOString(),
    month: monthStr,
    data: [...targetScores]
  };
  db.scores = db.scores.filter((r) => r.yearMonth !== monthStr);
  if (db.honorBoards[monthStr]) {
    delete db.honorBoards[monthStr];
  }
  saveDatabase();
  res.json({
    success: true,
    backupId,
    affectedCount: targetScores.length,
    message: `\u0110\xE3 x\xF3a b\u1EA3ng \u0111i\u1EC3m th\xE1ng ${monthStr} (${targetScores.length} b\u1EA3n ghi). B\u1EA3n sao l\u01B0u ${backupId} \u0111\xE3 \u0111\u01B0\u1EE3c l\u01B0u l\u1EA1i \u0111\u1EC3 kh\xF4i ph\u1EE5c khi c\u1EA7n.`
  });
});
app.post("/api/scores/restore", authMiddleware, teacherOnly, (req, res) => {
  const { backupId } = req.body;
  const backup = db.scoreBackups[backupId];
  if (!backup) {
    res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y b\u1EA3n sao l\u01B0u \u0111i\u1EC3m" });
    return;
  }
  db.scores = db.scores.filter((r) => r.yearMonth !== backup.month);
  db.scores.push(...backup.data);
  saveDatabase();
  res.json({
    success: true,
    restoredCount: backup.data.length,
    message: `Kh\xF4i ph\u1EE5c th\xE0nh c\xF4ng ${backup.data.length} b\u1EA3n ghi \u0111i\u1EC3m th\xE1ng ${backup.month}`
  });
});
app.get("/api/scores/backups", authMiddleware, teacherOnly, (req, res) => {
  const list = Object.entries(db.scoreBackups).map(([id, b]) => ({
    id,
    month: b.month,
    backupTime: b.backupTime,
    count: b.data.length
  }));
  res.json(list);
});
app.get("/api/conduct/rules", (req, res) => {
  res.json(db.conductSettings);
});
app.post("/api/conduct/rules", authMiddleware, teacherOnly, (req, res) => {
  const { initialScore, thresholdGood, thresholdFair, thresholdPass, rules } = req.body;
  if (initialScore !== void 0) db.conductSettings.initialScore = Number(initialScore);
  if (thresholdGood !== void 0) db.conductSettings.thresholdGood = Number(thresholdGood);
  if (thresholdFair !== void 0) db.conductSettings.thresholdFair = Number(thresholdFair);
  if (thresholdPass !== void 0) db.conductSettings.thresholdPass = Number(thresholdPass);
  if (Array.isArray(rules)) db.conductSettings.rules = rules;
  saveDatabase();
  res.json({ success: true, conductSettings: db.conductSettings });
});
app.get("/api/conduct/incidents", authMiddleware, (req, res) => {
  const user = req.user;
  const { studentId, month } = req.query;
  let records = db.incidents;
  if (user.role === "student") {
    records = records.filter((r) => r.studentId === user.studentId);
  } else if (studentId) {
    records = records.filter((r) => r.studentId === String(studentId));
  }
  if (month) {
    records = records.filter((r) => r.date.startsWith(String(month)));
  }
  res.json(records);
});
app.post("/api/conduct/incidents", authMiddleware, teacherOnly, (req, res) => {
  const { studentId, date, ruleId, ruleName, category, points, content, note } = req.body;
  if (!studentId || !date || !ruleName || !content || points === void 0) {
    res.status(400).json({ error: "Vui l\xF2ng nh\u1EADp \u0111\u1EA7y \u0111\u1EE7 th\xF4ng tin s\u1EF1 vi\u1EC7c" });
    return;
  }
  const newIncident = {
    id: `inc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    studentId,
    date,
    ruleId: ruleId || void 0,
    ruleName,
    category: category === "reward" ? "reward" : "violation",
    points: Math.abs(Number(points)),
    content,
    note: note || "",
    recordedBy: db.config.teacherName,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.incidents.push(newIncident);
  saveDatabase();
  res.json({ success: true, incident: newIncident });
});
app.put("/api/conduct/incidents/:id", authMiddleware, teacherOnly, (req, res) => {
  const { id } = req.params;
  const incident = db.incidents.find((inc) => inc.id === id);
  if (!incident) {
    res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y s\u1EF1 vi\u1EC7c" });
    return;
  }
  const { date, ruleId, ruleName, category, points, content, note } = req.body;
  if (date) incident.date = date;
  if (ruleId !== void 0) incident.ruleId = ruleId;
  if (ruleName) incident.ruleName = ruleName;
  if (category) incident.category = category;
  if (points !== void 0) incident.points = Math.abs(Number(points));
  if (content) incident.content = content;
  if (note !== void 0) incident.note = note;
  saveDatabase();
  res.json({ success: true, incident });
});
app.delete("/api/conduct/incidents/:id", authMiddleware, teacherOnly, (req, res) => {
  const { id } = req.params;
  const idx = db.incidents.findIndex((inc) => inc.id === id);
  if (idx === -1) {
    res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y s\u1EF1 vi\u1EC7c" });
    return;
  }
  db.incidents.splice(idx, 1);
  saveDatabase();
  res.json({ success: true, message: "\u0110\xE3 x\xF3a ghi nh\u1EADn s\u1EF1 vi\u1EC7c" });
});
app.get("/api/bulletin", authMiddleware, (req, res) => {
  const user = req.user;
  if (user.role === "student") {
    const published = db.bulletin.filter((p) => p.isPublished);
    res.json(published);
    return;
  }
  res.json(db.bulletin);
});
app.post("/api/bulletin", authMiddleware, teacherOnly, (req, res) => {
  const { id, title, content, category, mediaUrl, mediaType, embedUrl, isPinned, isPublished } = req.body;
  if (!title || !content) {
    res.status(400).json({ error: "Ti\xEAu \u0111\u1EC1 v\xE0 n\u1ED9i dung kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng" });
    return;
  }
  if (id) {
    const post = db.bulletin.find((p) => p.id === id);
    if (!post) {
      res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y b\xE0i vi\u1EBFt" });
      return;
    }
    post.title = title;
    post.content = content;
    post.category = category || "announcement";
    post.mediaUrl = mediaUrl || "";
    post.mediaType = mediaType || "image";
    post.embedUrl = embedUrl || "";
    post.isPinned = Boolean(isPinned);
    if (isPublished && !post.isPublished) {
      post.publishedAt = (/* @__PURE__ */ new Date()).toISOString();
    }
    post.isPublished = Boolean(isPublished);
    saveDatabase();
    res.json({ success: true, post });
    return;
  }
  const newPost = {
    id: `post_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title,
    content,
    category: category || "announcement",
    mediaUrl: mediaUrl || "",
    mediaType: mediaType || "image",
    embedUrl: embedUrl || "",
    isPinned: Boolean(isPinned),
    isPublished: Boolean(isPublished),
    publishedAt: isPublished ? (/* @__PURE__ */ new Date()).toISOString() : "",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  db.bulletin.unshift(newPost);
  saveDatabase();
  res.json({ success: true, post: newPost });
});
app.delete("/api/bulletin/:id", authMiddleware, teacherOnly, (req, res) => {
  const { id } = req.params;
  const idx = db.bulletin.findIndex((p) => p.id === id);
  if (idx === -1) {
    res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y b\xE0i vi\u1EBFt" });
    return;
  }
  db.bulletin.splice(idx, 1);
  saveDatabase();
  res.json({ success: true, message: "\u0110\xE3 x\xF3a b\xE0i vi\u1EBFt" });
});
app.get("/api/seating", authMiddleware, (req, res) => {
  const user = req.user;
  if (user.role === "student" && !db.seating.isPublished) {
    res.json({
      ...db.seating,
      slots: [],
      message: "S\u01A1 \u0111\u1ED3 l\u1EDBp ch\u01B0a \u0111\u01B0\u1EE3c c\xF4ng b\u1ED1"
    });
    return;
  }
  res.json(db.seating);
});
app.post("/api/seating", authMiddleware, teacherOnly, (req, res) => {
  const { title, isPublished, slots } = req.body;
  if (title) db.seating.title = title;
  if (isPublished !== void 0) db.seating.isPublished = Boolean(isPublished);
  if (Array.isArray(slots)) {
    const seen = /* @__PURE__ */ new Set();
    for (const slot of slots) {
      if (slot.studentId) {
        if (seen.has(slot.studentId)) {
          const student = db.students.find((s) => s.id === slot.studentId);
          res.status(400).json({
            error: `H\u1ECDc sinh "${student?.fullName || slot.studentId}" kh\xF4ng th\u1EC3 ng\u1ED3i \u1EDF nhi\u1EC1u ch\u1ED7 c\xF9ng l\xFAc.`
          });
          return;
        }
        seen.add(slot.studentId);
      }
    }
    db.seating.slots = slots;
  }
  db.seating.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  saveDatabase();
  res.json({ success: true, seating: db.seating });
});
app.get("/api/honor/:month", authMiddleware, (req, res) => {
  const user = req.user;
  const { month } = req.params;
  const board = db.honorBoards[month];
  if (!board) {
    res.json({ yearMonth: month, isPublished: false, topAcademic: [], customRewards: [] });
    return;
  }
  if (user.role === "student" && !board.isPublished) {
    res.json({ yearMonth: month, isPublished: false, topAcademic: [], customRewards: [] });
    return;
  }
  res.json(board);
});
app.post("/api/honor/publish", authMiddleware, teacherOnly, (req, res) => {
  const { month, isPublished, customRewards } = req.body;
  if (!month) {
    res.status(400).json({ error: "Thi\u1EBFu th\xE1ng c\xF4ng b\u1ED1" });
    return;
  }
  const monthScores = db.scores.filter((r) => r.yearMonth === month && r.gpa !== null && r.gpa !== void 0);
  monthScores.sort((a, b) => (b.gpa || 0) - (a.gpa || 0));
  const topStudents = monthScores.slice(0, 5).map((r, idx) => {
    const student = db.students.find((s) => s.id === r.studentId);
    return {
      studentId: r.studentId,
      studentName: student?.fullName || "H\u1ECDc sinh",
      studentCode: student?.code || "",
      gpa: Math.round((r.gpa || 0) * 100) / 100,
      rank: idx + 1
    };
  });
  const board = {
    yearMonth: month,
    isPublished: Boolean(isPublished),
    publishedAt: (/* @__PURE__ */ new Date()).toISOString(),
    topAcademic: topStudents,
    customRewards: customRewards || [],
    requiresRepublish: false
  };
  db.honorBoards[month] = board;
  saveDatabase();
  res.json({ success: true, board });
});
app.get("/api/backup", authMiddleware, teacherOnly, (req, res) => {
  const backup = {
    version: "1.0.0",
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    config: db.config,
    students: db.students,
    subjects: db.subjects,
    conductSettings: db.conductSettings,
    attendance: db.attendance,
    scores: db.scores,
    incidents: db.incidents,
    bulletin: db.bulletin,
    seating: db.seating,
    honorBoards: db.honorBoards
  };
  res.setHeader("Content-Disposition", `attachment; filename="Sao_Luu_Lop_${db.config.className}_${Date.now()}.json"`);
  res.json(backup);
});
app.post("/api/restore", authMiddleware, teacherOnly, (req, res) => {
  const { backupData } = req.body;
  if (!backupData || !backupData.config) {
    res.status(400).json({ error: "D\u1EEF li\u1EC7u sao l\u01B0u kh\xF4ng h\u1EE3p l\u1EC7" });
    return;
  }
  const emergencySnapshot = JSON.parse(JSON.stringify({ ...db, _snapshots: void 0 }));
  db = {
    ...defaultDb,
    ...backupData,
    _sessions: {},
    _attempts: {},
    _snapshots: { beforeRestore: emergencySnapshot },
    config: {
      ...defaultDb.config,
      ...backupData.config,
      // Retain existing password hash if backup has none
      adminPasswordHash: backupData.config?.adminPasswordHash || db.config.adminPasswordHash
    },
    seating: {
      ...defaultDb.seating,
      ...backupData.seating || {},
      slots: backupData.seating?.slots || generateDefaultSeatingSlots()
    }
  };
  saveDatabase();
  res.json({
    success: true,
    message: `Kh\xF4i ph\u1EE5c th\xE0nh c\xF4ng l\u1EDBp ${db.config.className} (${db.students.length} h\u1ECDc sinh).`
  });
});
app.get("/api/supabase/test", async (req, res) => {
  if (!supabaseClient) {
    res.json({
      configured: false,
      connected: false,
      message: "Ch\u01B0a c\u1EA5u h\xECnh Supabase. Vui l\xF2ng thi\u1EBFt l\u1EADp bi\u1EBFn m\xF4i tr\u01B0\u1EDDng SUPABASE_URL v\xE0 SUPABASE_SERVICE_ROLE_KEY."
    });
    return;
  }
  try {
    const { data, error } = await supabaseClient.from("ngoc_yen_app_state").select("scope").eq("scope", scope).limit(1);
    if (error && error.code !== "PGRST116") {
      res.json({
        configured: true,
        connected: false,
        error: error.message,
        message: "Kh\xF4ng th\u1EC3 k\u1EBFt n\u1ED1i b\u1EA3ng ngoc_yen_app_state tr\xEAn Supabase. B\u1EA1n \u0111\xE3 ch\u1EA1y t\u1EADp l\u1EC7nh schema.sql ch\u01B0a?"
      });
      return;
    }
    res.json({
      configured: true,
      connected: true,
      message: "K\u1EBFt n\u1ED1i Supabase th\xE0nh c\xF4ng v\xE0 s\u1EB5n s\xE0ng \u0111\u1ED3ng b\u1ED9!"
    });
  } catch (err) {
    res.json({
      configured: true,
      connected: false,
      error: err.message,
      message: "L\u1ED7i ki\u1EC3m tra k\u1EBFt n\u1ED1i Supabase"
    });
  }
});
app.all(/^\/api(\/.*)?$/, (req, res) => res.status(404).json({ error: "API kh\xF4ng t\u1ED3n t\u1EA1i" }));
app.use((error, req, res, next) => {
  res.status(error.status === 413 ? 413 : 500).json({ error: error.status === 413 ? "N\u1ED9i dung qu\xE1 l\u1EDBn." : "M\xE1y ch\u1EE7 kh\xF4ng x\u1EED l\xFD \u0111\u01B0\u1EE3c y\xEAu c\u1EA7u." });
});
var app_default = app;
export {
  app_default as default
};
