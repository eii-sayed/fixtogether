const validAIResponse = {
  itemCategory: 'appliance',
  itemSubcategory: 'small appliance',
  extractedSymptoms: [],
  possibleInspectionAreas: [],
  recommendedTechnicianSkills: [],
  missingInformation: [],
  clarificationQuestions: [],
  safetyFlags: [],
  suggestedPathways: [],
  confidence: 50,
};

const loadAIService = (provider) => {
  jest.resetModules();
  jest.doMock('../../src/config', () => ({
    ai: {
      provider,
      gemini: { apiKey: '' },
      openai: { apiKey: '' },
    },
  }));
  jest.doMock('../../src/services/ai/mockProvider', () => jest.fn().mockImplementation(() => ({
    name: 'mock',
    model: 'mock-model',
    analyzeRepairRequest: jest.fn().mockResolvedValue(validAIResponse),
  })));
  jest.doMock('../../src/services/ai/openaiProvider', () => jest.fn());
  jest.doMock('../../src/services/ai/geminiProvider', () => jest.fn());
  jest.doMock('../../src/utils/logger', () => ({
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  }));

  return require('../../src/services/ai');
};

describe('AI provider fallback analytics', () => {
  it.each(['gemini', 'openai'])('marks missing %s credentials as a fallback', async (provider) => {
    const aiService = loadAIService(provider);

    await expect(aiService.analyzeRepairRequest({})).resolves.toMatchObject({
      provider: 'mock',
      fallbackUsed: true,
    });
  });

  it('does not mark an intentionally selected mock provider as a fallback', async () => {
    const aiService = loadAIService('mock');

    await expect(aiService.analyzeRepairRequest({})).resolves.toMatchObject({
      provider: 'mock',
      fallbackUsed: false,
    });
  });
});
