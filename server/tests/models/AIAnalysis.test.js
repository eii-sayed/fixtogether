const mongoose = require('mongoose');
const AIAnalysis = require('../../src/models/AIAnalysis');

describe('AIAnalysis provider persistence', () => {
  it.each(['mock', 'openai', 'gemini'])('accepts the %s provider', async (provider) => {
    const analysis = new AIAnalysis({
      repairRequest: new mongoose.Types.ObjectId(),
      provider,
      model: 'test-model',
      fallbackUsed: provider === 'mock',
    });

    await expect(analysis.validate()).resolves.toBeUndefined();
  });
});
