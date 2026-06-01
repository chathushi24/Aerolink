import { isLocalhost, API_URLS } from './config';

describe('Configuration module', () => {
  it('should detect localhost properly or fall back', () => {
    expect(typeof isLocalhost).toBe('boolean');
  });

  it('should define API URLs for all services', () => {
    expect(API_URLS.auth).toBeDefined();
    expect(API_URLS.flight).toBeDefined();
    expect(API_URLS.booking).toBeDefined();
    expect(API_URLS.payment).toBeDefined();
    expect(API_URLS.baggage).toBeDefined();
    expect(API_URLS.notification).toBeDefined();
  });
});
