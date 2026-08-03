import {
  activeFilterCount,
  emptyFilters,
  filtersToQuery,
  setPostedWithin,
  setQuery,
  toggleValue,
  type JobFilters,
} from './jobFilters';

describe('filtersToQuery', () => {
  it('is empty for the empty filter set', () => {
    expect(filtersToQuery(emptyFilters)).toBe('');
  });

  it('serializes a free-text query as q', () => {
    expect(filtersToQuery({ ...emptyFilters, q: 'react' })).toBe('q=react');
  });

  it('repeats a multi-value facet param once per value', () => {
    const f: JobFilters = { ...emptyFilters, facets: { work_mode: ['remote', 'hybrid'] } };
    expect(filtersToQuery(f)).toBe('work_mode=remote&work_mode=hybrid');
  });

  it('emits posted_within_days only when set', () => {
    expect(filtersToQuery({ ...emptyFilters, postedWithinDays: 7 })).toBe('posted_within_days=7');
    expect(filtersToQuery({ ...emptyFilters, postedWithinDays: null })).toBe('');
  });

  it('orders q, then facets, then posted_within_days', () => {
    const f: JobFilters = {
      q: 'designer',
      facets: { work_mode: ['remote'] },
      postedWithinDays: 30,
    };
    expect(filtersToQuery(f)).toBe('q=designer&work_mode=remote&posted_within_days=30');
  });
});

describe('activeFilterCount', () => {
  it('is zero for the empty set (a bare query is not a filter)', () => {
    expect(activeFilterCount(emptyFilters)).toBe(0);
    expect(activeFilterCount({ ...emptyFilters, q: 'react' })).toBe(0);
  });

  it('sums every selected facet value plus posted-within', () => {
    const f: JobFilters = {
      q: '',
      facets: { work_mode: ['remote', 'hybrid'], seniority: ['senior'] },
      postedWithinDays: 7,
    };
    expect(activeFilterCount(f)).toBe(4);
  });
});

describe('toggleValue', () => {
  it('adds a value when off, and is immutable', () => {
    const next = toggleValue(emptyFilters, 'work_mode', 'remote');
    expect(next.facets.work_mode).toEqual(['remote']);
    expect(emptyFilters.facets.work_mode).toBeUndefined(); // original untouched
  });

  it('removes the value on the second toggle (include -> off)', () => {
    const on = toggleValue(emptyFilters, 'work_mode', 'remote');
    const off = toggleValue(on, 'work_mode', 'remote');
    expect(off.facets.work_mode ?? []).toEqual([]);
  });

  it('keeps other values in the same facet', () => {
    let f = toggleValue(emptyFilters, 'seniority', 'senior');
    f = toggleValue(f, 'seniority', 'lead');
    expect(f.facets.seniority).toEqual(['senior', 'lead']);
    f = toggleValue(f, 'seniority', 'senior');
    expect(f.facets.seniority).toEqual(['lead']);
  });
});

describe('setters', () => {
  it('setQuery replaces q immutably', () => {
    const f = setQuery(emptyFilters, 'go');
    expect(f.q).toBe('go');
    expect(emptyFilters.q).toBe('');
  });

  it('setPostedWithin sets and clears', () => {
    expect(setPostedWithin(emptyFilters, 14).postedWithinDays).toBe(14);
    expect(setPostedWithin({ ...emptyFilters, postedWithinDays: 14 }, null).postedWithinDays).toBeNull();
  });
});
