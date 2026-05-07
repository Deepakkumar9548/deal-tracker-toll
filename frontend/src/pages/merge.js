const fs = require('fs');
const src = fs.readFileSync('frontend/src/pages/calculator/Insurance_Pro_updated.html', 'utf8');
const dest = fs.readFileSync('frontend/src/pages/calculator/hyundai_kia_bulk_insurance_calculator.html', 'utf8');

const htmlMatch = src.match(/<!-- ══ CALCULATOR ══ -->[\s\S]*?(?=<!-- ══ BULK UPLOAD ══ -->)/);
let html = htmlMatch ? htmlMatch[0] : '';
html = html.replace(/<div class="panel" id="panel-calculator">/, '<div class="calc-wrap" id="panel-calculator">');

const jsMatch = src.match(/\/\/ ════════════════════════════════════════════════════════\r?\n\s*\/\/  BRAND \/ CALCULATOR LIST[\s\S]*?(?=\/\/ ════════════════════════════════════════════════════════\r?\n\s*\/\/  BULK UPLOAD)/);
let js = jsMatch ? jsMatch[0] : '';

const dlMatch = src.match(/function buildExcelRows[\s\S]*?(?=<\/script>)/);
let dlJs = dlMatch ? dlMatch[0] : '';
dlJs = dlJs.replace(/function downloadBulkExcel\(\) \{[\s\S]*?function downloadSingleExcel/, 'function downloadSingleExcel');
dlJs = dlJs.replace(/function downloadMasterExcel\(\) \{[\s\S]*?function styleSheet/, 'function styleSheet');

const css = `
  <style>
    /* Calculator Styles Extracted */
    .calc-wrap {
      --bg: #0a1628;
      --bg2: #0f1e38;
      --card: rgba(255, 255, 255, 0.03);
      --card-hover: rgba(255, 255, 255, 0.06);
      --border: rgba(100, 160, 255, 0.12);
      --border2: rgba(100, 160, 255, 0.22);
      --accent: #3b82f6;
      --accent2: #60a5fa;
      --gold: #f59e0b;
      --green: #10b981;
      --red: #ef4444;
      --white: #e2eeff;
      --grey: #6b87b8;
      --grey2: #4a6489;
      --font: 'Syne', sans-serif;
      --mono: 'DM Mono', monospace;
      --radius: 12px;
      --radius-lg: 18px;
      background: var(--bg);
      color: var(--white);
      padding: 24px;
      border-radius: var(--radius-lg);
      font-family: var(--font);
      margin-bottom: 2rem;
    }
    .calc-wrap * { box-sizing: border-box; }
    .calc-wrap .form-card {
      background: var(--card); border: 1px solid var(--border);
      border-radius: var(--radius-lg); padding: 20px 22px; margin-bottom: 16px;
    }
    .calc-wrap .form-card-title {
      font-size: 12px; font-weight: 600; letter-spacing: 0.8px; color: var(--grey);
      text-transform: uppercase; font-family: var(--mono); margin-bottom: 16px;
      display: flex; align-items: center; gap: 8px;
    }
    .calc-wrap .form-card-title::before {
      content: ''; display: block; width: 3px; height: 14px; background: var(--accent); border-radius: 2px;
    }
    .calc-wrap .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }
    .calc-wrap .field { display: flex; flex-direction: column; gap: 5px; }
    .calc-wrap label { font-size: 11px; font-weight: 600; color: var(--grey); letter-spacing: 0.5px; text-transform: uppercase; font-family: var(--mono); }
    .calc-wrap input[type='number'], .calc-wrap input[type='text'], .calc-wrap select {
      background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border); border-radius: 8px;
      padding: 9px 12px; font-size: 13px; color: var(--white); font-family: var(--font); font-weight: 500;
      outline: none; transition: border-color 0.2s, background 0.2s; width: 100%;
    }
    .calc-wrap input:focus, .calc-wrap select:focus { border-color: var(--accent); background: rgba(59, 130, 246, 0.08); }
    .calc-wrap select option { background: #162545; color: var(--white); }
    .calc-wrap .btn-primary {
      display: inline-flex; align-items: center; gap: 8px; padding: 11px 26px; border-radius: 10px;
      border: none; background: linear-gradient(135deg, #1d4ed8, #3b82f6); color: white;
      font-family: var(--font); font-size: 13px; font-weight: 700; cursor: pointer; transition: opacity 0.2s;
    }
    .calc-wrap .btn-secondary {
      display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 10px;
      border: 1px solid var(--border2); background: transparent; color: var(--white);
      font-family: var(--font); font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .calc-wrap .btn-success {
      display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 10px;
      border: none; background: linear-gradient(135deg, #065f46, #10b981); color: white;
      font-family: var(--font); font-size: 13px; font-weight: 700; cursor: pointer;
    }
    .calc-wrap .btn-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 4px; }
    .calc-wrap .results-card {
      background: linear-gradient(135deg, rgba(29, 78, 216, 0.15), rgba(59, 130, 246, 0.08));
      border: 1px solid rgba(59, 130, 246, 0.3); border-radius: var(--radius-lg); padding: 22px 24px; margin-top: 16px;
    }
    .calc-wrap .result-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 18px; }
    .calc-wrap .result-item { display: flex; flex-direction: column; gap: 5px; }
    .calc-wrap .r-label { font-size: 10px; color: var(--grey); font-family: var(--mono); text-transform: uppercase; }
    .calc-wrap .r-val { font-size: 17px; font-weight: 700; font-family: var(--mono); color: var(--white); }
    .calc-wrap .r-val.big { font-size: 28px; color: var(--accent2); }
    .calc-wrap .r-val.green { color: var(--green); }
    .calc-wrap .r-val.gold { color: var(--gold); }
    .calc-wrap .r-divider { border: none; border-top: 1px solid var(--border); margin: 16px 0; }
    .calc-wrap .detail-tabs { display: flex; border-bottom: 1px solid var(--border); margin-bottom: 0; }
    .calc-wrap .detail-tab {
      padding: 10px 18px; font-size: 12px; font-weight: 600; cursor: pointer; color: var(--grey);
      border-bottom: 2px solid transparent; text-transform: uppercase; font-family: var(--mono);
    }
    .calc-wrap .detail-tab.active { color: var(--accent2); border-bottom-color: var(--accent2); }
    .calc-wrap .detail-content { display: none; padding: 16px 0 4px; }
    .calc-wrap .detail-content.active { display: block; }
    .calc-wrap table.detail-tbl { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    .calc-wrap table.detail-tbl th {
      background: rgba(59, 130, 246, 0.08); padding: 9px 12px; text-align: left;
      font-weight: 600; color: var(--grey); font-family: var(--mono); font-size: 11px;
    }
    .calc-wrap table.detail-tbl td { padding: 8px 12px; border-top: 1px solid var(--border); color: var(--white); font-family: var(--mono); }
    .calc-wrap table.detail-tbl td:not(:first-child) { text-align: right; color: var(--grey); }
    .calc-wrap table.detail-tbl tr.subtotal td { font-weight: 700; color: var(--white); background: rgba(255, 255, 255, 0.03); }
    .calc-wrap table.detail-tbl tr.grand td { font-weight: 700; color: var(--accent2); font-size: 13px; }
  </style>
`;

const singleEntryRegex = /<!-- Single Entry Section -->[\s\S]*?<\/form>\s*<\/div>/;
const newDest = dest.replace(singleEntryRegex, css + '\n' + html);

const jsInject = '<script>\n' + js + '\n' + dlJs + '\n</script>\n</body>';
const finalDest = newDest.replace(/<\/body>/, jsInject);

const cleanDest = finalDest.replace(/function calcAndSave\(\) \{[\s\S]*?toast\("Quote saved! " \+ ref, "success"\);\s*\}/, `function calcAndSave() {
  const p = getFormParams();
  const R = calcInsurance(p);
  if (!R) { showToast('Enter a valid Ex-Showroom price!', 'error'); return; }
  lastR = R; renderResults(R); document.getElementById('singleResults').style.display = 'block';
  showToast('Calculated successfully!', 'success');
}`);

const cleanerDest = cleanDest.replace(/toast\(/g, 'showToast(');

fs.writeFileSync('frontend/src/pages/calculator/hyundai_kia_bulk_insurance_calculator.html', cleanerDest);
console.log('Merge complete!');
