// Accounting Rules Engine
// Contains all accounting logic for debit/credit determination

// Accounting rules for debit/credit determination
const accountingRules = {
    // Assets: Increase = Debit, Decrease = Credit
    'Asset': (amount) => amount < 0 ? 'credit' : 'debit',
    
    // Liabilities: Increase = Credit, Decrease = Debit
    'Liability': (amount) => amount < 0 ? 'debit' : 'credit',
    
    // Equity: Increase = Credit, Decrease = Debit
    'Equity': (amount) => amount < 0 ? 'debit' : 'credit',
    
    // Revenue: Increase = Credit, Decrease = Debit
    'Revenue': (amount) => amount < 0 ? 'debit' : 'credit',
    
    // Expenses: Increase = Debit, Decrease = Credit
    'Expense': (amount) => amount < 0 ? 'credit' : 'debit'
};

// Account type mappings
const accountTypes = {
    // Assets
    'Lease Deposit': 'Asset',
    'Inventory': 'Asset',
    'Prepaid Insurance': 'Asset',
    'Equipment': 'Asset',
    'Cash': 'Asset',
    'Accounts Receivable': 'Asset',
    'Bank Account': 'Asset',
    'Fixed Assets': 'Asset',
    'Investments': 'Asset',
    
    // Liabilities
    'Accounts Payable': 'Liability',
    'Loans Payable': 'Liability',
    'Credit Card Payable': 'Liability',
    'Accrued Expenses': 'Liability',
    'Notes Payable': 'Liability',
    
    // Equity
    "Owner's Equity": 'Equity',
    'Retained Earnings': 'Equity',
    'Common Stock': 'Equity',
    'Preferred Stock': 'Equity',
    
    // Revenue
    'Rental Revenue': 'Revenue',
    'Tour Revenue': 'Revenue',
    'Sales Revenue': 'Revenue',
    'Service Revenue': 'Revenue',
    'Interest Revenue': 'Revenue',
    'Commission Revenue': 'Revenue',
    
    // Expenses
    'Salary Expense': 'Expense',
    'Rent Expense': 'Expense', 
    'Insurance Expense': 'Expense',
    'Marketing Expense': 'Expense',
    'Training Expense': 'Expense',
    'Maintenance Expense': 'Expense',
    'Utilities Expense': 'Expense',
    'Supplies Expense': 'Expense',
    'Depreciation Expense': 'Expense',
    'Travel Expense': 'Expense',
    'Meals Expense': 'Expense',
    'Office Expense': 'Expense',
    'Legal Expense': 'Expense',
    'Advertising Expense': 'Expense'
};

// Determine account type based on account name
function getAccountType(accountName) {
    if (!accountName) return 'Expense'; // Default to Expense for unknown accounts
    
    const cleanName = accountName.toString().trim();
    
    // Exact match
    if (accountTypes[cleanName]) {
        return accountTypes[cleanName];
    }
    
    // Partial matching for common patterns
    const lowerName = cleanName.toLowerCase();
    
    if (lowerName.includes('receivable') || 
        lowerName.includes('asset') ||
        lowerName.includes('equipment') ||
        lowerName.includes('inventory') ||
        lowerName.includes('cash') ||
        lowerName.includes('bank') ||
        lowerName.includes('prepaid')) {
        return 'Asset';
    }
    
    if (lowerName.includes('payable') || 
        lowerName.includes('loan') ||
        lowerName.includes('debt') ||
        lowerName.includes('credit') ||
        lowerName.includes('accrued')) {
        return 'Liability';
    }
    
    if (lowerName.includes('revenue') || 
        lowerName.includes('income') ||
        lowerName.includes('sales') ||
        lowerName.includes('fee')) {
        return 'Revenue';
    }
    
    if (lowerName.includes('equity') || 
        lowerName.includes('capital') ||
        lowerName.includes('stock') ||
        lowerName.includes('retained')) {
        return 'Equity';
    }
    
    // Default to Expense for anything else (most transactions are expenses)
    return 'Expense';
}

// Determine debit/credit for a transaction
function determineDebitCredit(accountType, amount) {
    if (!accountingRules[accountType]) {
        console.warn(`Unknown account type: ${accountType}`);
        return 'debit'; // Default to debit
    }
    
    return accountingRules[accountType](amount);
}

// Get appropriate counter account based on transaction type
function getCounterAccount(transaction) {
    const amount = Math.abs(transaction.Amount);
    const accountType = transaction.AccountType || getAccountType(transaction.Account);
    const debitCredit = transaction.DebitCredit || determineDebitCredit(accountType, transaction.Amount);
    
    // Logic for determining counter account
    switch (accountType) {
        case 'Asset':
            if (debitCredit === 'debit') {
                return 'Cash'; // Buying asset with cash
            } else {
                return 'Cash'; // Selling asset for cash
            }
            
        case 'Expense':
            return 'Cash'; // Paying expense with cash
            
        case 'Revenue':
            return 'Cash'; // Receiving cash for revenue
            
        case 'Liability':
            if (debitCredit === 'credit') {
                return 'Cash'; // Receiving loan proceeds
            } else {
                return 'Cash'; // Paying down loan
            }
            
        case 'Equity':
            if (debitCredit === 'credit') {
                return 'Cash'; // Owner investment
            } else {
                return 'Cash'; // Owner withdrawal
            }
            
        default:
            return 'Cash'; // Default counter account
    }
}

// Validate if journal entries are balanced
function validateJournalBalance(entries) {
    let totalDebits = 0;
    let totalCredits = 0;
    
    entries.forEach(entry => {
        if (entry.Debit) totalDebits += entry.Debit;
        if (entry.Credit) totalCredits += entry.Credit;
    });
    
    return {
        isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
        totalDebits: totalDebits,
        totalCredits: totalCredits,
        difference: Math.abs(totalDebits - totalCredits)
    };
}

// Generate double-entry journal entries from categorized transactions
function generateDoubleEntryJournal(transactions) {
    const entries = [];
    
    transactions.forEach(transaction => {
        if (!transaction.FinalCategory || !transaction.DebitCredit) return;
        
        const amount = Math.abs(transaction.Amount);
        const description = transaction.JournalNote || transaction.Description;
        const accountType = transaction.AccountType || getAccountType(transaction.Account);
        
        // Main account entry
        entries.push({
            Date: transaction.Date,
            Account: transaction.Account || transaction.FinalCategory,
            Debit: transaction.DebitCredit === 'debit' ? amount : null,
            Credit: transaction.DebitCredit === 'credit' ? amount : null,
            Description: description,
            Category: transaction.FinalCategory,
            Type: accountType
        });
        
        // Counter account entry
        const counterAccount = getCounterAccount(transaction);
        const counterAccountType = getAccountType(counterAccount);
        const counterDebitCredit = transaction.DebitCredit === 'debit' ? 'credit' : 'debit';
        
        entries.push({
            Date: transaction.Date,
            Account: counterAccount,
            Debit: counterDebitCredit === 'debit' ? amount : null,
            Credit: counterDebitCredit === 'credit' ? amount : null,
            Description: description,
            Category: counterAccountType,
            Type: counterAccountType
        });
    });
    
    return entries;
}

// Get color for category badge (for UI)
function getCategoryColor(category) {
    const colors = {
        'Asset': 'bg-blue-100 text-blue-800',
        'Expense': 'bg-red-100 text-red-800',
        'Revenue': 'bg-green-100 text-green-800',
        'Liability': 'bg-yellow-100 text-yellow-800',
        'Equity': 'bg-purple-100 text-purple-800'
    };
    
    return colors[category] || 'bg-gray-100 text-gray-800';
}

// Get accounting rules explanation for UI
function getAccountingRulesExplanation() {
    return {
        debitRules: [
            'Increase in Assets',
            'Increase in Expenses', 
            'Decrease in Liabilities',
            'Decrease in Equity',
            'Decrease in Revenue'
        ],
        creditRules: [
            'Decrease in Assets',
            'Decrease in Expenses',
            'Increase in Liabilities',
            'Increase in Equity',
            'Increase in Revenue'
        ]
    };
}

// Make functions available globally
window.accountingRules = accountingRules;
window.accountTypes = accountTypes;
window.getAccountType = getAccountType;
window.determineDebitCredit = determineDebitCredit;
window.getCounterAccount = getCounterAccount;
window.validateJournalBalance = validateJournalBalance;
window.generateDoubleEntryJournal = generateDoubleEntryJournal;
window.getCategoryColor = getCategoryColor;
window.getAccountingRulesExplanation = getAccountingRulesExplanation;
