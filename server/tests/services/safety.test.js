const { checkSafetyRules, shouldBlockAIAdvice, getHighestSeverity } = require('../../src/services/safetyService');

describe('Safety Service', () => {
  describe('checkSafetyRules', () => {
    it('should detect electrical risks', async () => {
      const flags = await checkSafetyRules('The device is sparking when plugged in');
      expect(flags.length).toBeGreaterThan(0);
      expect(flags.some(f => f.type === 'electrical')).toBe(true);
    });

    it('should detect fire risks', async () => {
      const flags = await checkSafetyRules('There is a burning smell coming from the device');
      expect(flags.some(f => f.type === 'fire')).toBe(true);
    });

    it('should detect battery risks', async () => {
      const flags = await checkSafetyRules('The battery is swollen and the phone is hot');
      expect(flags.some(f => f.type === 'battery')).toBe(true);
    });

    it('should return empty for safe descriptions', async () => {
      const flags = await checkSafetyRules('The screen has a small crack on the corner');
      expect(flags.length).toBe(0);
    });

    it('should detect multiple risk types', async () => {
      const flags = await checkSafetyRules('The device has a swollen battery and is sparking');
      expect(flags.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('shouldBlockAIAdvice', () => {
    it('should block for critical severity', () => {
      expect(shouldBlockAIAdvice([{ severity: 'critical' }])).toBe(true);
    });

    it('should not block for low severity', () => {
      expect(shouldBlockAIAdvice([{ severity: 'low' }])).toBe(false);
    });

    it('should block when blockAIAdvice flag is set', () => {
      expect(shouldBlockAIAdvice([{ severity: 'medium', blockAIAdvice: true }])).toBe(true);
    });
  });

  describe('getHighestSeverity', () => {
    it('should return highest severity', () => {
      expect(getHighestSeverity([
        { severity: 'low' },
        { severity: 'high' },
        { severity: 'medium' },
      ])).toBe('high');
    });

    it('should return critical when present', () => {
      expect(getHighestSeverity([
        { severity: 'high' },
        { severity: 'critical' },
      ])).toBe('critical');
    });
  });
});
