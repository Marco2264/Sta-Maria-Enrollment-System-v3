import { describe, expect, it } from 'vitest';
import type { Subject } from '../../lib/adminData';
import { filterSubjects } from './subjectsFilter';

describe('filterSubjects', () => {
  const subjects: Subject[] = [
    {
      id: '1',
      name: 'Mathematics',
      gradeLevel: 'Grade 1',
      status: 'Active',
      academicYear: '2024-2025',
      createdAt: new Date('2024-01-01')
    },
    {
      id: '2',
      name: 'Science',
      gradeLevel: 'Grade 3',
      status: 'Active',
      academicYear: '2024-2025',
      createdAt: new Date('2024-01-02')
    },
    {
      id: '3',
      name: 'English',
      gradeLevel: 'Grade 1',
      status: 'Inactive',
      academicYear: '2025-2026',
      createdAt: new Date('2024-02-01')
    }
  ] as Subject[];

  it('filters by grade level, year, and search text together', () => {
    const result = filterSubjects(subjects, {
      searchQuery: 'math',
      selectedYear: '2024-2025',
      selectedGrade: 'Grade 1'
    });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Mathematics');
  });

  it('returns all grades when the grade filter is set to All', () => {
    const result = filterSubjects(subjects, {
      searchQuery: '',
      selectedYear: 'All',
      selectedGrade: 'All'
    });

    expect(result).toHaveLength(3);
  });
});
