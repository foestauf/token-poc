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

export interface TokenStatus {
  exists: boolean;
  token?: string;
  decoded?: ProjectedTokenPayload;
  expiresAt?: string;
  expiresInSeconds?: number;
  isExpired?: boolean;
  error?: string;
}

export interface TokenReviewResult {
  authenticated: boolean;
  user?: {
    username: string;
    uid: string;
    groups: string[];
  };
  audiences?: string[];
  error?: string;
}

export interface MiddlewareStep {
  step: string;
  status: 'pass' | 'fail' | 'skip';
  detail: string;
  timestamp: number;
}

export interface AuthResult {
  authenticated: boolean;
  steps: MiddlewareStep[];
  payload?: ProjectedTokenPayload;
  error?: string;
}
