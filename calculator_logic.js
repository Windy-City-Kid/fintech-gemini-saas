/**
 * Retire Without Permission - Core Logic Engine
 * Calculates the "Permission Date" based on savings velocity.
 */

function calculateRetirement(currentSavings, monthlyContribution, monthlyExpenses, annualReturn = 0.07) {
    const targetNetWorth = monthlyExpenses * 12 * 25; // The 4% Rule
    let months = 0;
    let projectedSavings = currentSavings;
    const monthlyRate = annualReturn / 12;

    while (projectedSavings < targetNetWorth && months < 600) { // Cap at 50 years
        projectedSavings = (projectedSavings + monthlyContribution) * (1 + monthlyRate);
        months++;
    }

    return {
        targetNetWorth: targetNetWorth.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
        monthsToFreedom: months,
        yearsToFreedom: (months / 12).toFixed(1),
        status: projectedSavings >= targetNetWorth ? "Joyful" : "In Progress"
    };
}

// Test Case: A user with $50k saved, adding $2k/month, spending $4k/month
const testUser = calculateRetirement(50000, 2000, 4000);
console.log("--- Retirement Logic Test ---");
console.log(testUser);
