/**
 * Wire shapes for the freehire public API. This is a deliberate subset of the
 * server's full Job model — only the fields the feed card reads. Everything is
 * optional/nullable-tolerant because the API omits absent fields entirely
 * (e.g. a job with no salary has no `salary_min` key at all).
 */

/** AI enrichment: controlled-vocabulary facets plus optional compensation. */
export type Enrichment = {
  employment_type?: string; // e.g. "full_time"
  category?: string; // e.g. "sales", "software_engineering"
  work_mode?: string; // e.g. "remote", "hybrid", "onsite"
  seniority?: string;
  summary?: string; // clean model-written one-liner (tech jobs only)
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string; // "USD" | "EUR" | "GBP"
  salary_period?: string; // "year" | "month" | "day" | "hour"
};

export type Job = {
  public_slug: string;
  title: string;
  company: string;
  company_slug?: string;
  location?: string | null;
  description?: string | null; // raw HTML
  url?: string;
  source?: string;
  reality?: string | null; // trust signal, e.g. "verified"
  regions?: string[];
  countries?: string[];
  cities?: string[];
  skills?: string[]; // served dictionary facet
  posted_at?: string | null; // ISO timestamp
  enrichment?: Enrichment | null;
};

/** The list envelope every paginated read returns. */
export type Page<T> = {
  data: T[];
  meta: {
    limit: number;
    offset: number;
    total: number;
  };
};
