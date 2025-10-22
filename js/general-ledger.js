// General Ledger Tool - Creates GL from Journal Entries
// Connects with accounting-rules.js and journal-entry.js

// Global variables
let journalEntries = [];
let generalLedger = {};
let chartOfAccounts = {};

// DOM elements
const elements = {
    uploadArea: document.getElementById('gl-upload-area'),
    fileInput: document.getElementById('gl-file-input'),
    generateBtn: document.getElementById('gl-generate-btn'),
    resetBtn: document.getElementById('gl-reset-btn'),
    downloadBtn: document.getElementById('gl-download-btn'),
    fileInfo: document.getElementById('gl-file-info'),
    fileDetails: document.getElementById('gl-file-details'),
    
    // Results and display elements
    resultsDiv: document.getElementById('gl-results'),
    resultsStats: document.getElementById('gl-results-stats'),
    ledgerInterface: document.getElementById('gl-interface'),
    previewDiv: document.getElementById('gl-preview'),
    emptyState: document.getElementById('gl-empty-state'),
    
    // Ledger preview elements
    ledgerBody: document.getElementById('gl-ledger-body'),
    accountsList: document.getElementById('gl-accounts-list'),
    previewFooter: document.getElementById('gl-preview-footer'),
    equationCheck: document.getElementById('gl-equation-check')
};

// Initialize the general ledger tool
function initGeneralLedgerTool() {
    setupEventListeners();
    console.log('General Ledger Tool initialized');
}

// Set up all event listeners
function setupEventListeners() {
    // Upload area events
    if (elements.uploadArea) {
        elements.uploadArea.addEventListener('click', () => elements.fileInput.click());
        elements.uploadArea.addEventListener('dragover', handleDragOver);
        elements.uploadArea.addEventListener('dragleave', handleDragLeave);
        elements.uploadArea.addEventListener('drop', handleDrop);
    }
    
    // File input event
    if (elements.fileInput) {
        elements.fileInput.addEventListener('change', handleFileSelect);
    }
    
    // Button events
    if (elements.generateBtn) elements.generateBtn.addEventListener('click', generateGeneralLedger);
    if (elements.resetBtn) elements.resetBtn.addEventListener('click', resetGLTool);
    if (elements.downloadBtn) elements.downloadBtn.addEventListener('click', downloadGeneralLedger);
}

// Drag and drop handlers
function handleDragOver(e) {
    e.preventDefault();
    elements.uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    elements.uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    elements.uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        elements.fileInput.files = files;
        handleFileSelect();
    }
}

// File selection and parsing
function handleFileSelect() {
    const file = elements.fileInput.files[0];
    if (!file) return;

    elements.fileDetails.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    elements.fileInfo.classList.remove('hidden');

    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            if (results.errors.length > 0) {
                showError('Error reading file: ' + results.errors[0].message);
                return;
            }
            
            if (results.data.length === 0) {
                showError('No journal entries found in the file.');
                return;
            }
            
            journalEntries = results.data;
            enableGeneration();
        },
        error: function(error) {
            showError('Error reading file. Please check the file format.');
            console.error('Error:', error);
        }
    });
}

// Generate general ledger from journal entries
function generateGeneralLedger() {
    if (journalEntries.length === 0) {
        showError('No journal entries to process. Please upload a journal entries CSV first.');
        return;
    }
    
    try {
        // Initialize ledger structure
        initializeLedgerStructure();
        
        // Process each journal entry
        journalEntries.forEach(entry => {
            postToGeneralLedger(entry);
        });
        
        // Calculate totals and validate
        calculateLedgerTotals();
        const equationBalance = validateAccountingEquation();
        
        // Display results
        showLedgerResults(equationBalance);
        displayGeneralLedger();
        displayChartOfAccounts();
        
        elements.downloadBtn.disabled = false;
        
    } catch (error) {
        showError('Error generating general ledger: ' + error.message);
        console.error('GL Generation error:', error);
    }
}

// Initialize the ledger structure
function initializeLedgerStructure() {
    generalLedger = {};
    chartOfAccounts = {
        'Assets': {},
        'Liabilities': {},
        'Equity': {},
        'Revenue': {},
        'Expenses': {}
    };
}

// Post a journal entry to the general ledger
function postToGeneralLedger(entry) {
    const { Date, Trans_ID, Account, Debit, Credit, Description, Category } = entry;
    
    if (!generalLedger[Account]) {
        generalLedger[Account] = {
            transactions: [],
            totalDebits: 0,
            totalCredits: 0,
            balance: 0,
            category: Category || getAccountType(Account)
        };
        
        // Add to chart of accounts
        const accountCategory = Category || getAccountType(Account);
        if (!chartOfAccounts[accountCategory]) {
            chartOfAccounts[accountCategory] = {};
        }
        chartOfAccounts[accountCategory][Account] = 0;
    }
    
    // Create transaction record
    const transaction = {
        Date,
        Trans_ID,
        Description,
        Debit: Debit ? parseFloat(Debit) : 0,
        Credit: Credit ? parseFloat(Credit) : 0
    };
    
    // Add to account ledger
    generalLedger[Account].transactions.push(transaction);
    
    // Update totals
    generalLedger[Account].totalDebits += transaction.Debit;
    generalLedger[Account].totalCredits += transaction.Credit;
    
    // Calculate balance based on account type
    const accountType = generalLedger[Account].category;
    if (accountType === 'Asset' || accountType === 'Expense') {
        generalLedger[Account].balance = generalLedger[Account].totalDebits - generalLedger[Account].totalCredits;
    } else {
        generalLedger[Account].balance = generalLedger[Account].totalCredits - generalLedger[Account].totalDebits;
    }
    
    // Update chart of accounts balance
    chartOfAccounts[accountCategory][Account] = generalLedger[Account].balance;
}

// Calculate totals for the entire ledger
function calculateLedgerTotals() {
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    let totalRevenue = 0;
    let totalExpenses = 0;
    
    Object.keys(generalLedger).forEach(account => {
        const accountData = generalLedger[account];
        const balance = accountData.balance;
        const category = accountData.category;
        
        switch (category) {
            case 'Asset':
                totalAssets += balance;
                break;
            case 'Liability':
                totalLiabilities += balance;
                break;
            case 'Equity':
                totalEquity += balance;
                break;
            case 'Revenue':
                totalRevenue += balance;
                break;
            case 'Expense':
                totalExpenses += balance;
                break;
        }
    });
    
    // Net Income calculation
    const netIncome = totalRevenue - totalExpenses;
    
    return {
        totalAssets,
        totalLiabilities,
        totalEquity: totalEquity + netIncome, // Include net income in equity
        totalRevenue,
        totalExpenses,
        netIncome
    };
}

// Validate the accounting equation
function validateAccountingEquation() {
    const totals = calculateLedgerTotals();
    const assets = totals.totalAssets;
    const liabilities = totals.totalLiabilities;
    const equity = totals.totalEquity;
    
    const isBalanced = Math.abs(assets - (liabilities + equity)) < 0.01;
    
    return {
        isBalanced,
        assets,
        liabilities,
        equity,
        difference: Math.abs(assets - (liabilities + equity))
    };
}

// Display general ledger results
function showLedgerResults(equationBalance) {
    const accounts = Object.keys(generalLedger);
    const transactions = journalEntries.length;
    
    elements.resultsStats.innerHTML = `
        <div class="flex items-center justify-between py-2 border-b border-gray-200">
            <span class="text-gray-600">Total Accounts</span>
            <span class="font-medium">${accounts.length}</span>
        </div>
        <div class="flex items-center justify-between py-2 border-b border-gray-200">
            <span class="text-gray-600">Total Transactions</span>
            <span class="font-medium">${transactions}</span>
        </div>
        <div class="flex items-center justify-between py-2 border-b border-gray-200">
            <span class="text-gray-600">Total Assets</span>
            <span class="font-medium text-blue-600">$${equationBalance.assets.toFixed(2)}</span>
        </div>
        <div class="flex items-center justify-between py-2 border-b border-gray-200">
            <span class="text-gray-600">Total Liabilities</span>
            <span class="font-medium text-yellow-600">$${equationBalance.liabilities.toFixed(2)}</span>
        </div>
        <div class="flex items-center justify-between py-2">
            <span class="text-gray-600">Total Equity</span>
            <span class="font-medium text-purple-600">$${equationBalance.equity.toFixed(2)}</span>
        </div>
    `;
    
    elements.equationCheck.innerHTML = `
        <div class="text-center p-4 ${equationBalance.isBalanced ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'} rounded-lg">
            <div class="font-medium mb-2">Accounting Equation Check</div>
            <div class="text-sm">Assets ($${equationBalance.assets.toFixed(2)}) = Liabilities ($${equationBalance.liabilities.toFixed(2)}) + Equity ($${equationBalance.equity.toFixed(2)})</div>
            <div class="font-bold mt-2">${equationBalance.isBalanced ? '✅ BALANCED' : '❌ NOT BALANCED'}</div>
            ${!equationBalance.isBalanced ? `<div class="text-xs mt-1">Difference: $${equationBalance.difference.toFixed(2)}</div>` : ''}
        </div>
    `;
    
    elements.resultsDiv.classList.remove('hidden');
    elements.ledgerInterface.classList.remove('hidden');
    elements.previewDiv.classList.remove('hidden');
    elements.emptyState.style.display = 'none';
}

// Display the general ledger
function displayGeneralLedger() {
    if (!elements.ledgerBody) return;
    
    elements.ledgerBody.innerHTML = '';
    
    Object.keys(generalLedger).sort().forEach(account => {
        const accountData = generalLedger[account];
        
        // Account header
        const headerRow = document.createElement('tr');
        headerRow.className = 'bg-gray-50 font-medium';
        headerRow.innerHTML = `
            <td colspan="6" class="px-4 py-3 text-gray-700">
                ${account} <span class="text-xs font-normal ml-2 ${getCategoryColor(accountData.category)}">${accountData.category}</span>
            </td>
        `;
        elements.ledgerBody.appendChild(headerRow);
        
        // Column headers
        const columnHeaderRow = document.createElement('tr');
        columnHeaderRow.className = 'bg-gray-100 text-xs text-gray-600';
        columnHeaderRow.innerHTML = `
            <th class="px-4 py-2 text-left">Date</th>
            <th class="px-4 py-2 text-left">Trans ID</th>
            <th class="px-4 py-2 text-left">Description</th>
            <th class="px-4 py-2 text-right">Debit</th>
            <th class="px-4 py-2 text-right">Credit</th>
            <th class="px-4 py-2 text-right">Balance</th>
        `;
        elements.ledgerBody.appendChild(columnHeaderRow);
        
        // Transactions
        accountData.transactions.forEach(transaction => {
            const transactionRow = document.createElement('tr');
            transactionRow.className = 'border-b border-gray-200 hover:bg-gray-50';
            transactionRow.innerHTML = `
                <td class="px-4 py-2 text-sm text-gray-600">${transaction.Date}</td>
                <td class="px-4 py-2 text-sm text-gray-500">${transaction.Trans_ID}</td>
                <td class="px-4 py-2 text-sm text-gray-600">${transaction.Description}</td>
                <td class="px-4 py-2 text-sm text-right ${transaction.Debit > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}">
                    ${transaction.Debit > 0 ? '$' + transaction.Debit.toFixed(2) : ''}
                </td>
                <td class="px-4 py-2 text-sm text-right ${transaction.Credit > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}">
                    ${transaction.Credit > 0 ? '$' + transaction.Credit.toFixed(2) : ''}
                </td>
                <td class="px-4 py-2 text-sm text-right font-medium">
                    $${accountData.balance.toFixed(2)}
                </td>
            `;
            elements.ledgerBody.appendChild(transactionRow);
        });
        
        // Account summary
        const summaryRow = document.createElement('tr');
        summaryRow.className = 'bg-blue-50 font-medium';
        summaryRow.innerHTML = `
            <td colspan="3" class="px-4 py-2 text-right text-gray-700">Account Total:</td>
            <td class="px-4 py-2 text-right text-red-600">$${accountData.totalDebits.toFixed(2)}</td>
            <td class="px-4 py-2 text-right text-green-600">$${accountData.totalCredits.toFixed(2)}</td>
            <td class="px-4 py-2 text-right text-blue-600">$${accountData.balance.toFixed(2)}</td>
        `;
        elements.ledgerBody.appendChild(summaryRow);
        
        // Spacer row
        const spacerRow = document.createElement('tr');
        spacerRow.innerHTML = '<td colspan="6" class="py-2"></td>';
        elements.ledgerBody.appendChild(spacerRow);
    });
}

// Display chart of accounts
function displayChartOfAccounts() {
    if (!elements.accountsList) return;
    
    elements.accountsList.innerHTML = '';
    
    Object.keys(chartOfAccounts).forEach(category => {
        const accounts = chartOfAccounts[category];
        if (Object.keys(accounts).length === 0) return;
        
        const categorySection = document.createElement('div');
        categorySection.className = 'mb-6';
        categorySection.innerHTML = `
            <h4 class="font-medium text-gray-800 mb-3 ${getCategoryColor(category).replace('bg-', 'text-').replace('text-', '')}">${category}</h4>
            <div class="space-y-2">
                ${Object.keys(accounts).map(account => `
                    <div class="flex justify-between items-center py-2 px-3 bg-white border border-gray-200 rounded">
                        <span class="text-sm text-gray-700">${account}</span>
                        <span class="text-sm font-medium ${accounts[account] >= 0 ? 'text-green-600' : 'text-red-600'}">
                            $${Math.abs(accounts[account]).toFixed(2)}
                        </span>
                    </div>
                `).join('')}
            </div>
        `;
        elements.accountsList.appendChild(categorySection);
    });
}

// Download general ledger as CSV
function downloadGeneralLedger() {
    try {
        const glData = convertLedgerToCSV();
        const csv = Papa.unparse(glData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.setAttribute('href', url);
        link.setAttribute('download', `general_ledger_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
    } catch (error) {
        showError('Error downloading general ledger: ' + error.message);
        console.error('Download error:', error);
    }
}

// Convert ledger to CSV format for Google Sheets
function convertLedgerToCSV() {
    const csvData = [];
    
    // Add header
    csvData.push(['Account', 'Category', 'Total Debits', 'Total Credits', 'Balance', 'Transaction Count']);
    
    // Add account summaries
    Object.keys(generalLedger).forEach(account => {
        const accountData = generalLedger[account];
        csvData.push([
            account,
            accountData.category,
            accountData.totalDebits.toFixed(2),
            accountData.totalCredits.toFixed(2),
            accountData.balance.toFixed(2),
            accountData.transactions.length
        ]);
    });
    
    // Add accounting equation validation
    const equation = validateAccountingEquation();
    csvData.push([]);
    csvData.push(['ACCOUNTING EQUATION VALIDATION']);
    csvData.push(['Assets', `$${equation.assets.toFixed(2)}`]);
    csvData.push(['Liabilities', `$${equation.liabilities.toFixed(2)}`]);
    csvData.push(['Equity', `$${equation.equity.toFixed(2)}`]);
    csvData.push(['Status', equation.isBalanced ? 'BALANCED' : 'NOT BALANCED']);
    
    return csvData;
}

// Enable generation buttons
function enableGeneration() {
    elements.generateBtn.disabled = false;
    elements.resetBtn.disabled = false;
    elements.emptyState.style.display = 'none';
}

// Reset the GL tool
function resetGLTool() {
    journalEntries = [];
    generalLedger = {};
    chartOfAccounts = {};
    elements.fileInput.value = '';
    elements.fileInfo.classList.add('hidden');
    elements.resultsDiv.classList.add('hidden');
    elements.ledgerInterface.classList.add('hidden');
    elements.previewDiv.classList.add('hidden');
    elements.downloadBtn.disabled = true;
    elements.emptyState.style.display = 'block';
}

// Show error messages
function showError(message) {
    alert('General Ledger Error: ' + message);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the general ledger tool page
    if (document.getElementById('gl-interface')) {
        initGeneralLedgerTool();
    }
});
