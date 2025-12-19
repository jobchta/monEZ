const REGEX_TOTAL = /\btotal[\s$:]+([\d,]+\.?\d*)/i;
const REGEX_AMOUNT = /(amount|due)[\s$:]+([\d,]+\.?\d*)/i;

function testReceipt(text) {
    console.log(`\nInput: "${text.replace(/\n/g, ' ')}"`);
    const lowerText = text.toLowerCase();

    // Strategy 1: Total Keyword
    let match = lowerText.match(REGEX_TOTAL);
    if (match) {
        console.log(`✅ Strategy 1 (Total): Found ${match[1]}`);
        return;
    }

    // Strategy 2: Amount Keyword
    match = lowerText.match(REGEX_AMOUNT);
    if (match) {
        console.log(`✅ Strategy 2 (Amount): Found ${match[2]}`);
        return;
    }

    // Strategy 3: Heuristic Max (Decimals)
    const decimals = text.match(/[\d,]+\.\d{2}/g);
    if (decimals) {
        const max = Math.max(...decimals.map(n => parseFloat(n.replace(/,/g, ''))));
        console.log(`✅ Strategy 3 (Max Decimal): Found ${max}`);
        return;
    }

    console.log("❌ Failed to find total.");
}

console.log("--- STARTING ACCURACY VERIFICATION ---");

// Test Case 1: Standard Receipt
testReceipt("Walmart Supercenter\nMilk $3.00\nBread $2.50\nTotal $123.45\nThank you");

// Test Case 2: Tricky Order Number
testReceipt("Order #5555\nBurger $12.50\nFries $4.00");

// Test Case 3: No Decimals
testReceipt("Taxi Ride\nFARE 500\nTIP 50");

// Test Case 4: Text Mixed
testReceipt("Lunch at Subway total is 12.99 thanks");

console.log("\n--- STRESS TESTING (Simulating Bad OCR) ---");

// Test 5: Dots and Spacing
testReceipt("Grand Total . . . . . $ 45.50");

// Test 6: Noise characters
testReceipt("Total: ~~~ 99.99 ~~~");

// Test 7: Multiple potential matches
testReceipt("Subtotal 10.00 Tax 1.00 Total 11.00");

// Test 8: No 'Total' keyword, messy numbers
testReceipt("Walmart 06/12/2024\nItem 5.00\nItem 5.00\n* 10.00 *");

console.log("\n--- VERIFICATION COMPLETE ---");
