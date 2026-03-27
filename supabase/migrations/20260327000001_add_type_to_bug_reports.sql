alter table bug_reports
  add column if not exists type text not null default 'bug';
