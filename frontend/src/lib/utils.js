// src/lib/utils.js

/**
 * Merge classNames conditionally
 * Usage: cn("base", condition && "extra")
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Example utility function
 */
export function formatDate(date) {
  return new Date(date).toLocaleDateString();
}
