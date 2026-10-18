import { ArchiveLedgerState } from "./types";

export const INITIAL_ARCHIVE_STATE: ArchiveLedgerState = {
  lastDailyCheckAt: undefined,
  pieces: [],
  outfits: [],
  reports: [],
  events: [],
};
