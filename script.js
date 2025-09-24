// Dollar Exchange Calculator with Sri Lankan Rupee Symbol
class DollarExchangeCalculator {
    constructor() {
        this.billDenominations = [100, 50, 20, 10, 5, 2, 1];
        this.modal = null;
        this.initializeElements();
        this.initializeEventListeners();
        this.calculateExchange();
    }

    initializeElements() {
        this.modal = document.getElementById('settings-modal');
        this.settingsBtn = document.getElementById('settings-btn');
        this.closeBtn = document.getElementById('close-modal');
        this.saveBtn = document.getElementById('save-settings');
        this.resetBtn = document.getElementById('reset-settings');
        this.calculateBtn = document.getElementById('calculate-btn');
    }

    initializeEventListeners() {
        // Settings modal controls
        this.settingsBtn.addEventListener('click', () => this.openModal());
        this.closeBtn.addEventListener('click', () => this.closeModal());
        this.saveBtn.addEventListener('click', () => this.saveSettings());
        this.resetBtn.addEventListener('click', () => this.resetSettings());

        // Close modal when clicking outside
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display === 'block') {
                this.closeModal();
            }
        });

        // Calculate button
        this.calculateBtn.addEventListener('click', () => {
            this.calculateExchange();
        });

        // Auto-calculate on bill input change
        const billInputs = document.querySelectorAll('.bill-field');
        billInputs.forEach(input => {
            input.addEventListener('input', () => {
                this.calculateExchange();
            });
        });

        // Add input validation
        this.addInputValidation();

        // Load saved settings
        this.loadSettings();
    }

    // Fix floating-point precision issues for currency calculations
    roundToCurrency(value) {
        return Math.round(value * 100) / 100;
    }

    // Multiply currency values with proper precision
    multiplyCurrency(...values) {
        // Convert all values to cents for calculation
        let result = Math.round(values[0] * 100);

        for (let i = 1; i < values.length; i++) {
            result = Math.round(result * values[i]);
        }

        // Convert back to dollars
        return this.roundToCurrency(result / 100);
    }

    // Add two currency values with proper precision
    addCurrency(value1, value2) {
        const cents1 = Math.round(value1 * 100);
        const cents2 = Math.round(value2 * 100);
        const result = (cents1 + cents2) / 100;
        return this.roundToCurrency(result);
    }

    // Subtract two currency values with proper precision
    subtractCurrency(value1, value2) {
        const cents1 = Math.round(value1 * 100);
        const cents2 = Math.round(value2 * 100);
        const result = (cents1 - cents2) / 100;
        return this.roundToCurrency(result);
    }

    openModal() {
        this.modal.style.display = 'block';
        document.body.style.overflow = 'hidden';

        const firstInput = this.modal.querySelector('.rate-field');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }

    closeModal() {
        this.modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    saveSettings() {
        const settings = {};
        settings.baseRate = this.getBaseRate();

        this.billDenominations.forEach(denomination => {
            if (denomination !== 100) {
                settings[`deduction_${denomination}`] = this.getDeduction(denomination);
            }
        });

        localStorage.setItem('exchangeSettings', JSON.stringify(settings));

        this.calculateExchange();
        this.closeModal();

        this.showToast('Settings saved successfully!', 'success');
    }

    loadSettings() {
        const savedSettings = localStorage.getItem('exchangeSettings');
        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);

                if (settings.baseRate) {
                    document.getElementById('rate-100').value = settings.baseRate.toFixed(2);
                }

                this.billDenominations.forEach(denomination => {
                    if (denomination !== 100 && settings[`deduction_${denomination}`] !== undefined) {
                        document.getElementById(`deduction-${denomination}`).value = 
                            settings[`deduction_${denomination}`].toFixed(2);
                    }
                });

                this.calculateExchange();
            } catch (e) {
                console.warn('Failed to load saved settings:', e);
            }
        }
    }

    resetSettings() {
        if (!confirm('Are you sure you want to reset all settings to default values?')) {
            return;
        }

        document.getElementById('rate-100').value = '100.00';

        this.billDenominations.forEach(denomination => {
            if (denomination !== 100) {
                document.getElementById(`deduction-${denomination}`).value = '0.00';
            }
        });

        localStorage.removeItem('exchangeSettings');
        this.calculateExchange();
        this.showToast('Settings reset to default values!', 'info');
    }

    addInputValidation() {
        const billFields = document.querySelectorAll('.bill-field');
        billFields.forEach(field => {
            field.addEventListener('input', (e) => {
                if (e.target.value < 0) {
                    e.target.value = 0;
                }
                if (e.target.value > 9999) {
                    e.target.value = 9999;
                }
            });

            field.addEventListener('keypress', (e) => {
                if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
                    e.preventDefault();
                }
            });
        });

        const rateFields = document.querySelectorAll('.rate-field');
        rateFields.forEach(field => {
            field.addEventListener('blur', (e) => {
                const value = parseFloat(e.target.value) || 0;
                e.target.value = this.roundToCurrency(Math.max(0, value)).toFixed(2);
            });

            field.addEventListener('input', (e) => {
                if (e.target.value > 99999) {
                    e.target.value = 99999;
                }
            });
        });
    }

    getBillCount(denomination) {
        const element = document.getElementById(`bill-${denomination}`);
        return parseInt(element.value) || 0;
    }

    getBaseRate() {
        const element = document.getElementById('rate-100');
        const value = parseFloat(element.value) || 100.00;
        return this.roundToCurrency(value);
    }

    getDeduction(denomination) {
        if (denomination === 100) return 0;
        const element = document.getElementById(`deduction-${denomination}`);
        const value = parseFloat(element.value) || 0;
        return this.roundToCurrency(value);
    }

    calculateExchangeRate(denomination) {
        const baseRate = this.getBaseRate();
        const deduction = this.getDeduction(denomination);
        const result = this.subtractCurrency(baseRate, deduction);
        return Math.max(0, result);
    }

    calculateExchange() {
        let totalValue = 0;
        const breakdown = [];

        // Calculate for each denomination: bill_rate * denomination_value * quantity
        this.billDenominations.forEach(denomination => {
            const billCount = this.getBillCount(denomination);

            if (billCount > 0) {
                const exchangeRate = this.calculateExchangeRate(denomination);

                // CORRECT FORMULA: bill_rate * denomination_value * quantity
                // Example: If user has 1 x $100 bill with rate 95.00, calculation is: 95.00 * 100 * 1 = 9500.00
                const subtotal = this.multiplyCurrency(exchangeRate, denomination, billCount);

                breakdown.push({
                    denomination: denomination,
                    count: billCount,
                    rate: exchangeRate,
                    subtotal: subtotal
                });

                totalValue = this.addCurrency(totalValue, subtotal);
            }
        });

        this.displayResults(breakdown, totalValue);
        this.animateResults();

        // Debug logging
        console.log('Calculation Debug:', {
            breakdown: breakdown.map(item => ({
                denomination: item.denomination,
                count: item.count,
                rate: item.rate,
                calculation: `${item.rate} × ${item.denomination} × ${item.count} = ${item.subtotal}`,
                subtotal: item.subtotal
            })),
            totalValue: totalValue,
            baseRate: this.getBaseRate()
        });
    }

    displayResults(breakdown, totalValue) {
        const breakdownElement = document.getElementById('breakdown');
        const totalElement = document.getElementById('total-value');

        breakdownElement.innerHTML = '';

        if (breakdown.length === 0) {
            breakdownElement.innerHTML = '<p style="text-align: center; color: #666; font-style: italic; padding: 20px;">No bills entered. Add some bills above to see the calculation.</p>';
            totalElement.textContent = 'Rs 0.00';
            return;
        }

        // Create breakdown display showing the correct calculation format with Rs symbol
        breakdown.forEach(item => {
            const breakdownItem = document.createElement('div');
            breakdownItem.className = 'breakdown-item';
            // Show: $denomination × count @ Rs rate = Rs subtotal (e.g., $100 × 1 @ Rs 95.00 = Rs 9,500.00)
            breakdownItem.innerHTML = `
                <span>$${item.denomination} × ${item.count} @ Rs ${item.rate.toFixed(2)}</span>
                <span>Rs ${item.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            `;
            breakdownElement.appendChild(breakdownItem);
        });

        // Add total line with Rs symbol
        const totalItem = document.createElement('div');
        totalItem.className = 'breakdown-item';
        totalItem.innerHTML = `
            <span><strong>TOTAL</strong></span>
            <span><strong>Rs ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
        `;
        breakdownElement.appendChild(totalItem);

        // Update main total display with Rs symbol
        totalElement.textContent = `Rs ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    animateResults() {
        const resultDisplay = document.querySelector('.result-display');
        resultDisplay.style.transform = 'scale(0.98)';
        resultDisplay.style.opacity = '0.8';

        setTimeout(() => {
            resultDisplay.style.transform = 'scale(1)';
            resultDisplay.style.opacity = '1';
        }, 100);
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 2000;
            font-weight: 500;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 10);

        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    resetBillCounts() {
        this.billDenominations.forEach(denomination => {
            document.getElementById(`bill-${denomination}`).value = 0;
        });
        this.calculateExchange();
    }

    formatCurrency(amount) {
        // Updated to use Rs symbol for Sri Lankan Rupee
        return `Rs ${this.roundToCurrency(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    // Example calculation test with Rs symbol
    testCalculationExample() {
        console.log('=== CALCULATION EXAMPLE ===');
        console.log('User inputs: 1 in $100 bill field');
        console.log('Bill rate: Rs 95.00 (example)');
        console.log('Calculation: Rs 95.00 × 100 × 1 = Rs 9,500.00');
        console.log('Formula: bill_rate × denomination_value × quantity');

        const rate = 95.00;
        const denomination = 100;
        const quantity = 1;
        const result = this.multiplyCurrency(rate, denomination, quantity);
        console.log(`Result: Rs ${result.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    }
}

// Initialize the calculator when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.exchangeCalculator = new DollarExchangeCalculator();

    // Test the calculation example (uncomment to see)
    // window.exchangeCalculator.testCalculationExample();

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            window.exchangeCalculator.calculateExchange();
        }

        if ((e.ctrlKey || e.metaKey) && e.key === ',') {
            e.preventDefault();
            window.exchangeCalculator.openModal();
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
            if (confirm('Reset all bill counts to zero?')) {
                window.exchangeCalculator.resetBillCounts();
            }
        }
    });

    console.log('💵 Dollar Exchange Calculator loaded successfully!');
    console.log('⚡ Formula: bill_rate × denomination_value × quantity');
    console.log('💰 Currency: Sri Lankan Rupee (Rs)');
    console.log('📊 Example: Rs 95.00 × 100 × 1 = Rs 9,500.00');
});

// Service worker registration for PWA capabilities (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Uncomment if you want PWA functionality
        // navigator.serviceWorker.register('/sw.js')
        //     .then(reg => console.log('SW registered'))
        //     .catch(err => console.log('SW registration failed'));
    });
}