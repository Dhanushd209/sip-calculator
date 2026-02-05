// ==========================================
// Portfolio Analyzer Onboarding Wizard (FIXED - SLIDER SYNC VERSION)
// ==========================================

let portfolioOnboardingState = {
    currentStep: 0,
    totalSteps: 4,
    data: {
        mode: null,
        budget: 10000,
        tenure: 10,
        risk: 'medium',
        fundCount: 0
    }
};

function shouldShowPortfolioOnboarding() {
    const hasSeenOnboarding = localStorage.getItem('sipwise-portfolio-onboarding-completed');
    return !hasSeenOnboarding;
}

function initializePortfolioOnboarding() {
    if (shouldShowPortfolioOnboarding() && window.location.pathname.includes('portfolio.html')) {
        setTimeout(() => {
            showPortfolioOnboarding();
        }, 500);
    }
}

function showPortfolioOnboarding() {
    const modal = document.createElement('div');
    modal.className = 'onboarding-modal';
    modal.id = 'portfolioOnboardingModal';
    modal.innerHTML = `
        <div class="onboarding-overlay"></div>
        <div class="onboarding-container">
            <div class="onboarding-header">
                <div class="onboarding-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" id="portfolioProgress" style="width: 0%"></div>
                    </div>
                    <div class="progress-text">
                        <span id="portfolioStepText">Step 1</span> of ${portfolioOnboardingState.totalSteps}
                    </div>
                </div>
                <button class="onboarding-skip" onclick="skipPortfolioOnboarding()">Skip Tutorial</button>
            </div>
            
            <div class="onboarding-content" id="portfolioOnboardingContent"></div>
            
            <div class="onboarding-footer">
                <button class="btn btn-secondary" id="portfolioBackBtn" onclick="portfolioPreviousStep()" style="display: none;">← Back</button>
                <button class="btn btn-primary" id="portfolioNextBtn" onclick="portfolioNextStep()">Next →</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    renderPortfolioOnboardingStep();
}

function renderPortfolioOnboardingStep() {
    const content = document.getElementById('portfolioOnboardingContent');
    const step = portfolioOnboardingState.currentStep;
    const nextBtn = document.getElementById('portfolioNextBtn');
    const backBtn = document.getElementById('portfolioBackBtn');
    
    backBtn.style.display = step > 0 ? 'block' : 'none';
    
    const progress = ((step) / portfolioOnboardingState.totalSteps) * 100;
    document.getElementById('portfolioProgress').style.width = progress + '%';
    document.getElementById('portfolioStepText').textContent = `Step ${step + 1}`;
    
    let stepHTML = '';
    
    switch(step) {
        case 0:
            stepHTML = `
                <div class="onboarding-step step-welcome">
                    <div class="step-icon">🎯</div>
                    <h2>Welcome to Portfolio Analyzer!</h2>
                    <p class="step-description">Build and analyze your mutual fund portfolio in 2 different ways</p>
                    <div class="welcome-features">
                        <div class="feature-item">
                            <span class="feature-icon">📊</span>
                            <div><strong>Manual Mode</strong><p>Add your own funds and customize allocation</p></div>
                        </div>
                        <div class="feature-item">
                            <span class="feature-icon">🤖</span>
                            <div><strong>Auto Mode</strong><p>Get AI-suggested diversified portfolio</p></div>
                        </div>
                        <div class="feature-item">
                            <span class="feature-icon">📈</span>
                            <div><strong>Real NAV Data</strong><p>Live data from AMFI via MFAPI.in</p></div>
                        </div>
                    </div>
                </div>
            `;
            nextBtn.innerHTML = 'Get Started →';
            break;
            
        case 1:
            stepHTML = `
                <div class="onboarding-step step-mode">
                    <div class="step-icon">🎯</div>
                    <h2>Choose Your Approach</h2>
                    <p class="step-description">How do you want to build your portfolio?</p>
                    <div class="goal-cards">
                        <div class="goal-card ${portfolioOnboardingState.data.mode === 'manual' ? 'selected' : ''}" onclick="selectPortfolioMode('manual')">
                            <div class="goal-card-icon">📊</div>
                            <h3>Manual Mode</h3>
                            <p>I want to select my own funds</p>
                            <div class="goal-card-example"><strong>Best for:</strong> Experienced investors who know specific funds</div>
                            <ul class="mode-features">
                                <li>Search & add up to 10 funds</li>
                                <li>Customize allocation %</li>
                                <li>Enable step-up SIP per fund</li>
                                <li>See detailed performance metrics</li>
                            </ul>
                        </div>
                        <div class="goal-card ${portfolioOnboardingState.data.mode === 'auto' ? 'selected' : ''}" onclick="selectPortfolioMode('auto')">
                            <div class="goal-card-icon">🤖</div>
                            <h3>Auto Mode</h3>
                            <p>Get AI-suggested portfolio</p>
                            <div class="goal-card-example"><strong>Best for:</strong> Beginners or those wanting quick recommendations</div>
                            <ul class="mode-features">
                                <li>Set your risk profile</li>
                                <li>AI picks best funds</li>
                                <li>Automatic diversification</li>
                                <li>Rationale for each fund</li>
                            </ul>
                        </div>
                    </div>
                </div>
            `;
            nextBtn.innerHTML = 'Continue →';
            nextBtn.disabled = !portfolioOnboardingState.data.mode;
            break;
            
        case 2:
            stepHTML = `
                <div class="onboarding-step step-budget">
                    <div class="step-icon">💰</div>
                    <h2>Set Your Investment Parameters</h2>
                    <p class="step-description">How much can you invest monthly?</p>
                    <div class="input-card">
                        <label>Monthly Investment Budget</label>
                        <div class="amount-input">
                            <span class="currency">₹</span>
                            <input type="number" id="portfolioBudgetInput" value="${portfolioOnboardingState.data.budget}" min="500" step="1000" oninput="updatePortfolioOnboardingValue('budget', this.value)">
                        </div>
                        <div class="amount-display">₹${formatCurrency(portfolioOnboardingState.data.budget)}/month</div>
                    </div>
                    <div class="input-card" style="margin-top: 24px;">
                        <label>Investment Duration</label>
                        <input type="range" id="portfolioTenureSlider" min="1" max="30" value="${portfolioOnboardingState.data.tenure}" oninput="updatePortfolioOnboardingValue('tenure', this.value)">
                        <div class="duration-display">
                            <span id="portfolioTenureValue">${portfolioOnboardingState.data.tenure}</span> years
                        </div>
                    </div>
                    <div class="quick-presets">
                        <button onclick="setPortfolioOnboardingTenure(5)" class="preset-btn">5 years</button>
                        <button onclick="setPortfolioOnboardingTenure(10)" class="preset-btn">10 years</button>
                        <button onclick="setPortfolioOnboardingTenure(15)" class="preset-btn">15 years</button>
                        <button onclick="setPortfolioOnboardingTenure(20)" class="preset-btn">20 years</button>
                    </div>
                </div>
            `;
            nextBtn.innerHTML = portfolioOnboardingState.data.mode === 'auto' ? 'Continue →' : 'Start Building →';
            nextBtn.disabled = false;
            break;
            
        case 3:
            if (portfolioOnboardingState.data.mode === 'auto') {
                stepHTML = `
                    <div class="onboarding-step step-risk">
                        <div class="step-icon">⚖️</div>
                        <h2>Choose Your Risk Profile</h2>
                        <p class="step-description">This determines fund allocation and expected returns</p>
                        <div class="risk-cards">
                            <div class="risk-card ${portfolioOnboardingState.data.risk === 'low' ? 'selected' : ''}" onclick="selectPortfolioRisk('low')">
                                <div class="risk-card-icon">🛡️</div>
                                <h3>Conservative</h3>
                                <div class="risk-return">Low Risk</div>
                                <p>60% Debt, 40% Equity</p>
                                <ul class="risk-features">
                                    <li>Capital protection focus</li>
                                    <li>Stable returns</li>
                                    <li>Low volatility</li>
                                </ul>
                            </div>
                            <div class="risk-card ${portfolioOnboardingState.data.risk === 'medium' ? 'selected' : ''}" onclick="selectPortfolioRisk('medium')">
                                <div class="risk-card-icon">⚖️</div>
                                <h3>Moderate</h3>
                                <div class="risk-return">Balanced</div>
                                <p>30% Debt, 70% Equity</p>
                                <ul class="risk-features">
                                    <li>Balanced approach</li>
                                    <li>Growth with stability</li>
                                    <li>Moderate volatility</li>
                                </ul>
                            </div>
                            <div class="risk-card ${portfolioOnboardingState.data.risk === 'high' ? 'selected' : ''}" onclick="selectPortfolioRisk('high')">
                                <div class="risk-card-icon">🚀</div>
                                <h3>Aggressive</h3>
                                <div class="risk-return">High Risk</div>
                                <p>10% Debt, 90% Equity</p>
                                <ul class="risk-features">
                                    <li>Maximum growth potential</li>
                                    <li>Higher returns</li>
                                    <li>High volatility</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                `;
                nextBtn.innerHTML = 'Generate Portfolio →';
            } else {
                stepHTML = `
                    <div class="onboarding-step step-manual-tips">
                        <div class="step-icon">💡</div>
                        <h2>Manual Mode Tips</h2>
                        <p class="step-description">Here's how to build your perfect portfolio</p>
                        <div class="tips-container">
                            <div class="tip-card">
                                <div class="tip-icon">🔍</div>
                                <h4>Search for Funds</h4>
                                <p>Click "Add Fund" and search by AMC name, fund type, or scheme name</p>
                                <div class="tip-example">Example: "parag parikh", "hdfc equity", "axis midcap"</div>
                            </div>
                            <div class="tip-card">
                                <div class="tip-icon">⚖️</div>
                                <h4>Diversify Wisely</h4>
                                <p>Mix different categories for balanced portfolio</p>
                                <div class="tip-example">Large Cap + Mid Cap + Debt = Balanced</div>
                            </div>
                            <div class="tip-card">
                                <div class="tip-icon">📊</div>
                                <h4>Check Performance</h4>
                                <p>Look for funds with consistent 3Y and 5Y CAGR</p>
                                <div class="tip-example">Prefer Direct Growth plans for lower fees</div>
                            </div>
                            <div class="tip-card">
                                <div class="tip-icon">📈</div>
                                <h4>Use Step-up SIP</h4>
                                <p>Enable step-up to increase SIP amount annually</p>
                                <div class="tip-example">10% annual increase = Higher corpus</div>
                            </div>
                        </div>
                        <div class="info-box" style="margin-top: 20px; background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(16, 185, 129, 0.05)); border-left-color: var(--primary);">
                            <strong>📌 Remember:</strong>
                            <ul style="margin: 8px 0 0 20px; font-size: 13px; line-height: 1.8;">
                                <li>Maximum 10 funds per portfolio</li>
                                <li>NAV data updates daily from AMFI</li>
                                <li>Returns calculated from historical data</li>
                                <li>You can enable/disable step-up per fund</li>
                            </ul>
                        </div>
                    </div>
                `;
                nextBtn.innerHTML = 'Start Adding Funds →';
            }
            nextBtn.disabled = false;
            break;
    }
    
    content.innerHTML = stepHTML;
}

function portfolioNextStep() {
    if (portfolioOnboardingState.currentStep < portfolioOnboardingState.totalSteps - 1) {
        portfolioOnboardingState.currentStep++;
        renderPortfolioOnboardingStep();
    } else {
        completePortfolioOnboarding();
    }
}

function portfolioPreviousStep() {
    if (portfolioOnboardingState.currentStep > 0) {
        portfolioOnboardingState.currentStep--;
        renderPortfolioOnboardingStep();
    }
}

function skipPortfolioOnboarding() {
    closePortfolioOnboarding();
    localStorage.setItem('sipwise-portfolio-onboarding-completed', 'true');
}

function completePortfolioOnboarding() {
    localStorage.setItem('sipwise-portfolio-onboarding-completed', 'true');
    closePortfolioOnboarding();
    setTimeout(() => {
        applyPortfolioOnboardingSettings();
        showPortfolioSuccessMessage();
    }, 300);
}

function closePortfolioOnboarding() {
    const modal = document.getElementById('portfolioOnboardingModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
}

function applyPortfolioOnboardingSettings() {
    const data = portfolioOnboardingState.data;
    console.log('🚀 Starting portfolio setup with:', data);
    
    if (data.mode === 'manual') {
        console.log('📊 Manual Mode Selected');
        if (typeof switchMode === 'function') {
            switchMode('manual');
        } else {
            document.querySelector('[onclick*="switchMode(\'manual\')"]')?.click();
        }
        setTimeout(() => {
            const budgetInput = document.getElementById('totalBudget');
            const tenureInput = document.getElementById('portfolioTenure');
            if (budgetInput) budgetInput.value = data.budget;
            if (tenureInput) {
                tenureInput.value = data.tenure;
                if (typeof updatePortfolioValue === 'function') updatePortfolioValue('portfolioTenure');
            }
            setTimeout(() => {
                if (typeof showFundSearchModal === 'function') {
                    showFundSearchModal();
                } else {
                    document.querySelector('button[onclick*="showFundSearchModal"]')?.click();
                }
            }, 500);
        }, 300);
    } else {
        // AUTO MODE
        console.log('🤖 Auto Mode Selected - Generating Portfolio...');
        
        if (typeof switchMode === 'function') {
            switchMode('auto');
            console.log('✅ Switched to auto mode via function');
        } else {
            const autoBtn = document.querySelector('[onclick*="switchMode(\'auto\')"]');
            if (autoBtn) {
                autoBtn.click();
                console.log('✅ Switched to auto mode via button click');
            } else {
                console.error('❌ Cannot find auto mode switcher');
            }
        }
        
        setTimeout(() => {
            const autoBudget = document.getElementById('autoBudget');
            const autoTenure = document.getElementById('autoTenure');
            const autoExpectedReturn = document.getElementById('autoExpectedReturn');
            
            if (autoBudget) {
                autoBudget.value = data.budget;
                console.log('✅ Budget:', data.budget);
            }
            if (autoTenure) {
                autoTenure.value = data.tenure;
                if (typeof updatePortfolioValue === 'function') updatePortfolioValue('autoTenure');
                console.log('✅ Tenure:', data.tenure);
            }
            
            const returnRate = data.risk === 'low' ? 8 : (data.risk === 'medium' ? 12 : 15);
            if (autoExpectedReturn) {
                autoExpectedReturn.value = returnRate;
                if (typeof updatePortfolioValue === 'function') updatePortfolioValue('autoExpectedReturn');
                console.log('✅ Return rate:', returnRate);
            }
            
            if (typeof selectRisk === 'function') {
                selectRisk(data.risk);
                console.log('✅ Risk selected:', data.risk);
            } else {
                const riskBtn = document.querySelector(`[data-risk="${data.risk}"]`);
                if (riskBtn) {
                    riskBtn.click();
                    console.log('✅ Risk selected via button:', data.risk);
                }
            }
            
            setTimeout(() => {
                console.log('🎯 GENERATING PORTFOLIO NOW...');
                
                if (typeof generateAutoPortfolio === 'function') {
                    try {
                        generateAutoPortfolio();
                        console.log('✅✅✅ PORTFOLIO GENERATION CALLED!');
                    } catch (e) {
                        console.error('❌ Error calling generateAutoPortfolio:', e);
                    }
                } else {
                    console.error('❌ generateAutoPortfolio function not found');
                    const genBtn = document.querySelector('button[onclick*="generateAutoPortfolio"]');
                    if (genBtn) {
                        genBtn.click();
                        console.log('✅ Clicked generate button as fallback');
                    } else {
                        console.error('❌ Generate button not found!');
                        alert('⚠️ Please click "Generate Portfolio" button manually');
                    }
                }
            }, 2000);
        }, 600);
    }
}

function showPortfolioSuccessMessage() {
    const toast = document.createElement('div');
    toast.className = 'onboarding-toast';
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">✅</span>
            <div>
                <strong>Setup Complete!</strong>
                <p>${portfolioOnboardingState.data.mode === 'manual' ? 'Start adding funds' : 'Generating portfolio...'}</p>
            </div>
        </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function selectPortfolioMode(mode) {
    portfolioOnboardingState.data.mode = mode;
    renderPortfolioOnboardingStep();
}

function selectPortfolioRisk(risk) {
    portfolioOnboardingState.data.risk = risk;
    renderPortfolioOnboardingStep();
}

function updatePortfolioOnboardingValue(field, value) {
    portfolioOnboardingState.data[field] = parseFloat(value);
    
    if (field === 'budget') {
        const displayElement = document.querySelector('.amount-display');
        if (displayElement) {
            displayElement.textContent = '₹' + formatCurrency(value) + '/month';
        }
    } else if (field === 'tenure') {
        const displayElement = document.getElementById('portfolioTenureValue');
        if (displayElement) {
            displayElement.textContent = value;
        }
    }
}

// ⭐ CRITICAL FIX: Proper tenure setter that updates BOTH slider and display
function setPortfolioOnboardingTenure(years) {
    portfolioOnboardingState.data.tenure = years;
    
    // Update slider
    const slider = document.getElementById('portfolioTenureSlider');
    if (slider) {
        slider.value = years;
    }
    
    // Update display text
    const displayElement = document.getElementById('portfolioTenureValue');
    if (displayElement) {
        displayElement.textContent = years;
    }
}

function restartPortfolioOnboarding() {
    portfolioOnboardingState.currentStep = 0;
    showPortfolioOnboarding();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePortfolioOnboarding);
} else {
    initializePortfolioOnboarding();
}