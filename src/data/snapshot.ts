// Vite supports the ?raw suffix to import file contents as a string.
import csv from "./snapshot.csv?raw";
export const SNAPSHOT_CSV: string = csv;
export const SNAPSHOT_DATE = "2026-08-20";
