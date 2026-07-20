/**
 * Tool: Smart Calculator
 */

let displayValue = '0';
let equationValue = '';
let activeTab = 'standard';

export function renderOptions(container) {
    container.innerHTML = `
        <div class="form-group">
            <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5;">
                Everyday Calculator suite provides Standard, Scientific, Mortgage Loan, and Health BMI calculators. Everything runs 100% offline.
            </p>
        </div>
        <div class="form-group" style="margin-top:20px;">
            <label>Quick Constants</label>
            <div style="display:flex; flex-direction:column; gap:6px; font-size:0.8rem; color:var(--text-muted);">
                <div><strong>π (Pi)</strong> ≈ 3.14159265</div>
                <div><strong>e (Euler)</strong> ≈ 2.71828182</div>
            </div>
        </div>
    `;
}

export async function renderWorkspace(container, files, utils) {
    container.innerHTML = `
        <div class="calculator-container">
            <!-- Tabs -->
            <div class="calc-tabs">
                <button class="calc-tab-btn active" data-tab="standard">Standard</button>
                <button class="calc-tab-btn" data-tab="scientific">Scientific</button>
                <button class="calc-tab-btn" data-tab="mortgage">Mortgage</button>
                <button class="calc-tab-btn" data-tab="bmi">BMI</button>
            </div>

            <!-- Standard/Scientific Grid -->
            <div id="calc-keypad-panel">
                <div class="calc-display">
                    <div class="calc-history" id="calc-history-display"></div>
                    <div class="calc-result" id="calc-result-display">0</div>
                </div>
                <div class="calc-grid" id="calc-grid-buttons"></div>
            </div>

            <!-- Mortgage Form (Hidden by default) -->
            <div id="calc-mortgage-panel" class="hidden" style="animation: fadeIn 0.3s ease;">
                <h3 style="font-size:1.1rem;margin-bottom:12px;color:var(--primary);">Mortgage Calculator</h3>
                <div class="form-group">
                    <label for="mort-principal">Loan Principal ($)</label>
                    <input type="number" id="mort-principal" class="form-control" value="250000" min="100">
                </div>
                <div class="form-group">
                    <label for="mort-rate">Interest Rate (% per year)</label>
                    <input type="number" id="mort-rate" class="form-control" value="4.5" step="0.05" min="0.01">
                </div>
                <div class="form-group">
                    <label for="mort-term">Loan Term (years)</label>
                    <input type="number" id="mort-term" class="form-control" value="30" min="1">
                </div>
                <button class="btn-primary btn-block mt-4" id="btn-calc-mortgage">Calculate Monthly Payment</button>
                
                <div id="mortgage-result-box" class="hidden" style="margin-top:20px; padding:12px; background:var(--bg-input); border-radius:10px; border:1px solid var(--border-color); font-size:0.9rem; line-height:1.6;">
                    <div><strong>Monthly Payment:</strong> <span id="mort-res-monthly" style="color:var(--success);font-weight:bold;">$0.00</span></div>
                    <div><strong>Total Interest Paid:</strong> <span id="mort-res-interest">$0.00</span></div>
                    <div><strong>Total Loan Payoff:</strong> <span id="mort-res-total">$0.00</span></div>
                </div>
            </div>

            <!-- BMI Form (Hidden by default) -->
            <div id="calc-bmi-panel" class="hidden" style="animation: fadeIn 0.3s ease;">
                <h3 style="font-size:1.1rem;margin-bottom:12px;color:var(--primary);">BMI Health Calculator</h3>
                <div class="form-group">
                    <label for="bmi-weight">Weight (kg)</label>
                    <input type="number" id="bmi-weight" class="form-control" value="70" min="1">
                </div>
                <div class="form-group">
                    <label for="bmi-height">Height (cm)</label>
                    <input type="number" id="bmi-height" class="form-control" value="175" min="50">
                </div>
                <button class="btn-primary btn-block mt-4" id="btn-calc-bmi">Calculate BMI</button>
                
                <div id="bmi-result-box" class="hidden" style="margin-top:20px; padding:12px; background:var(--bg-input); border-radius:10px; border:1px solid var(--border-color); font-size:0.9rem; line-height:1.6; text-align:center;">
                    <div>Your BMI is: <strong id="bmi-res-val" style="font-size:1.4rem; color:var(--primary); display:block; margin:6px 0;">0.0</strong></div>
                    <div id="bmi-res-badge" style="display:inline-block; padding:4px 12px; border-radius:12px; font-weight:bold; font-size:0.8rem; color:white;">Normal</div>
                </div>
            </div>
        </div>
    `;

    // Bind tab clicks
    container.querySelectorAll('.calc-tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            container.querySelectorAll('.calc-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const tab = btn.getAttribute('data-tab');
            activeTab = tab;
            switchTab(tab);
        });
    });

    // Initial render
    switchTab('standard');
    
    // Bind Mortgage calculate
    document.getElementById('btn-calc-mortgage').addEventListener('click', calculateMortgage);
    
    // Bind BMI calculate
    document.getElementById('btn-calc-bmi').addEventListener('click', calculateBMI);
}

function switchTab(tab) {
    const keypad = document.getElementById('calc-keypad-panel');
    const mortgage = document.getElementById('calc-mortgage-panel');
    const bmi = document.getElementById('calc-bmi-panel');

    // Hide all
    keypad.classList.add('hidden');
    mortgage.classList.add('hidden');
    bmi.classList.add('hidden');

    if (tab === 'standard' || tab === 'scientific') {
        keypad.classList.remove('hidden');
        renderKeypad(tab);
    } else if (tab === 'mortgage') {
        mortgage.classList.remove('hidden');
    } else if (tab === 'bmi') {
        bmi.classList.remove('hidden');
    }
}

function renderKeypad(mode) {
    const grid = document.getElementById('calc-grid-buttons');
    grid.innerHTML = '';
    
    // Setup grid layout class
    if (mode === 'scientific') {
        grid.className = 'calc-grid scientific-grid';
    } else {
        grid.className = 'calc-grid';
    }

    const standardKeys = [
        { label: 'C', action: 'clear', class: 'clear' },
        { label: '(', action: 'append' },
        { label: ')', action: 'append' },
        { label: '÷', action: 'append-op', value: '÷', class: 'op' },
        { label: '7', action: 'append' },
        { label: '8', action: 'append' },
        { label: '9', action: 'append' },
        { label: '×', action: 'append-op', value: '×', class: 'op' },
        { label: '4', action: 'append' },
        { label: '5', action: 'append' },
        { label: '6', action: 'append' },
        { label: '–', action: 'append-op', value: '–', class: 'op' },
        { label: '1', action: 'append' },
        { label: '2', action: 'append' },
        { label: '3', action: 'append' },
        { label: '+', action: 'append-op', value: '+', class: 'op' },
        { label: '0', action: 'append' },
        { label: '.', action: 'append' },
        { label: '⌫', action: 'delete' },
        { label: '=', action: 'evaluate', class: 'eq' }
    ];

    const scientificKeys = [
        { label: 'sin', action: 'append-func', value: 'sin(' },
        { label: 'cos', action: 'append-func', value: 'cos(' },
        { label: 'tan', action: 'append-func', value: 'tan(' },
        { label: 'sqrt', action: 'append-func', value: 'sqrt(' },
        { label: 'π', action: 'append', value: 'pi' },
        
        { label: 'ln', action: 'append-func', value: 'ln(' },
        { label: 'log', action: 'append-func', value: 'log(' },
        { label: 'e', action: 'append', value: 'e' },
        { label: '(', action: 'append' },
        { label: ')', action: 'append' },
        
        { label: 'C', action: 'clear', class: 'clear' },
        { label: '÷', action: 'append-op', value: '÷', class: 'op' },
        { label: '×', action: 'append-op', value: '×', class: 'op' },
        { label: '–', action: 'append-op', value: '–', class: 'op' },
        { label: '+', action: 'append-op', value: '+', class: 'op' },
        
        { label: '7', action: 'append' },
        { label: '8', action: 'append' },
        { label: '9', action: 'append' },
        { label: '.', action: 'append' },
        { label: '⌫', action: 'delete' },
        
        { label: '4', action: 'append' },
        { label: '5', action: 'append' },
        { label: '6', action: 'append' },
        { label: '1', action: 'append' },
        { label: '2', action: 'append' },
        
        { label: '3', action: 'append' },
        { label: '0', action: 'append' },
        { label: '=', action: 'evaluate', class: 'eq' }
    ];

    const targetKeys = mode === 'scientific' ? scientificKeys : standardKeys;
    
    targetKeys.forEach(key => {
        const btn = document.createElement('button');
        btn.className = `calc-btn ${key.class || ''}`;
        btn.textContent = key.label;
        btn.addEventListener('click', () => handleKeyPress(key));
        grid.appendChild(btn);
    });

    // Reset displays
    updateDisplay();
}

function handleKeyPress(key) {
    const history = document.getElementById('calc-history-display');
    const result = document.getElementById('calc-result-display');

    if (key.action === 'clear') {
        displayValue = '0';
        equationValue = '';
    } else if (key.action === 'delete') {
        if (displayValue.length > 1) {
            displayValue = displayValue.slice(0, -1);
        } else {
            displayValue = '0';
        }
    } else if (key.action === 'append') {
        const appendVal = key.value !== undefined ? key.value : key.label;
        if (displayValue === '0' && appendVal !== '.') {
            displayValue = appendVal;
        } else {
            displayValue += appendVal;
        }
    } else if (key.action === 'append-func') {
        if (displayValue === '0') {
            displayValue = key.value;
        } else {
            displayValue += key.value;
        }
    } else if (key.action === 'append-op') {
        displayValue += ` ${key.value} `;
    } else if (key.action === 'evaluate') {
        try {
            equationValue = displayValue;
            const evalResult = parseAndEvaluate(displayValue);
            displayValue = formatResult(evalResult);
        } catch (err) {
            displayValue = 'Error';
            console.error('Calculation Error:', err);
        }
    }
    
    updateDisplay();
}

function updateDisplay() {
    const history = document.getElementById('calc-history-display');
    const result = document.getElementById('calc-result-display');
    if (history && result) {
        history.textContent = equationValue;
        result.textContent = displayValue;
    }
}

function formatResult(num) {
    if (num === null) return 'Error';
    if (Math.abs(num) < 1e-10 && num !== 0) return '0';
    
    // Scale floating numbers nicely
    const str = num.toString();
    if (str.includes('.') && str.length > 12) {
        return parseFloat(num.toFixed(8)).toString();
    }
    return str;
}

function parseAndEvaluate(expr) {
    // Standardize operations
    let sanitized = expr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/–/g, '-')
        .replace(/pi/g, Math.PI.toString())
        .replace(/e/g, Math.E.toString())
        .replace(/sin\(/g, 'Math.sin(')
        .replace(/cos\(/g, 'Math.cos(')
        .replace(/tan\(/g, 'Math.tan(')
        .replace(/log\(/g, 'Math.log10(')
        .replace(/ln\(/g, 'Math.log(')
        .replace(/sqrt\(/g, 'Math.sqrt(');
        
    // Safely match allowed characters (prevent arbitrary JS code injection)
    // Allowed characters: numbers, decimals, + - * / ( ) Math functions, spaces
    const cleanExpr = sanitized.replace(/Math\.[a-z0-9]+/g, '');
    if (!/^[0-9+\-*/().\s]*$/.test(cleanExpr)) {
        throw new Error('Invalid tokens');
    }

    try {
        const value = new Function(`return (${sanitized})`)();
        if (value === undefined || isNaN(value)) {
            throw new Error('Invalid math result');
        }
        return value;
    } catch (e) {
        throw new Error('Math Error');
    }
}

// Financial Mortgage Loan Calculator
function calculateMortgage() {
    const principal = parseFloat(document.getElementById('mort-principal').value);
    const rate = parseFloat(document.getElementById('mort-rate').value) / 100 / 12; // Monthly rate
    const termMonths = parseFloat(document.getElementById('mort-term').value) * 12; // Total payments

    const resultBox = document.getElementById('mortgage-result-box');
    const resMonthly = document.getElementById('mort-res-monthly');
    const resInterest = document.getElementById('mort-res-interest');
    const resTotal = document.getElementById('mort-res-total');

    if (isNaN(principal) || isNaN(rate) || isNaN(termMonths) || principal <= 0 || rate < 0 || termMonths <= 0) {
        alert('Please enter valid numeric inputs.');
        return;
    }

    // Amortization Payment Formula: P * (r*(1+r)^n) / ((1+r)^n - 1)
    let monthly = 0;
    if (rate === 0) {
        monthly = principal / termMonths;
    } else {
        monthly = principal * (rate * Math.pow(1 + rate, termMonths)) / (Math.pow(1 + rate, termMonths) - 1);
    }

    const totalPaid = monthly * termMonths;
    const totalInterest = totalPaid - principal;

    resMonthly.textContent = `$${monthly.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    resInterest.textContent = `$${totalInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    resTotal.textContent = `$${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    resultBox.classList.remove('hidden');
}

// BMI Calculator
function calculateBMI() {
    const weight = parseFloat(document.getElementById('bmi-weight').value);
    const height = parseFloat(document.getElementById('bmi-height').value) / 100; // to meters

    const resultBox = document.getElementById('bmi-result-box');
    const resVal = document.getElementById('bmi-res-val');
    const resBadge = document.getElementById('bmi-res-badge');

    if (isNaN(weight) || isNaN(height) || weight <= 0 || height <= 0) {
        alert('Please enter valid weight and height.');
        return;
    }

    // Formula: kg / m^2
    const bmiVal = weight / (height * height);
    resVal.textContent = bmiVal.toFixed(1);

    // Categories
    let category = 'Normal';
    let color = '#10b981'; // Green
    if (bmiVal < 18.5) {
        category = 'Underweight';
        color = '#3b82f6'; // Blue
    } else if (bmiVal >= 25 && bmiVal < 30) {
        category = 'Overweight';
        color = '#f59e0b'; // Amber
    } else if (bmiVal >= 30) {
        category = 'Obese';
        color = '#ef4444'; // Red
    }

    resBadge.textContent = category;
    resBadge.style.backgroundColor = color;
    
    resultBox.classList.remove('hidden');
}

export async function process(files, options, progressCallback) {
    // Standard interface expects a process method, return dummy
    return { blob: new Blob([]), filename: 'calc.txt' };
}
