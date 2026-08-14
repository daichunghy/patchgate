/**
 * Parser/resource safety limits. These are not reviewability policy thresholds.
 * The changed-path limit mirrors the maximum collection size this local
 * contract can replay without silently treating truncation as completeness.
 */
export const MAX_COLLECTION_ITEMS = 3000;
export const MAX_STRING_LENGTH = 100_000;
export const MAX_NESTED_ENTRIES = 10_000;
