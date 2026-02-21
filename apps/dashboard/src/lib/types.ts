export interface TokenStatus {
  exists: boolean;
  token?: string;
  decoded?: ProjectedTokenPayload;
  expiresAt?: string;
  expiresInSeconds?: number;
  isExpired?: boolean;
  error?: string;
}

export interface ProjectedTokenPayload {
  aud: string | string[];
  exp: number;
  iat: number;
  iss: string;
  'kubernetes.io': {
    namespace: string;
    pod: {
      name: string;
      uid: string;
    };
    serviceaccount: {
      name: string;
      uid: string;
    };
  };
  nbf: number;
  sub: string;
}

export interface MiddlewareStep {
  step: string;
  status: 'pass' | 'fail' | 'skip';
  detail: string;
  timestamp: number;
}

export interface CallResult {
  success: boolean;
  status: number;
  body: unknown;
  targetEndpoint: string;
  error?: string;
}

export interface TokenRefreshEvent {
  type: 'connected' | 'refresh' | 'error';
  timestamp: number;
  previousExp?: number;
  newExp?: number;
  tokenPath?: string;
  message?: string;
}

export interface BenchmarkStats {
  strategy: string;
  iterations: number;
  timings: number[];
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
}

export interface BenchmarkResponse {
  direct: BenchmarkStats;
  cached: BenchmarkStats;
  iterations: number;
  tokenPath: string;
  timestamp: string;
}
