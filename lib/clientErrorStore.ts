/**
 * Tarayıcı tarafında son hataları bellekte tutan basit store.
 * ErrorCollector hatayı yakalar → buraya yazar.
 * BugReportModal buradan okur ve raporu zenginleştirir.
 */

export interface ClientError {
  type: string;
  message: string;
  source?: string;
  line?: number;
  stack?: string;
  timestamp: string;
}

const MAX_ERRORS = 20;
const _errors: ClientError[] = [];

export function pushClientError(err: ClientError) {
  _errors.push(err);
  if (_errors.length > MAX_ERRORS) _errors.shift();
}

export function getClientErrors(): ClientError[] {
  return [..._errors];
}
