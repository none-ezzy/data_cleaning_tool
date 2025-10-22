// Journal Entry Tool - Main Application Logic
// Integrates with accounting-rules.js for debit/credit determination

// Global variables
let originalData = [];
let categorizedTransactions = [];

// DOM elements cache
const elements = {
    // Upload and control elements
    uploadArea: document.getElementById('upload-area'),
    fileInput: document.getElementById('file-input'),
    analyzeBtn: document.getElementById('analyze-btn'),
    resetBtn: document.getElementById('reset-btn'),
    exportBtn: document.getElementById('export-btn'),
    fileInfo: document.getElementById('file-info'),
    fileDetails: document.getElementById('file-details'),
    
    // Results and display elements
    resultsDiv: document.getElementById('results'),
    resultsStats: document.getElementById('results-stats'),
    rulesInfo: document.getElementById('rules-info'),
    journalInterface: document.getElementById('journal-interface'),
    previewDiv: document.getElementById('preview'),
    emptyState: document.getElementById('empty-state'),
    
    // Transaction list elements
    transactionsList: document.getElementById('transactions-list'),
    transactionCount: document.getElementById('transaction-count'),
    
    // Journal preview elements
    journalBody: document.getElementById('journal-body'),
    previewFooter: document.getElementById('preview-footer'),
    entriesCount: document.getElementById('entries-count'),
    balanceCheck: document.getElementById('balance-check'),
    
    // Filter controls
    filterType: document.getElementById('filter-type'),
    sortBy: document.getElementById('sort-by')
};

// Initialize the journal entry tool
function initJournalEntryTool() {
    setupEventListeners();
    console.log('Journal Entry Tool initialized');
}

// Set up all event listeners
function setupEventListeners() {
    // Upload area events
    elements.uploadArea.addEventListener('click', () => elements.fileInput.click());
    elements.uploadArea.addEventListener('dragover', handleDragOver);
    elements.uploadArea.addEventListener('dragleave', handleDragLeave);
    elements.uploadArea.addEventListener('drop', handleDrop);
    
    // File input event
    elements.fileInput.addEventListener('change', handleFileSelect);
    
    // Button events
    elements.analyzeBtn.addEventListener('click', analyzeTransactions);
    elements.resetBtn.addEventListener('click', resetTool);
    elements.exportBtn.addEventListener('click', exportJournalEntries);
    
    // Filter events
    elements.filterType.addEventListener('change', filterTransactions);
    elements.sortBy.addEventListener('change', filterTransactions);
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

    // Update file info display
    elements.fileDetails.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    elements.fileInfo.classList.remove('hidden');

    // Parse CSV file
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            if (results.errors.length > 0) {
                showError('Error reading file: ' + results.errors[0].message);
                return;
            }
            
            if (results.data.length === 0) {
                showError('No data found in the CSV file.');
                return;
            }
            
            originalData = results.data;
            enableAnalysis();
        },
        error: function(error) {
            showError('Error reading file. Please check the file format.');
            console.error('Error:', error);
        }
    });
}

// Analyze transactions and suggest categories
function analyzeTransactions() {
    if (originalData.length === 0) {
        showError('No data to analyze. Please upload a CSV file first.');
        return;
    }
    
    try {
        let stats = {
            total: originalData.length,
            uncategorized: 0,
            revenue: 0,
            expense: 0,
            asset: 0,
            liability: 0,
            equity: 0
        };
        
        categorizedTransactions = originalData.map((transaction, index) => {
            const amount = parseFloat(transaction.Amount) || 0;
            const account = transaction.Account || '';
            const description = transaction.Description || '';
            const vendor = transaction.Vendor_Customer || '';
            
            // Use accounting engine to determine category and debit/credit
            const suggestedCategory = getAccountType(account);
            const debitCredit = determineDebitCredit(suggestedCategory, amount);
            
            // Generate intelligent journal note
            const journalNote = generateJournalNote(transaction, suggestedCategory, amount);
            
            // Update statistics
            if (!suggestedCategory) stats.uncategorized++;
            else stats[suggestedCategory.toLowerCase()]++;
            
            return {
                ...transaction,
                Index: index,
                Amount: amount,
                SuggestedCategory: suggestedCategory,
                FinalCategory: suggestedCategory,
                AccountType: suggestedCategory,
                DebitCredit: debitCredit,
                JournalNote: journalNote,
                IsCategorized: !!suggestedCategory
            };
        });
        
        showAnalysisResults(stats);
        displayTransactions();
        elements.exportBtn.disabled = false;
        elements.rulesInfo.classList.remove('hidden');
        
    } catch (error) {
        showError('Error analyzing transactions: ' + error.message);
        console.error('Analysis error:', error);
    }
}

// Generate intelligent journal notes based on transaction data
function generateJournalNote(transaction, category, amount) {
    const account = transaction.Account || '';
    const description = transaction.Description || '';
    const vendor = transaction.Vendor_Customer || '';
    const isNegative = amount < 0;
    
    // Base note on category and amount
    switch (category) {
        case 'Revenue':
            return isNegative ? 'Revenue adjustment' : `Revenue from ${description.toLowerCase()}`;
        case 'Expense':
            return isNegative ? `Payment for ${description.toLowerCase()}` : 'Expense refund';
        case 'Asset':
            return isNegative ? `Purchase of ${description.toLowerCase()}` : `Sale of ${description.toLowerCase()}`;
        case 'Liability':
            return isNegative ? 'Loan payment' : 'Loan received';
        case 'Equity':
            return isNegative ? 'Owner withdrawal' : 'Owner investment';
        default:
            return description || 'Transaction entry';
    }
}

// Display transactions in the UI
function displayTransactions() {
    if (!categorizedTransactions.length) return;
    
    elements.transactionsList.innerHTML = '';
    
    const filteredTransactions = filterAndSortTransactions(categorizedTransactions);
    
    filteredTransactions.forEach((transaction) => {
        const transactionEl = createTransactionElement(transaction);
        elements.transactionsList.appendChild(transactionEl);
    });
    
    elements.transactionCount.textContent = `Showing ${filteredTransactions.length} of ${categorizedTransactions.length} transactions`;
    updateJournalPreview();
}

// Create individual transaction element
function createTransactionElement(transaction) {
    const transactionEl = document.createElement('div');
    const amountColor = transaction.Amount < 0 ? 'text-red-600' : 'text-green-600';
    const amountSign = transaction.Amount < 0 ? '-' : '+';
    const isCategorized = transaction.IsCategorized;
    
    transactionEl.className = `transaction-row p-4 ${isCategorized ? 'categorized' : 'uncategorized'} ${transaction.DebitCredit === 'debit' ? 'debit' : transaction.DebitCredit === 'credit' ? 'credit' : ''}`;
    transactionEl.innerHTML = `
        <div class="flex flex-wrap items-center gap-4">
            <div class="flex-1 min-w-64">
                <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-medium text-gray-900">${transaction.Date || 'No date'}</span>
                    <span class="text-xs px-2 py-1 rounded ${amountColor} bg-gray-100">
                        ${amountSign}$${Math.abs(transaction.Amount).toFixed(2)}
                    </span>
                    ${transaction.DebitCredit ? `
                        <span class="text-xs px-2 py-1 rounded ${transaction.DebitCredit === 'debit' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
                            ${transaction.DebitCredit.toUpperCase()}
                        </span>
                    ` : ''}
                    ${transaction.FinalCategory ? `
                        <span class="text-xs px-2 py-1 rounded ${getCategoryColor(transaction.FinalCategory)}">
                            ${transaction.FinalCategory}
                        </span>
                    ` : ''}
                </div>
                <div class="text-sm text-gray-600 mt-1">${transaction.Description || 'No description'}</div>
                <div class="text-xs text-gray-500 mt-1">${transaction.Vendor_Customer || 'No vendor'} • ${transaction.Account || 'No account'}</div>
            </div>
            
            <div class="flex-1 min-w-48">
                <select class="category-select border border-gray-300 rounded px-3 py-1 text-sm w-full" data-index="${transaction.Index}">
                    <option value="">-- Select Category --</option>
                    <option value="Asset" ${transaction.FinalCategory === 'Asset' ? 'selected' : ''}>Asset</option>
                    <option value="Liability" ${transaction.FinalCategory === 'Liability' ? 'selected' : ''}>Liability</option>
                    <option value="Equity" ${transaction.FinalCategory === 'Equity' ? 'selected' : ''}>Equity</option>
                    <option value="Revenue" ${transaction.FinalCategory === 'Revenue' ? 'selected' : ''}>Revenue</option>
                    <option value="Expense" ${transaction.FinalCategory === 'Expense' ? 'selected' : ''}>Expense</option>
                </select>
                ${transaction.DebitCredit ? `
                    <div class="text-xs mt-1 ${transaction.DebitCredit === 'debit' ? 'text-red-600' : 'text-green-600'}">
                        Auto-detected: ${transaction.DebitCredit}
                    </div>
                ` : ''}
            </div>
            
            <div class="flex-1 min-w-64">
                <input type="text" class="journal-note border border-gray-300 rounded px-3 py-1 text-sm w-full" 
                       placeholder="Journal entry note..." value="${transaction.JournalNote || ''}" data-index="${transaction.Index}">
            </div>
        </div>
    `;
    
    // Add event listeners to dynamic elements
    const select = transactionEl.querySelector('.category-select');
    const input = transactionEl.querySelector('.journal-note');
    
    select.addEventListener('change', (e) => updateTransactionCategory(e, transactionEl));
    input.addEventListener('input', (e) => updateTransactionNote(e));
    
    return transactionEl;
}

// Update transaction category
function updateTransactionCategory(e, transactionEl) {
    const index = parseInt(e.target.dataset.index);
    const category = e.target.value;
    const transaction = categorizedTransactions[index];
    
    if (!transaction) return;
    
    // Update transaction data
    transaction.FinalCategory = category;
    transaction.AccountType = category;
    transaction.IsCategorized = !!category;
    
    // Recalculate debit/credit based on new category
    if (category) {
        transaction.DebitCredit = determineDebitCredit(category, transaction.Amount);
    } else {
        transaction.DebitCredit = '';
    }
    
    // Update UI appearance
    updateTransactionAppearance(transactionEl, transaction);
    updateJournalPreview();
}

// Update transaction journal note
function updateTransactionNote(e) {
    const index = parseInt(e.target.dataset.index);
    const transaction = categorizedTransactions[index];
    
    if (transaction) {
        transaction.JournalNote = e.target.value;
        updateJournalPreview();
    }
}

// Update transaction UI appearance
function updateTransactionAppearance(transactionEl, transaction) {
    // Update categorization styling
    transactionEl.classList.remove('uncategorized', 'categorized');
    transactionEl.classList.add(transaction.IsCategorized ? 'categorized' : 'uncategorized');
    
    // Update debit/credit styling
    transactionEl.classList.remove('debit', 'credit');
    if (transaction.DebitCredit === 'debit') {
        transactionEl.classList.add('debit');
    } else if (transaction.DebitCredit === 'credit') {
        transactionEl.classList.add('credit');
    }
    
    // Update the debit/credit display
    const debitCreditDisplay = transactionEl.querySelector('.text-xs');
    if (debitCreditDisplay && transaction.DebitCredit) {
        debitCreditDisplay.textContent = `Auto-detected: ${transaction.DebitCredit}`;
        debitCreditDisplay.className = `text-xs mt-1 ${transaction.DebitCredit === 'debit' ? 'text-red-600' : 'text-green-600'}`;
    }
}

// Filter and sort transactions
function filterAndSortTransactions(transactions) {
    let filtered = [...transactions];
    const filterType = elements.filterType.value;
    const sortBy = elements.sortBy.value;
    
    // Apply filter
    if (filterType === 'uncategorized') {
        filtered = filtered.filter(t => !t.IsCategorized);
    } else if (filterType === 'categorized') {
        filtered = filtered.filter(t => t.IsCategorized);
    } else if (filterType !== 'all') {
        filtered = filtered.filter(t => t.FinalCategory === filterType);
    }
    
    // Apply sort
    filtered.sort((a, b) => {
        switch (sortBy) {
            case 'date':
                return new Date(a.Date || 0) - new Date(b.Date || 0);
            case 'amount':
                return Math.abs(b.Amount) - Math.abs(a.Amount);
            case 'account':
                return (a.Account || '').localeCompare(b.Account || '');
            case 'vendor':
                return (a.Vendor_Customer || '').localeCompare(b.Vendor_Customer || '');
            default:
                return 0;
        }
    });
    
    return filtered;
}

// Update journal preview
function updateJournalPreview() {
    if (!elements.journalBody) return;
    
    elements.journalBody.innerHTML = '';
    
    const journalEntries = generateDoubleEntryJournal(categorizedTransactions.filter(t => t.IsCategorized));
    const balanceCheck = validateJournalBalance(journalEntries);
    
    journalEntries.forEach(entry => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-gray-100 hover:bg-gray-50';
        
        tr.innerHTML = `
            <td class="px-4 py-3 text-gray-600 text-sm">${entry.Date || ''}</td>
            <td class="px-4 py-3 text-gray-600 text-sm font-medium">${entry.Account}</td>
            <td class="px-4 py-3 text-sm ${entry.Debit ? 'bg-red-50 text-red-700 font-medium' : 'text-gray-500'}">
                ${entry.Debit ? '$' + entry.Debit.toFixed(2) : ''}
            </td>
            <td class="px-4 py-3 text-sm ${entry.Credit ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-500'}">
                ${entry.Credit ? '$' + entry.Credit.toFixed(2) : ''}
            </td>
            <td class="px-4 py-3 text-gray-600 text-sm">${entry.Description}</td>
            <td class="px-4 py-3 text-gray-600 text-sm">
                <span class="px-2 py-1 rounded text-xs ${getCategoryColor(entry.Category)}">${entry.Category}</span>
            </td>
        `;
        
        elements.journalBody.appendChild(tr);
    });
    
    elements.entriesCount.textContent = `Generated ${journalEntries.length} journal entries`;
    elements.balanceCheck.textContent = `Debits: $${balanceCheck.totalDebits.toFixed(2)} | Credits: $${balanceCheck.totalCredits.toFixed(2)} | ${balanceCheck.isBalanced ? '✅ Balanced' : '❌ Not Balanced'}`;
    elements.balanceCheck.className = `font-medium ${balanceCheck.isBalanced ? 'text-green-600' : 'text-red-600'}`;
}

// Show analysis results
function showAnalysisResults(stats) {
    if (!elements.resultsStats) return;
    
    elements.resultsStats.innerHTML = `
        <div class="flex items-center justify-between py-2 border-b border-gray-200">
            <span class="text-gray-600">Total Transactions</span>
            <span class="font-medium">${stats.total}</span>
        </div>
        <div class="flex items-center justify-between py-2 border-b border-gray-200">
            <span class="text-gray-600">Revenue</span>
            <span class="font-medium text-green-600">${stats.revenue}</span>
        </div>
        <div class="flex items-center justify-between py-2 border-b border-gray-200">
            <span class="text-gray-600">Expenses</span>
            <span class="font-medium text-red-600">${stats.expense}</span>
        </div>
        <div class="flex items-center justify-between py-2 border-b border-gray-200">
            <span class="text-gray-600">Assets</span>
            <span class="font-medium text-blue-600">${stats.asset}</span>
        </div>
        <div class="flex items-center justify-between py-2">
            <span class="text-gray-600">Needs Categorization</span>
            <span class="font-medium text-orange-600">${stats.uncategorized}</span>
        </div>
    `;
    
    elements.resultsDiv.classList.remove('hidden');
    elements.journalInterface.classList.remove('hidden');
    elements.previewDiv.classList.remove('hidden');
    elements.emptyState.style.display = 'none';
}

// Enable analysis buttons
function enableAnalysis() {
    elements.analyzeBtn.disabled = false;
    elements.resetBtn.disabled = false;
    elements.emptyState.style.display = 'none';
}

// Reset the tool
function resetTool() {
    originalData = [];
    categorizedTransactions = [];
    elements.fileInput.value = '';
    elements.fileInfo.classList.add('hidden');
    elements.resultsDiv.classList.add('hidden');
    elements.journalInterface.classList.add('hidden');
    elements.previewDiv.classList.add('hidden');
    elements.rulesInfo.classList.add('hidden');
    elements.exportBtn.disabled = true;
    elements.emptyState.style.display = 'block';
    
    // Reset file input
    elements.fileInput.value = '';
}

// Export journal entries to CSV
function exportJournalEntries() {
    try {
        const journalEntries = generateDoubleEntryJournal(categorizedTransactions.filter(t => t.IsCategorized));
        
        if (journalEntries.length === 0) {
            showError('No journal entries to export. Please categorize some transactions first.');
            return;
        }
        
        const csv = Papa.unparse(journalEntries);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.setAttribute('href', url);
        link.setAttribute('download', `journal_entries_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up URL
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
    } catch (error) {
        showError('Error exporting journal entries: ' + error.message);
        console.error('Export error:', error);
    }
}

// Show error messages
function showError(message) {
    alert('Error: ' + message);
}

// Filter transactions when filter changes
function filterTransactions() {
    displayTransactions();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the journal entry tool page
    if (document.getElementById('journal-interface')) {
        initJournalEntryTool();
    }
});
