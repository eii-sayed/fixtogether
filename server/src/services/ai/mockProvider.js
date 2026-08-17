const logger = require('../../utils/logger');

/**
 * Mock AI Provider
 *
 * Provides deterministic AI analysis responses for development and testing.
 * No external API calls are made.
 */
class MockAIProvider {
  constructor() {
    this.name = 'mock';
    this.model = 'mock-v1';
  }

  /**
   * Analyze a repair request
   * @param {Object} params
   * @param {string} params.title - Item title
   * @param {string} params.description - Problem description
   * @param {string} params.category - Item category name
   * @param {string} params.brand - Item brand
   * @param {string} params.condition - Item condition
   * @returns {Promise<Object>}
   */
  async analyzeRepairRequest({ title, description, category, brand, condition }) {
    logger.info('[MockAI] Analyzing repair request:', { title, category });

    // Simulate processing time
    await this._delay(500);

    const lowerDesc = description.toLowerCase();
    const symptoms = this._extractSymptoms(lowerDesc);
    const pathways = this._suggestPathways(condition, symptoms);

    return {
      itemCategory: category || 'Electronics',
      itemSubcategory: this._guessSubcategory(title, category),
      extractedSymptoms: symptoms,
      possibleInspectionAreas: this._getInspectionAreas(symptoms),
      recommendedTechnicianSkills: this._getRecommendedSkills(category, symptoms),
      missingInformation: this._getMissingInfo(description),
      clarificationQuestions: this._getClarificationQuestions(category, symptoms),
      safetyFlags: [],
      suggestedPathways: pathways,
      confidence: this._calculateConfidence(description, symptoms),
    };
  }

  /**
   * Generate clarification questions
   */
  async generateClarificationQuestions({ description, category, existingAnswers }) {
    await this._delay(300);

    const questions = [
      'When did you first notice this problem?',
      'Has the item been exposed to water or moisture recently?',
      'Have you attempted any repairs or troubleshooting steps?',
      'Is the item still under any manufacturer warranty?',
    ];

    if (category && category.toLowerCase().includes('electronic')) {
      questions.push('Does the item turn on at all?');
      questions.push('Are there any unusual sounds when operating?');
    }

    return questions.slice(0, 4);
  }

  /**
   * Summarize reviews for a technician
   */
  async summarizeReviews({ reviews }) {
    await this._delay(200);

    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    return {
      summary: `Based on ${reviews.length} reviews, this technician has an average rating of ${avgRating.toFixed(1)}/5. Customers generally report satisfactory service quality.`,
      strengths: ['Responsive communication', 'Fair pricing'],
      areasForImprovement: ['Could provide more detailed repair reports'],
    };
  }

  /**
   * Suggest reuse pathway for an item
   */
  async suggestReusePathway({ item, condition }) {
    await this._delay(200);

    const pathways = [];

    if (condition === 'poor' || condition === 'broken') {
      pathways.push({
        pathway: 'parts',
        reason: 'Individual components may still be functional and useful.',
        requiresHumanVerification: true,
      });
      pathways.push({
        pathway: 'recycling',
        reason: 'Materials can be responsibly recycled.',
        requiresHumanVerification: true,
      });
    } else {
      pathways.push({
        pathway: 'donation',
        reason: 'Item is in usable condition and could benefit community organizations.',
        requiresHumanVerification: true,
      });
    }

    return pathways;
  }

  /**
   * Find semantic matches (simplified for mock)
   */
  async findSemanticMatches({ text, candidates }) {
    await this._delay(200);

    // Simple keyword-based matching
    const textWords = new Set(text.toLowerCase().split(/\s+/));
    return candidates.map((candidate) => {
      const candidateWords = new Set(candidate.text.toLowerCase().split(/\s+/));
      const intersection = [...textWords].filter((w) => candidateWords.has(w));
      return {
        id: candidate.id,
        score: intersection.length / Math.max(textWords.size, 1),
      };
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * Detect potential duplicate listings
   */
  async detectPotentialDuplicate({ newRequest, existingRequests }) {
    await this._delay(200);

    const duplicates = [];
    const newWords = new Set(newRequest.description.toLowerCase().split(/\s+/));

    for (const existing of existingRequests) {
      const existingWords = new Set(existing.description.toLowerCase().split(/\s+/));
      const intersection = [...newWords].filter((w) => existingWords.has(w));
      const similarity = intersection.length / Math.max(newWords.size, existingWords.size, 1);

      if (similarity > 0.6) {
        duplicates.push({
          requestId: existing._id,
          similarity: Math.round(similarity * 100),
        });
      }
    }

    return duplicates;
  }

  /**
   * Health check
   */
  async healthCheck() {
    return { status: 'ok', provider: 'mock', latency: 0 };
  }

  // ---- Private helper methods ----

  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  _extractSymptoms(description) {
    const symptomPatterns = [
      { pattern: /not turning on|won't turn on|doesn't start|won't start/i, type: 'power', description: 'Device does not power on', severity: 'high' },
      { pattern: /screen crack|broken screen|shattered/i, type: 'physical', description: 'Screen damage detected', severity: 'medium' },
      { pattern: /battery drain|battery dies|short battery/i, type: 'battery', description: 'Battery performance issue', severity: 'medium' },
      { pattern: /overheating|gets hot|too hot/i, type: 'thermal', description: 'Overheating reported', severity: 'high' },
      { pattern: /noise|buzzing|clicking|grinding/i, type: 'audio', description: 'Unusual noise detected', severity: 'low' },
      { pattern: /slow|lag|freeze|freezing|hangs/i, type: 'performance', description: 'Performance degradation', severity: 'low' },
      { pattern: /water damage|wet|spill|liquid/i, type: 'liquid', description: 'Possible liquid damage', severity: 'high' },
      { pattern: /broken|bent|dent|crack/i, type: 'physical', description: 'Physical damage reported', severity: 'medium' },
      { pattern: /not charging|charge issue|charger/i, type: 'charging', description: 'Charging issue reported', severity: 'medium' },
    ];

    const symptoms = [];
    for (const { pattern, type, description: desc, severity } of symptomPatterns) {
      if (pattern.test(description)) {
        symptoms.push({ type, description: desc, severity });
      }
    }

    if (symptoms.length === 0) {
      symptoms.push({
        type: 'general',
        description: 'Issue reported - requires technician inspection for diagnosis',
        severity: 'unknown',
      });
    }

    return symptoms;
  }

  _guessSubcategory(title, category) {
    const lower = (title || '').toLowerCase();
    if (lower.includes('phone') || lower.includes('mobile')) return 'Mobile phone';
    if (lower.includes('laptop')) return 'Laptop';
    if (lower.includes('desktop')) return 'Desktop computer';
    if (lower.includes('monitor') || lower.includes('screen')) return 'Monitor';
    if (lower.includes('fan')) return 'Electric fan';
    if (lower.includes('chair')) return 'Chair';
    if (lower.includes('bicycle') || lower.includes('bike')) return 'Bicycle';
    return category || 'General';
  }

  _getInspectionAreas(symptoms) {
    const areas = new Set();
    for (const s of symptoms) {
      switch (s.type) {
        case 'power': areas.add('Power supply'); areas.add('Motherboard'); break;
        case 'battery': areas.add('Battery'); areas.add('Charging circuit'); break;
        case 'physical': areas.add('External housing'); areas.add('Display assembly'); break;
        case 'thermal': areas.add('Cooling system'); areas.add('Thermal paste'); break;
        case 'charging': areas.add('Charging port'); areas.add('Battery'); break;
        case 'liquid': areas.add('Internal components'); areas.add('Connectors'); break;
        default: areas.add('General inspection');
      }
    }
    return [...areas];
  }

  _getRecommendedSkills(category, symptoms) {
    const skills = new Set();
    const cat = (category || '').toLowerCase();
    if (cat.includes('electronic') || cat.includes('phone') || cat.includes('laptop')) {
      skills.add('Electronics repair');
      skills.add('Soldering');
    }
    if (cat.includes('bicycle')) {
      skills.add('Bicycle mechanics');
    }
    if (cat.includes('furniture')) {
      skills.add('Furniture repair');
      skills.add('Woodworking');
    }
    if (cat.includes('appliance')) {
      skills.add('Appliance repair');
    }

    for (const s of symptoms) {
      if (s.type === 'physical') skills.add('Physical repair');
      if (s.type === 'battery') skills.add('Battery replacement');
    }

    if (skills.size === 0) skills.add('General repair');
    return [...skills];
  }

  _getMissingInfo(description) {
    const missing = [];
    if (description.length < 50) missing.push('More detailed description of the problem');
    if (!/\b(brand|make)\b/i.test(description)) missing.push('Item brand or manufacturer');
    if (!/\b(model|type)\b/i.test(description)) missing.push('Item model or type');
    if (!/\b(when|how long|start|began)\b/i.test(description)) missing.push('When the issue started');
    return missing;
  }

  _getClarificationQuestions(category, symptoms) {
    const questions = ['When did you first notice this issue?'];

    if (symptoms.some((s) => s.type === 'power')) {
      questions.push('Does the device show any signs of life (LEDs, sounds) when you try to turn it on?');
    }
    if (symptoms.some((s) => s.type === 'physical')) {
      questions.push('Was the item dropped or impacted?');
    }
    if (symptoms.some((s) => s.type === 'liquid')) {
      questions.push('How long ago did the liquid exposure occur?');
    }

    questions.push('Is this item still under manufacturer warranty?');

    return questions.slice(0, 5);
  }

  _suggestPathways(condition, symptoms) {
    const pathways = [];

    const highSeverity = symptoms.some((s) => s.severity === 'high');

    pathways.push({
      pathway: 'repair',
      reason: 'Professional inspection and repair is recommended.',
      requiresHumanVerification: true,
    });

    if (condition === 'poor' || condition === 'broken') {
      pathways.push({
        pathway: 'parts',
        reason: 'Some components may be recoverable for reuse.',
        requiresHumanVerification: true,
      });
      pathways.push({
        pathway: 'donation',
        reason: 'Community organizations may accept this item for refurbishment projects.',
        requiresHumanVerification: true,
      });
    }

    return pathways;
  }

  _calculateConfidence(description, symptoms) {
    let confidence = 30;
    if (description.length > 100) confidence += 15;
    if (description.length > 300) confidence += 10;
    if (symptoms.length > 0 && symptoms[0].type !== 'general') confidence += 20;
    if (symptoms.length > 1) confidence += 10;
    return Math.min(confidence, 85); // Mock never exceeds 85% confidence
  }

  /**
   * Conversational Assistant Chat
   */
  async chat({ message }) {
    const lower = (message || '').toLowerCase();

    if (lower.includes('safe') || lower.includes('microwave') || lower.includes('battery')) {
      return {
        reply: '⚠️ **Safety First!** High-voltage devices like microwaves, CRT monitors, and swollen lithium-ion batteries carry significant risks of electric shock or fire. We strongly recommend having a certified FixTogether technician inspect these items rather than attempting self-disassembly.',
        suggestedActions: ['Find a certified technician', 'Post a repair request', 'Battery safety tips'],
      };
    }

    if (lower.includes('quote') || lower.includes('price') || lower.includes('cost')) {
      return {
        reply: '💰 **How Quotations Work:** Once you publish a repair request, matched technicians review your issue and submit itemized quotations (labor, parts estimate, expected duration, and warranty). You can compare quotes and message technicians directly before accepting!',
        suggestedActions: ['Create a repair request', 'View technician profiles', 'How long does repair take?'],
      };
    }

    return {
      reply: `👋 Hello! I am **Fixie**, your FixTogether AI repair assistant. I can help you diagnose broken electronics, verify safety precautions, prepare detailed repair requests, or connect with verified technicians. How can I assist you today?`,
      suggestedActions: ['Help diagnose my item', 'Is it safe to repair?', 'How do quotations work?'],
    };
  }
}

module.exports = MockAIProvider;
