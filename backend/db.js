const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.APPDATA_PATH 
    ? path.join(process.env.APPDATA_PATH, 'provms.db') 
    : path.join(__dirname, 'provms.db');
const db = new Database(dbPath);

// Khởi tạo các bảng
db.exec(`
  CREATE TABLE IF NOT EXISTS Users (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Username TEXT UNIQUE NOT NULL,
    PasswordHash TEXT NOT NULL,
    FullName TEXT,
    Role TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS Cameras (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL,
    IpAddress TEXT,
    Username TEXT,
    Password TEXT,
    RtspMainStream TEXT,
    RtspSubStream TEXT,
    TranscodeMode TEXT DEFAULT 'copy'
  );

  CREATE TABLE IF NOT EXISTS UserCameraAccesses (
    UserId INTEGER,
    CameraId INTEGER,
    PRIMARY KEY (UserId, CameraId),
    FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    FOREIGN KEY (CameraId) REFERENCES Cameras(Id) ON DELETE CASCADE
  );
`);

// Try to add FullName column if it doesn't exist (for existing DBs)
try {
  db.exec("ALTER TABLE Users ADD COLUMN FullName TEXT;");
} catch (e) {
  // Column already exists
}


module.exports = db;
