/** Shared limits for the read paths, kept out of route files. */

/**
 * Hard cap on a full task read. Comfortably above a realistic personal task
 * list, and it bounds a response well inside the Atlas Free transfer
 * allowance.
 */
export const TASK_CAP = 500;

/** Cap on a calendar window read, which is a much narrower slice. */
export const RANGE_CAP = 400;

/** One year of days is the widest calendar range the UI will request. */
export const MAX_RANGE_DAYS = 366;
