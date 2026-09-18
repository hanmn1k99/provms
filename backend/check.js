const db = require('better-sqlite3')('provms.db');
const rows = db.prepare('SELECT * FROM Cameras').all();
console.log(JSON.stringify(rows, null, 2));
