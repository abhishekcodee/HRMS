/**
 * HRMS Appointment Letter Engine — Central Utilities
 * Formats formal dates, resolves Indian Financial Years, formats Indian currency grouping, and converts amounts to Indian English words.
 */
/**
 * Formats an ISO/String date into formal corporate format: "01 April 2026"
 */
export function formatFormalDate(rawDate) {
    if (!rawDate)
        return '';
    const d = new Date(rawDate);
    if (isNaN(d.getTime()))
        return String(rawDate);
    const day = String(d.getDate()).padStart(2, '0');
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
}
/**
 * Resolves the Indian Financial Year string (April 1 to March 31).
 * E.g. Date 2026-04-01 => "2026-27"
 * E.g. Date 2026-02-15 => "2025-26"
 */
export function resolveIndianFinancialYear(rawDate) {
    const d = rawDate ? new Date(rawDate) : new Date();
    if (isNaN(d.getTime())) {
        const now = new Date();
        const curYear = now.getFullYear();
        const curMonth = now.getMonth(); // 0 = Jan, 3 = Apr
        return curMonth >= 3 ? `${curYear}-${String(curYear + 1).slice(-2)}` : `${curYear - 1}-${String(curYear).slice(-2)}`;
    }
    const year = d.getFullYear();
    const month = d.getMonth(); // 0-indexed: April is 3
    if (month >= 3) {
        // April to December -> FY is Year-(Year+1)
        const nextYear = String(year + 1).slice(-2);
        return `${year}-${nextYear}`;
    }
    else {
        // January to March -> FY is (Year-1)-Year
        const prevYear = year - 1;
        const curYearShort = String(year).slice(-2);
        return `${prevYear}-${curYearShort}`;
    }
}
/**
 * Formats a number with Indian Currency grouping (e.g. 4,50,000 instead of 450,000)
 */
export function formatIndianCurrency(amount) {
    const num = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
    if (isNaN(num))
        return '₹0';
    return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}
/**
 * Converts a numeric salary amount into Indian English Words
 * E.g. 600000 => "Rupees Six Lakh Only"
 * E.g. 840000 => "Rupees Eight Lakh Forty Thousand Only"
 */
export function numberToIndianWords(amount) {
    const num = Math.round(typeof amount === 'number' ? amount : parseFloat(String(amount || 0)));
    if (isNaN(num) || num === 0)
        return 'Rupees Zero Only';
    const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teenDigits = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tensDigits = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    function convertTwoDigits(n) {
        if (n < 10)
            return singleDigits[n];
        if (n >= 10 && n < 20)
            return teenDigits[n - 10];
        const ten = Math.floor(n / 10);
        const rest = n % 10;
        return (tensDigits[ten] + ' ' + singleDigits[rest]).trim();
    }
    function convertThreeDigits(n) {
        const hundred = Math.floor(n / 100);
        const rest = n % 100;
        let res = '';
        if (hundred > 0)
            res += singleDigits[hundred] + ' Hundred ';
        if (rest > 0)
            res += convertTwoDigits(rest);
        return res.trim();
    }
    let crore = Math.floor(num / 10000000);
    let remainder = num % 10000000;
    let lakh = Math.floor(remainder / 100000);
    remainder = remainder % 100000;
    let thousand = Math.floor(remainder / 1000);
    remainder = remainder % 1000;
    let words = '';
    if (crore > 0)
        words += convertThreeDigits(crore) + ' Crore ';
    if (lakh > 0)
        words += convertTwoDigits(lakh) + ' Lakh ';
    if (thousand > 0)
        words += convertTwoDigits(thousand) + ' Thousand ';
    if (remainder > 0)
        words += convertThreeDigits(remainder);
    return `Rupees ${words.trim()} Only`;
}
//# sourceMappingURL=appointmentLetterHelpers.js.map