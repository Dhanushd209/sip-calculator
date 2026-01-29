// ==========================================
// Portfolio Analyzer JavaScript
// ==========================================

let currentMode = 'manual';
let fundCounter = 0;
let selectedRisk = 'medium';
let allocationChart = null;

// Comprehensive Mutual Fund Database (Illustrative)
const fundDatabase = [
    // Large Cap Equity
    { id: 1, name: "HDFC Top 100 Fund", amc: "HDFC", category: "Large Cap", cagr1y: 18.5, cagr3y: 15.2, cagr5y: 14.8, expense: 1.05, risk: "Medium", aum: 25000, exitLoad: 1.0, manager: "Chirag Setalvad", nfo: false },
    { id: 2, name: "ICICI Prudential Bluechip Fund", amc: "ICICI", category: "Large Cap", cagr1y: 17.2, cagr3y: 14.8, cagr5y: 13.9, expense: 1.05, risk: "Medium", aum: 35000, exitLoad: 1.0, manager: "Sankaran Naren", nfo: false },
    { id: 3, name: "Axis Bluechip Fund", amc: "Axis", category: "Large Cap", cagr1y: 19.1, cagr3y: 16.5, cagr5y: 15.2, expense: 0.48, risk: "Medium", aum: 28000, exitLoad: 1.0, manager: "Shreyash Devalkar", nfo: false },
    { id: 4, name: "SBI Bluechip Fund", amc: "SBI", category: "Large Cap", cagr1y: 16.8, cagr3y: 14.2, cagr5y: 13.5, expense: 0.71, risk: "Medium", aum: 32000, exitLoad: 1.0, manager: "R. Srinivasan", nfo: false },
    
    // Mid Cap Equity
    { id: 5, name: "Kotak Emerging Equity Fund", amc: "Kotak", category: "Mid Cap", cagr1y: 22.5, cagr3y: 18.9, cagr5y: 17.2, expense: 0.54, risk: "High", aum: 18000, exitLoad: 1.0, manager: "Pankaj Tibrewal", nfo: false },
    { id: 6, name: "DSP Midcap Fund", amc: "DSP", category: "Mid Cap", cagr1y: 21.8, cagr3y: 17.5, cagr5y: 16.8, expense: 0.82, risk: "High", aum: 12000, exitLoad: 1.0, manager: "Vinit Sambre", nfo: false },
    { id: 7, name: "HDFC Mid-Cap Opportunities Fund", amc: "HDFC", category: "Mid Cap", cagr1y: 23.2, cagr3y: 19.5, cagr5y: 18.1, expense: 1.17, risk: "High", aum: 42000, exitLoad: 1.0, manager: "Chirag Setalvad", nfo: false },
    
    // Small Cap Equity
    { id: 8, name: "Axis Small Cap Fund", amc: "Axis", category: "Small Cap", cagr1y: 28.5, cagr3y: 24.2, cagr5y: 22.5, expense: 0.63, risk: "Very High", aum: 8500, exitLoad: 1.0, manager: "Anupam Tiwari", nfo: false },
    { id: 9, name: "SBI Small Cap Fund", amc: "SBI", category: "Small Cap", cagr1y: 26.8, cagr3y: 22.5, cagr5y: 21.2, expense: 0.89, risk: "Very High", aum: 7200, exitLoad: 1.0, manager: "R. Srinivasan", nfo: false },
    
    // Flexi Cap / Multi Cap
    { id: 10, name: "Parag Parikh Flexi Cap Fund", amc: "PPFAS", category: "Flexi Cap", cagr1y: 20.5, cagr3y: 17.8, cagr5y: 16.5, expense: 0.82, risk: "Medium-High", aum: 45000, exitLoad: 2.0, manager: "Rajeev Thakkar", nfo: false },
    { id: 11, name: "Canara Robeco Flexi Cap Fund", amc: "Canara Robeco", category: "Flexi Cap", cagr1y: 19.2, cagr3y: 16.5, cagr5y: 15.8, expense: 0.95, risk: "Medium-High", aum: 15000, exitLoad: 1.0, manager: "Shridatta Bhandwaldar", nfo: false },
    
    // ELSS (Tax Saving)
    { id: 12, name: "Axis Long Term Equity Fund", amc: "Axis", category: "ELSS", cagr1y: 21.2, cagr3y: 18.5, cagr5y: 17.2, expense: 0.68, risk: "High", aum: 25000, exitLoad: 0.0, manager: "Jinesh Gopani", nfo: false },
    { id: 13, name: "Mirae Asset Tax Saver Fund", amc: "Mirae", category: "ELSS", cagr1y: 22.5, cagr3y: 19.2, cagr5y: 18.5, expense: 0.75, risk: "High", aum: 18000, exitLoad: 0.0, manager: "Neelesh Surana", nfo: false },
    { id: 14, name: "Quant ELSS Tax Saver Fund", amc: "Quant", category: "ELSS", cagr1y: 25.8, cagr3y: 22.5, cagr5y: 21.2, expense: 0.62, risk: "Very High", aum: 5500, exitLoad: 0.0, manager: "Sanjeev Sharma", nfo: false },
    
    // Debt Funds
    { id: 15, name: "ICICI Prudential Corporate Bond Fund", amc: "ICICI", category: "Debt", cagr1y: 7.2, cagr3y: 6.8, cagr5y: 7.5, expense: 0.42, risk: "Low", aum: 15000, exitLoad: 1.0, manager: "Manish Banthia", nfo: false },
    { id: 16, name: "HDFC Corporate Bond Fund", amc: "HDFC", category: "Debt", cagr1y: 7.5, cagr3y: 7.2, cagr5y: 7.8, expense: 0.38, risk: "Low", aum: 18000, exitLoad: 1.0, manager: "Anil Bamboli", nfo: false },
    { id: 17, name: "Axis Banking & PSU Debt Fund", amc: "Axis", category: "Debt", cagr1y: 7.8, cagr3y: 7.5, cagr5y: 8.2, expense: 0.35, risk: "Low", aum: 12000, exitLoad: 0.25, manager: "Devang Shah", nfo: false },
    
    // Hybrid Funds
    { id: 18, name: "ICICI Prudential Equity & Debt Fund", amc: "ICICI", category: "Hybrid", cagr1y: 14.5, cagr3y: 12.8, cagr5y: 11.5, expense: 1.25, risk: "Medium", aum: 22000, exitLoad: 1.0, manager: "Manish Banthia", nfo: false },
    { id: 19, name: "HDFC Balanced Advantage Fund", amc: "HDFC", category: "Hybrid", cagr1y: 13.8, cagr3y: 11.5, cagr5y: 10.8, expense: 1.05, risk: "Medium", aum: 50000, exitLoad: 1.0, manager: "Prashant Jain", nfo: false },
    { id: 20, name: "SBI Equity Hybrid Fund", amc: "SBI", category: "Hybrid", cagr1y: 15.2, cagr3y: 13.5, cagr5y: 12.2, expense: 0.95, risk: "Medium", aum: 28000, exitLoad: 1.0, manager: "Dinesh Ahuja", nfo: false },
    
    // Index Funds
    { id: 21, name: "ICICI Prudential Nifty 50 Index Fund", amc: "ICICI", category: "Index", cagr1y: 16.5, cagr3y: 14.2, cagr5y: 13.8, expense: 0.18, risk: "Medium", aum: 8000, exitLoad: 0.0, manager: "Nishit Patel", nfo: false },
    { id: 22, name: "UTI Nifty Index Fund", amc: "UTI", category: "Index", cagr1y: 16.2, cagr3y: 14.0, cagr5y: 13.5, expense: 0.20, risk: "Medium", aum: 12000, exitLoad: 0.0, manager: "Sharwan Goyal", nfo: false },
    
    // New AMCs / NFOs
    { id: 23, name: "Jio-BlackRock Innovation Fund", amc: "Jio-BlackRock", category: "Thematic", cagr1y: null, cagr3y: null, cagr5y: null, expense: 0.50, risk: "High", aum: 500, exitLoad: 1.0, manager: "TBA", nfo: true },
    { id: 24, name: "Jio-BlackRock Nifty 50 Index Fund", amc: "Jio-BlackRock", category: "Index", cagr1y: null, cagr3y: null, cagr5y: null, expense: 0.15, risk: "Medium", aum: 300, exitLoad: 0.0, manager: "TBA", nfo: true },
];

// ==========================================
// Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    // Add first fund by default in manual mode
    if (currentMode === 'manual') {
        addFund();
    }
});

// ==========================================
// Mode Switching
// ==========================================

function switchMode(mode) {
    currentMode = mode;
    
    // Update button states
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    event.target.closest('.mode-btn').classList.add('active');
    
    // Update content visibility
    document.querySelectorAll('.mode-content').forEach(content => content.classList.remove('active'));
    document.getElementById(mode + 'Mode').classList.add('active');
}

// ==========================================
// Value Update Functions
// ==========================================

function updatePortfolioValue(id) {
    const slider = document.getElementById(id);
    const display = document.getElementById(id + 'Display');
    display.textContent = slider.value;
}

// ==========================================
// MANUAL MODE FUNCTIONS
// ==========================================

function addFund() {
    if (fundCounter >= 10) {
        alert('Maximum 10 funds allowed');
        return;
    }
    
    fundCounter++;
    const fundList = document.getElementById('fundList');
    
    const fundItem = document.createElement('div');
    fundItem.className = 'fund-item';
    fundItem.id = `fund-${fundCounter}`;
    fundItem.innerHTML = `
        <div class="fund-header">
            <span class="fund-number">Fund ${fundCounter}</span>
            <button class="remove-fund" onclick="removeFund(${fundCounter})">×</button>
        </div>
        
        <div class="fund-search">
            <input type="text" 
                   id="search-${fundCounter}" 
                   placeholder="Search fund name..."
                   onkeyup="searchFunds(${fundCounter})"
                   onfocus="searchFunds(${fundCounter})">
            <div class="fund-suggestions" id="suggestions-${fundCounter}" style="display: none;"></div>
        </div>
        
        <div id="selected-${fundCounter}" style="display: none;"></div>
        
        <div class="fund-allocation" id="allocation-${fundCounter}" style="display: none;">
            <div class="allocation-input">
                <label>Monthly SIP (₹)</label>
                <input type="number" id="amount-${fundCounter}" value="1000" min="100">
            </div>
            <div class="allocation-input">
                <label>Allocation (%)</label>
                <input type="number" id="percent-${fundCounter}" value="10" min="0" max="100" disabled>
            </div>
        </div>
    `;
    
    fundList.appendChild(fundItem);
}

function removeFund(id) {
    const fundItem = document.getElementById(`fund-${id}`);
    fundItem.remove();
    fundCounter--;
}

function searchFunds(fundId) {
    const searchInput = document.getElementById(`search-${fundId}`);
    const query = searchInput.value.toLowerCase();
    const suggestionsDiv = document.getElementById(`suggestions-${fundId}`);
    
    if (query.length < 2) {
        suggestionsDiv.style.display = 'none';
        return;
    }
    
    const matches = fundDatabase.filter(fund => 
        fund.name.toLowerCase().includes(query) || 
        fund.amc.toLowerCase().includes(query)
    ).slice(0, 5);
    
    if (matches.length === 0) {
        suggestionsDiv.style.display = 'none';
        return;
    }
    
    suggestionsDiv.innerHTML = matches.map(fund => `
        <div class="fund-suggestion" onclick="selectFund(${fundId}, ${fund.id})">
            <div class="fund-suggestion-name">${fund.name}</div>
            <div class="fund-suggestion-meta">${fund.amc} • ${fund.category} ${fund.nfo ? '• NFO' : ''}</div>
        </div>
    `).join('');
    
    suggestionsDiv.style.display = 'block';
}

function selectFund(fundId, dbId) {
    const fund = fundDatabase.find(f => f.id === dbId);
    const suggestionsDiv = document.getElementById(`suggestions-${fundId}`);
    const selectedDiv = document.getElementById(`selected-${fundId}`);
    const allocationDiv = document.getElementById(`allocation-${fundId}`);
    const searchInput = document.getElementById(`search-${fundId}`);
    
    searchInput.value = '';
    suggestionsDiv.style.display = 'none';
    
    selectedDiv.innerHTML = `
        <div class="selected-fund">
            <div class="selected-fund-name">${fund.name}</div>
            <div class="selected-fund-meta">
                <span class="fund-badge ${fund.category.toLowerCase()}">${fund.category}</span>
                <span class="fund-badge">${fund.amc}</span>
                <span class="fund-badge">Expense: ${fund.expense}%</span>
                ${fund.nfo ? '<span class="fund-badge" style="background: #10B981; color: white;">NFO</span>' : ''}
            </div>
        </div>
    `;
    
    selectedDiv.style.display = 'block';
    allocationDiv.style.display = 'grid';
    selectedDiv.dataset.fundId = dbId;
}

function toggleEqualSplit() {
    const checkbox = document.getElementById('equalSplit');
    checkbox.checked = !checkbox.checked;
    
    // Update allocation percentages
    const fundCount = document.querySelectorAll('.fund-item').length;
    if (checkbox.checked && fundCount > 0) {
        const equalPercent = (100 / fundCount).toFixed(2);
        document.querySelectorAll('[id^="percent-"]').forEach(input => {
            input.value = equalPercent;
            input.disabled = true;
        });
    } else {
        document.querySelectorAll('[id^="percent-"]').forEach(input => {
            input.disabled = false;
        });
    }
}

function analyzeManualPortfolio() {
    const funds = [];
    const totalBudget = parseFloat(document.getElementById('totalBudget').value);
    const tenure = parseInt(document.getElementById('portfolioTenure').value);
    
    // Collect all selected funds
    document.querySelectorAll('.fund-item').forEach((item, index) => {
        const selectedDiv = item.querySelector('[id^="selected-"]');
        if (selectedDiv && selectedDiv.dataset.fundId) {
            const fundId = parseInt(selectedDiv.dataset.fundId);
            const fund = fundDatabase.find(f => f.id === fundId);
            const amount = parseFloat(item.querySelector('[id^="amount-"]').value);
            const percent = parseFloat(item.querySelector('[id^="percent-"]').value);
            
            funds.push({
                ...fund,
                sipAmount: amount,
                allocation: percent
            });
        }
    });
    
    if (funds.length === 0) {
        alert('Please add at least one fund');
        return;
    }
    
    // Calculate portfolio metrics
    const totalInvested = funds.reduce((sum, f) => sum + (f.sipAmount * 12 * tenure), 0);
    const weightedCAGR = funds.reduce((sum, f) => sum + ((f.cagr5y || f.cagr3y || 12) * f.allocation / 100), 0);
    
    // Calculate future values
    let totalCorpus = 0;
    funds.forEach(fund => {
        const monthlyRate = (fund.cagr5y || fund.cagr3y || 12) / 100 / 12;
        const months = tenure * 12;
        const fv = fund.sipAmount * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
        fund.futureValue = fv;
        totalCorpus += fv;
    });
    
    displayManualResults(funds, totalInvested, totalCorpus, weightedCAGR, tenure);
}

function displayManualResults(funds, totalInvested, totalCorpus, weightedCAGR, tenure) {
    const resultsDiv = document.getElementById('portfolioResults');
    const detailedDiv = document.getElementById('detailedAnalysis');
    const detailedResults = document.getElementById('detailedResults');
    
    // Summary Cards
    resultsDiv.innerHTML = `
        <div class="results-summary">
            <div class="summary-card">
                <div class="summary-label">Total Invested</div>
                <div class="summary-value">₹${formatNumber(totalInvested)}</div>
                <div class="summary-subtext">Over ${tenure} years</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Expected Corpus</div>
                <div class="summary-value">₹${formatNumber(totalCorpus)}</div>
                <div class="summary-subtext">At maturity</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Total Gains</div>
                <div class="summary-value">₹${formatNumber(totalCorpus - totalInvested)}</div>
                <div class="summary-subtext">${((totalCorpus - totalInvested) / totalInvested * 100).toFixed(1)}% Returns</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Weighted CAGR</div>
                <div class="summary-value">${weightedCAGR.toFixed(2)}%</div>
                <div class="summary-subtext">Portfolio average</div>
            </div>
        </div>
        
        <div class="allocation-chart">
            <canvas id="allocationChart"></canvas>
        </div>
    `;
    
    // Create allocation chart
    createAllocationChart(funds);
    
    // Detailed breakdown
    detailedResults.innerHTML = `
        <table class="fund-table">
            <thead>
                <tr>
                    <th>Fund Name</th>
                    <th>Category</th>
                    <th>SIP Amount</th>
                    <th>5Y CAGR</th>
                    <th>Future Value</th>
                    <th>Returns</th>
                </tr>
            </thead>
            <tbody>
                ${funds.map(fund => `
                    <tr>
                        <td>
                            <div class="fund-name-cell">${fund.name}</div>
                            <div class="fund-category-cell">${fund.amc} ${fund.nfo ? '• NFO' : ''}</div>
                        </td>
                        <td><span class="fund-badge ${fund.category.toLowerCase()}">${fund.category}</span></td>
                        <td>₹${formatNumber(fund.sipAmount)}/mo</td>
                        <td>${fund.cagr5y ? fund.cagr5y.toFixed(1) + '%' : 'N/A'}</td>
                        <td>₹${formatNumber(fund.futureValue)}</td>
                        <td>₹${formatNumber(fund.futureValue - (fund.sipAmount * 12 * tenure))}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        ${checkWarnings(funds)}
    `;
    
    detailedDiv.style.display = 'block';
}

function checkWarnings(funds) {
    const warnings = [];
    
    // Check AMC concentration
    const amcCount = {};
    funds.forEach(f => {
        amcCount[f.amc] = (amcCount[f.amc] || 0) + 1;
    });
    
    const overconcentratedAMCs = Object.entries(amcCount).filter(([amc, count]) => count > 3);
    if (overconcentratedAMCs.length > 0) {
        warnings.push(`High concentration in ${overconcentratedAMCs.map(([amc]) => amc).join(', ')} - consider diversifying across AMCs`);
    }
    
    // Check category balance
    const categories = funds.map(f => f.category);
    const equityCount = categories.filter(c => c.includes('Cap') || c === 'ELSS' || c === 'Flexi Cap').length;
    const debtCount = categories.filter(c => c === 'Debt').length;
    
    if (debtCount === 0 && equityCount > 0) {
        warnings.push('No debt funds in portfolio - consider adding for stability');
    }
    
    if (warnings.length === 0) {
        return '';
    }
    
    return `
        <div class="warning-box">
            <strong>⚠️ Portfolio Warnings</strong>
            <ul class="warning-list">
                ${warnings.map(w => `<li>${w}</li>`).join('')}
            </ul>
        </div>
    `;
}

// ==========================================
// AUTO MODE FUNCTIONS
// ==========================================

function selectRisk(risk) {
    selectedRisk = risk;
    document.querySelectorAll('.risk-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-risk="${risk}"]`).classList.add('active');
}

function toggleTaxSaving() {
    const checkbox = document.getElementById('taxSaving');
    checkbox.checked = !checkbox.checked;
}

function toggleNFO() {
    const checkbox = document.getElementById('includeNFO');
    checkbox.checked = !checkbox.checked;
}

function generateAutoPortfolio() {
    const budget = parseFloat(document.getElementById('autoBudget').value);
    const tenure = parseInt(document.getElementById('autoTenure').value);
    const expectedReturn = parseFloat(document.getElementById('autoExpectedReturn').value);
    const style = parseInt(document.getElementById('styleSlider').value);
    const includeTax = document.getElementById('taxSaving').checked;
    const includeNFO = document.getElementById('includeNFO').checked;
    
    // Generate diversified portfolio based on risk and style
    const portfolio = createDiversifiedPortfolio(budget, selectedRisk, style, includeTax, includeNFO);
    
    // Calculate projections
    const totalInvested = budget * 12 * tenure;
    let totalCorpus = 0;
    
    portfolio.forEach(fund => {
        const monthlyRate = (fund.cagr5y || fund.cagr3y || expectedReturn) / 100 / 12;
        const months = tenure * 12;
        const fv = fund.sipAmount * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
        fund.futureValue = fv;
        totalCorpus += fv;
    });
    
    const weightedCAGR = portfolio.reduce((sum, f) => sum + ((f.cagr5y || f.cagr3y || expectedReturn) * f.allocation / 100), 0);
    
    displayAutoResults(portfolio, totalInvested, totalCorpus, weightedCAGR, tenure, selectedRisk);
}

function createDiversifiedPortfolio(budget, risk, style, includeTax, includeNFO) {
    let portfolio = [];
    let availableFunds = fundDatabase.filter(f => includeNFO || !f.nfo);
    
    // Risk-based allocation strategy
    let allocations = {};
    
    if (risk === 'low') {
        allocations = { debt: 60, hybrid: 25, largeCap: 15 };
    } else if (risk === 'medium') {
        allocations = { debt: 30, hybrid: 20, largeCap: 30, midCap: 15, flexiCap: 5 };
    } else {
        allocations = { largeCap: 25, midCap: 30, smallCap: 15, flexiCap: 20, debt: 10 };
    }
    
    // Adjust for investment style (stability vs growth)
    if (style < 33) { // More stability
        allocations.debt = (allocations.debt || 0) + 10;
        allocations.smallCap = Math.max(0, (allocations.smallCap || 0) - 10);
    } else if (style > 66) { // More growth
        allocations.smallCap = (allocations.smallCap || 0) + 10;
        allocations.debt = Math.max(0, (allocations.debt || 0) - 10);
    }
    
    // Add ELSS if tax saving requested
    if (includeTax) {
        allocations.elss = 20;
        allocations.largeCap = Math.max(0, (allocations.largeCap || 0) - 10);
        allocations.debt = Math.max(0, (allocations.debt || 0) - 10);
    }
    
    // Select funds for each category
    for (const [category, allocation] of Object.entries(allocations)) {
        if (allocation === 0) continue;
        
        let categoryFilter;
        if (category === 'debt') categoryFilter = 'Debt';
        else if (category === 'hybrid') categoryFilter = 'Hybrid';
        else if (category === 'largeCap') categoryFilter = 'Large Cap';
        else if (category === 'midCap') categoryFilter = 'Mid Cap';
        else if (category === 'smallCap') categoryFilter = 'Small Cap';
        else if (category === 'flexiCap') categoryFilter = 'Flexi Cap';
        else if (category === 'elss') categoryFilter = 'ELSS';
        
        const categoryFunds = availableFunds.filter(f => f.category === categoryFilter);
        
        if (categoryFunds.length > 0) {
            // Pick best performing fund (by 3Y CAGR)
            const bestFund = categoryFunds.sort((a, b) => (b.cagr3y || 0) - (a.cagr3y || 0))[0];
            portfolio.push({
                ...bestFund,
                allocation: allocation,
                sipAmount: Math.round(budget * allocation / 100),
                role: getRoleDescription(category)
            });
        }
    }
    
    return portfolio;
}

function getRoleDescription(category) {
    const roles = {
        debt: 'Stability & Capital Protection',
        hybrid: 'Balanced Growth & Stability',
        largeCap: 'Stable Growth',
        midCap: 'High Growth Potential',
        smallCap: 'Aggressive Growth',
        flexiCap: 'Diversified Exposure',
        elss: 'Tax Saving & Growth'
    };
    return roles[category] || 'Diversification';
}

function displayAutoResults(portfolio, totalInvested, totalCorpus, weightedCAGR, tenure, risk) {
    const resultsDiv = document.getElementById('autoPortfolioResults');
    const detailedDiv = document.getElementById('autoDetailedAnalysis');
    const rationaleDiv = document.getElementById('autoRationale');
    
    // Summary Cards
    resultsDiv.innerHTML = `
        <div class="results-summary">
            <div class="summary-card">
                <div class="summary-label">Portfolio Size</div>
                <div class="summary-value">${portfolio.length}</div>
                <div class="summary-subtext">Funds selected</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Total Invested</div>
                <div class="summary-value">₹${formatNumber(totalInvested)}</div>
                <div class="summary-subtext">Over ${tenure} years</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Expected Corpus</div>
                <div class="summary-value">₹${formatNumber(totalCorpus)}</div>
                <div class="summary-subtext">At maturity</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Weighted CAGR</div>
                <div class="summary-value">${weightedCAGR.toFixed(2)}%</div>
                <div class="summary-subtext">${risk.toUpperCase()} risk profile</div>
            </div>
        </div>
        
        <div class="allocation-chart">
            <canvas id="autoAllocationChart"></canvas>
        </div>
        
        <table class="fund-table">
            <thead>
                <tr>
                    <th>Fund Name</th>
                    <th>Category</th>
                    <th>Allocation</th>
                    <th>Monthly SIP</th>
                    <th>Expected Value</th>
                </tr>
            </thead>
            <tbody>
                ${portfolio.map(fund => `
                    <tr>
                        <td>
                            <div class="fund-name-cell">${fund.name}</div>
                            <div class="fund-category-cell">${fund.amc} ${fund.nfo ? '• NFO' : ''}</div>
                        </td>
                        <td><span class="fund-badge ${fund.category.toLowerCase()}">${fund.category}</span></td>
                        <td>${fund.allocation}%</td>
                        <td>₹${formatNumber(fund.sipAmount)}</td>
                        <td>₹${formatNumber(fund.futureValue)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    // Create chart
    createAutoAllocationChart(portfolio);
    
    // Rationale
    rationaleDiv.innerHTML = portfolio.map(fund => `
        <div class="rationale-item">
            <h4>${fund.name}</h4>
            <div>
                <span class="rationale-badge role-${fund.role.includes('Stability') ? 'stability' : fund.role.includes('Growth') ? 'growth' : fund.role.includes('Tax') ? 'tax' : 'hedge'}">${fund.role}</span>
            </div>
            <p>
                <strong>Why selected:</strong> ${fund.cagr5y ? `Consistent ${fund.cagr5y.toFixed(1)}% CAGR over 5 years` : 'New offering with strong potential'}. 
                ${fund.expense < 0.75 ? 'Low expense ratio of ' + fund.expense + '%.' : ''} 
                ${fund.category === 'Debt' ? 'Provides stability to the portfolio.' : ''}
                ${fund.category.includes('Cap') ? 'Contributes to capital appreciation.' : ''}
            </p>
        </div>
    `).join('');
    
    detailedDiv.style.display = 'block';
}

// ==========================================
// Chart Functions
// ==========================================

function createAllocationChart(funds) {
    const ctx = document.getElementById('allocationChart').getContext('2d');
    
    if (allocationChart) {
        allocationChart.destroy();
    }
    
    const theme = document.body.getAttribute('data-theme');
    const textColor = theme === 'dark' ? '#F1F5F9' : '#1A1A1A';
    
    allocationChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: funds.map(f => f.name),
            datasets: [{
                data: funds.map(f => f.allocation),
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(236, 72, 153, 0.8)',
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(251, 146, 60, 0.8)',
                    'rgba(168, 85, 247, 0.8)',
                    'rgba(14, 165, 233, 0.8)',
                    'rgba(217, 70, 239, 0.8)',
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: textColor }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.parsed + '%';
                        }
                    }
                }
            }
        }
    });
}

function createAutoAllocationChart(portfolio) {
    const ctx = document.getElementById('autoAllocationChart').getContext('2d');
    
    if (allocationChart) {
        allocationChart.destroy();
    }
    
    const theme = document.body.getAttribute('data-theme');
    const textColor = theme === 'dark' ? '#F1F5F9' : '#1A1A1A';
    
    allocationChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: portfolio.map(f => f.name),
            datasets: [{
                data: portfolio.map(f => f.allocation),
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(236, 72, 153, 0.8)',
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: textColor, font: { size: 11 } }
                }
            }
        }
    });
}

// ==========================================
// Utility Functions
// ==========================================

function formatNumber(num) {
    return Math.round(num).toLocaleString('en-IN');
}