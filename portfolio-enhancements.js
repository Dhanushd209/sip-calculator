// ==========================================
// Portfolio Enhancement Features
// ==========================================

// ==========================================
// A) Data Caching System with Freshness Indicator
// ==========================================

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Get cached data with expiry check
 */
function getCachedData(key) {
    try {
        const cached = localStorage.getItem(`mf_cache_${key}`);
        if (!cached) return null;
        
        const data = JSON.parse(cached);
        const now = Date.now();
        
        // Check if expired
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

/**
 * Set cached data with timestamp
 */
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

/**
 * Get cache freshness info
 */
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

/**
 * Show data freshness indicator
 */
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

// Enhanced API functions with caching
async function getLatestNAVCached(schemeCode) {
    const cacheKey = `nav_latest_${schemeCode}`;
    const cached = getCachedData(cacheKey);
    
    if (cached) {
        console.log(`Using cached NAV for ${schemeCode}`);
        return cached;
    }
    
    // Fetch fresh data
    const data = await getLatestNAV(schemeCode);
    if (data) {
        setCachedData(cacheKey, data);
        setCachedData('nav_data_general', true); // Mark that we have some cached data
    }
    
    return data;
}

async function getNAVHistoryCached(schemeCode) {
    const cacheKey = `nav_history_${schemeCode}`;
    const cached = getCachedData(cacheKey);
    
    if (cached) {
        console.log(`Using cached NAV history for ${schemeCode}`);
        return cached;
    }
    
    // Fetch fresh data
    const data = await getNAVHistory(schemeCode);
    if (data) {
        setCachedData(cacheKey, data);
    }
    
    return data;
}

// ==========================================
// B) Portfolio Explanation Engine
// ==========================================

/**
 * Generate natural language explanation of portfolio
 */
function generatePortfolioExplanation(funds, risk, totalBudget) {
    // Analyze portfolio composition
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
    
    // Sort categories by allocation
    const sortedCategories = Object.entries(categories)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, alloc]) => ({ category: cat, allocation: alloc }));
    
    // Build explanation
    let explanation = '';
    
    // Opening statement based on risk
    if (risk === 'low') {
        explanation += `Your portfolio prioritizes <strong>stability and capital protection</strong> `;
    } else if (risk === 'medium') {
        explanation += `Your portfolio follows a <strong>balanced approach</strong> `;
    } else {
        explanation += `Your portfolio is designed for <strong>aggressive growth</strong> `;
    }
    
    // Mention top allocations
    if (sortedCategories.length > 0) {
        const top = sortedCategories[0];
        explanation += `by allocating <strong>${top.allocation.toFixed(0)}%</strong> to <strong>${top.category}</strong>`;
        
        if (sortedCategories.length > 1) {
            const second = sortedCategories[1];
            explanation += ` and <strong>${second.allocation.toFixed(0)}%</strong> to <strong>${second.category}</strong>`;
        }
        explanation += '. ';
    }
    
    // Diversification analysis
    if (funds.length >= 5) {
        explanation += `With <strong>${funds.length} funds</strong>, your portfolio is <strong>well-diversified</strong> across multiple categories and fund houses. `;
    } else if (funds.length >= 3) {
        explanation += `Your <strong>${funds.length}-fund portfolio</strong> provides <strong>good diversification</strong>. `;
    } else {
        explanation += `Consider adding more funds for <strong>better diversification</strong>. `;
    }
    
    // Tax efficiency mention
    const equityAllocation = (categories['Large Cap'] || 0) + (categories['Mid Cap'] || 0) + 
                             (categories['Small Cap'] || 0) + (categories['Flexi Cap'] || 0) + 
                             (categories['ELSS'] || 0);
    
    if (equityAllocation > 60) {
        explanation += `Tax-efficiency is optimized with <strong>${equityAllocation.toFixed(0)}% equity allocation</strong>, suitable for long-term wealth creation with favorable LTCG treatment. `;
    } else if (categories['ELSS'] > 0) {
        explanation += `Your portfolio includes <strong>ELSS funds (${categories['ELSS'].toFixed(0)}%)</strong> for <strong>tax savings under Section 80C</strong>. `;
    }
    
    // Risk-return trade-off
    if (categories['Debt'] > 40) {
        explanation += `The high debt allocation (<strong>${categories['Debt'].toFixed(0)}%</strong>) provides <strong>stability and regular income</strong>, reducing overall portfolio volatility. `;
    }
    
    if (categories['Small Cap'] > 20) {
        explanation += `Your <strong>${categories['Small Cap'].toFixed(0)}% allocation to Small Cap</strong> funds offers high growth potential but requires a <strong>long investment horizon (7+ years)</strong>. `;
    }
    
    // Closing statement
    if (risk === 'high') {
        explanation += `This aggressive strategy is ideal for investors with <strong>high risk tolerance</strong> and a <strong>long-term horizon of ${Math.max(10, funds.length * 2)}+ years</strong>.`;
    } else if (risk === 'medium') {
        explanation += `This balanced strategy suits investors seeking <strong>moderate growth with controlled risk</strong> over a <strong>${Math.max(5, funds.length * 1.5)}+ year horizon</strong>.`;
    } else {
        explanation += `This conservative strategy is suitable for <strong>risk-averse investors</strong> or those with <strong>shorter investment horizons</strong>.`;
    }
    
    return explanation;
}

/**
 * Display portfolio explanation
 */
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

// ==========================================
// C) Historical Backtest Overlay
// ==========================================

/**
 * Calculate historical performance metrics
 */
function calculateHistoricalMetrics(funds, tenure) {
    // Aggregate historical returns
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
    
    // Calculate statistics
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

/**
 * Display historical backtest overlay
 */
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
    
    // Display stats for each period
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

// ==========================================
// Integration Helper Functions
// ==========================================

/**
 * Enhanced portfolio display with all features
 */
function displayEnhancedPortfolioResults(funds, totalInvested, totalCorpus, weightedCAGR, tenure, risk, totalBudget) {
    // Show portfolio explanation
    displayPortfolioExplanation(funds, risk, totalBudget, 'portfolioExplanation');
    
    // Show historical backtest
    displayHistoricalBacktest(funds, tenure, 'historicalBacktest');
    
    // Show data freshness
    showDataFreshnessIndicator('dataFreshness');
}

/**
 * Add explanation and backtest containers to results section
 */
function addEnhancementContainers() {
    // Check if containers already exist
    if (document.getElementById('portfolioExplanation')) return;
    
    // Find the results section
    const resultsDiv = document.getElementById('portfolioResults');
    if (!resultsDiv) return;
    
    // Add containers after results
    const enhancementHTML = `
        <div id="dataFreshness" style="margin: 12px 0;"></div>
        <div id="portfolioExplanation"></div>
        <div id="historicalBacktest"></div>
    `;
    
    resultsDiv.insertAdjacentHTML('afterend', enhancementHTML);
}

// Initialize enhancement containers when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(addEnhancementContainers, 1000);
    });
} else {
    setTimeout(addEnhancementContainers, 1000);
}