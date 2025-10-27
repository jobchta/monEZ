/**
 * Rendering Utilities for monEZ
 */

/**
 * Creates an HTML element with specified tag, class, and innerHTML.
 * @param {string} tag - The HTML tag for the element.
 * @param {string} [className] - The CSS class name for the element.
 * @param {string} [innerHTML] - The inner HTML content of the element.
 * @returns {HTMLElement} The created HTML element.
 */
export function createElement(tag, className, innerHTML) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (innerHTML) el.innerHTML = innerHTML;
  return el;
}

/**
 * Formats a number as a currency string.
 * @param {number} amount - The amount to format.
 * @param {string} [currency='INR'] - The currency code.
 * @returns {string} The formatted currency string.
 */
export function formatCurrency(amount, currency = 'INR') {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

/**
 * Formats a timestamp into a readable date string.
 * @param {object} timestamp - The timestamp object (e.g., from Firestore).
 * @param {string} [format='short'] - The desired date format.
 * @returns {string} The formatted date string.
 */
export function formatDate(timestamp, format = 'short') {
    const date = timestamp.toDate(); // Assuming Firestore timestamp
    if (format === 'short') {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString('en-US');
}
