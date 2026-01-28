function formatMoney(num) {
  return num.toLocaleString("en-IN");
}

function calculateSIP() {
  const P = Number(document.getElementById("monthly").value);
  const years = Number(document.getElementById("years").value);
  const annualRate = Number(document.getElementById("rate").value);

  const n = years * 12;
  const r = annualRate / 12 / 100;

  const futureValue = P * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
  const invested = P * n;
  const gain = futureValue - invested;

  document.getElementById("invested").innerText = formatMoney(invested.toFixed(0));
  document.getElementById("final").innerText = formatMoney(futureValue.toFixed(0));
  document.getElementById("gain").innerText = formatMoney(gain.toFixed(0));
}

// Auto-calculate on page load
calculateSIP();

