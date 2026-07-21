import { authMessage } from './api';

describe('authMessage', () => {
  it("prefers the server's message, capitalized", () => {
    expect(authMessage(401, 'invalid credentials')).toBe('Invalid credentials');
    expect(authMessage(400, 'password must be at least 8 characters')).toBe(
      'Password must be at least 8 characters',
    );
    expect(authMessage(409, 'email already registered')).toBe('Email already registered');
  });

  it('falls back to status-based copy when the server sends no message', () => {
    expect(authMessage(401)).toBe('Invalid email or password.');
    expect(authMessage(409)).toBe('That email is already registered.');
    expect(authMessage(400)).toBe('Please check your email and password.');
    expect(authMessage(500)).toBe('Something went wrong. Please try again.');
  });

  it('treats a blank server message as absent', () => {
    expect(authMessage(401, '   ')).toBe('Invalid email or password.');
  });
});
