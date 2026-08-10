import { codeFromCallbackUrl } from './oauth';

describe('codeFromCallbackUrl', () => {
  it('reads the code from the query string', () => {
    expect(codeFromCallbackUrl('freehiremobile://auth-callback?code=xyz')).toEqual({ code: 'xyz' });
  });

  it('reads the auth_error marker', () => {
    expect(codeFromCallbackUrl('freehiremobile://auth-callback?auth_error=oauth')).toEqual({
      error: 'oauth',
    });
  });

  it('tolerates the value in the URL fragment', () => {
    expect(codeFromCallbackUrl('freehiremobile://auth-callback#code=frag123')).toEqual({
      code: 'frag123',
    });
  });

  it('picks code out of a multi-param URL', () => {
    expect(codeFromCallbackUrl('freehiremobile://auth-callback?state=s&code=abc&x=1')).toEqual({
      code: 'abc',
    });
  });

  it('URL-decodes the code', () => {
    expect(codeFromCallbackUrl('freehiremobile://auth-callback?code=a%20b')).toEqual({ code: 'a b' });
  });

  it('returns neither for an empty string', () => {
    expect(codeFromCallbackUrl('')).toEqual({});
  });

  it('returns neither for an unrelated URL', () => {
    expect(codeFromCallbackUrl('freehiremobile://auth-callback?foo=bar')).toEqual({});
  });

  it('does not confuse a lookalike param for code', () => {
    expect(codeFromCallbackUrl('freehiremobile://auth-callback?zipcode=90210')).toEqual({});
  });
});
