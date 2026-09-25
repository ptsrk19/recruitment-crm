// ── GST calculation ──────────────────────────────────────────────────────────
// BUG FIXED: the original app always charged CGST(9%) + SGST(9%) and hard-coded
// igst:0 on every invoice, regardless of which state the client was
// registered in. Under Indian GST law, invoices to a client registered in a
// DIFFERENT state from the billing entity must charge IGST(18%) instead of
// CGST+SGST — otherwise the tax invoice is not compliant. We now derive each
// party's state from the first two digits of their GSTIN (the official GST
// state code) and pick the correct split.

// First two digits of a GSTIN are the state code, e.g. "27AAAAA0000A1Z5" -> Maharashtra (27).
function gstStateCode(gstin) {
  if (!gstin || typeof gstin !== "string") return null;
  const code = gstin.trim().slice(0, 2);
  return /^\d{2}$/.test(code) ? code : null;
}

/**
 * @param {number} feeAmount taxable value (the recruitment fee, pre-tax)
 * @param {string} orgGstin  the recruiting agency's own GSTIN
 * @param {string} clientGstin the billed client's GSTIN
 * @returns {{taxType:string, sgst:number, cgst:number, igst:number, totalAmount:number, stateMatchKnown:boolean}}
 */
function computeGst(feeAmount, orgGstin, clientGstin) {
  const orgState = gstStateCode(orgGstin);
  const clientState = gstStateCode(clientGstin);
  const stateMatchKnown = !!(orgState && clientState);
  // If either GSTIN is missing/malformed we can't be sure — default to
  // intra-state (the more common case) but flag it via stateMatchKnown so
  // the UI can warn the admin to double check before publishing.
  const sameState = stateMatchKnown ? orgState === clientState : true;

  const fee = Number(feeAmount) || 0;
  if (sameState) {
    const half = fee * 0.09;
    return {
      taxType: "CGST_SGST",
      sgst: round2(half),
      cgst: round2(half),
      igst: 0,
      totalAmount: round2(fee + half * 2),
      stateMatchKnown,
    };
  }
  const igst = fee * 0.18;
  return {
    taxType: "IGST",
    sgst: 0,
    cgst: 0,
    igst: round2(igst),
    totalAmount: round2(fee + igst),
    stateMatchKnown,
  };
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

module.exports = { gstStateCode, computeGst, round2 };
