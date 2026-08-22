export interface HealthStatus {
  status: 'ok' | 'error';
  uptime: number;
  timestamp: string;
  environment: string;
  database: 'ok' | 'error';
}
