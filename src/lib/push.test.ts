import { describeTestPush, isRegistered } from './push';

/**
 * The test-send endpoint answers with four counts, not a status: a 200 can mean
 * "delivered", "you have no devices", or "that token was dead and has just been
 * removed". Those need different words, because two of them require the user to
 * do something.
 */
describe('describeTestPush', () => {
  it('reports nothing registered when there are no devices', () => {
    expect(describeTestPush({ devices: 0, sent: 0, pruned: 0, failed: 0 })).toMatch(/no device/i);
  });

  it('confirms a single delivery', () => {
    expect(describeTestPush({ devices: 1, sent: 1, pruned: 0, failed: 0 })).toBe(
      'Test notification sent to 1 device.',
    );
  });

  it('pluralizes multiple devices', () => {
    expect(describeTestPush({ devices: 2, sent: 2, pruned: 0, failed: 0 })).toBe(
      'Test notification sent to 2 devices.',
    );
  });

  it('explains a pruned token as a stale registration, not a success', () => {
    const msg = describeTestPush({ devices: 1, sent: 0, pruned: 1, failed: 0 });
    expect(msg).toMatch(/no longer valid/i);
    expect(msg).not.toMatch(/sent to/i);
  });

  it('reports a failure', () => {
    expect(describeTestPush({ devices: 1, sent: 0, pruned: 0, failed: 1 })).toMatch(/could not be sent/i);
  });

  it('mentions both the delivery and the trouble when outcomes are mixed', () => {
    const msg = describeTestPush({ devices: 3, sent: 1, pruned: 1, failed: 1 });
    expect(msg).toMatch(/1 device/);
    expect(msg).toMatch(/no longer valid/i);
    expect(msg).toMatch(/could not be sent/i);
  });
});

/**
 * The toggle reads on only when THIS device's token is among the caller's
 * registered devices — another device of the same user must not turn it on.
 */
describe('isRegistered', () => {
  const devices = [
    { token: 'ExponentPushToken[aaa]', platform: 'ios', created_at: null, last_seen_at: null },
    { token: 'ExponentPushToken[bbb]', platform: 'android', created_at: null, last_seen_at: null },
  ];

  it('finds this device', () => {
    expect(isRegistered(devices, 'ExponentPushToken[bbb]')).toBe(true);
  });

  it('does not count another device of the same user', () => {
    expect(isRegistered(devices, 'ExponentPushToken[ccc]')).toBe(false);
  });

  it('is false when this device has no token yet', () => {
    expect(isRegistered(devices, null)).toBe(false);
  });

  it('is false when nothing is registered', () => {
    expect(isRegistered([], 'ExponentPushToken[aaa]')).toBe(false);
  });
});
