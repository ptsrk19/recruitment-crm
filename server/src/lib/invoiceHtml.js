const { daysBetween, todayStr } = require("./dates");

const fmtDate = (d) =>
  d
    ? new Date(d + "T00:00:00Z").toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "—";

const INR = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number(n) || 0
  );

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// inv, org, client, candidate, job are plain objects loaded from the DB.
function buildInvoiceHTML({ invoice: inv, org, client: cl, candidate: cand, job, forPrint = false }) {
  org = org || {};
  cl = cl || {};
  cand = cand || {};
  job = job || {};
  const subtotal = inv.feeAmount || 0;
  const sgst = inv.sgst || 0;
  const cgst = inv.cgst || 0;
  const igst = inv.igst || 0;
  const total = inv.totalAmount || 0;
  const accentColor = org.invoiceAccentColor || "#1E1B4B";
  const accentLight = accentColor + "18";
  const fontFamily = org.invoiceFontFamily || "'Segoe UI',Arial,sans-serif";
  const showLogo = org.invoiceShowLogo !== false;
  const showStamp = org.invoiceShowStamp !== false;
  const footerNote =
    org.invoiceFooterNote ||
    "This is a computer-generated invoice. GST is applicable as per place of supply rules under CGST/SGST or IGST.";
  const serviceDesc =
    org.invoiceServiceDesc ||
    `Recruitment services for placement of ${esc(cand.name || "candidate")} as ${esc(
      job.title || cand.role || "the role"
    )} at ${esc(cl.name || "client")}`;
  const logoDataUrl = org.logoDataUrl || null;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Invoice ${esc(inv.invoiceNo)}</title><style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:${fontFamily};font-size:13px;color:#222;background:#fff;}
  .page{max-width:800px;margin:0 auto;padding:40px;}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:20px;border-bottom:3px solid ${accentColor};}
  .logo-block{display:flex;flex-direction:column;gap:4px;}
  .logo-block .company-name{font-size:20px;font-weight:900;color:${accentColor};margin-bottom:4px;}
  .logo-block img{max-height:52px;max-width:180px;object-fit:contain;margin-bottom:8px;}
  .logo-block p{font-size:11px;color:#555;line-height:1.6;}
  .invoice-title{text-align:right;}
  .invoice-title h2{font-size:30px;font-weight:900;color:${accentColor};letter-spacing:3px;margin-bottom:8px;}
  .invoice-title .inv-no{font-size:14px;font-weight:700;color:${accentColor};}
  .invoice-title .dates{font-size:12px;color:#666;margin-top:8px;line-height:1.7;}
  .parties{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:22px;}
  .party-box{background:${accentLight};border:1px solid ${accentColor}33;border-radius:8px;padding:14px 16px;}
  .party-box h4{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:${accentColor};margin-bottom:8px;}
  .party-box .name{font-size:14px;font-weight:700;margin-bottom:4px;color:#111;}
  .party-box p{font-size:11.5px;color:#555;line-height:1.6;margin-top:2px;}
  table{width:100%;border-collapse:collapse;margin-bottom:20px;border-radius:8px;overflow:hidden;}
  thead{background:${accentColor};color:#fff;}
  thead th{padding:10px 12px;text-align:left;font-size:11.5px;font-weight:700;letter-spacing:.03em;}
  tbody tr:nth-child(even){background:#F8F8FB;}
  tbody td{padding:10px 12px;font-size:12.5px;border-bottom:1px solid #EEEEEE;color:#333;}
  .totals{display:flex;justify-content:flex-end;margin-bottom:22px;}
  .totals-box{min-width:290px;border:1px solid #E0E0E0;border-radius:8px;overflow:hidden;}
  .totals-row{display:flex;justify-content:space-between;padding:8px 14px;font-size:12.5px;border-bottom:1px solid #F0F0F0;}
  .totals-row:last-child{border-bottom:none;}
  .totals-row.total{font-weight:900;font-size:14px;background:${accentColor};color:#fff;padding:10px 14px;}
  .bank-box{background:#F0FDF4;border:1.5px solid #6EE7B7;border-radius:8px;padding:14px 16px;margin-bottom:20px;}
  .bank-box h4{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#065F46;margin-bottom:10px;}
  .bank-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;}
  .bank-label{color:#888;margin-right:4px;}
  .note-box{background:#FFFBEB;border:1.5px solid #FCD34D;border-radius:8px;padding:12px 16px;margin-bottom:18px;font-size:12px;}
  .footer-note{font-size:10.5px;color:#999;margin-bottom:16px;line-height:1.5;}
  .sig{margin-top:36px;display:flex;justify-content:space-between;align-items:flex-end;}
  .sig-right{text-align:right;}
  .sig-right p{font-size:12px;color:#666;}
  .sig-right .sig-name{margin-top:36px;border-top:1.5px solid #999;padding-top:6px;font-size:13px;font-weight:700;color:#333;}
  .stamp-box{width:90px;height:90px;border:2px solid ${accentColor};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:${accentColor};text-align:center;opacity:.35;letter-spacing:.04em;text-transform:uppercase;line-height:1.3;}
  .footer{border-top:1px solid #EEE;padding-top:12px;margin-top:24px;display:flex;justify-content:space-between;font-size:10.5px;color:#bbb;}
  @media print{.no-print{display:none!important;}}
</style></head><body>
${
  forPrint
    ? `<div class="no-print" style="background:${accentColor};padding:10px 20px;display:flex;gap:10px;align-items:center;">
  <button onclick="window.print()" style="background:#fff;color:${accentColor};border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-weight:800;font-size:13px;">🖨️ Print / Save as PDF</button>
  <button onclick="window.close()" style="background:rgba(255,255,255,.15);color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;font-size:13px;">✕ Close</button>
  <span style="color:rgba(255,255,255,.6);font-size:12px;margin-left:8px;">Use browser Print → Save as PDF to download</span>
</div>`
    : ""
}
<div class="page">
  <div class="header">
    <div class="logo-block">
      ${showLogo && logoDataUrl ? `<img src="${logoDataUrl}" alt="logo"/>` : ""}
      <div class="company-name">${esc(org.name)}</div>
      <p>${esc(org.address || "").replace(/\n/g, "<br>")}</p>
      <p>GSTIN: <strong>${esc(org.gstin)}</strong>&nbsp;&nbsp;PAN: <strong>${esc(org.pan)}</strong></p>
      <p>${esc(org.email)}&nbsp;&nbsp;${esc(org.phone)}</p>
    </div>
    <div class="invoice-title">
      <h2>TAX INVOICE</h2>
      <div class="inv-no">${esc(inv.invoiceNo)}</div>
      <div class="dates">
        <div>Issue Date: <strong>${fmtDate(inv.issuedAt)}</strong></div>
        <div>Due Date: <strong>${fmtDate(inv.dueDate)}</strong></div>
      </div>
    </div>
  </div>

  <div class="parties">
    <div class="party-box">
      <h4>Bill To</h4>
      <div class="name">${esc((inv.billingAddress || "").split(",")[0] || cl.name)}</div>
      <p>${esc((inv.billingAddress || cl.billingAddress || "").split(",").slice(1).join(",").trim())}</p>
      <p>GSTIN: <strong>${esc(inv.clientGstin || cl.gstin || "—")}</strong></p>
    </div>
    <div class="party-box">
      <h4>Placement Details</h4>
      <div class="name">${esc(cand.name || "—")}</div>
      <p>Role: ${esc(job.title || cand.role || "—")}</p>
      <p>SAC Code: <strong>${esc(inv.sacCode || "998513")}</strong></p>
      <p>Billing: <strong>${inv.billingType === "FLAT" ? `Flat Fee ${INR(inv.billingRate || 0)}` : `${inv.billingRate || 0}% of CTC`}</strong></p>
    </div>
  </div>

  <table>
    <thead>
      <tr><th style="width:28px">#</th><th>Description of Service</th><th style="width:70px">SAC</th><th style="width:120px">CTC</th><th style="width:60px">Rate</th><th style="width:110px;text-align:right">Amount</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td>${serviceDesc}</td>
        <td>${esc(inv.sacCode || "998513")}</td>
        <td>${INR(inv.ctc || 0)}</td>
        <td>${inv.billingType === "FLAT" ? "Flat" : `${inv.billingRate || 0}%`}</td>
        <td style="text-align:right"><strong>${INR(subtotal)}</strong></td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="totals-row"><span>Subtotal (Fee)</span><span>${INR(subtotal)}</span></div>
      ${sgst > 0 ? `<div class="totals-row"><span>SGST @ 9%</span><span>${INR(sgst)}</span></div>` : ""}
      ${cgst > 0 ? `<div class="totals-row"><span>CGST @ 9%</span><span>${INR(cgst)}</span></div>` : ""}
      ${igst > 0 ? `<div class="totals-row"><span>IGST @ 18%</span><span>${INR(igst)}</span></div>` : ""}
      <div class="totals-row total"><span>TOTAL PAYABLE</span><span>${INR(total)}</span></div>
    </div>
  </div>

  <div class="bank-box">
    <h4>Bank Details for Payment</h4>
    <div class="bank-grid">
      <div><span class="bank-label">Bank:</span><strong>${esc(org.bank)}</strong></div>
      <div><span class="bank-label">Account No:</span><strong>${esc(org.accountNo)}</strong></div>
      <div><span class="bank-label">IFSC:</span><strong>${esc(org.ifsc)}</strong></div>
      <div><span class="bank-label">Payment Due:</span><strong>${fmtDate(inv.dueDate)}</strong></div>
    </div>
  </div>

  ${inv.notes ? `<div class="note-box"><strong>Note: </strong>${esc(inv.notes)}</div>` : ""}

  <p class="footer-note">${esc(footerNote)}</p>

  <div class="sig">
    ${showStamp ? `<div class="stamp-box">VERIFIED<br>${esc(org.name)}</div>` : "<div></div>"}
    <div class="sig-right">
      <p>For <strong>${esc(org.name)}</strong></p>
      <div class="sig-name">Authorised Signatory</div>
    </div>
  </div>

  <div class="footer">
    <span>Invoice # ${esc(inv.invoiceNo)}</span>
    <span>Generated ${fmtDate(todayStr())}</span>
  </div>
</div></body></html>`;
}

module.exports = { buildInvoiceHTML, INR, fmtDate };
