const fs = require('fs');
const path = 'src/renderer/styles/gacha.css';
let c = fs.readFileSync(path, 'utf8');
const si = c.indexOf('.gacha-result-card.gacha-multi-card');
const ei = c.indexOf('/* ============ Gacha Modal (used in JSX) ============ */');
console.log('si=', si, 'ei=', ei);
const newCSS = `