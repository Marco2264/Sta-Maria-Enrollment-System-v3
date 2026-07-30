import type { Subject } from '../../lib/adminData';

export interface SubjectFilters {
  searchQuery: string;
  selectedYear: string;
  selectedGrade: string;
}

export function filterSubjects(subjects: Subject[], filters: SubjectFilters): Subject[] {
  return subjects.filter((subject) => {
    const matchesYear = filters.selectedYear === 'All' || subject.academicYear === filters.selectedYear;
    const matchesGrade = filters.selectedGrade === 'All' || subject.gradeLevel === filters.selectedGrade;
    const searchTerm = filters.searchQuery.trim().toLowerCase();
    const matchesSearch = searchTerm === '' || subject.name.toLowerCase().includes(searchTerm);

    return matchesYear && matchesGrade && matchesSearch;
  });
}
