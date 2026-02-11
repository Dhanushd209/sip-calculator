// ==========================================
// BACKEND API CONFIGURATION
// ==========================================

const API_BASE_URL = 'http://localhost:8000';  // Change to your production URL later

// ==========================================
// UPDATED: Backend-powered fund search
// ==========================================

async function searchFunds(query) {
    if (!query || query.length < 3) return [];

    try {
        console.log('🔍 Searching backend for:', query);
        
        // NEW: Search via backend API instead of MFAPI
        const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
        
        if (!response.ok) {
            console.error('Backend search failed:', response.status);
            return [];
        }
        
        const results = await response.json();
        console.log('✅ Backend returned', results.length, 'results');
        
        // Results are already enriched by backend!
        return results.map(fund => ({
            schemeCode: fund.scheme_code,
            schemeName: fund.fund_name,
            category: fund.category,
            risk: RISK_MAPPING[fund.category] || 'Medium',
            isDirect: fund.is_direct,
            isGrowth: fund.is_growth,
            amc: fund.amc
        }));
        
    } catch (error) {
        console.error('Search error:', error);
        return [];
    }
}

// ==========================================
// UPDATED: Get fund details from backend
// ==========================================

async function getFundDetails(schemeCode) {
    try {
        console.log('📊 Fetching metrics from backend:', schemeCode);
        
        // NEW: Single API call gets everything
        const response = await fetch(`${API_BASE_URL}/funds/${schemeCode}/metrics`);
        
        if (!response.ok) {
            if (response.status === 404) {
                console.warn('Fund not in backend database:', schemeCode);
                // Fallback: Add fund to database on-the-fly (optional)
                return null;
            }
            throw new Error(`Backend error: ${response.status}`);
        }
        
        const metrics = await response.json();
        console.log('✅ Got metrics:', metrics);
        
        // Get fund details (includes latest NAV)
        const detailsResponse = await fetch(`${API_BASE_URL}/funds/${schemeCode}`);
        const details = detailsResponse.ok ? await detailsResponse.json() : {};
        
        // Transform backend response to frontend format
        return {
            id: schemeCode,
            schemeCode: schemeCode,
            name: details.fund_name || 'Unknown Fund',
            category: details.category || 'Other',
            risk: RISK_MAPPING[details.category] || 'Medium',
            amc: details.amc || 'Unknown',
            
            // Pre-computed metrics from backend (FAST!)
            nav: details.latest_nav,
            navDate: details.latest_nav_date,
            cagr1y: metrics.cagr_1y?.value,
            cagr3y: metrics.cagr_3y?.value,
            cagr5y: metrics.cagr_5y?.value,
            
            // Data quality flags
            cagr1yType: metrics.cagr_1y?.type,
            cagr3yType: metrics.cagr_3y?.type,
            cagr5yType: metrics.cagr_5y?.type,
            
            // Data quality metadata
            hasDataIssues: metrics.suspicious_nav_count > 0,
            isEstimated: metrics.cagr_5y?.type === 'estimated',
            isApprox: metrics.cagr_5y?.type === 'approx',
            
            expense: estimateExpenseRatio(details.fund_name || ''),
            
            isDirect: details.is_direct,
            isGrowth: details.is_growth,
            isNFO: !metrics.has_sufficient_history_5y
        };
        
    } catch (error) {
        console.error('Error fetching fund details:', error);
        return null;
    }
}

// ==========================================
// RISK MAPPING (unchanged)
// ==========================================

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
// HELPER: Estimate expense ratio (fallback)
// ==========================================

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
    if (!isDirect) ratio += 0.75;
    
    return ratio;
}

function detectCategory(fundName) {
    const patterns = {
        'ELSS': /elss|tax saver/i,
        'Large Cap': /large cap|bluechip|top \d+/i,
        'Mid Cap': /mid cap|midcap/i,
        'Small Cap': /small cap|smallcap/i,
        'Flexi Cap': /flexi cap|flexicap|multi cap/i,
        'Debt': /debt|bond|income|gilt/i,
        'Hybrid': /hybrid|balanced/i,
        'Index': /index|nifty|sensex/i,
        'Thematic': /thematic|sectoral/i,
        'International': /international|overseas|global/i
    };
    
    for (const [category, pattern] of Object.entries(patterns)) {
        if (pattern.test(fundName)) return category;
    }
    return 'Other';
}

// ==========================================
// DISPLAY: Show data quality badges
// ==========================================

function createFundCard(fund, index) {
    const card = document.createElement('div');
    card.className = 'fund-item';

    const returnsDisplay = fund.cagr5y
        ? `5Y CAGR: ${fund.cagr5y.toFixed(1)}%`
        : (fund.cagr3y ? `3Y: ${fund.cagr3y.toFixed(1)}%` : 'Returns: N/A');
    
    // Data quality badge
    let qualityBadge = '';
    if (fund.isEstimated) {
        qualityBadge = '<span class="fund-badge" style="background: #F59E0B; color: white;" title="Estimated from category average">⚠️ Estimated</span>';
    } else if (fund.isApprox) {
        qualityBadge = '<span class="fund-badge" style="background: #3B82F6; color: white;" title="Date gap > 10 days">ℹ️ Approx</span>';
    }

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
                ${qualityBadge}
                ${fund.isNFO ? '<span class="fund-badge" style="background: #10B981; color: white;">NFO</span>' : ''}
                ${fund.isDirect ? '<span class="fund-badge" style="background: #3B82F6; color: white;">Direct</span>' : ''}
                ${fund.isGrowth ? '<span class="fund-badge" style="background: #10B981; color: white;">Growth</span>' : ''}
            </div>
            ${fund.nav ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">NAV: ₹${fund.nav.toFixed(2)} (${fund.navDate})</div>` : ''}
            ${fund.hasDataIssues ? '<div style="font-size: 12px; color: #EF4444; margin-top: 4px;">⚠️ Data quality issues detected</div>' : ''}
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

// ==========================================
// AUTO MODE: Use backend for fund selection
// ==========================================

async function createDiversifiedPortfolio(budget, risk, style, includeTax, includeNFO) {
    console.log('🤖 Creating portfolio from backend data...');
    
    try {
        // Get all available funds from backend
        const response = await fetch(`${API_BASE_URL}/funds?limit=100`);
        const allFunds = await response.json();
        
        console.log(`📊 Backend has ${allFunds.length} funds available`);
        
        // Filter by risk and preferences
        const suitableFunds = allFunds.filter(fund => {
            // Filter by Direct Growth plans
            if (!fund.is_direct || !fund.is_growth) return false;
            
            // Filter by risk
            const fundRisk = RISK_MAPPING[fund.category] || 'Medium';
            if (risk === 'low' && !['Low', 'Medium'].includes(fundRisk)) return false;
            if (risk === 'high' && fundRisk === 'Low') return false;
            
            return true;
        });
        
        console.log(`✅ ${suitableFunds.length} suitable funds for ${risk} risk`);
        
        // Build portfolio based on risk profile
        let allocation = {};
        if (risk === 'low') {
            allocation = { 'Debt': 60, 'Hybrid': 25, 'Large Cap': 15 };
        } else if (risk === 'medium') {
            allocation = { 'Debt': 30, 'Large Cap': 30, 'Mid Cap': 20, 'Flexi Cap': 20 };
        } else {
            allocation = { 'Large Cap': 25, 'Mid Cap': 30, 'Small Cap': 20, 'Flexi Cap': 25 };
        }
        
        // Add ELSS if tax saving enabled
        if (includeTax) {
            allocation['ELSS'] = 20;
            const largestCategory = Object.keys(allocation).reduce((a, b) => 
                allocation[a] > allocation[b] ? a : b
            );
            allocation[largestCategory] = Math.max(0, allocation[largestCategory] - 20);
        }
        
        // Select funds for each category
        const portfolio = [];
        for (const [category, targetAlloc] of Object.entries(allocation)) {
            if (targetAlloc === 0) continue;
            
            const categoryFunds = suitableFunds.filter(f => f.category === category);
            if (categoryFunds.length === 0) {
                console.warn(`No ${category} funds available`);
                continue;
            }
            
            // Pick first fund from category (could be randomized or sorted by performance)
            const selectedFund = categoryFunds[0];
            
            // Get full metrics
            const fundDetails = await getFundDetails(selectedFund.scheme_code);
            if (!fundDetails) continue;
            
            portfolio.push({
                ...fundDetails,
                allocation: targetAlloc,
                sipAmount: Math.round(budget * targetAlloc / 100),
                role: getRoleDescription(category)
            });
        }
        
        console.log(`✅ Created portfolio with ${portfolio.length} funds`);
        return portfolio;
        
    } catch (error) {
        console.error('Error creating portfolio:', error);
        return [];
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

console.log('✅ Backend-integrated portfolio script loaded!');
console.log(`🔗 API URL: ${API_BASE_URL}`);