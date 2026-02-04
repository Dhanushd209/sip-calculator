// ==========================================
// MFAPI.in Integration & Fund Database
// ==========================================

const MFAPI_BASE_URL = 'https://api.mfapi.in/mf';

// Cache for API responses
const apiCache = {
    search: {},
    navData: {},
    latest: {}
};

// Category mapping
const CATEGORY_PATTERNS = {
    'ELSS': /elss|tax saver|tax saving/i,
    'Large Cap': /large cap|bluechip|blue chip|top \d+/i,
    'Mid Cap': /mid cap|midcap/i,
    'Small Cap': /small cap|smallcap/i,
    'Flexi Cap': /flexi cap|flexicap|multi cap|multicap/i,
    'Debt': /debt|bond|income|gilt|liquid|money market|ultra short|short duration|medium duration|dynamic bond/i,
    'Hybrid': /hybrid|balanced|equity & debt|aggressive|conservative hybrid|dynamic asset/i,
    'Index': /index|nifty|sensex|etf/i,
    'Thematic': /thematic|sectoral|pharma|banking|technology|infrastructure|psu|consumption/i,
    'International': /international|overseas|global|us equity|nasdaq/i
};

const RISK_MAPPING = {
    'ELSS': 'High',
    'Large Cap': 'Medium',
    'Mid Cap': 'High',
    'Small Cap': 'Very High',
    'Flexi Cap': 'Medium-High',
    'Debt': 'Low',
    'Hybrid': 'Medium',
    'Index': 'Medium',
    'Thematic': 'High',
    'International': 'Medium-High'
};

// ==========================================
// API Helper Functions
// ==========================================

/**
 * Search for mutual funds - FIXED VERSION based on working example
 */
async function searchFunds(query) {
    if (!query || query.length < 3) return [];
    
    const cacheKey = query.toLowerCase();
    if (apiCache.search[cacheKey]) {
        console.log('Returning cached search results');
        return apiCache.search[cacheKey];
    }
    
    try {
        console.log('Searching for:', query);
        
        // Simple, direct API call like the working example
        const response = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(query)}`);
        
        if (!response.ok) {
            console.error('API response not OK:', response.status);
            throw new Error('Network error');
        }
        
        const results = await response.json();
        console.log('API returned results:', results.length);
        
        if (!results || results.length === 0) {
            console.log('No results found');
            return [];
        }
        
        // Enrich results with category and risk info
        const enrichedResults = results.map(fund => ({
            schemeCode: fund.schemeCode,
            schemeName: fund.schemeName,
            category: detectCategory(fund.schemeName),
            risk: detectRisk(fund.schemeName),
            isDirect: fund.schemeName.toLowerCase().includes('direct'),
            isGrowth: fund.schemeName.toLowerCase().includes('growth')
        }));
        
        // Sort: Direct Growth first, then Direct, then others
        enrichedResults.sort((a, b) => {
            if (a.isDirect && a.isGrowth && !(b.isDirect && b.isGrowth)) return -1;
            if (!(a.isDirect && a.isGrowth) && b.isDirect && b.isGrowth) return 1;
            if (a.isDirect && !b.isDirect) return -1;
            if (!a.isDirect && b.isDirect) return 1;
            return 0;
        });
        
        // Limit to top 15 results
        const limitedResults = enrichedResults.slice(0, 15);
        
        // Cache the results
        apiCache.search[cacheKey] = limitedResults;
        
        console.log('Returning', limitedResults.length, 'enriched results');
        return limitedResults;
        
    } catch (error) {
        console.error('Fund search error:', error);
        return [];
    }
}

async function getLatestNAV(schemeCode) {
    const cacheKey = `${schemeCode}_latest`;
    if (apiCache.latest[cacheKey]) {
        const cached = apiCache.latest[cacheKey];
        if (Date.now() - cached.timestamp < 3600000) {
            return cached.data;
        }
    }
    
    try {
        const response = await fetch(`${MFAPI_BASE_URL}/${schemeCode}/latest`);
        if (!response.ok) throw new Error('Failed to fetch NAV');
        
        const data = await response.json();
        const result = {
            schemeName: data.meta.scheme_name,
            schemeCode: data.meta.scheme_code,
            nav: parseFloat(data.data[0].nav),
            date: data.data[0].date
        };
        
        apiCache.latest[cacheKey] = {
            data: result,
            timestamp: Date.now()
        };
        
        return result;
    } catch (error) {
        console.error('Error fetching latest NAV:', error);
        return null;
    }
}

async function getNAVHistory(schemeCode) {
    const cacheKey = `${schemeCode}_history`;
    if (apiCache.navData[cacheKey]) {
        const cached = apiCache.navData[cacheKey];
        if (Date.now() - cached.timestamp < 86400000) {
            return cached.data;
        }
    }
    
    try {
        const response = await fetch(`${MFAPI_BASE_URL}/${schemeCode}`);
        if (!response.ok) throw new Error('Failed to fetch NAV history');
        
        const result = await response.json();
        
        apiCache.navData[cacheKey] = {
            data: result,
            timestamp: Date.now()
        };
        
        return result;
    } catch (error) {
        console.error('Error fetching NAV history:', error);
        return null;
    }
}

function calculateCAGR(startNAV, endNAV, years) {
    if (!startNAV || !endNAV || years <= 0) return null;
    return ((Math.pow(endNAV / startNAV, 1 / years) - 1) * 100);
}

function findNAVByDate(navData, targetDate) {
    if (!navData || navData.length === 0) return null;
    
    const target = new Date(targetDate);
    
    for (let i = 0; i < navData.length; i++) {
        const navDate = parseIndianDate(navData[i].date);
        if (navDate <= target) {
            return {
                nav: parseFloat(navData[i].nav),
                date: navData[i].date
            };
        }
    }
    
    return null;
}

function parseIndianDate(dateStr) {
    const [day, month, year] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
}

async function calculateReturns(schemeCode) {
    const historyData = await getNAVHistory(schemeCode);
    if (!historyData || !historyData.data || historyData.data.length === 0) {
        return { cagr1y: null, cagr3y: null, cagr5y: null };
    }
    
    const navData = historyData.data;
    const latestNAV = parseFloat(navData[0].nav);
    const latestDate = parseIndianDate(navData[0].date);
    
    const oneYearAgo = new Date(latestDate);
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const threeYearsAgo = new Date(latestDate);
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    
    const fiveYearsAgo = new Date(latestDate);
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    
    const nav1y = findNAVByDate(navData, oneYearAgo);
    const nav3y = findNAVByDate(navData, threeYearsAgo);
    const nav5y = findNAVByDate(navData, fiveYearsAgo);
    
    return {
        cagr1y: nav1y ? calculateCAGR(nav1y.nav, latestNAV, 1) : null,
        cagr3y: nav3y ? calculateCAGR(nav3y.nav, latestNAV, 3) : null,
        cagr5y: nav5y ? calculateCAGR(nav5y.nav, latestNAV, 5) : null
    };
}

function detectCategory(fundName) {
    for (const [category, pattern] of Object.entries(CATEGORY_PATTERNS)) {
        if (pattern.test(fundName)) {
            return category;
        }
    }
    return 'Other';
}

function detectRisk(fundName) {
    const category = detectCategory(fundName);
    return RISK_MAPPING[category] || 'Medium';
}

async function getFundDetails(schemeCode) {
    const [latest, returns] = await Promise.all([
        getLatestNAV(schemeCode),
        calculateReturns(schemeCode)
    ]);
    
    if (!latest) return null;
    
    return {
        id: schemeCode,
        schemeCode: schemeCode,
        name: latest.schemeName,
        category: detectCategory(latest.schemeName),
        risk: detectRisk(latest.schemeName),
        nav: latest.nav,
        navDate: latest.date,
        cagr1y: returns.cagr1y,
        cagr3y: returns.cagr3y,
        cagr5y: returns.cagr5y,
        expense: estimateExpenseRatio(latest.schemeName),
        amc: extractAMC(latest.schemeName)
    };
}

function extractAMC(fundName) {
    const amcPatterns = {
        'HDFC': /hdfc/i,
        'ICICI': /icici/i,
        'Axis': /axis/i,
        'SBI': /sbi/i,
        'Kotak': /kotak/i,
        'Aditya Birla': /aditya birla|birla sun life/i,
        'UTI': /uti/i,
        'DSP': /dsp/i,
        'Nippon': /nippon/i,
        'Franklin': /franklin/i,
        'Mirae': /mirae/i,
        'PPFAS': /parag parikh|ppfas/i,
        'Quant': /quant/i,
        'Motilal': /motilal/i,
        'Tata': /tata/i,
        'Invesco': /invesco/i,
        'LIC': /lic/i,
        'Canara Robeco': /canara robeco/i,
        'HSBC': /hsbc/i,
        'Sundaram': /sundaram/i,
        'IDFC': /idfc/i,
        'Baroda': /baroda/i,
        'BOI': /boi/i,
        'Edelweiss': /edelweiss/i,
        'JM Financial': /jm financial/i,
        'Mahindra': /mahindra/i,
        'PGIM': /pgim/i,
        'Principal': /principal/i,
        'Quantum': /quantum/i,
        'Sahara': /sahara/i,
        'Shriram': /shriram/i,
        'Union': /union/i,
        'WhiteOak': /whiteoak/i,
        'Jio-BlackRock': /jio.*blackrock|blackrock.*jio/i,
        'Zerodha': /zerodha/i,
        'Groww': /groww/i
    };
    
    for (const [amc, pattern] of Object.entries(amcPatterns)) {
        if (pattern.test(fundName)) {
            return amc;
        }
    }
    
    return 'Other';
}

function estimateExpenseRatio(fundName) {
    const category = detectCategory(fundName);
    const isDirect = fundName.toLowerCase().includes('direct');
    
    const baseRatios = {
        'Index': 0.15,
        'Debt': 0.35,
        'ELSS': 0.65,
        'Large Cap': 0.60,
        'Mid Cap': 0.75,
        'Small Cap': 0.85,
        'Flexi Cap': 0.70,
        'Hybrid': 0.80,
        'Thematic': 0.90,
        'International': 0.95
    };
    
    let ratio = baseRatios[category] || 0.75;
    
    if (!isDirect) {
        ratio += 0.75;
    }
    
    return ratio;
}

// ==========================================
// Portfolio Management
// ==========================================

let currentPMode = 'manual';
let selectedRisk = 'medium';
let allocationChart = null;
let portfolios = [];
let currentPortfolioIndex = 0;
let currentPortfolio = {
    id: 1,
    name: 'Portfolio 1',
    funds: []
};

let searchModalOpen = false;

// ==========================================
// Initialization
// ==========================================

document.addEventListener('DOMContentLoaded', function() {
    portfolios.push(currentPortfolio);
    updatePortfolioSelector();
    renderFundsList();
});

// ==========================================
// Mode Switching
// ==========================================
function switchMode(input) {
    let mode;

    // Determine mode safely
    if (input && input.target) {
        // Called from real button click (event object)
        mode = input.target.dataset.mode || input.target.getAttribute('data-mode');
    } else if (typeof input === 'string') {
        // Called from tutorial/code like switchMode('auto')
        mode = input.toLowerCase();
    } else {
        console.warn("switchMode called with invalid argument");
        return;
    }

    console.log('Switching to mode:', mode);

    // Update currentPMode
    currentPMode = mode;

    // Update mode buttons
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    const targetBtn = document.querySelector(`.mode-btn[data-mode="${mode}"]`);
    if (targetBtn) {
        targetBtn.classList.add('active');
    }

    // Update mode content visibility
    document.querySelectorAll('.mode-content').forEach(content => content.classList.remove('active'));
    const modeContent = document.getElementById(mode + 'Mode');
    if (modeContent) {
        modeContent.classList.add('active');
    }
}


// ==========================================
// Portfolio Management
// ==========================================

function updatePortfolioSelector() {
    console.log('Current portfolios:', portfolios.length);
}

function renderFundsList() {
    const fundListContainer = document.getElementById('fundList');
    if (!fundListContainer) return;
    
    fundListContainer.innerHTML = '';
    
    if (currentPortfolio.funds.length === 0) {
        fundListContainer.innerHTML = `
            <div class="fund-list-empty" id="fundListEmpty">
                <div style="text-align: center; padding: 40px 20px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
                    <h3 style="color: var(--text); margin-bottom: 8px;">No Funds Added Yet</h3>
                    <p style="color: var(--text-secondary); font-size: 14px;">Click "Add Fund" below to start building your portfolio</p>
                </div>
            </div>
        `;
        return;
    }
    
    currentPortfolio.funds.forEach((fund, index) => {
        const fundCard = createFundCard(fund, index);
        fundListContainer.appendChild(fundCard);
    });
    
    // Update budget automatically
    updateTotalBudget();
}

function createFundCard(fund, index) {
    const card = document.createElement('div');
    card.className = 'fund-item';
    
    const returnsDisplay = fund.cagr5y 
        ? `CAGR: ${fund.cagr5y.toFixed(1)}%` 
        : (fund.cagr3y ? `3Y: ${fund.cagr3y.toFixed(1)}%` : 'Returns: N/A');
    
    card.innerHTML = `
        <div class="fund-header">
            <span class="fund-number">Fund ${index + 1}</span>
            <button class="remove-fund" onclick="removeFundFromPortfolio(${index})">×</button>
        </div>
        
        <div class="selected-fund">
            <div class="selected-fund-name">${fund.name}</div>
            <div class="selected-fund-meta">
                <span class="fund-badge ${fund.category.toLowerCase().replace(' ', '-')}">${fund.category}</span>
                <span class="fund-badge">${fund.amc}</span>
                <span class="fund-badge">${returnsDisplay}</span>
                ${fund.isNFO ? '<span class="fund-badge" style="background: #10B981; color: white;">NFO</span>' : ''}
                ${fund.isDirect ? '<span class="fund-badge" style="background: #3B82F6; color: white;">Direct</span>' : ''}
                ${fund.isGrowth ? '<span class="fund-badge" style="background: #10B981; color: white;">Growth</span>' : ''}
            </div>
            ${fund.nav ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">NAV: ₹${fund.nav.toFixed(2)} (${fund.navDate})</div>` : ''}
        </div>
        
        <div class="fund-allocation" style="display: grid;">
            <div class="allocation-input">
                <label>Monthly SIP (₹)</label>
                <input type="number" value="${fund.sipAmount}" min="100" 
                       onchange="updateFundAmount(${index}, this.value)">
            </div>
            <div class="allocation-input">
                <label>Allocation (%)</label>
                <input type="number" value="${fund.allocation}" min="0" max="100"
                       onchange="updateFundAllocation(${index}, this.value)" readonly>
            </div>
        </div>
        
        <div class="form-group" style="margin-top: 16px;">
            <div class="checkbox-group" onclick="toggleFundStepUp(${index})">
                <input type="checkbox" id="stepup-${index}" ${fund.stepUpEnabled ? 'checked' : ''}>
                <label>Enable Step-up SIP</label>
            </div>
            <div id="stepup-options-${index}" style="display: ${fund.stepUpEnabled ? 'block' : 'none'}; margin-top: 12px;">
                <div class="allocation-input">
                    <label>Annual Increase (%)</label>
                    <input type="number" value="${fund.stepUpRate || 10}" min="0" max="25"
                           onchange="updateFundStepUp(${index}, this.value)">
                </div>
            </div>
        </div>
    `;
    return card;
}

function showFundSearchModal() {
    if (currentPortfolio.funds.length >= 10) {
        alert('Maximum 10 funds allowed per portfolio');
        return;
    }
    
    searchModalOpen = true;
    
    const modal = document.createElement('div');
    modal.className = 'fund-search-modal';
    modal.id = 'fundSearchModal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="handleOverlayClick(event)"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h3>🔍 Search & Add Funds (${currentPortfolio.funds.length}/10)</h3>
                <button onclick="closeFundSearchModal()" class="modal-close">×</button>
            </div>
            <div class="modal-body">
                <input type="text" 
                       id="fundSearchInput" 
                       placeholder="Type at least 3 characters (e.g., parag, hdfc, axis, quant)..." 
                       oninput="debounceSearch()"
                       autocomplete="off"
                       autofocus>
                <div id="fundSearchResults" class="fund-search-results">
                    <div style="text-align: center; padding: 40px 20px; color: var(--text-secondary);">
                        <div style="font-size: 48px; margin-bottom: 12px;">🔎</div>
                        <p>Start typing to search for mutual funds</p>
                        <p style="font-size: 12px; margin-top: 8px;">Type at least 3 characters</p>
                        <p style="font-size: 12px; margin-top: 4px;">Direct Growth plans shown first</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Focus on search input
    setTimeout(() => {
        document.getElementById('fundSearchInput').focus();
    }, 100);
    
    // Add Enter key support
    document.getElementById('fundSearchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchFundsInModal();
        }
    });
}

function handleOverlayClick(event) {
    if (event.target.classList.contains('modal-overlay')) {
        closeFundSearchModal();
    }
}

function closeFundSearchModal() {
    const modal = document.getElementById('fundSearchModal');
    if (modal) {
        modal.remove();
        searchModalOpen = false;
    }
}

let searchTimeout;
function debounceSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        searchFundsInModal();
    }, 500);
}

async function searchFundsInModal() {
    const input = document.getElementById('fundSearchInput');
    const query = input.value.trim();
    const resultsDiv = document.getElementById('fundSearchResults');
    
    if (query.length < 3) {
        resultsDiv.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--text-secondary);">
                <div style="font-size: 48px; margin-bottom: 12px;">🔎</div>
                <p>Please type at least 3 characters</p>
                <p style="font-size: 12px; margin-top: 8px;">e.g., parag, hdfc, axis, quant</p>
            </div>
        `;
        return;
    }
    
    resultsDiv.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
            <div class="loading-spinner" style="margin: 0 auto 16px;"></div>
            <p style="color: var(--text-secondary);">Searching funds...</p>
        </div>
    `;
    
    const results = await searchFunds(query);
    
    if (results.length === 0) {
        resultsDiv.innerHTML = `
            <div class="no-results">
                <div style="font-size: 48px; margin-bottom: 12px;">😕</div>
                <p>No funds found matching "${query}"</p>
                <p style="font-size: 12px; margin-top: 8px; color: var(--text-secondary);">Try different keywords (e.g., AMC name, fund type)</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    for (const fund of results) {
        const alreadyAdded = currentPortfolio.funds.some(item => item.schemeCode === fund.schemeCode);
        const planType = (fund.isDirect ? 'Direct' : 'Regular') + ' • ' + (fund.isGrowth ? 'Growth' : 'Other');
        
        html += `
            <div class="fund-result-item ${alreadyAdded ? 'disabled' : ''}" onclick="${alreadyAdded ? '' : 'addFundToPortfolioBySchemeCode(' + fund.schemeCode + ')'}">
                <div class="fund-result-name">${fund.schemeName}</div>
                <div class="fund-result-meta">
                    <span class="fund-badge ${fund.category.toLowerCase().replace(' ', '-')}">${fund.category}</span>
                    <span class="fund-badge">${fund.risk} Risk</span>
                    <span class="fund-badge">${planType}</span>
                    ${alreadyAdded ? '<span class="fund-badge" style="background: #10B981; color: white;">✓ Added</span>' : ''}
                </div>
            </div>
        `;
    }
    
    resultsDiv.innerHTML = html;
}

async function addFundToPortfolioBySchemeCode(schemeCode) {
    if (currentPortfolio.funds.length >= 10) {
        alert('Maximum 10 funds per portfolio');
        return;
    }
    
    if (currentPortfolio.funds.find(f => f.schemeCode === schemeCode)) {
        return; // Already added
    }
    
    // Show inline loading
    const resultsDiv = document.getElementById('fundSearchResults');
    const originalContent = resultsDiv.innerHTML;
    resultsDiv.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
            <div class="loading-spinner" style="margin: 0 auto 16px;"></div>
            <p style="color: var(--text-secondary);">Adding fund to portfolio...</p>
        </div>
    `;
    
    try {
        const fundDetails = await getFundDetails(schemeCode);
        
        if (!fundDetails) {
            alert('Unable to fetch fund details. Please try again.');
            resultsDiv.innerHTML = originalContent;
            return;
        }
        
        const newFund = {
            ...fundDetails,
            sipAmount: 1000,
            allocation: 10,
            stepUpEnabled: false,
            stepUpRate: 10,
            isNFO: !fundDetails.cagr1y && !fundDetails.cagr3y && !fundDetails.cagr5y,
            isDirect: fundDetails.name.toLowerCase().includes('direct'),
            isGrowth: fundDetails.name.toLowerCase().includes('growth')
        };
        
        currentPortfolio.funds.push(newFund);
        renderFundsList();
        
        // Auto-analyze after adding fund
        analyzeManualPortfolio();
        
        // Update modal header
        const modalHeader = document.querySelector('.modal-header h3');
        if (modalHeader) {
            modalHeader.textContent = `🔍 Search & Add Funds (${currentPortfolio.funds.length}/10)`;
        }
        
        // Restore search results (keep modal open)
        searchFundsInModal();
        
    } catch (error) {
        console.error('Error adding fund:', error);
        alert('Error adding fund to portfolio. Please try again.');
        resultsDiv.innerHTML = originalContent;
    }
}

function removeFundFromPortfolio(index) {
    if (confirm('Remove this fund from portfolio?')) {
        currentPortfolio.funds.splice(index, 1);
        renderFundsList();
        
        // Auto-analyze after removal
        if (currentPortfolio.funds.length > 0) {
            analyzeManualPortfolio();
        } else {
            // Clear results if no funds
            document.getElementById('portfolioResults').innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <h3>No Portfolio Yet</h3>
                    <p>Add mutual funds to start analyzing your portfolio</p>
                </div>
            `;
            document.getElementById('detailedAnalysis').style.display = 'none';
        }
    }
}

function updateFundAmount(index, value) {
    currentPortfolio.funds[index].sipAmount = parseFloat(value);
    updateTotalBudget();
    analyzeManualPortfolio();
}

function updateFundAllocation(index, value) {
    currentPortfolio.funds[index].allocation = parseFloat(value);
}

function toggleFundStepUp(index) {
    const checkbox = document.getElementById(`stepup-${index}`);
    const fund = currentPortfolio.funds[index];
    fund.stepUpEnabled = !fund.stepUpEnabled;
    checkbox.checked = fund.stepUpEnabled;
    
    const optionsDiv = document.getElementById(`stepup-options-${index}`);
    optionsDiv.style.display = fund.stepUpEnabled ? 'block' : 'none';
    
    analyzeManualPortfolio();
}

function updateFundStepUp(index, value) {
    currentPortfolio.funds[index].stepUpRate = parseFloat(value);
    analyzeManualPortfolio();
}

function updateTotalBudget() {
    if (currentPortfolio.funds.length === 0) return;
    
    const totalSIP = currentPortfolio.funds.reduce((sum, fund) => sum + fund.sipAmount, 0);
    const budgetInput = document.getElementById('totalBudget');
    if (budgetInput) {
        budgetInput.value = totalSIP;
    }
    
    // Update allocations as percentages
    currentPortfolio.funds.forEach(fund => {
        fund.allocation = ((fund.sipAmount / totalSIP) * 100).toFixed(2);
    });
}

function toggleEqualSplit() {
    const checkbox = document.getElementById('equalSplit');
    checkbox.checked = !checkbox.checked;
    
    if (checkbox.checked && currentPortfolio.funds.length > 0) {
        const totalBudget = parseFloat(document.getElementById('totalBudget').value) || 10000;
        const equalAmount = Math.round(totalBudget / currentPortfolio.funds.length);
        
        currentPortfolio.funds.forEach(fund => {
            fund.sipAmount = equalAmount;
            fund.allocation = (100 / currentPortfolio.funds.length).toFixed(2);
        });
        
        renderFundsList();
        analyzeManualPortfolio();
    }
}

// ==========================================
// Portfolio Analysis
// ==========================================

function analyzeManualPortfolio() {
    if (currentPortfolio.funds.length === 0) {
        return;
    }
    
    const totalBudget = parseFloat(document.getElementById('totalBudget').value) || 10000;
    const tenure = parseInt(document.getElementById('portfolioTenure').value) || 10;
    
    let totalInvested = 0;
    let totalCorpus = 0;
    
    currentPortfolio.funds.forEach(fund => {
        let yearlyInvestment = 0;
        let corpus = 0;
        let currentSIP = fund.sipAmount;
        
        const expectedReturn = fund.cagr5y || fund.cagr3y || getCategoryReturn(fund.category);
        
        for (let year = 1; year <= tenure; year++) {
            if (fund.stepUpEnabled && year > 1) {
                currentSIP = currentSIP * (1 + fund.stepUpRate / 100);
            }
            
            yearlyInvestment = currentSIP * 12;
            totalInvested += yearlyInvestment;
            
            const monthlyRate = expectedReturn / 100 / 12;
            for (let month = 0; month < 12; month++) {
                corpus = corpus * (1 + monthlyRate) + currentSIP;
            }
        }
        
        fund.futureValue = corpus;
        totalCorpus += corpus;
    });
    
    const totalGains = totalCorpus - totalInvested;
    const weightedCAGR = currentPortfolio.funds.reduce((sum, f) => {
        const returnRate = f.cagr5y || f.cagr3y || getCategoryReturn(f.category);
        return sum + (returnRate * f.allocation / 100);
    }, 0);
    
    displayManualResults(totalInvested, totalCorpus, totalGains, weightedCAGR, tenure);
}

function getCategoryReturn(category) {
    const categoryReturns = {
        'Large Cap': 12,
        'Mid Cap': 15,
        'Small Cap': 18,
        'Flexi Cap': 13,
        'ELSS': 13,
        'Debt': 7,
        'Hybrid': 10,
        'Index': 11,
        'Thematic': 14,
        'International': 12
    };
    return categoryReturns[category] || 12;
}

/**
 * Determine overall portfolio risk level based on fund composition
 */
function getRiskFromPortfolio(funds) {
    if (!funds || funds.length === 0) return 'medium';
    
    // Risk scores for each category
    const riskScores = {
        'Debt': 1,
        'Hybrid': 2,
        'Large Cap': 3,
        'Index': 3,
        'Flexi Cap': 4,
        'ELSS': 4,
        'Mid Cap': 5,
        'Thematic': 5,
        'Small Cap': 6,
        'International': 4
    };
    
    // Calculate weighted average risk
    let totalRiskScore = 0;
    
    funds.forEach(fund => {
        const categoryRisk = riskScores[fund.category] || 3;
        const weight = parseFloat(fund.allocation) || (100 / funds.length);
        totalRiskScore += (categoryRisk * weight) / 100;
    });
    
    // Map score to risk level
    if (totalRiskScore <= 2) return 'low';
    if (totalRiskScore <= 4) return 'medium';
    return 'high';
}

function displayManualResults(totalInvested, totalCorpus, totalGains, weightedCAGR, tenure) {
    const resultsDiv = document.getElementById('portfolioResults');
    const detailedDiv = document.getElementById('detailedAnalysis');
    const detailedResults = document.getElementById('detailedResults');
    
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
                <div class="summary-value">₹${formatNumber(totalGains)}</div>
                <div class="summary-subtext">${((totalGains / totalInvested) * 100).toFixed(1)}% Returns</div>
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
        
        <div class="info-box" style="margin-top: 16px; background: #FEF3C7; color: #92400E; border-left-color: #F59E0B;">
            <strong>📊 Data Source & Disclaimer</strong>
            <p style="margin-top: 8px; font-size: 13px;">
                NAV data sourced from MFAPI.in (AMFI data). Returns calculated from historical NAVs. 
                Mutual fund investments are subject to market risks. Past performance does not guarantee future returns. 
                Please consult a SEBI registered financial advisor before making investment decisions.
            </p>
        </div>
    `;
    
    createAllocationChart(currentPortfolio.funds);
    
    detailedResults.innerHTML = `
        <table class="fund-table">
            <thead>
                <tr>
                    <th>Fund Name</th>
                    <th>Category</th>
                    <th>Monthly SIP</th>
                    <th>Returns (CAGR)</th>
                    <th>Step-up</th>
                    <th>Future Value</th>
                </tr>
            </thead>
            <tbody>
                ${currentPortfolio.funds.map(fund => {
                    const returns = fund.cagr5y ? `${fund.cagr5y.toFixed(1)}% (5Y)` : 
                                   (fund.cagr3y ? `${fund.cagr3y.toFixed(1)}% (3Y)` : 'Est.');
                    return `
                        <tr>
                            <td>
                                <div class="fund-name-cell">${fund.name}</div>
                                <div class="fund-category-cell">${fund.amc} • NAV: ₹${fund.nav ? fund.nav.toFixed(2) : 'N/A'}</div>
                            </td>
                            <td><span class="fund-badge ${fund.category.toLowerCase().replace(' ', '-')}">${fund.category}</span></td>
                            <td>₹${formatNumber(fund.sipAmount)}</td>
                            <td>${returns}</td>
                            <td>${fund.stepUpEnabled ? fund.stepUpRate + '%' : 'No'}</td>
                            <td>₹${formatNumber(fund.futureValue)}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    
    detailedDiv.style.display = 'block';

    const risk = getRiskFromPortfolio(currentPortfolio.funds);
    const totalBudget = parseFloat(document.getElementById('totalBudget').value) || 10000;
    
    displayEnhancedPortfolioResults(
        currentPortfolio.funds,
        totalInvested,
        totalCorpus,
        weightedCAGR,
        tenure,
        risk,
        totalBudget
    )
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

async function generateAutoPortfolio() {
    const budget = parseFloat(document.getElementById('autoBudget').value);
    const tenure = parseInt(document.getElementById('autoTenure').value);
    const expectedReturn = parseFloat(document.getElementById('autoExpectedReturn').value);
    const style = parseInt(document.getElementById('styleSlider').value);
    const includeTax = document.getElementById('taxSaving').checked;
    const includeNFO = document.getElementById('includeNFO').checked;
    
    const resultsDiv = document.getElementById('autoPortfolioResults');
    resultsDiv.innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
            <div class="loading-spinner" style="margin: 0 auto 16px;"></div>
            <h3 style="color: var(--text);">Generating Portfolio...</h3>
            <p style="color: var(--text-secondary); margin-top: 8px;">Analyzing funds based on your preferences</p>
        </div>
    `;
    
    const portfolio = await createDiversifiedPortfolio(budget, selectedRisk, style, includeTax, includeNFO);
    
    if (!portfolio || portfolio.length === 0) {
        resultsDiv.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <h3>Unable to Generate Portfolio</h3>
                <p>Please try again or adjust your preferences</p>
            </div>
        `;
        return;
    }
    
    const totalInvested = budget * 12 * tenure;
    let totalCorpus = 0;
    
    portfolio.forEach(fund => {
        const returnRate = fund.cagr5y || fund.cagr3y || expectedReturn;
        const monthlyRate = returnRate / 100 / 12;
        const months = tenure * 12;
        const fv = fund.sipAmount * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
        fund.futureValue = fv;
        totalCorpus += fv;
    });
    
    const weightedCAGR = portfolio.reduce((sum, f) => {
        const returnRate = f.cagr5y || f.cagr3y || expectedReturn;
        return sum + (returnRate * f.allocation / 100);
    }, 0);
    
    displayAutoResults(portfolio, totalInvested, totalCorpus, weightedCAGR, tenure, selectedRisk);
}

function getRoleDescription(category) {
    const roles = {
        'Debt': 'Stability & Capital Protection',
        'Hybrid': 'Balanced Growth & Stability',
        'Large Cap': 'Stable Growth',
        'Mid Cap': 'High Growth Potential',
        'Small Cap': 'Aggressive Growth',
        'Flexi Cap': 'Diversified Exposure',
        'ELSS': 'Tax Saving & Growth',
        'Index': 'Market Returns',
        'Thematic': 'Sector-Focused Growth',
        'International': 'Global Diversification'
    };
    return roles[category] || 'Diversification';
}

function displayAutoResults(portfolio, totalInvested, totalCorpus, weightedCAGR, tenure, risk) {
    const resultsDiv = document.getElementById('autoPortfolioResults');
    const detailedDiv = document.getElementById('autoDetailedAnalysis');
    const rationaleDiv = document.getElementById('autoRationale');
    
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
                <div class="summary-subtext">${risk.toUpperCase()} risk</div>
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
                ${portfolio.map(fund => {
                    const returns = fund.cagr5y ? `${fund.cagr5y.toFixed(1)}%` : 
                                   (fund.cagr3y ? `${fund.cagr3y.toFixed(1)}%` : 'Est.');
                    return `
                        <tr>
                            <td>
                                <div class="fund-name-cell">${fund.name}</div>
                                <div class="fund-category-cell">${fund.amc} • Returns: ${returns}</div>
                            </td>
                            <td><span class="fund-badge ${fund.category.toLowerCase().replace(' ', '-')}">${fund.category}</span></td>
                            <td>${fund.allocation}%</td>
                            <td>₹${formatNumber(fund.sipAmount)}</td>
                            <td>₹${formatNumber(fund.futureValue)}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
        
        <div class="info-box" style="margin-top: 16px; background: #FEF3C7; color: #92400E; border-left-color: #F59E0B;">
            <strong>📊 Data Source & Disclaimer</strong>
            <p style="margin-top: 8px; font-size: 13px;">
                NAV data sourced from MFAPI.in (AMFI data). Returns calculated from historical NAVs. 
                Mutual fund investments are subject to market risks. Past performance does not guarantee future returns. 
                Please consult a SEBI registered financial advisor before making investment decisions.
            </p>
        </div>
    `;
    
    createAutoAllocationChart(portfolio);
    
    rationaleDiv.innerHTML = portfolio.map(fund => `
        <div class="rationale-item">
            <h4>${fund.name}</h4>
            <div>
                <span class="rationale-badge role-${fund.role.includes('Stability') ? 'stability' : fund.role.includes('Growth') ? 'growth' : fund.role.includes('Tax') ? 'tax' : 'hedge'}">${fund.role}</span>
            </div>
            <p>
                <strong>Why selected:</strong> ${fund.cagr5y ? `Consistent ${fund.cagr5y.toFixed(1)}% CAGR over 5 years` : 
                    (fund.cagr3y ? `${fund.cagr3y.toFixed(1)}% CAGR over 3 years` : 'Category-leading performance')}. 
                ${fund.expense < 0.75 ? 'Low expense ratio of ' + fund.expense.toFixed(2) + '%.' : ''} 
                ${fund.category === 'Index' ? 'Passive investment for broad market exposure.' : ''}
            </p>
        </div>
    `).join('');
    
    detailedDiv.style.display = 'block';

    const totalBudget = parseFloat(document.getElementById('autoBudget').value) || 10000;
    
    displayEnhancedPortfolioResults(
        portfolio,
        totalInvested,
        totalCorpus,
        weightedCAGR,
        tenure,
        risk,
        totalBudget
    );
}

async function createDiversifiedPortfolio(budget, risk, style, includeTax, includeNFO) {
    let portfolio = [];
    
    let allocations = {};
    
    if (risk === 'low') {
        allocations = { 'Debt': 60, 'Hybrid': 25, 'Large Cap': 15 };
    } else if (risk === 'medium') {
        allocations = { 'Debt': 30, 'Hybrid': 20, 'Large Cap': 30, 'Mid Cap': 15, 'Index': 5 };
    } else {
        allocations = { 'Large Cap': 25, 'Mid Cap': 30, 'Small Cap': 15, 'Flexi Cap': 20, 'Debt': 10 };
    }
    
    if (style < 33) {
        allocations['Debt'] = (allocations['Debt'] || 0) + 10;
        allocations['Small Cap'] = Math.max(0, (allocations['Small Cap'] || 0) - 10);
    } else if (style > 66) {
        allocations['Small Cap'] = (allocations['Small Cap'] || 0) + 10;
        allocations['Debt'] = Math.max(0, (allocations['Debt'] || 0) - 10);
    }
    
    if (includeTax) {
        allocations['ELSS'] = 20;
        allocations['Large Cap'] = Math.max(0, (allocations['Large Cap'] || 0) - 10);
        allocations['Debt'] = Math.max(0, (allocations['Debt'] || 0) - 10);
    }
    
    const searchPromises = [];
    const categorySearchTerms = {
        'Debt': 'debt',
        'Hybrid': 'hybrid',
        'Large Cap': 'large cap',
        'Mid Cap': 'mid cap',
        'Small Cap': 'small cap',
        'Flexi Cap': 'flexi cap',
        'ELSS': 'elss',
        'Index': 'nifty'
    };
    
    for (const [category, allocation] of Object.entries(allocations)) {
        if (allocation === 0) continue;
        
        const searchTerm = categorySearchTerms[category];
        if (searchTerm) {
            searchPromises.push(
                searchFunds(searchTerm).then(results => ({
                    category,
                    allocation,
                    funds: results.filter(f => f.category === category && f.isDirect && f.isGrowth).slice(0, 3)
                }))
            );
        }
    }
    
    const searchResults = await Promise.all(searchPromises);
    
    for (const result of searchResults) {
        if (result.funds.length > 0) {
            const selectedFund = result.funds[0];
            const fundDetails = await getFundDetails(selectedFund.schemeCode);
            
            if (fundDetails) {
                portfolio.push({
                    ...fundDetails,
                    allocation: result.allocation,
                    sipAmount: Math.round(budget * result.allocation / 100),
                    role: getRoleDescription(result.category)
                });
            }
        }
    }
    
    return portfolio;
}

// ==========================================
// Chart Functions
// ==========================================

function createAllocationChart(funds) {
    const ctx = document.getElementById('allocationChart');
    if (!ctx) return;
    
    if (allocationChart) {
        allocationChart.destroy();
    }
    
    const theme = document.body.getAttribute('data-theme');
    const textColor = theme === 'dark' ? '#F1F5F9' : '#1A1A1A';
    
    allocationChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: funds.map(f => f.name.substring(0, 30) + '...'),
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
                    labels: { color: textColor, font: { size: 11 } }
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
    const ctx = document.getElementById('autoAllocationChart');
    if (!ctx) return;
    
    if (allocationChart) {
        allocationChart.destroy();
    }
    
    const theme = document.body.getAttribute('data-theme');
    const textColor = theme === 'dark' ? '#F1F5F9' : '#1A1A1A';
    
    allocationChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: portfolio.map(f => f.name.substring(0, 30) + '...'),
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

// ==========================================
// Utility Functions
// ==========================================

function formatNumber(num) {
    return Math.round(num).toLocaleString('en-IN');
}

function updatePortfolioValue(id) {
    const slider = document.getElementById(id);
    const display = document.getElementById(id + 'Display');
    display.textContent = slider.value;
}

// Add loading spinner CSS
const style = document.createElement('style');
style.textContent = `
.loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid var(--border);
    border-top-color: var(--primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.fund-result-item.disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: var(--surface);
}
`;
document.head.appendChild(style);