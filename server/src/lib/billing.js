// ── Billing / fee calculation ────────────────────────────────────────────────
// A client can bill either a flat percentage of every placement's CTC, or use
// CTC-based slabs — and each slab can independently be a flat rupee fee
// (e.g. "₹15,000 for any CTC under 8L") or a percentage of CTC (e.g. "4% for
// CTC 8L and above"). This mirrors how real recruitment contracts are often
// written: a flat minimum fee up to a threshold, then a percentage beyond it.
//
// Client.ctcBins shape: [{ ctcMin, ctcMax, type: "PERCENTAGE"|"FLAT", value }]
//   - type "PERCENTAGE": value is a percentage, e.g. 4 means 4% of CTC
//   - type "FLAT": value is a flat fee in rupees, e.g. 15000

function findBin(client, ctc) {
  const ctcNum = Number(ctc) || 0;
  const sorted = [...(client.ctcBins || [])].sort((a, b) => Number(a.ctcMin) - Number(b.ctcMin));
  for (const bin of sorted) {
    const lo = Number(bin.ctcMin) || 0;
    const hi = bin.ctcMax === "" || bin.ctcMax == null ? Infinity : Number(bin.ctcMax);
    if (ctcNum >= lo && ctcNum <= hi) return bin;
  }
  return null;
}

/**
 * @returns {{ fee: number, billingType: "PERCENTAGE"|"FLAT", billingRate: number }}
 *   billingRate is a percentage when billingType is PERCENTAGE, or the flat
 *   fee amount in rupees when billingType is FLAT — same field, different units,
 *   matching how it's stored on Placement/Invoice.
 */
function computeFee(client, ctc) {
  const ctcNum = Number(ctc) || 0;
  if (client?.useBins && Array.isArray(client.ctcBins) && client.ctcBins.length > 0) {
    const bin = findBin(client, ctcNum);
    if (bin) {
      if (bin.type === "FLAT") {
        const amount = Number(bin.value) || 0;
        return { fee: amount, billingType: "FLAT", billingRate: amount };
      }
      const rate = Number(bin.value) || 0;
      return { fee: (ctcNum * rate) / 100, billingType: "PERCENTAGE", billingRate: rate };
    }
    // No matching slab covers this CTC — fall through to the flat default rate.
  }
  const rate = Number(client?.billingRate) || 0;
  return { fee: (ctcNum * rate) / 100, billingType: "PERCENTAGE", billingRate: rate };
}

module.exports = { computeFee, findBin };
