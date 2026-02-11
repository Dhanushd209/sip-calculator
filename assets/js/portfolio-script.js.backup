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
// Caching System with Freshness
// ==========================================

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

function getCachedData(key) {
    try {
        const cached = localStorage.getItem(`mf_cache_${key}`);
        if (!cached) return null;
        
        const data = JSON.parse(cached);
        const now = Date.now();
        
        if (now - data.timestamp > CACHE_DURATION) {
            localStorage.removeItem(`mf_cache_${key}`);
            return null;
        }
        
        return data.value;
    } catch (error) {
        console.error('Cache read error:', error);
        return null;
    }
}

function setCachedData(key, value) {
    try {
        const data = {
            value: value,
            timestamp: Date.now()
        };
        localStorage.setItem(`mf_cache_${key}`, JSON.stringify(data));
    } catch (error) {
        console.error('Cache write error:', error);
    }
}

function getCacheFreshness(key) {
    try {
        const cached = localStorage.getItem(`mf_cache_${key}`);
        if (!cached) return null;
        
        const data = JSON.parse(cached);
        const now = Date.now();
        const age = now - data.timestamp;
        const hoursOld = Math.floor(age / (60 * 60 * 1000));
        
        return {
            age: age,
            hoursOld: hoursOld,
            isStale: age > CACHE_DURATION,
            percentage: Math.min(100, (age / CACHE_DURATION) * 100)
        };
    } catch (error) {
        return null;
    }
}

function showDataFreshnessIndicator(containerId) {
    const freshness = getCacheFreshness('nav_data_general');
    if (!freshness) return;
    
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const freshnessHTML = `
        <div class="data-freshness-indicator" style="
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            background: ${freshness.hoursOld < 12 ? '#D1FAE5' : (freshness.hoursOld < 20 ? '#FEF3C7' : '#FEE2E2')};
            color: ${freshness.hoursOld < 12 ? '#065F46' : (freshness.hoursOld < 20 ? '#92400E' : '#991B1B')};
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
        ">
            <span>${freshness.hoursOld < 12 ? '🟢' : (freshness.hoursOld < 20 ? '🟡' : '🔴')}</span>
            <span>Data: ${freshness.hoursOld}h old ${freshness.hoursOld < 12 ? '(Fresh)' : (freshness.hoursOld < 20 ? '(Good)' : '(Stale)')}</span>
        </div>
    `;
    
    container.innerHTML = freshnessHTML;
}

// ==========================================
// API Helper Functions
// ==========================================

async function searchFunds(query) {
    if (!query || query.length < 3) return [];

    const cacheKey = query.toLowerCase();
    if (apiCache.search[cacheKey]) {
        console.log('Returning cached search results');
        return apiCache.search[cacheKey];
    }

    try {
        console.log('Searching for:', query);

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

        const enrichedResults = results.map(fund => ({
            schemeCode: fund.schemeCode,
            schemeName: fund.schemeName,
            category: detectCategory(fund.schemeName),
            risk: detectRisk(fund.schemeName),
            isDirect: fund.schemeName.toLowerCase().includes('direct'),
            isGrowth: fund.schemeName.toLowerCase().includes('growth')
        }));

        enrichedResults.sort((a, b) => {
            if (a.isDirect && a.isGrowth && !(b.isDirect && b.isGrowth)) return -1;
            if (!(a.isDirect && a.isGrowth) && b.isDirect && b.isGrowth) return 1;
            if (a.isDirect && !b.isDirect) return -1;
            if (!a.isDirect && b.isDirect) return 1;
            return 0;
        });

        const limitedResults = enrichedResults.slice(0, 15);
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

document.addEventListener('DOMContentLoaded', function () {
    portfolios.push(currentPortfolio);
    updatePortfolioSelector();
    renderFundsList();
});

// ==========================================
// Mode Switching
// ==========================================
function switchMode(input) {
    let mode;

    if (input && input.target) {
        mode = input.target.dataset.mode || input.target.getAttribute('data-mode');
    } else if (typeof input === 'string') {
        mode = input.toLowerCase();
    } else {
        console.warn("switchMode called with invalid argument");
        return;
    }

    console.log('Switching to mode:', mode);

    currentPMode = mode;

    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    const targetBtn = document.querySelector(`.mode-btn[data-mode="${mode}"]`);
    if (targetBtn) {
        targetBtn.classList.add('active');
    }

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

    setTimeout(() => {
        document.getElementById('fundSearchInput').focus();
    }, 100);

    document.getElementById('fundSearchInput').addEventListener('keypress', function (e) {
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
        return;
    }

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

        analyzeManualPortfolio();

        const modalHeader = document.querySelector('.modal-header h3');
        if (modalHeader) {
            modalHeader.textContent = `🔍 Search & Add Funds (${currentPortfolio.funds.length}/10)`;
        }

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

        if (currentPortfolio.funds.length > 0) {
            analyzeManualPortfolio();
        } else {
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

function getRiskFromPortfolio(funds) {
    if (!funds || funds.length === 0) return 'medium';

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

    let totalRiskScore = 0;

    funds.forEach(fund => {
        const categoryRisk = riskScores[fund.category] || 3;
        const weight = parseFloat(fund.allocation) || (100 / funds.length);
        totalRiskScore += (categoryRisk * weight) / 100;
    });

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
    );
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
    console.log('🤖 generateAutoPortfolio called');

    const budget = parseFloat(document.getElementById('autoBudget').value) || 10000;
    const tenure = parseInt(document.getElementById('autoTenure').value) || 10;
    const expectedReturn = parseFloat(document.getElementById('autoExpectedReturn').value) || 12;
    const style = parseInt(document.getElementById('styleSlider').value) || 50;
    const includeTax = document.getElementById('taxSaving')?.checked || false;
    const includeNFO = document.getElementById('includeNFO')?.checked || false;

    console.log('📊 Portfolio parameters:', { budget, tenure, expectedReturn, style, selectedRisk, includeTax, includeNFO });

    const resultsDiv = document.getElementById('autoPortfolioResults');
    resultsDiv.innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
            <div class="loading-spinner" style="margin: 0 auto 16px;"></div>
            <h3 style="color: var(--text);">Generating Your Portfolio...</h3>
            <p style="color: var(--text-secondary); margin-top: 8px;">Analyzing funds based on your risk profile</p>
        </div>
    `;

    try {
        console.log('🔍 Creating diversified portfolio...');
        const portfolio = await createDiversifiedPortfolio(budget, selectedRisk, style, includeTax, includeNFO);

        if (!portfolio || portfolio.length === 0) {
            console.error('❌ Portfolio generation returned empty');
            resultsDiv.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚠️</div>
                    <h3>Unable to Generate Portfolio</h3>
                    <p>Could not find suitable funds. Please try adjusting your preferences.</p>
                    <button onclick="generateAutoPortfolio()" style="margin-top: 16px;">Try Again</button>
                </div>
            `;
            return;
        }

        console.log('✅ Portfolio generated with', portfolio.length, 'funds');

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

        console.log('💰 Total corpus:', totalCorpus, 'Weighted CAGR:', weightedCAGR);

        displayAutoResults(portfolio, totalInvested, totalCorpus, weightedCAGR, tenure, selectedRisk);

    } catch (error) {
        console.error('❌ Error generating portfolio:', error);
        resultsDiv.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">❌</div>
                <h3>Error Generating Portfolio</h3>
                <p>${error.message || 'An unexpected error occurred'}</p>
                <button onclick="generateAutoPortfolio()" style="margin-top: 16px;">Try Again</button>
            </div>
        `;
    }
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
    console.log('🎯 Creating portfolio for risk:', risk);

    let portfolio = [];

    let allocations = {};

    if (risk === 'low') {
        allocations = {
            'Debt': 60,
            'Hybrid': 25,
            'Large Cap': 15
        };
    } else if (risk === 'medium') {
        allocations = {
            'Debt': 30,
            'Hybrid': 20,
            'Large Cap': 30,
            'Mid Cap': 15,
            'Index': 5
        };
    } else {
        allocations = {
            'Large Cap': 25,
            'Mid Cap': 30,
            'Small Cap': 15,
            'Flexi Cap': 20,
            'Debt': 10
        };
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

    console.log('📊 Target allocations:', allocations);

    const topFundsByCategoryWithBackups = {
        'Debt': [
            { code: '118825', name: 'HDFC Corporate Bond Fund', search: 'hdfc corporate bond direct growth' },
            { code: '118989', name: 'ICICI Prudential Corporate Bond Fund', search: 'icici corporate bond direct growth' },
            { code: '119533', name: 'Axis Banking & PSU Debt Fund', search: 'axis banking psu debt direct growth' }
        ],
        'Hybrid': [
            { code: '119551', name: 'HDFC Balanced Advantage Fund', search: 'hdfc balanced advantage direct growth' },
            { code: '120503', name: 'ICICI Prudential Equity & Debt Fund', search: 'icici equity debt direct growth' },
            { code: '120344', name: 'HDFC Hybrid Equity Fund', search: 'hdfc hybrid equity direct growth' }
        ],
        'Large Cap': [
            { code: '119597', name: 'HDFC Top 100 Fund', search: 'hdfc top 100 direct growth' },
            { code: '120505', name: 'ICICI Prudential Bluechip Fund', search: 'icici bluechip direct growth' },
            { code: '120591', name: 'Axis Bluechip Fund', search: 'axis bluechip direct growth' }
        ],
        'Mid Cap': [
            { code: '119598', name: 'HDFC Mid-Cap Opportunities Fund', search: 'hdfc mid cap direct growth' },
            { code: '120838', name: 'Kotak Emerging Equity Fund', search: 'kotak emerging equity direct growth' },
            { code: '120593', name: 'Axis Midcap Fund', search: 'axis midcap direct growth' }
        ],
        'Small Cap': [
            { code: '119555', name: 'HDFC Small Cap Fund', search: 'hdfc small cap direct growth' },
            { code: '120594', name: 'Axis Small Cap Fund', search: 'axis small cap direct growth' },
            { code: '120839', name: 'Kotak Small Cap Fund', search: 'kotak small cap direct growth' }
        ],
        'Flexi Cap': [
            { code: '122639', name: 'Parag Parikh Flexi Cap Fund', search: 'parag parikh flexi cap direct growth' },
            { code: '120716', name: 'HDFC Flexi Cap Fund', search: 'hdfc flexi cap direct growth' },
            { code: '145552', name: 'Quant Flexi Cap Fund', search: 'quant flexi cap direct growth' }
        ],
        'ELSS': [
            { code: '119533', name: 'HDFC Tax Saver', search: 'hdfc tax saver direct growth' },
            { code: '120594', name: 'Axis Long Term Equity Fund', search: 'axis long term equity direct growth' },
            { code: '145550', name: 'Quant Tax Plan', search: 'quant tax plan direct growth' }
        ],
        'Index': [
            { code: '120716', name: 'HDFC Index Fund Nifty 50', search: 'hdfc index nifty 50 direct growth' },
            { code: '120844', name: 'ICICI Prudential Nifty 50 Index Fund', search: 'icici nifty 50 index direct growth' },
            { code: '120830', name: 'UTI Nifty 50 Index Fund', search: 'uti nifty 50 index direct growth' }
        ]
    };

    for (const [category, allocation] of Object.entries(allocations)) {
        if (allocation === 0) continue;

        console.log(`🔍 Finding fund for ${category} (${allocation}%)`);

        let fundDetails = null;
        const categoryFunds = topFundsByCategoryWithBackups[category];

        if (categoryFunds && categoryFunds.length > 0) {
            for (const fundOption of categoryFunds) {
                try {
                    console.log(`   Trying hardcoded fund: ${fundOption.name}`);
                    fundDetails = await getFundDetails(fundOption.code);
                    if (fundDetails) {
                        console.log(`   ✅ Got fund details for ${fundOption.name}`);
                        break;
                    }
                } catch (e) {
                    console.log(`   ⚠️ Failed to get ${fundOption.name}, trying next...`);
                }
            }

            if (!fundDetails && categoryFunds[0].search) {
                try {
                    console.log(`   Searching for: ${categoryFunds[0].search}`);
                    const searchResults = await searchFunds(categoryFunds[0].search);
                    if (searchResults && searchResults.length > 0) {
                        const matchingFund = searchResults.find(f =>
                            f.category === category && f.isDirect && f.isGrowth
                        ) || searchResults[0];

                        fundDetails = await getFundDetails(matchingFund.schemeCode);
                    }
                } catch (e) {
                    console.log(`   ⚠️ Search also failed for ${category}`);
                }
            }
        }

        if (fundDetails) {
            portfolio.push({
                ...fundDetails,
                allocation: allocation,
                sipAmount: Math.round(budget * allocation / 100),
                role: getRoleDescription(category)
            });
            console.log(`   ✅ Added ${category} fund to portfolio`);
        } else {
            console.warn(`   ⚠️ Could not find fund for ${category}`);
        }
    }

    console.log('🎉 Portfolio created with', portfolio.length, 'funds');
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
                        label: function (context) {
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
                        label: function (context) {
                            return context.label + ': ' + context.parsed + '%';
                        }
                    }
                }
            }
        }
    });
}

// ==========================================
// Portfolio Enhancements
// ==========================================

function generatePortfolioExplanation(funds, risk, totalBudget) {
    const categories = {};
    let totalAllocation = 0;
    
    funds.forEach(fund => {
        const category = fund.category;
        if (!categories[category]) {
            categories[category] = 0;
        }
        categories[category] += parseFloat(fund.allocation);
        totalAllocation += parseFloat(fund.allocation);
    });
    
    const sortedCategories = Object.entries(categories)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, alloc]) => ({ category: cat, allocation: alloc }));
    
    let explanation = '';
    
    if (risk === 'low') {
        explanation += `Your portfolio prioritizes <strong>stability and capital protection</strong> `;
    } else if (risk === 'medium') {
        explanation += `Your portfolio follows a <strong>balanced approach</strong> `;
    } else {
        explanation += `Your portfolio is designed for <strong>aggressive growth</strong> `;
    }
    
    if (sortedCategories.length > 0) {
        const top = sortedCategories[0];
        explanation += `by allocating <strong>${top.allocation.toFixed(0)}%</strong> to <strong>${top.category}</strong>`;
        
        if (sortedCategories.length > 1) {
            const second = sortedCategories[1];
            explanation += ` and <strong>${second.allocation.toFixed(0)}%</strong> to <strong>${second.category}</strong>`;
        }
        explanation += '. ';
    }
    
    if (funds.length >= 5) {
        explanation += `With <strong>${funds.length} funds</strong>, your portfolio is <strong>well-diversified</strong> across multiple categories and fund houses. `;
    } else if (funds.length >= 3) {
        explanation += `Your <strong>${funds.length}-fund portfolio</strong> provides <strong>good diversification</strong>. `;
    } else {
        explanation += `Consider adding more funds for <strong>better diversification</strong>. `;
    }
    
    const equityAllocation = (categories['Large Cap'] || 0) + (categories['Mid Cap'] || 0) + 
                             (categories['Small Cap'] || 0) + (categories['Flexi Cap'] || 0) + 
                             (categories['ELSS'] || 0);
    
    if (equityAllocation > 60) {
        explanation += `Tax-efficiency is optimized with <strong>${equityAllocation.toFixed(0)}% equity allocation</strong>, suitable for long-term wealth creation with favorable LTCG treatment. `;
    } else if (categories['ELSS'] > 0) {
        explanation += `Your portfolio includes <strong>ELSS funds (${categories['ELSS'].toFixed(0)}%)</strong> for <strong>tax savings under Section 80C</strong>. `;
    }
    
    if (categories['Debt'] > 40) {
        explanation += `The high debt allocation (<strong>${categories['Debt'].toFixed(0)}%</strong>) provides <strong>stability and regular income</strong>, reducing overall portfolio volatility. `;
    }
    
    if (categories['Small Cap'] > 20) {
        explanation += `Your <strong>${categories['Small Cap'].toFixed(0)}% allocation to Small Cap</strong> funds offers high growth potential but requires a <strong>long investment horizon (7+ years)</strong>. `;
    }
    
    if (risk === 'high') {
        explanation += `This aggressive strategy is ideal for investors with <strong>high risk tolerance</strong> and a <strong>long-term horizon of ${Math.max(10, funds.length * 2)}+ years</strong>.`;
    } else if (risk === 'medium') {
        explanation += `This balanced strategy suits investors seeking <strong>moderate growth with controlled risk</strong> over a <strong>${Math.max(5, funds.length * 1.5)}+ year horizon</strong>.`;
    } else {
        explanation += `This conservative strategy is suitable for <strong>risk-averse investors</strong> or those with <strong>shorter investment horizons</strong>.`;
    }
    
    return explanation;
}

function displayPortfolioExplanation(funds, risk, totalBudget, containerId) {
    const explanation = generatePortfolioExplanation(funds, risk, totalBudget);
    const container = document.getElementById(containerId);
    
    if (!container) return;
    
    container.innerHTML = `
        <div class="portfolio-explanation" style="
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(16, 185, 129, 0.05));
            padding: 20px;
            border-radius: 12px;
            border-left: 4px solid var(--primary);
            margin: 20px 0;
        ">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <span style="font-size: 24px;">💡</span>
                <h3 style="margin: 0; font-size: 18px; color: var(--text);">Portfolio Strategy Explanation</h3>
            </div>
            <p style="
                font-size: 15px;
                line-height: 1.8;
                color: var(--text);
                margin: 0;
            ">${explanation}</p>
        </div>
    `;
}

function calculateHistoricalMetrics(funds, tenure) {
    const returns = {
        '1Y': [],
        '3Y': [],
        '5Y': []
    };
    
    funds.forEach(fund => {
        if (fund.cagr1y) returns['1Y'].push(fund.cagr1y);
        if (fund.cagr3y) returns['3Y'].push(fund.cagr3y);
        if (fund.cagr5y) returns['5Y'].push(fund.cagr5y);
    });
    
    const stats = {};
    
    for (const [period, values] of Object.entries(returns)) {
        if (values.length === 0) continue;
        
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const sorted = [...values].sort((a, b) => a - b);
        const best = sorted[sorted.length - 1];
        const worst = sorted[0];
        const median = sorted[Math.floor(sorted.length / 2)];
        
        stats[period] = {
            average: avg,
            best: best,
            worst: worst,
            median: median,
            range: best - worst
        };
    }
    
    return stats;
}

function displayHistoricalBacktest(funds, tenure, containerId) {
    const stats = calculateHistoricalMetrics(funds, tenure);
    const container = document.getElementById(containerId);
    
    if (!container || Object.keys(stats).length === 0) return;
    
    let backtestHTML = `
        <div class="historical-backtest" style="
            background: var(--surface);
            padding: 20px;
            border-radius: 12px;
            border: 2px solid var(--border);
            margin: 20px 0;
        ">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                <span style="font-size: 24px;">📊</span>
                <h3 style="margin: 0; font-size: 18px; color: var(--text);">Historical Performance Analysis</h3>
            </div>
            
            <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">
                Based on actual historical returns of selected funds. Past performance is not indicative of future results.
            </p>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
    `;
    
    for (const [period, data] of Object.entries(stats)) {
        const periodLabel = period === '1Y' ? '1 Year' : (period === '3Y' ? '3 Years' : '5 Years');
        
        backtestHTML += `
            <div style="
                background: var(--background);
                padding: 16px;
                border-radius: 8px;
                border: 1px solid var(--border);
            ">
                <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px; font-weight: 600; text-transform: uppercase;">
                    ${periodLabel} CAGR
                </div>
                
                <div style="margin: 12px 0;">
                    <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">Best</div>
                    <div style="font-size: 20px; font-weight: 700; color: var(--success); font-family: 'JetBrains Mono', monospace;">
                        ${data.best.toFixed(1)}%
                    </div>
                </div>
                
                <div style="margin: 12px 0;">
                    <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">Average</div>
                    <div style="font-size: 18px; font-weight: 700; color: var(--primary); font-family: 'JetBrains Mono', monospace;">
                        ${data.average.toFixed(1)}%
                    </div>
                </div>
                
                <div style="margin: 12px 0;">
                    <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">Worst</div>
                    <div style="font-size: 20px; font-weight: 700; color: var(--danger); font-family: 'JetBrains Mono', monospace;">
                        ${data.worst.toFixed(1)}%
                    </div>
                </div>
                
                <div style="
                    margin-top: 12px;
                    padding-top: 12px;
                    border-top: 1px solid var(--border);
                    font-size: 12px;
                    color: var(--text-secondary);
                ">
                    Range: <strong style="color: var(--text);">${data.range.toFixed(1)}%</strong>
                </div>
            </div>
        `;
    }
    
    backtestHTML += `
            </div>
            
            <div style="
                margin-top: 16px;
                padding: 12px;
                background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(251, 146, 60, 0.05));
                border-radius: 8px;
                border-left: 3px solid var(--warning);
            ">
                <div style="font-size: 13px; color: var(--text); line-height: 1.6;">
                    <strong>📈 Interpretation:</strong> Your portfolio's funds have historically delivered between 
                    <strong>${stats['5Y'] ? stats['5Y'].worst.toFixed(1) : stats['3Y'] ? stats['3Y'].worst.toFixed(1) : stats['1Y'].worst.toFixed(1)}%</strong> 
                    to 
                    <strong>${stats['5Y'] ? stats['5Y'].best.toFixed(1) : stats['3Y'] ? stats['3Y'].best.toFixed(1) : stats['1Y'].best.toFixed(1)}%</strong> 
                    CAGR. Plan for volatility and maintain a long-term investment horizon.
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = backtestHTML;
}

function displayEnhancedPortfolioResults(funds, totalInvested, totalCorpus, weightedCAGR, tenure, risk, totalBudget) {
    displayPortfolioExplanation(funds, risk, totalBudget, 'portfolioExplanation');
    displayHistoricalBacktest(funds, tenure, 'historicalBacktest');
    showDataFreshnessIndicator('dataFreshness');
}

function addEnhancementContainers() {
    if (document.getElementById('portfolioExplanation')) return;
    
    const resultsDiv = document.getElementById('portfolioResults');
    if (!resultsDiv) return;
    
    const enhancementHTML = `
        <div id="dataFreshness" style="margin: 12px 0;"></div>
        <div id="portfolioExplanation"></div>
        <div id="historicalBacktest"></div>
    `;
    
    resultsDiv.insertAdjacentHTML('afterend', enhancementHTML);
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

// Initialize enhancement containers when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(addEnhancementContainers, 1000);
    });
} else {
    setTimeout(addEnhancementContainers, 1000);
}