import { readFileSync, existsSync } from 'fs';
import { TokenReviewResult } from '@token-poc/token-utils';

const SA_TOKEN_PATH = '/var/run/secrets/kubernetes.io/serviceaccount/token';
const K8S_API_HOST = process.env.KUBERNETES_SERVICE_HOST;
const K8S_API_PORT = process.env.KUBERNETES_SERVICE_PORT || '443';

function getServiceAccountToken(): string | null {
  if (!existsSync(SA_TOKEN_PATH)) return null;
  return readFileSync(SA_TOKEN_PATH, 'utf-8').trim();
}

export async function submitTokenReview(token: string, audiences?: string[]): Promise<TokenReviewResult> {
  if (!K8S_API_HOST) {
    return {
      authenticated: false,
      error: 'Not running in Kubernetes (KUBERNETES_SERVICE_HOST not set)',
    };
  }

  const saToken = getServiceAccountToken();
  if (!saToken) {
    return {
      authenticated: false,
      error: `Service account token not found at ${SA_TOKEN_PATH}`,
    };
  }

  const reviewBody = {
    apiVersion: 'authentication.k8s.io/v1',
    kind: 'TokenReview',
    spec: {
      token,
      ...(audiences && { audiences }),
    },
  };

  const url = `https://${K8S_API_HOST}:${K8S_API_PORT}/apis/authentication.k8s.io/v1/tokenreviews`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${saToken}`,
    },
    body: JSON.stringify(reviewBody),
  });

  if (!response.ok) {
    const body = await response.text();
    return {
      authenticated: false,
      error: `TokenReview API returned ${response.status}: ${body}`,
    };
  }

  const result = await response.json();
  const status = result.status;

  if (!status.authenticated) {
    return {
      authenticated: false,
      error: status.error || 'Token not authenticated',
    };
  }

  return {
    authenticated: true,
    user: status.user,
    audiences: status.audiences,
  };
}
