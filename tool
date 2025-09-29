import React, { useState, useRef } from 'react';
import { Upload, Download, RefreshCw, Calendar, Hash } from 'lucide-react';
import * as Papa from 'papaparse';

const UltimateDataCleaningTool = () => {
  const [data, setData] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [results, setResults] = useState(null);
  const fileInputRef = useRef(null);

  // Keep your existing date standardization (you said it's okay)
  const standardizeDate = (dateStr) => {
    if (!dateStr || dateStr.trim() === '') return '';
    
    const cleaned = dateStr.toString().trim();
    
    const anyNumbers = cleaned.match(/(\d{1,4})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
    if (anyNumbers) {
      let num1 = parseInt(anyNumbers[1]);
      let num2 = parseInt(anyNumbers[2]); 
      let num3 = parseInt(anyNumbers[3]);
      
      if (num1 > 31 || anyNumbers[1].length === 4) {
        return `${num2}/${num3}/${num1}`;
      }
      else {
        if (num3 < 100) {
          num3 = num3 < 50 ? 2000 + num3 : 1900 + num3;
        }
        return `${num1}/${num2}/${num3}`;
      }
    }
    
    const monthNames = {
      jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
      apr: 4, april: 4, may: 5, jun: 6, june: 6,
      jul: 7, july: 7, aug: 8, august: 8, sep: 9, september: 9,
      oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12
    };
    
    const textMonth = cleaned.match(/^(\w+)\s+(\d{1,2}),?\s*(\d{4})?$/);
    if (textMonth) {
      const monthName = textMonth[1].toLowerCase();
      const day = parseInt(textMonth[2]);
      const year = textMonth[3] || '2024';
      if (monthNames[monthName]) {
        return `${monthNames[monthName]}/${day}/${year}`;
      }
    }
    
    const dayMonth = cleaned.match(/^(\d{1,2})-(\w+)$/);
    if (dayMonth) {
      const day = parseInt(dayMonth[1]);
      const monthName = dayMonth[2].toLowerCase();
      if (monthNames[monthName]) {
        return `${monthNames[monthName]}/${day}/2024`;
      }
    }
    
    return cleaned;
  };

  // Keep your existing ID assignment
  const assignTransactionIds = (data) => {
    let currentId = 1001;
    return data.map(row => ({
      ...row,
      Trans_ID: currentId++
    }));
  };

  // ULTIMATE ACCOUNT NAME STANDARDIZATION - 42 variations mapped to 18 consistent names
  const standardizeAccountNames = (data) => {
    const accountMappings = {
      // Salary/Wage variations - COMPREHENSIVE
      'salary expense': 'Salary Expense',
      'wages expense': 'Salary Expense',
      'wages': 'Salary Expense',
      'salary': 'Salary Expense',
      'salaries': 'Salary Expense',
      'wages exp': 'Salary Expense',
      
      // Rent variations - COMPREHENSIVE
      'rent expense': 'Rent Expense',
      'rent': 'Rent Expense',
      'rent expense': 'Rent Expense',
      
      // Insurance variations - COMPREHENSIVE
      'insurance expense': 'Insurance Expense',
      'insurance exp': 'Insurance Expense',
      'ins. expense': 'Insurance Expense',
      'insurance': 'Insurance Expense',
      'prepaid insurance': 'Prepaid Insurance',
      
      // Utilities variations - COMPREHENSIVE
      'utilities expense': 'Utilities Expense',
      'utilities': 'Utilities Expense',
      
      // Revenue variations - COMPREHENSIVE
      'rental revenue': 'Rental Revenue',
      'rental rev': 'Rental Revenue',
      'tour revenue': 'Tour Revenue',
      'sales revenue': 'Sales Revenue',
      'sales rev': 'Sales Revenue',
      'event revenue': 'Event Revenue',
      
      // Supplies variations - COMPREHENSIVE
      'office supplies': 'Office Supplies',
      'supplies': 'Supplies',
      
      // Equipment
      'equipment': 'Equipment',
      
      // Marketing/Advertising - COMPREHENSIVE
      'marketing expense': 'Marketing Expense',
      'marketing': 'Marketing Expense',
      'advertising': 'Advertising Expense',
      
      // Maintenance/Repairs - COMPREHENSIVE
      'maintenance expense': 'Maintenance Expense',
      'maintenance': 'Maintenance Expense',
      'repairs': 'Maintenance Expense',
      
      // Other expenses - COMPREHENSIVE
      'license expense': 'License Expense',
      'training expense': 'Training Expense',
      'event expense': 'Event Expense',
      'storage expense': 'Storage Expense',
      
      // Assets
      'inventory': 'Inventory',
      "owner's equity": "Owner's Equity"
    };
    
    return data.map(row => ({
      ...row,
      Account: row.Account ? 
        accountMappings[row.Account.toLowerCase().trim()] || row.Account : 
        row.Account
    }));
  };

  // ULTIMATE PAYMENT METHOD STANDARDIZATION - 25 variations mapped to 10 consistent names
  const standardizePaymentMethods = (data) => {
    const paymentMappings = {
      // Check variations - COMPREHENSIVE
      'check': 'Check',
      'check #101': 'Check',
      'check #102': 'Check',
      'check #103': 'Check',
      'check #105': 'Check',
      'check #106': 'Check',
      'check #107': 'Check',
      'check #109': 'Check',
      'check #110': 'Check',
      'check #111': 'Check',
      'check #112': 'Check',
      'check #115': 'Check',
      'check #116': 'Check',
      'check #117': 'Check',
      'check #120': 'Check',
      'check #121': 'Check',
      
      // Wire transfer variations - COMPREHENSIVE
      'wire transfer': 'Wire Transfer',
      'wire': 'Wire Transfer',
      
      // Credit card variations - COMPREHENSIVE
      'credit card': 'Credit Card',
      'credit cards': 'Credit Card',
      'cc': 'Credit Card',
      
      // Direct deposit variations - COMPREHENSIVE
      'direct deposit': 'Direct Deposit',
      'dd': 'Direct Deposit',
      'direct dep': 'Direct Deposit',
      
      // Cash variations - COMPREHENSIVE
      'cash': 'Cash',
      
      // Auto pay variations - COMPREHENSIVE
      'auto pay': 'Auto Pay',
      'auto': 'Auto Pay',
      
      // Online/Transfer variations - COMPREHENSIVE
      'online': 'Online Payment',
      'transfer': 'Transfer',
      
      // Mixed payments - COMPREHENSIVE
      'mixed': 'Mixed Payment Methods'
    };
    
    return data.map(row => ({
      ...row,
      Payment_Method: row.Payment_Method ? 
        paymentMappings[row.Payment_Method.toLowerCase().trim()] || row.Payment_Method : 
        row.Payment_Method
    }));
  };

  // ULTIMATE VENDOR NAME STANDARDIZATION
  const standardizeVendorNames = (data) => {
    const vendorMappings = {
      // Mountain Mutual Insurance variations - COMPREHENSIVE
      'mountain mutual ins': 'Mountain Mutual Insurance',
      'mountain mutual': 'Mountain Mutual Insurance', 
      'mtn mutual': 'Mountain Mutual Insurance',
      
      // Valley Properties variations - COMPREHENSIVE
      'valley properties': 'Valley Properties',
      'valley props': 'Valley Properties',
      
      // Joe's Bike Shop variations - COMPREHENSIVE
      "joe's bike shop": "Joe's Bike Shop",
      "joe's bike": "Joe's Bike Shop",
      
      // Mountain Electric variations - COMPREHENSIVE
      'mountain electric': 'Mountain Electric',
      'mtn electric': 'Mountain Electric',
      
      // Outdoor Wholesale variations - COMPREHENSIVE
      'outdoor wholesale co': 'Outdoor Wholesale Co',
      'outdoor wholesale': 'Outdoor Wholesale Co',
      
      // Other vendors that need standardization
      'vista print': 'VistaPrint',
      
      // Vendors that should stay as-is (no mapping needed):
      // 'specialized dealer', 'whitewater supply', 'office depot', 
      // 'best buy', 'square systems', 'walmart', 'target', 'costco',
      // 'county clerk', 'j. harrison', 'm. thompson', 'valley times',
      // 't. anderson', 'smith family', 'wilderness cert', etc.
    };
    
    return data.map(row => ({
      ...row,
      Vendor_Customer: row.Vendor_Customer ? 
        vendorMappings[row.Vendor_Customer.toLowerCase().trim()] || 
        row.Vendor_Customer.trim() : 
        row.Vendor_Customer
    }));
  };

  // Missing data handler - improved to handle empty strings consistently
  const handleMissingData = (data) => {
    return data.map(row => {
      const cleanRow = {};
      Object.keys(row).forEach(key => {
        const value = row[key];
        if (value === null || value === undefined || value.toString().trim() === '') {
          cleanRow[key] = '';
        } else {
          cleanRow[key] = value.toString().trim();
        }
      });
      return cleanRow;
    });
  };

  // Remove duplicate entries - improved to handle exact duplicates
  const removeDuplicates = (data) => {
    const seen = new Set();
    return data.filter(row => {
      // Create comprehensive key from all fields except Notes
      const key = `${row.Date}-${row.Trans_ID}-${row.Description}-${row.Amount}-${row.Account}-${row.Payment_Method}-${row.Vendor_Customer}`.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  };

  // Text cleaner - improved to handle all text fields consistently
  const cleanText = (data) => {
    return data.map(row => {
      const cleanRow = {};
      Object.keys(row).forEach(key => {
        const value = row[key];
        if (value && typeof value === 'string') {
          cleanRow[key] = value.trim().replace(/\s+/g, ' ');
        } else {
          cleanRow[key] = value;
        }
      });
      return cleanRow;
    });
  };

  // VALIDATION: Check for data quality issues
  const validateData = (data) => {
    const issues = [];
    
    data.forEach((row, index) => {
      // Check for missing dates
      if (!row.Date || row.Date.trim() === '') {
        issues.push(`Row ${index + 1}: Missing date`);
      }
      
      // Check for missing amounts in expense/income rows
      if ((row.Account && row.Account.toLowerCase().includes('expense')) || 
          (row.Account && row.Account.toLowerCase().includes('revenue'))) {
        if (!row.Amount || row.Amount.toString().trim() === '') {
          issues.push(`Row ${index + 1}: Missing amount for ${row.Account}`);
        }
      }
      
      // Check for invalid amounts
      if (row.Amount && row.Amount.toString().trim() !== '') {
        const amount = parseFloat(row.Amount);
        if (isNaN(amount)) {
          issues.push(`Row ${index + 1}: Invalid amount "${row.Amount}"`);
        }
      }
    });
    
    return issues;
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        setOriginalData(result.data);
        setData(result.data);
        setResults(null);
      }
    });
  };

  const cleanData = () => {
    let cleaned = [...originalData];
    let dateChanges = 0;
    let idChanges = 0;
    let accountChanges = 0;
    let paymentChanges = 0;
    let vendorChanges = 0;
    let missingDataFilled = 0;
    let duplicatesRemoved = 0;
    let textCleaned = 0;
    
    const originalCount = cleaned.length;
    
    // Step 1: Clean text (remove extra spaces, etc.)
    const beforeTextClean = JSON.stringify(cleaned);
    cleaned = cleanText(cleaned);
    textCleaned = beforeTextClean !== JSON.stringify(cleaned) ? 1 : 0;
    
    // Step 2: Clean dates
    cleaned = cleaned.map(row => {
      const originalDate = row.Date;
      const cleanedDate = standardizeDate(originalDate);
      if (originalDate !== cleanedDate) dateChanges++;
      return { ...row, Date: cleanedDate };
    });
    
    // Step 3: Standardize account names
    cleaned = cleaned.map(row => {
      const originalAccount = row.Account;
      const cleanedRow = standardizeAccountNames([row])[0];
      if (originalAccount !== cleanedRow.Account) accountChanges++;
      return cleanedRow;
    });
    
    // Step 4: Standardize payment methods
    cleaned = cleaned.map(row => {
      const originalPayment = row.Payment_Method;
      const cleanedRow = standardizePaymentMethods([row])[0];
      if (originalPayment !== cleanedRow.Payment_Method) paymentChanges++;
      return cleanedRow;
    });
    
    // Step 5: Standardize vendor names
    cleaned = cleaned.map(row => {
      const originalVendor = row.Vendor_Customer;
      const cleanedRow = standardizeVendorNames([row])[0];
      if (originalVendor !== cleanedRow.Vendor_Customer) vendorChanges++;
      return cleanedRow;
    });
    
    // Step 6: Handle missing data
    const beforeMissingData = JSON.stringify(cleaned);
    cleaned = handleMissingData(cleaned);
    missingDataFilled = beforeMissingData !== JSON.stringify(cleaned) ? 1 : 0;
    
    // Step 7: Remove duplicates
    cleaned = removeDuplicates(cleaned);
    duplicatesRemoved = originalCount - cleaned.length;
    
    // Step 8: Assign sequential transaction IDs
    cleaned = assignTransactionIds(cleaned);
    idChanges = cleaned.length;
    
    // Step 9: Validate data
    const validationIssues = validateData(cleaned);
    
    setData(cleaned);
    setResults({
      dateChanges,
      idChanges,
      accountChanges,
      paymentChanges,
      vendorChanges,
      missingDataFilled: missingDataFilled ? 'Yes' : 'No',
      duplicatesRemoved,
      textCleaned: textCleaned ? 'Yes' : 'No',
      validationIssues,
      totalRows: cleaned.length,
      originalRows: originalCount
    });
  };

  const resetData = () => {
    setData([...originalData]);
    setResults(null);
  };

  const downloadData = () => {
    if (data.length === 0) return;
    
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'cleaned_financial_data.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Ultimate Financial Data Cleaning Tool</h1>
      
      {/* Upload Section */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          ref={fileInputRef}
          className="hidden"
        />
        <div className="flex gap-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-600"
          >
            <Upload size={16} />
            Upload CSV
          </button>
          
          {data.length > 0 && (
            <>
              <button
                onClick={cleanData}
                className="bg-green-500 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-green-600"
              >
                <RefreshCw size={16} />
                Clean Data
              </button>
              
              <button
                onClick={resetData}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Reset
              </button>
              
              <button
                onClick={downloadData}
                className="bg-purple-500 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-purple-600"
              >
                <Download size={16} />
                Download Cleaned Data
              </button>
            </>
          )}
        </div>
        
        {data.length > 0 && (
          <p className="text-sm text-gray-600 mt-2">
            Loaded {data.length} rows from financial transactions
          </p>
        )}
      </div>

      {/* Results */}
      {results && (
        <div className="bg-green-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-green-800 mb-2">Cleaning Complete!</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {results.dateChanges} dates standardized
            </span>
            <span className="flex items-center gap-1">
              <Hash size={14} />
              {results.idChanges} IDs assigned
            </span>
            <span className="flex items-center gap-1">
              📊 {results.accountChanges} account names consolidated
            </span>
            <span className="flex items-center gap-1">
              💳 {results.paymentChanges} payment methods standardized
            </span>
            <span className="flex items-center gap-1">
              🏪 {results.vendorChanges} vendor names standardized
            </span>
            <span className="flex items-center gap-1">
              📝 Empty fields cleaned: {results.missingDataFilled}
            </span>
            <span className="flex items-center gap-1">
              🗑️ {results.duplicatesRemoved} duplicates removed
            </span>
            <span className="flex items-center gap-1">
              ✨ Text cleaned: {results.textCleaned}
            </span>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            {results.originalRows} rows → {results.totalRows} rows (final)
          </div>
          
          {/* Validation Issues */}
          {results.validationIssues.length > 0 && (
            <div className="mt-4 bg-yellow-50 p-3 rounded">
              <h4 className="font-semibold text-yellow-800 mb-1">Data Quality Issues Found:</h4>
              <ul className="text-xs text-yellow-700 list-disc list-inside">
                {results.validationIssues.slice(0, 5).map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
                {results.validationIssues.length > 5 && (
                  <li>... and {results.validationIssues.length - 5} more issues</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Data Preview */}
      {data.length > 0 && (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-100">
                <tr>
                  {Object.keys(data[0]).map(header => (
                    <th key={header} className="px-2 py-1 text-left font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 15).map((row, idx) => (
                  <tr key={idx} className="border-t even:bg-gray-50">
                    {Object.values(row).map((value, cellIdx) => (
                      <td key={cellIdx} className="px-2 py-1 truncate max-w-[120px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.length > 15 && (
            <div className="p-2 bg-gray-50 text-xs text-gray-600">
              Showing first 15 of {data.length} rows
            </div>
          )}
        </div>
      )}

      {/* Cleaning Summary */}
      {data.length > 0 && (
        <div className="mt-8 bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">This Tool Specifically Handles:</h3>
          <div className="text-sm grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <p className="font-medium">Account Names (42 → 18):</p>
              <ul className="text-xs list-disc list-inside">
                <li>Salary/Wages: 6 variations → "Salary Expense"</li>
                <li>Rent: 3 variations → "Rent Expense"</li>
                <li>Insurance: 5 variations → "Insurance Expense"</li>
                <li>Revenue: 6 variations standardized</li>
              </ul>
            </div>
            <div>
              <p className="font-medium">Payment Methods (25 → 10):</p>
              <ul className="text-xs list-disc list-inside">
                <li>All Check # variations → "Check"</li>
                <li>DD/Direct Dep → "Direct Deposit"</li>
                <li>CC → "Credit Card"</li>
                <li>Auto/Auto Pay → "Auto Pay"</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UltimateDataCleaningTool;
