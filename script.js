let sipChart = null;

function formatMoney(num) {
  return num.toLocaleString("en-IN");
}

function calculateSIP() {
  const baseMonthly = Number(document.getElementById("monthly").value);
  const years = Number(document.getElementById("years").value);
  const annualRate = Number(document.getElementById("rate").value);
  const stepUp = Number(document.getElementById("stepup").value);

  const r = annualRate / 12 / 100;

  let monthly = baseMonthly;
  let totalInvested = 0;
  let value = 0;

  const labels = [];
  const values = [];

  for (let year = 1; year <= years; year++) {
    for (let month = 1; month <= 12; month++) {
      value = (value + monthly) * (1 + r);
      totalInvested += monthly;
    }
    labels.push(`Year ${year}`);
    values.push(value.toFixed(0));

    monthly = monthly * (1 + stepUp / 100);
  }

  const gain = value - totalInvested;

  document.getElementById("invested").innerText = formatMoney(totalInvested.toFixed(0));
  document.getElementById("final").innerText = formatMoney(value.toFixed(0));
  document.getElementById("gain").innerText = formatMoney(gain.toFixed(0));

  drawChart(labels, values);
}

function drawChart(labels, data) {
  const ctx = document.getElementById("sipChart").getContext("2d");

  if (sipChart) {
    sipChart.destroy();
  }

  sipChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Portfolio Value (₹)",
        data: data,
        fill: true,
        tension: 0.35
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: true
        }
      },
      scales: {
        y: {
          ticks: {
            callback: function(value) {
              return "₹" + formatMoney(value);
            }
          }
        }
      }
    }
  });
}

// Auto-calc on load
calculateSIP();
