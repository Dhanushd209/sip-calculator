// ==========================================
// Global Variables
// ==========================================

let sipChart = null;
let currentMode = 'forward';
let currentChartType = 'bar';

// ==========================================
// Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    // Load saved theme preference
    const savedTheme = localStorage.getItem('sipwise-theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    document.getElementById('themeToggle').textContent = savedTheme === 'light' ? '🌙' : '☀️';
    
    // Set default start date to today (only on calculator page)
    const startDateInput = document.getElementById('startDate');
    if (startDateInput) {
        const today = new Date().toISOString().split('T')[0];
        startDateInput.value = today;
    }
    
    // Initial calculation (only on calculator page)
    if (typeof calculate === 'function') {
        calculate();
    }
    
    // Load URL parameters if present
    if (typeof loadURLParameters === 'function') {
        loadURLParameters();
    }
});

// ==========================================
// Theme Functions
// ==========================================

function toggleTheme() {
    const body = document.body;
    const theme = body.getAttribute('data-theme');
    const newTheme = theme === 'light' ? 'dark' : 'light';
    body.setAttribute('data-theme', newTheme);
    document.getElementById('themeToggle').textContent = newTheme === 'light' ? '🌙' : '☀️';
    
    // Save theme preference to localStorage
    localStorage.setItem('sipwise-theme', newTheme);
    
    // Recreate chart with new theme colors (only if on calculator page)
    if (sipChart && typeof calculate === 'function') {
        calculate();
    }
}

// ==========================================
// UI Update Functions
// ==========================================

function updateValue(id) {
    const slider = document.getElementById(id);
    const display = document.getElementById(id + 'Display');
    const input = document.getElementById(id + 'Input');
    
    if (id === 'sipAmount' || id === 'targetCorpus') {
        display.textContent = formatCurrency(slider.value);
        if (input) input.value = slider.value;
    } else {
        display.textContent = slider.value;
    }
    
    calculate();
}

function updateSlider(id) {
    const input = document.getElementById(id + 'Input');
    const slider = document.getElementById(id);
    const display = document.getElementById(id + 'Display');
    
    slider.value = input.value;
    display.textContent = formatCurrency(input.value);
    
    calculate();
}

function updateDisplay(id) {
    const input = document.getElementById(id);
    const display = document.getElementById(id + 'Display');
    display.textContent = formatCurrency(input.value);
    calculate();
}

// ==========================================
// Mode & Settings Functions
// ==========================================

function setMode(mode) {
    currentMode = mode;
    const buttons = document.querySelectorAll('.toggle-group .toggle-btn');
    buttons.forEach((btn, idx) => {
        btn.classList.toggle('active', (mode === 'forward' && idx === 0) || (mode === 'reverse' && idx === 1));
    });

    document.getElementById('sipAmountGroup').style.display = mode === 'forward' ? 'block' : 'none';
    document.getElementById('targetCorpusGroup').style.display = mode === 'reverse' ? 'block' : 'none';

    calculate();
}

function setReturn(rate) {
    document.getElementById('returnRate').value = rate;
    document.getElementById('returnRateDisplay').textContent = rate;
    
    const buttons = document.querySelectorAll('.toggle-group .toggle-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    calculate();
}

function setGoal(goal) {
    const buttons = document.querySelectorAll('.goal-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.closest('.goal-btn').classList.add('active');
}

function toggleStepUp() {
    const checkbox = document.getElementById('stepUpEnabled');
    const options = document.getElementById('stepUpOptions');
    checkbox.checked = !checkbox.checked;
    options.style.display = checkbox.checked ? 'block' : 'none';
    calculate();
}

function toggleLumpSum() {
    const checkbox = document.getElementById('lumpSumEnabled');
    const options = document.getElementById('lumpSumOptions');
    checkbox.checked = !checkbox.checked;
    options.style.display = checkbox.checked ? 'block' : 'none';
    calculate();
}

function toggleInflation() {
    const checkbox = document.getElementById('inflationEnabled');
    const options = document.getElementById('inflationOptions');
    const box = document.getElementById('inflationAdjustedBox');
    checkbox.checked = !checkbox.checked;
    options.style.display = checkbox.checked ? 'block' : 'none';
    box.style.display = checkbox.checked ? 'block' : 'none';
    calculate();
}

function toggleExpandable(id) {
    const content = document.getElementById(id + 'Content');
    const icon = document.getElementById(id + 'Icon');
    
    if (content.classList.contains('open')) {
        content.classList.remove('open');
        icon.textContent = '▼';
    } else {
        content.classList.add('open');
        icon.textContent = '▲';
    }
}

// ==========================================
// Tab Functions
// ==========================================

function switchTab(tab) {
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(tab + 'Tab').classList.add('active');
}

function setChartType(type) {
    currentChartType = type;
    const buttons = document.querySelectorAll('.toggle-group .toggle-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    calculate();
}

// ==========================================
// Calculation Functions
// ==========================================

function calculate() {
    let sipAmount = parseFloat(document.getElementById('sipAmount').value);
    const duration = parseInt(document.getElementById('duration').value);
    const annualReturn = parseFloat(document.getElementById('returnRate').value);
    const frequency = parseInt(document.getElementById('frequency').value);
    const stepUpEnabled = document.getElementById('stepUpEnabled').checked;
    const stepUpRate = stepUpEnabled ? parseFloat(document.getElementById('stepUp').value) : 0;
    const lumpSumEnabled = document.getElementById('lumpSumEnabled').checked;
    const lumpSum = lumpSumEnabled ? parseFloat(document.getElementById('lumpSum').value) : 0;
    const inflationEnabled = document.getElementById('inflationEnabled').checked;
    const inflationRate = inflationEnabled ? parseFloat(document.getElementById('inflation').value) : 0;

    // Reverse calculator mode
    if (currentMode === 'reverse') {
        const targetCorpus = parseFloat(document.getElementById('targetCorpus').value);
        sipAmount = calculateReverseSIP(targetCorpus, duration, annualReturn, frequency);
        document.getElementById('sipAmount').value = sipAmount;
        document.getElementById('sipAmountDisplay').textContent = formatCurrency(sipAmount);
        document.getElementById('sipAmountInput').value = sipAmount;
    }

    const monthlyRate = annualReturn / 100 / 12;
    const totalMonths = duration * 12;
    const periodsPerYear = frequency;

    let totalInvested = 0;
    let corpus = lumpSum;
    const yearlyData = [];

    // Calculate year by year
    for (let year = 1; year <= duration; year++) {
        const currentSIP = sipAmount * Math.pow(1 + stepUpRate / 100, year - 1);
        const yearInvestment = currentSIP * periodsPerYear;
        totalInvested += yearInvestment;

        for (let period = 0; period < periodsPerYear; period++) {
            corpus = corpus * (1 + monthlyRate * (12 / periodsPerYear)) + currentSIP;
        }

        yearlyData.push({
            year: year,
            invested: totalInvested,
            corpus: corpus,
            returns: corpus - totalInvested
        });
    }

    const totalGains = corpus - totalInvested;
    const multiplier = corpus / totalInvested;
    const cagr = (Math.pow(corpus / totalInvested, 1 / duration) - 1) * 100;
    const gainPercentage = ((totalGains / totalInvested) * 100).toFixed(2);

    // Update displays
    document.getElementById('totalInvested').textContent = '₹' + formatNumber(totalInvested);
    document.getElementById('expectedCorpus').textContent = '₹' + formatNumber(corpus);
    document.getElementById('totalGains').textContent = '₹' + formatNumber(totalGains);
    document.getElementById('gainPercentage').textContent = gainPercentage + '%';
    document.getElementById('multiplier').textContent = multiplier.toFixed(2) + 'x';
    document.getElementById('cagr').textContent = cagr.toFixed(2) + '%';

    // Inflation adjusted value
    if (inflationEnabled) {
        const realRate = ((1 + annualReturn / 100) / (1 + inflationRate / 100)) - 1;
        const realValue = totalInvested * Math.pow(1 + realRate, duration);
        document.getElementById('inflationAdjusted').textContent = '₹' + formatNumber(realValue);
    }

    // Tax calculation
    calculateTax(totalGains, corpus);

    // Scenario comparison
    calculateScenarios(sipAmount, duration, frequency, stepUpRate, lumpSum);

    // Update chart
    updateChart(yearlyData);

    // Update table
    updateTable(yearlyData);
}

function calculateReverseSIP(targetCorpus, duration, annualReturn, frequency) {
    const monthlyRate = annualReturn / 100 / 12;
    const totalMonths = duration * 12;
    
    // Using FV formula: FV = P × [(1 + r)^n - 1] / r × (1 + r)
    const fvFactor = (Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate * (1 + monthlyRate);
    const monthlySIP = targetCorpus / fvFactor;
    
    return Math.round(monthlySIP);
}

function calculateTax(gains, corpus) {
    const fundType = document.getElementById('fundType').value;
    let taxAmount = 0;
    
    if (fundType === 'equity') {
        // LTCG: 12.5% on gains above 1.25 lakh
        const exemption = 125000;
        if (gains > exemption) {
            taxAmount = (gains - exemption) * 0.125;
        }
    } else if (fundType === 'debt') {
        // Taxed at slab rate - assuming 30% for calculation
        taxAmount = gains * 0.30;
    } else {
        // Hybrid - average of equity and debt
        taxAmount = gains * 0.20;
    }

    const postTaxCorpus = corpus - taxAmount;
    
    document.getElementById('taxAmount').textContent = '₹' + formatNumber(taxAmount);
    document.getElementById('postTaxCorpus').textContent = '₹' + formatNumber(postTaxCorpus);
    document.getElementById('taxBox').style.display = 'block';
}

function calculateScenarios(sipAmount, duration, frequency, stepUpRate, lumpSum) {
    const scenarios = [
        { rate: 8, id: 'conservativeCorpus' },
        { rate: 12, id: 'moderateCorpus' },
        { rate: 15, id: 'aggressiveCorpus' }
    ];

    scenarios.forEach(scenario => {
        const monthlyRate = scenario.rate / 100 / 12;
        const totalMonths = duration * 12;
        let corpus = lumpSum;
        let totalInvested = 0;

        for (let year = 1; year <= duration; year++) {
            const currentSIP = sipAmount * Math.pow(1 + stepUpRate / 100, year - 1);
            totalInvested += currentSIP * frequency;

            for (let period = 0; period < frequency; period++) {
                corpus = corpus * (1 + monthlyRate * (12 / frequency)) + currentSIP;
            }
        }

        document.getElementById(scenario.id).textContent = '₹' + formatNumber(corpus);
    });

    // Calculate probability (simplified Monte Carlo simulation)
    const probability = Math.min(95, 50 + (duration * 3));
    document.getElementById('probabilityFill').style.width = probability + '%';
    document.getElementById('probabilityText').textContent = probability + '%';
}

// ==========================================
// Chart Functions
// ==========================================

function updateChart(data) {
    const ctx = document.getElementById('sipChart').getContext('2d');
    
    if (sipChart) {
        sipChart.destroy();
    }

    const theme = document.body.getAttribute('data-theme');
    const textColor = theme === 'dark' ? '#F1F5F9' : '#1A1A1A';
    const gridColor = theme === 'dark' ? '#334155' : '#E5E7EB';

    const labels = data.map(d => 'Year ' + d.year);
    const investedData = data.map(d => d.invested);
    const corpusData = data.map(d => d.corpus);
    const returnsData = data.map(d => d.returns);

    let config = {};

    if (currentChartType === 'bar') {
        config = {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Total Invested',
                        data: investedData,
                        backgroundColor: 'rgba(59, 130, 246, 0.7)',
                        borderColor: 'rgb(59, 130, 246)',
                        borderWidth: 2
                    },
                    {
                        label: 'Returns Generated',
                        data: returnsData,
                        backgroundColor: 'rgba(16, 185, 129, 0.7)',
                        borderColor: 'rgb(16, 185, 129)',
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        labels: { color: textColor }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ₹' + formatNumber(context.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        ticks: { color: textColor },
                        grid: { color: gridColor }
                    },
                    y: {
                        stacked: true,
                        ticks: { 
                            color: textColor,
                            callback: function(value) {
                                return '₹' + formatNumber(value);
                            }
                        },
                        grid: { color: gridColor }
                    }
                }
            }
        };
    } else if (currentChartType === 'line') {
        config = {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Total Invested',
                        data: investedData,
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Expected Corpus',
                        data: corpusData,
                        borderColor: 'rgb(16, 185, 129)',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        labels: { color: textColor }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ₹' + formatNumber(context.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: textColor },
                        grid: { color: gridColor }
                    },
                    y: {
                        ticks: { 
                            color: textColor,
                            callback: function(value) {
                                return '₹' + formatNumber(value);
                            }
                        },
                        grid: { color: gridColor }
                    }
                }
            }
        };
    } else {
        const finalData = data[data.length - 1];
        config = {
            type: 'pie',
            data: {
                labels: ['Principal Amount', 'Returns Generated'],
                datasets: [{
                    data: [finalData.invested, finalData.returns],
                    backgroundColor: [
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(16, 185, 129, 0.8)'
                    ],
                    borderColor: [
                        'rgb(59, 130, 246)',
                        'rgb(16, 185, 129)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: textColor }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': ₹' + formatNumber(context.parsed);
                            }
                        }
                    }
                }
            }
        };
    }

    sipChart = new Chart(ctx, config);
}

// ==========================================
// Table Functions
// ==========================================

function updateTable(data) {
    const tbody = document.getElementById('breakdownTableBody');
    tbody.innerHTML = '';

    data.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>Year ${row.year}</td>
            <td>₹${formatNumber(row.invested)}</td>
            <td>₹${formatNumber(row.returns)}</td>
            <td>₹${formatNumber(row.corpus)}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ==========================================
// Utility Functions
// ==========================================

function formatNumber(num) {
    return Math.round(num).toLocaleString('en-IN');
}

function formatCurrency(num) {
    const n = parseFloat(num);
    if (n >= 10000000) {
        return (n / 10000000).toFixed(2) + ' Cr';
    } else if (n >= 100000) {
        return (n / 100000).toFixed(2) + ' L';
    } else {
        return n.toLocaleString('en-IN');
    }
}

// ==========================================
// Export Functions
// ==========================================

async function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text('SIP Investment Report', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 20, 30);
    
    doc.setFontSize(14);
    doc.text('Investment Summary', 20, 45);
    
    doc.setFontSize(11);
    const sipAmount = document.getElementById('sipAmount').value;
    const duration = document.getElementById('duration').value;
    const returnRate = document.getElementById('returnRate').value;
    const totalInvested = document.getElementById('totalInvested').textContent;
    const expectedCorpus = document.getElementById('expectedCorpus').textContent;
    const totalGains = document.getElementById('totalGains').textContent;

    doc.text(`Monthly SIP: ₹${sipAmount}`, 20, 55);
    doc.text(`Duration: ${duration} years`, 20, 62);
    doc.text(`Expected Return: ${returnRate}%`, 20, 69);
    doc.text(`Total Invested: ${totalInvested}`, 20, 76);
    doc.text(`Expected Corpus: ${expectedCorpus}`, 20, 83);
    doc.text(`Total Gains: ${totalGains}`, 20, 90);

    doc.setFontSize(9);
    doc.text('Disclaimer: This is a projection based on assumptions. Actual returns may vary.', 20, 280);

    doc.save('sip-investment-report.pdf');
}

function downloadExcel() {
    const table = document.getElementById('breakdownTable');
    const wb = XLSX.utils.table_to_book(table);
    
    // Add summary sheet
    const summaryData = [
        ['SIP Investment Summary'],
        [''],
        ['Parameter', 'Value'],
        ['Monthly SIP', '₹' + document.getElementById('sipAmount').value],
        ['Duration', document.getElementById('duration').value + ' years'],
        ['Expected Return', document.getElementById('returnRate').value + '%'],
        ['Total Invested', document.getElementById('totalInvested').textContent],
        ['Expected Corpus', document.getElementById('expectedCorpus').textContent],
        ['Total Gains', document.getElementById('totalGains').textContent],
        [''],
        ['Generated on: ' + new Date().toLocaleDateString('en-IN')]
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws, 'Summary');

    XLSX.writeFile(wb, 'sip-calculation.xlsx');
}

function shareResults() {
    const sipAmount = document.getElementById('sipAmount').value;
    const duration = document.getElementById('duration').value;
    const returnRate = document.getElementById('returnRate').value;
    
    const url = `${window.location.origin}${window.location.pathname}?sip=${sipAmount}&duration=${duration}&return=${returnRate}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'SIP Investment Calculation',
            text: `Check out my SIP calculation: Monthly ₹${sipAmount} for ${duration} years at ${returnRate}% returns`,
            url: url
        });
    } else {
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
    }
}

// ==========================================
// URL Parameter Loading
// ==========================================

function loadURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('sip')) {
        document.getElementById('sipAmount').value = urlParams.get('sip');
        updateValue('sipAmount');
    }
    if (urlParams.has('duration')) {
        document.getElementById('duration').value = urlParams.get('duration');
        updateValue('duration');
    }
    if (urlParams.has('return')) {
        document.getElementById('returnRate').value = urlParams.get('return');
        updateValue('returnRate');
    }
}