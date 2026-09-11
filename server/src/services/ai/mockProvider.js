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
  async chat({ message, imageBase64 }) {
    const lower = (message || '').toLowerCase();

    // 1. Technician & Expert Inquiries (e.g. "list the technocians", "find a technician", "who can fix")
    if (
      lower.includes('technician') ||
      lower.includes('technocian') ||
      lower.includes('tech') ||
      lower.includes('mechanic') ||
      lower.includes('expert') ||
      lower.includes('who can fix') ||
      lower.includes('repair shop') ||
      lower.includes('list the')
    ) {
      return {
        reply: `🔧 **Verified Technicians on FixTogether**\n\nWe connect you with certified, background-checked repair professionals across multiple specializations:\n\n* **Sumon Electronics Pro** — *Specialties:* Motherboard micro-soldering, laptop chipset repair, display panel replacement (⭐ 4.9 Rating)\n* **Master Tech Lab** — *Specialties:* Smartphone screen replacement, battery restoration, charging IC diagnostics (⭐ 4.8 Rating)\n* **EcoFix Appliance Hub** — *Specialties:* Home appliances, power supplies, inverter boards (⭐ 4.9 Rating)\n\n### 🚀 How to get quotes from technicians:\n1. Click **Create Repair Request** to post your device issue.\n2. Matched technicians will review your request and send competitive price quotes with labor & parts breakdown.\n3. Chat directly with technicians, compare ratings, and choose the best offer!`,
        category: 'Electronics',
        skills: ['Micro-soldering', 'Smartphone Repair', 'Laptop Diagnostics', 'Appliance Repair'],
        suggestedActions: [
          'Create a repair request',
          'View technician directory',
          'How do quotations work?',
        ],
      };
    }

    // 2. Critical Safety & Hazard Warnings
    if (
      lower.includes('safe') ||
      lower.includes('smoke') ||
      lower.includes('spark') ||
      lower.includes('shock') ||
      lower.includes('fire') ||
      lower.includes('smell') ||
      lower.includes('swollen') ||
      lower.includes('burn') ||
      lower.includes('microwave') ||
      lower.includes('high voltage') ||
      lower.includes('gas')
    ) {
      return {
        reply: `⚠️ **CRITICAL SAFETY ADVISORY**\n\nHigh-voltage equipment, exposed wiring, and swollen lithium-ion batteries present severe hazards including **electric shock, fire, and toxic chemical exposure**.\n\n* **Do NOT attempt to disassemble or puncture swollen batteries.**\n* **Never open microwave ovens or power supplies with large charged capacitors.**\n* **Immediately disconnect the item from wall power outlets.**\n\nWe strongly recommend having a certified FixTogether technician inspect the device in a safe workshop environment.`,
        category: 'Safety Hazards',
        skills: ['High-voltage safety', 'Battery handling'],
        suggestedActions: [
          'Find a certified technician',
          'Create a repair request',
          'Battery safety guidelines',
        ],
      };
    }

    // 3. Laptop / Computer Diagnostics
    if (
      lower.includes('laptop') ||
      lower.includes('computer') ||
      lower.includes('pc') ||
      lower.includes('macbook') ||
      lower.includes('motherboard') ||
      lower.includes('boot') ||
      lower.includes('blue screen') ||
      lower.includes('ram') ||
      lower.includes('cpu')
    ) {
      return {
        reply: `💻 **Laptop & Computer Diagnostic Assessment**\n\nCommon failure points identified:\n\n1. **Power & Charging Circuit:** Test with a verified working adapter. Check for battery charging indicator LEDs.\n2. **Thermal & Cooling:** Overheating can trigger thermal shutdowns. Inspect air vents and listen for fan operation.\n3. **Display vs GPU:** If the power LED lights up but the screen remains dark, connect an external HDMI monitor to isolate whether the fault is with the display panel or motherboard.\n\n*Preliminary Recommendation:* A technician equipped with multimeter & diagnostic bench equipment can test the power rail and component integrity.`,
        category: 'Laptops',
        skills: ['Motherboard diagnostics', 'Thermal management', 'Screen replacement', 'Soldering'],
        suggestedActions: [
          'Create laptop repair request',
          'Is it worth repairing?',
          'How long do laptop repairs take?',
        ],
      };
    }

    // 4. Smartphone / Mobile Diagnostics
    if (
      lower.includes('phone') ||
      lower.includes('smartphone') ||
      lower.includes('iphone') ||
      lower.includes('samsung') ||
      lower.includes('screen') ||
      lower.includes('touch') ||
      lower.includes('cracked') ||
      lower.includes('display')
    ) {
      return {
        reply: `📱 **Smartphone & Display Diagnostic Assessment**\n\n* **Cracked Glass vs OLED/LCD:** If touch response works and there are no colored vertical lines or black ink spots, only the top glass or digitizer assembly requires replacement.\n* **Charging Port Issues:** Inspect the USB-C/Lightning port under a flashlight for compacted lint before attempting cable replacement.\n* **Battery Degradation:** If the phone powers off unexpectedly under 20% charge, the battery capacity has likely degraded below 80% health.\n\n*Next Step:* Post a repair request to receive competitive quotations from local mobile technicians!`,
        category: 'Smartphones',
        skills: ['Screen replacement', 'Battery replacement', 'Charging port repair', 'Micro-soldering'],
        suggestedActions: [
          'Request screen repair',
          'Get battery replacement quote',
          'View mobile technicians',
        ],
      };
    }

    // 5. Water & Liquid Damage
    if (lower.includes('water') || lower.includes('liquid') || lower.includes('spill') || lower.includes('dropped in')) {
      return {
        reply: `💧 **Liquid Damage Emergency Checklist**\n\n1. **Power Off Immediately:** Do not try to turn on or charge the device.\n2. **Do NOT use rice or hair dryers:** Rice leaves starch dust and heat pushes moisture deeper into sensitive chips.\n3. **Disconnect Battery:** If the battery is removable, take it out right away.\n4. **Seek Professional Ultrasonic Cleaning:** Mineral deposits cause rapid corrosion on PCB traces. A technician will clean the motherboard in an isopropyl alcohol/ultrasonic bath.`,
        category: 'Liquid Damage',
        skills: ['Ultrasonic cleaning', 'Corrosion repair', 'Board diagnostics'],
        suggestedActions: [
          'Find emergency technician',
          'Create repair request',
        ],
      };
    }

    // 6. Donations, E-Waste & Reuse Inquiries
    if (
      lower.includes('donate') ||
      lower.includes('donation') ||
      lower.includes('recycle') ||
      lower.includes('e-waste') ||
      lower.includes('give away') ||
      lower.includes('organization') ||
      lower.includes('reuse')
    ) {
      return {
        reply: `🌱 **Donations & Responsible E-Waste Recycling**\n\nFixTogether partners with verified community organizations, schools, and non-profits:\n\n* **Donation Offers:** You can list working, partially working, or fixable devices for donation. Local organizations will arrange pickup or drop-off.\n* **Refurbishment Projects:** Non-profit technical teams refurbish donated electronics and distribute them to underserved students and community centers.\n* **Zero E-Waste Policy:** Non-repairable items are recycled responsibly for raw metal and component recovery.`,
        category: 'Donations',
        skills: ['Refurbishment', 'Hardware testing'],
        suggestedActions: [
          'Donate an item now',
          'View community needs',
          'How donation pickup works',
        ],
      };
    }

    // 7. Quotations, Pricing & Payment Inquiries
    if (
      lower.includes('quote') ||
      lower.includes('price') ||
      lower.includes('cost') ||
      lower.includes('how much') ||
      lower.includes('fee') ||
      lower.includes('charge')
    ) {
      return {
        reply: `💰 **How Quotations & Payments Work**\n\n1. **Free to Post:** Submitting a repair request and receiving diagnostic advice is 100% free.\n2. **Itemized Quotes:** Technicians submit competitive bids broken down by **Labor**, **Parts Cost**, and **Estimated Duration**.\n3. **Warranty Included:** Technicians specify repair warranty duration (typically 30 to 90 days).\n4. **Direct Payment Transparency:** Repair payments are settled directly between you and the technician upon satisfactory inspection.`,
        category: 'Quotations',
        skills: ['General repair'],
        suggestedActions: [
          'Create a repair request',
          'View technician profiles',
          'Warranty policy details',
        ],
      };
    }

    // 8. General & Visual Inspection Fallback
    if (imageBase64) {
      return {
        reply: `📷 **Visual Inspection Analysis Completed**\n\nBased on the photo provided:\n\n* **Item Identified:** Electronic hardware device.\n* **Visual Findings:** Visible wear and potential component fault requiring internal inspection.\n* **Preliminary Recommendation:** Clean external contact points, verify power supply stability, and submit a repair request to have verified technicians diagnose the internal circuits.\n\n*Safety Reminder: Always unplug from mains power before inspection.*`,
        category: 'Electronics',
        skills: ['Visual inspection', 'Hardware diagnostics'],
        suggestedActions: [
          'Create repair request with this photo',
          'Find matching technicians',
          'Is it safe to repair?',
        ],
      };
    }

    return {
      reply: `👋 Hello! I am **Fixie**, your FixTogether AI repair assistant.\n\nI can help you with:\n* 🔍 **Diagnosing broken devices** (upload a photo or describe the symptoms)\n* ⚡ **Safety & hazard checks** (verify high-voltage & battery precautions)\n* 👨‍🔧 **Connecting with verified local technicians**\n* 🎁 **Donating unused items to community organizations**\n\nHow can I help you today?`,
      suggestedActions: [
        'List the technicians',
        'Diagnose a broken device',
        'Is it safe to repair myself?',
        'How do repair requests work?',
      ],
    };
  }
}

module.exports = MockAIProvider;
