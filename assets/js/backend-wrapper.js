// Backend Integration Wrapper
// Wraps existing functions to use backend when available

const API_BASE_URL = 'http://localhost:8000';
const USE_BACKEND = true;

// Store original functions
const _originalSearchFunds = window.searchFunds;
const _originalGetFundDetails = window.getFundDetails;

// Override searchFunds to use backend
window.searchFunds = async function(query) {
    if (!USE_BACKEND) return _originalSearchFunds(query);
    
    if (!query || query.length < 3) return [];
    
    try {
        console.log('🔍 Using backend search for:', query);
        const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
        
        if (!response.ok) {
            console.warn('Backend failed, falling back to MFAPI');
            return _originalSearchFunds(query);
        }
        
        const results = await response.json();
        console.log('✅ Backend returned', results.length, 'results');
        
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
        console.error('Backend error, falling back to MFAPI:', error);
        return _originalSearchFunds(query);
    }
};

// Override getFundDetails to use backend
window.getFundDetails = async function(schemeCode) {
    if (!USE_BACKEND) return _originalGetFundDetails(schemeCode);
    
    try {
        console.log('📊 Using backend for fund details:', schemeCode);
        
        const [metricsRes, detailsRes] = await Promise.all([
            fetch(`${API_BASE_URL}/funds/${schemeCode}/metrics`),
            fetch(`${API_BASE_URL}/funds/${schemeCode}`)
        ]);
        
        if (!metricsRes.ok) {
            console.warn('Fund not in backend, falling back to MFAPI');
            return _originalGetFundDetails(schemeCode);
        }
        
        const metrics = await metricsRes.json();
        const details = detailsRes.ok ? await detailsRes.json() : {};
        
        console.log('✅ Got backend data');
        
        return {
            id: schemeCode,
            schemeCode: schemeCode,
            name: details.fund_name || 'Unknown Fund',
            category: details.category || 'Other',
            amc: details.amc || 'Unknown',
            risk: RISK_MAPPING[details.category] || 'Medium',
            
            nav: details.latest_nav,
            navDate: details.latest_nav_date,
            cagr1y: metrics.cagr_1y?.value,
            cagr3y: metrics.cagr_3y?.value,
            cagr5y: metrics.cagr_5y?.value,
            
            cagr1yType: metrics.cagr_1y?.type,
            cagr3yType: metrics.cagr_3y?.type,
            cagr5yType: metrics.cagr_5y?.type,
            
            isEstimated: metrics.cagr_5y?.type === 'estimated',
            isApprox: metrics.cagr_5y?.type === 'approx',
            hasDataIssues: metrics.suspicious_nav_count > 0,
            
            expense: estimateExpenseRatio(details.fund_name || ''),
            isDirect: details.is_direct,
            isGrowth: details.is_growth,
            isNFO: !metrics.has_sufficient_history_5y
        };
    } catch (error) {
        console.error('Backend error, falling back to MFAPI:', error);
        return _originalGetFundDetails(schemeCode);
    }
};

console.log('✅ Backend wrapper loaded - API calls will use', API_BASE_URL);
