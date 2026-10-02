export type AttendanceRecord = {
  date: string;
  status?: 'Present' | 'Absent' | 'Late' | 'Unmarked';
  amStatus?: 'Present' | 'Absent' | 'Late' | 'Unmarked';
  pmStatus?: 'Present' | 'Absent' | 'Late' | 'Unmarked';
};

export type CanonicalAttendanceEntry = {
  studentId: string;
  date: string;
  status?: 'Present' | 'Absent' | 'Late' | 'Unmarked';
  amStatus?: 'Present' | 'Absent' | 'Late' | 'Unmarked';
  pmStatus?: 'Present' | 'Absent' | 'Late' | 'Unmarked';
};

export function mergeAttendanceWithCompatibility(params: {
  studentId: string;
  canonicalEntries: CanonicalAttendanceEntry[];
  legacyEntries?: AttendanceRecord[];
}): AttendanceRecord[] {
  const { studentId, canonicalEntries = [], legacyEntries = [] } = params;
  const safeCanonical = Array.isArray(canonicalEntries) ? canonicalEntries : [];
  const safeLegacy = Array.isArray(legacyEntries) ? legacyEntries : [];

  const canonical = safeCanonical
    .filter((entry) => entry && entry.studentId === studentId)
    .map((entry) => {
      let derived = entry.status;
      if (!derived) {
        if (entry.amStatus === 'Absent' || entry.pmStatus === 'Absent') derived = 'Absent';
        else if (entry.amStatus === 'Late' || entry.pmStatus === 'Late') derived = 'Late';
        else if (entry.amStatus === 'Present' || entry.pmStatus === 'Present') derived = 'Present';
        else derived = 'Present';
      }
      return { 
        date: entry.date || '', 
        status: derived,
        amStatus: entry.amStatus,
        pmStatus: entry.pmStatus
      };
    });

  if (canonical.length > 0) {
    return canonical.sort((a, b) => ((a.date || '') < (b.date || '') ? 1 : -1));
  }

  return [...safeLegacy].sort((a, b) => ((a?.date || '') < (b?.date || '') ? 1 : -1));
}
