export const INDEXNOW_ENDPOINT: string;
export const SITE_HOST: string;
export const INDEXNOW_BATCH: number;

export function findIndexNowKey(publicDir: string): {
  key: string;
  filename: string;
  keyLocation: string;
};

export function urlsFromSitemap(xml: string, host?: string): string[];

export function batches(urls: readonly string[], size?: number): string[][];

export function indexNowPayload(input: {
  host: string;
  key: string;
  keyLocation: string;
  urlList: readonly string[];
}): {
  host: string;
  key: string;
  keyLocation: string;
  urlList: readonly string[];
};
