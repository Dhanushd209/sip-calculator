// ==========================================
// Onboarding Wizard
// ==========================================

let onboardingState = {
    currentStep: 0,
    totalSteps: 4,
    data: {
        goal: null,          // 'corpus' or 'return'
        budget: 5000,
        duration: 10,
        risk: 'medium',
        targetCorpus: 1000000
    }
};

// Check if user has completed onboarding
function shouldShowOnboarding() {
    const hasSeenOnboarding = localStorage.getItem('sipwise-onboarding-completed');
    const isFirstVisit = !hasSeenOnboarding;
    return isFirstVisit;
}

// Initialize onboarding on page load
function initializeOnboarding() {
    if (shouldShowOnboarding() && window.location.pathname.includes('index.html')) {
        setTimeout(() => {
            showOnboarding();
        }, 500);
    }
}

// Show onboarding modal
function showOnboarding() {
    const modal = document.createElement('div');
    modal.className = 'onboarding-modal';
    modal.id = 'onboardingModal';
    modal.innerHTML = `
        <div class="onboarding-overlay"></div>
        <div class="onboarding-container">
            <div class="onboarding-header">
                <div class="onboarding-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" id="onboardingProgress" style="width: 0%"></div>
                    </div>
                    <div class="progress-text">
                        <span id="currentStepText">Step 1</span> of ${onboardingState.totalSteps}
                    </div>
                </div>
                <button class="onboarding-skip" onclick="skipOnboarding()">Skip Tutorial</button>
            </div>
            
            <div class="onboarding-content" id="onboardingContent">
                <!-- Steps will be rendered here -->
            </div>
            
            <div class="onboarding-footer">
                <button class="btn btn-secondary" id="onboardingBack" onclick="previousStep()" style="display: none;">
                    ← Back
                </button>
                <button class="btn btn-primary" id="onboardingNext" onclick="nextStep()">
                    Next →
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    renderOnboardingStep();
}

// Render current step
function renderOnboardingStep() {
    const content = document.getElementById('onboardingContent');
    const step = onboardingState.currentStep;
    const nextBtn = document.getElementById('onboardingNext');
    const backBtn = document.getElementById('onboardingBack');
    
    // Show/hide back button
    backBtn.style.display = step > 0 ? 'block' : 'none';
    
    // Update progress
    const progress = ((step) / onboardingState.totalSteps) * 100;
    document.getElementById('onboardingProgress').style.width = progress + '%';
    document.getElementById('currentStepText').textContent = `Step ${step + 1}`;
    
    let stepHTML = '';
    
    switch(step) {
        case 0:
            stepHTML = `
                <div class="onboarding-step step-welcome">
                    <div class="step-icon">👋</div>
                    <h2>Welcome to SIPWise!</h2>
                    <p class="step-description">Let's help you plan your investment journey in just 4 simple steps.</p>
                    
                    <div class="welcome-features">
                        <div class="feature-item">
                            <span class="feature-icon">📊</span>
                            <div>
                                <strong>Smart Calculator</strong>
                                <p>Calculate SIP returns with advanced features</p>
                            </div>
                        </div>
                        <div class="feature-item">
                            <span class="feature-icon">🎯</span>
                            <div>
                                <strong>Goal Planning</strong>
                                <p>Plan for specific financial goals</p>
                            </div>
                        </div>
                        <div class="feature-item">
                            <span class="feature-icon">📈</span>
                            <div>
                                <strong>Portfolio Analyzer</strong>
                                <p>Analyze and optimize your investments</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            nextBtn.innerHTML = 'Get Started →';
            break;
            
        case 1:
            stepHTML = `
                <div class="onboarding-step step-goal">
                    <div class="step-icon">🎯</div>
                    <h2>What's Your Investment Goal?</h2>
                    <p class="step-description">Choose what you want to achieve with your SIP investment</p>
                    
                    <div class="goal-cards">
                        <div class="goal-card ${onboardingState.data.goal === 'corpus' ? 'selected' : ''}" onclick="selectGoalType('corpus')">
                            <div class="goal-card-icon">💰</div>
                            <h3>Build a Corpus</h3>
                            <p>I want to grow my wealth to a specific amount</p>
                            <div class="goal-card-example">Example: Save ₹50 lakhs in 10 years</div>
                        </div>
                        
                        <div class="goal-card ${onboardingState.data.goal === 'return' ? 'selected' : ''}" onclick="selectGoalType('return')">
                            <div class="goal-card-icon">📊</div>
                            <h3>Maximize Returns</h3>
                            <p>I want to see how much my investments can grow</p>
                            <div class="goal-card-example">Example: Invest ₹5,000/month, what will I get?</div>
                        </div>
                    </div>
                </div>
            `;
            nextBtn.innerHTML = 'Continue →';
            nextBtn.disabled = !onboardingState.data.goal;
            break;
            
        case 2:
            const isCorpusMode = onboardingState.data.goal === 'corpus';
            stepHTML = `
                <div class="onboarding-step step-budget">
                    <div class="step-icon">${isCorpusMode ? '🎯' : '💵'}</div>
                    <h2>${isCorpusMode ? 'Set Your Target' : 'Your Investment Budget'}</h2>
                    <p class="step-description">${isCorpusMode ? 'How much do you want to accumulate?' : 'How much can you invest every month?'}</p>
                    
                    ${isCorpusMode ? `
                        <div class="input-card">
                            <label>Target Corpus Amount</label>
                            <div class="amount-input">
                                <span class="currency">₹</span>
                                <input type="number" id="onboardingTargetCorpus" value="${onboardingState.data.targetCorpus}" 
                                       min="10000" step="10000" oninput="updateOnboardingValue('targetCorpus', this.value)">
                            </div>
                            <div class="amount-display">₹${formatCurrency(onboardingState.data.targetCorpus)}</div>
                        </div>
                    ` : `
                        <div class="input-card">
                            <label>Monthly SIP Amount</label>
                            <div class="amount-input">
                                <span class="currency">₹</span>
                                <input type="number" id="onboardingBudget" value="${onboardingState.data.budget}" 
                                       min="500" step="500" oninput="updateOnboardingValue('budget', this.value)">
                            </div>
                            <div class="amount-display">₹${formatCurrency(onboardingState.data.budget)}/month</div>
                        </div>
                    `}
                    
                    <div class="input-card" style="margin-top: 24px;">
                        <label>Investment Duration</label>
                        <input type="range" id="onboardingDuration" min="1" max="30" value="${onboardingState.data.duration}" 
                               oninput="updateOnboardingValue('duration', this.value)">
                        <div class="duration-display">
                            <span>${onboardingState.data.duration}</span> years
                        </div>
                    </div>
                    
                    <div class="quick-presets">
                        <button onclick="setDuration(5)" class="preset-btn">5 years</button>
                        <button onclick="setDuration(10)" class="preset-btn">10 years</button>
                        <button onclick="setDuration(15)" class="preset-btn">15 years</button>
                        <button onclick="setDuration(20)" class="preset-btn">20 years</button>
                    </div>
                </div>
            `;
            nextBtn.innerHTML = 'Continue →';
            nextBtn.disabled = false;
            break;
            
        case 3:
            stepHTML = `
                <div class="onboarding-step step-risk">
                    <div class="step-icon">⚖️</div>
                    <h2>Choose Your Risk Profile</h2>
                    <p class="step-description">Your risk tolerance determines the expected returns</p>
                    
                    <div class="risk-cards">
                        <div class="risk-card ${onboardingState.data.risk === 'low' ? 'selected' : ''}" onclick="selectRiskType('low')">
                            <div class="risk-card-icon">🛡️</div>
                            <h3>Conservative</h3>
                            <div class="risk-return">~8% p.a.</div>
                            <p>Low risk, stable returns</p>
                            <ul class="risk-features">
                                <li>Minimal volatility</li>
                                <li>Capital protection focus</li>
                                <li>Suitable for short-term goals</li>
                            </ul>
                        </div>
                        
                        <div class="risk-card ${onboardingState.data.risk === 'medium' ? 'selected' : ''}" onclick="selectRiskType('medium')">
                            <div class="risk-card-icon">⚖️</div>
                            <h3>Moderate</h3>
                            <div class="risk-return">~12% p.a.</div>
                            <p>Balanced risk-reward</p>
                            <ul class="risk-features">
                                <li>Moderate volatility</li>
                                <li>Growth with stability</li>
                                <li>Ideal for most investors</li>
                            </ul>
                        </div>
                        
                        <div class="risk-card ${onboardingState.data.risk === 'high' ? 'selected' : ''}" onclick="selectRiskType('high')">
                            <div class="risk-card-icon">🚀</div>
                            <h3>Aggressive</h3>
                            <div class="risk-return">~15% p.a.</div>
                            <p>Higher risk, higher returns</p>
                            <ul class="risk-features">
                                <li>High volatility</li>
                                <li>Maximum growth potential</li>
                                <li>Long-term investment</li>
                            </ul>
                        </div>
                    </div>
                </div>
            `;
            nextBtn.innerHTML = 'See My Results →';
            nextBtn.disabled = false;
            break;
            
        case 4:
            const returnRate = onboardingState.data.risk === 'low' ? 8 : (onboardingState.data.risk === 'medium' ? 12 : 15);
            const monthlyRate = returnRate / 100 / 12;
            const months = onboardingState.data.duration * 12;
            
            let totalInvested, expectedCorpus, suggestedSIP;
            
            if (onboardingState.data.goal === 'corpus') {
                // Reverse calculation
                const targetCorpus = onboardingState.data.targetCorpus;
                const fvFactor = (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate * (1 + monthlyRate);
                suggestedSIP = Math.round(targetCorpus / fvFactor);
                totalInvested = suggestedSIP * months;
                expectedCorpus = targetCorpus;
            } else {
                // Forward calculation
                suggestedSIP = onboardingState.data.budget;
                totalInvested = suggestedSIP * months;
                expectedCorpus = suggestedSIP * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
            }
            
            const totalGains = expectedCorpus - totalInvested;
            const multiplier = (expectedCorpus / totalInvested).toFixed(2);
            
            stepHTML = `
                <div class="onboarding-step step-results">
                    <div class="step-icon">🎉</div>
                    <h2>Your Investment Plan is Ready!</h2>
                    <p class="step-description">Here's what your SIP journey looks like</p>
                    
                    <div class="results-preview">
                        ${onboardingState.data.goal === 'corpus' ? `
                            <div class="result-highlight">
                                <div class="result-label">Recommended Monthly SIP</div>
                                <div class="result-amount">₹${formatNumber(suggestedSIP)}</div>
                                <div class="result-subtext">to reach your goal of ₹${formatCurrency(expectedCorpus)}</div>
                            </div>
                        ` : `
                            <div class="result-highlight">
                                <div class="result-label">Expected Corpus</div>
                                <div class="result-amount">₹${formatCurrency(expectedCorpus)}</div>
                                <div class="result-subtext">with ₹${formatNumber(suggestedSIP)}/month</div>
                            </div>
                        `}
                        
                        <div class="result-stats">
                            <div class="stat-item">
                                <div class="stat-label">Total Investment</div>
                                <div class="stat-value">₹${formatCurrency(totalInvested)}</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-label">Expected Returns</div>
                                <div class="stat-value">₹${formatCurrency(totalGains)}</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-label">Wealth Multiplier</div>
                                <div class="stat-value">${multiplier}x</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-label">Return Rate</div>
                                <div class="stat-value">${returnRate}% p.a.</div>
                            </div>
                        </div>
                        
                        <div class="next-steps">
                            <h4>✨ What's Next?</h4>
                            <ul>
                                <li>We'll apply these settings to the calculator</li>
                                <li>You can adjust any parameter anytime</li>
                                <li>Explore advanced features like step-up SIP</li>
                                <li>Analyze different scenarios</li>
                            </ul>
                        </div>
                    </div>
                </div>
            `;
            nextBtn.innerHTML = 'Start Calculating →';
            nextBtn.disabled = false;
            break;
    }
    
    content.innerHTML = stepHTML;
}

// Navigation functions
function nextStep() {
    if (onboardingState.currentStep < onboardingState.totalSteps) {
        onboardingState.currentStep++;
        renderOnboardingStep();
    } else {
        completeOnboarding();
    }
}

function previousStep() {
    if (onboardingState.currentStep > 0) {
        onboardingState.currentStep--;
        renderOnboardingStep();
    }
}

function skipOnboarding() {
    if (confirm('Are you sure you want to skip the tutorial? You can always explore on your own!')) {
        closeOnboarding();
    }
}

function completeOnboarding() {
    // Apply settings to calculator
    applyOnboardingSettings();
    
    // Mark as completed
    localStorage.setItem('sipwise-onboarding-completed', 'true');
    
    // Close modal
    closeOnboarding();
    
    // Show success message
    showSuccessMessage();
}

function closeOnboarding() {
    const modal = document.getElementById('onboardingModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
}

function applyOnboardingSettings() {
    const data = onboardingState.data;
    
    // Set mode
    if (data.goal === 'corpus') {
        setMode('reverse');
        document.getElementById('targetCorpus').value = data.targetCorpus;
        updateDisplay('targetCorpus');
    } else {
        setMode('forward');
        document.getElementById('sipAmount').value = data.budget;
        document.getElementById('sipAmountInput').value = data.budget;
        updateValue('sipAmount');
    }
    
    // Set duration
    document.getElementById('duration').value = data.duration;
    updateValue('duration');
    
    // Set return rate based on risk
    const returnRate = data.risk === 'low' ? 8 : (data.risk === 'medium' ? 12 : 15);
    setReturn(returnRate);
    
    // Calculate
    calculate();
    
    // Scroll to results
    setTimeout(() => {
        const resultsSection = document.querySelector('.results-grid');
        if (resultsSection) {
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 300);
}

function showSuccessMessage() {
    const toast = document.createElement('div');
    toast.className = 'onboarding-toast';
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">✅</span>
            <div>
                <strong>Setup Complete!</strong>
                <p>Your investment plan is ready. Adjust parameters anytime.</p>
            </div>
        </div>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Helper functions
function selectGoalType(goal) {
    onboardingState.data.goal = goal;
    renderOnboardingStep();
}

function selectRiskType(risk) {
    onboardingState.data.risk = risk;
    renderOnboardingStep();
}

function updateOnboardingValue(field, value) {
    onboardingState.data[field] = parseFloat(value);
    
    // Update display
    const displayElement = document.querySelector('.amount-display, .duration-display');
    if (displayElement && field === 'budget') {
        displayElement.textContent = '₹' + formatCurrency(value) + '/month';
    } else if (displayElement && field === 'targetCorpus') {
        displayElement.textContent = '₹' + formatCurrency(value);
    } else if (displayElement && field === 'duration') {
        displayElement.innerHTML = `<span>${value}</span> years`;
    }
}

function setDuration(years) {
    onboardingState.data.duration = years;
    document.getElementById('onboardingDuration').value = years;
    updateOnboardingValue('duration', years);
}

// Add manual trigger function for users who want to see it again
function restartOnboarding() {
    onboardingState.currentStep = 0;
    showOnboarding();
}

// Initialize on DOM load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeOnboarding);
} else {
    initializeOnboarding();
}