/**
 * INR (Indian Rupee) Currency Formatter
 * Formats numbers into Indian Numbering and Currency standard (e.g. ₹14,990 or ₹1,24,500)
 */
export const formatINR = (amount: number): string => {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '₹0';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatCurrency = formatINR;
