const fs=require("fs");
const path="src/renderer/styles/gacha.css";
let c=fs.readFileSync(path,"utf8");
const si=c.indexOf(".result-card-bg");
const ei=c.indexOf("/* ============ Gacha Modal (used in JSX) ============ */");
console.log("Replace",si,ei);
fs.writeFileSync(path,fs.readFileSync("src/renderer/styles/gacha.css","utf8"));
