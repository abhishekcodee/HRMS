/**
 * HRMS Appointment Letter Engine — Central Utilities
 * Formats formal dates, resolves Indian Financial Years, formats Indian currency grouping, and converts amounts to Indian English words.
 */
/**
 * Formats an ISO/String date into formal corporate format: "01 April 2026"
 */
export declare function formatFormalDate(rawDate?: string | Date | null): string;
/**
 * Resolves the Indian Financial Year string (April 1 to March 31).
 * E.g. Date 2026-04-01 => "2026-27"
 * E.g. Date 2026-02-15 => "2025-26"
 */
export declare function resolveIndianFinancialYear(rawDate?: string | Date | null): string;
/**
 * Formats a number with Indian Currency grouping (e.g. 4,50,000 instead of 450,000)
 */
export declare function formatIndianCurrency(amount: number | string | null | undefined): string;
/**
 * Converts a numeric salary amount into Indian English Words
 * E.g. 600000 => "Rupees Six Lakh Only"
 * E.g. 840000 => "Rupees Eight Lakh Forty Thousand Only"
 */
export declare function numberToIndianWords(amount: number | string | null | undefined): string;
//# sourceMappingURL=appointmentLetterHelpers.d.ts.map