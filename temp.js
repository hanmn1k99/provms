const fs = require('fs');
let lines = fs.readFileSync('frontend/src/App.jsx','utf8').split('\n');
let s1 = lines.findIndex(l => l.includes('<header style='));
let e1 = lines.findIndex((l,i) => i>s1 && l.includes('</header>'));
let s2 = lines.findIndex(l => l.includes('{activeTab === ' + String.fromCharCode(39) + 'grid' + String.fromCharCode(39) + ' && ('));
let e2 = lines.findIndex((l,i) => i>s2 && l.includes('<div style={{ flex: 1, minHeight: 0 }}>'));
console.log(s1, e1, s2, e2);
