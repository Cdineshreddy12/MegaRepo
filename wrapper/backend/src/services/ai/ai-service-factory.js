import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

/**
 * AI Service Factory
 * Provides abstraction layer for multiple AI providers with fallback support
 */
class AIServiceFactory {
  constructor() {
    this.providers = {};
    this.primaryProvider = process.env.AI_PROVIDER || 'openai';
    this.fallbackEnabled = process.env.AI_FALLBACK_ENABLED === 'true';
    this.costTracking = {
      openai: { requests: 0, tokens: 0, cost: 0 },
      anthropic: { requests: 0, tokens: 0, cost: 0 }
    };

    this.initializeProviders();
  }

  /**
   * Initialize AI providers
   */
  initializeProviders() {
    // Initialize OpenAI
    if (process.env.OPENAI_API_KEY) {
      try {
        this.providers.openai = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY
        });
        console.log('✅ OpenAI provider initialized');
      } catch (error) {
        console.error('❌ Failed to initialize OpenAI:', error);
      }
    }

    // Initialize Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        this.providers.anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY
        });
        console.log('✅ Anthropic provider initialized');
      } catch (error) {
        console.error('❌ Failed to initialize Anthropic:', error);
      }
    }
  }

  /**
   * Get provider instance
   */
  getProvider(name = null) {
    const providerName = name || this.primaryProvider;
    
    if (!this.providers[providerName]) {
      if (this.fallbackEnabled) {
        // Try fallback provider
        const fallbackName = providerName === 'openai' ? 'anthropic' : 'openai';
        if (this.providers[fallbackName]) {
          console.warn(`⚠️ Provider ${providerName} not available, using fallback: ${fallbackName}`);
          return this.providers[fallbackName];
        }
      }
      throw new Error(`AI provider ${providerName} not available`);
    }

    return this.providers[providerName];
  }

  /**
   * Generate completion with automatic fallback
   */
  async generateCompletion(prompt, options = {}) {
    const {
      provider = null,
      model = null,
      temperature = 0.7,
      maxTokens = 1000,
      systemPrompt = null
    } = options;

    const providersToTry = provider 
      ? [provider, ...(this.fallbackEnabled ? [provider === 'openai' ? 'anthropic' : 'openai'] : [])]
      : [this.primaryProvider, ...(this.fallbackEnabled ? [this.primaryProvider === 'openai' ? 'anthropic' : 'openai'] : [])];

    let lastError = null;

    for (const providerName of providersToTry) {
      try {
        const result = await this._generateWithProvider(
          providerName,
          prompt,
          { model, temperature, maxTokens, systemPrompt }
        );

        // Track costs
        this._trackCost(providerName, result);

        return {
          ...result,
          provider: providerName
        };
      } catch (error) {
        console.error(`❌ Error with provider ${providerName}:`, error.message);
        lastError = error;
        continue;
      }
    }

    throw new Error(`All AI providers failed. Last error: ${lastError?.message}`);
  }

  /**
   * Generate with specific provider
   */
  async _generateWithProvider(providerName, prompt, options) {
    const provider = this.getProvider(providerName);
    const { model, temperature, maxTokens, systemPrompt } = options;

    if (providerName === 'openai') {
      const openaiModel = model || 'gpt-3.5-turbo';
      const messages = [];
      
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const response = await provider.chat.completions.create({
        model: openaiModel,
        messages,
        temperature,
        max_tokens: maxTokens
      });

      return {
        text: response.choices[0]?.message?.content || '',
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0
        },
        model: openaiModel
      };
    } else if (providerName === 'anthropic') {
      const anthropicModel = model || 'claude-3-haiku-20240307';
      
      const messages = [{ role: 'user', content: prompt }];
      const system = systemPrompt || undefined;

      const response = await provider.messages.create({
        model: anthropicModel,
        max_tokens: maxTokens,
        temperature,
        system,
        messages
      });

      return {
        text: response.content[0]?.text || '',
        usage: {
          promptTokens: response.usage?.input_tokens || 0,
          completionTokens: response.usage?.output_tokens || 0,
          totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
        },
        model: anthropicModel
      };
    }

    throw new Error(`Unsupported provider: ${providerName}`);
  }

  /**
   * Track costs per provider
   */
  _trackCost(providerName, result) {
    if (!this.costTracking[providerName]) {
      this.costTracking[providerName] = { requests: 0, tokens: 0, cost: 0 };
    }

    const tracking = this.costTracking[providerName];
    tracking.requests++;
    tracking.tokens += result.usage?.totalTokens || 0;

    // Estimate cost (rough estimates, adjust based on actual pricing)
    if (providerName === 'openai') {
      // GPT-3.5-turbo: ~$0.002 per 1K tokens
      tracking.cost += (result.usage?.totalTokens || 0) * 0.000002;
    } else if (providerName === 'anthropic') {
      // Claude Haiku: ~$0.00025 per 1K tokens
      tracking.cost += (result.usage?.totalTokens || 0) * 0.00000025;
    }
  }

  /**
   * Get cost statistics
   */
  getCostStats() {
    return {
      ...this.costTracking,
      total: {
        requests: Object.values(this.costTracking).reduce((sum, p) => sum + p.requests, 0),
        tokens: Object.values(this.costTracking).reduce((sum, p) => sum + p.tokens, 0),
        cost: Object.values(this.costTracking).reduce((sum, p) => sum + p.cost, 0)
      }
    };
  }

  /**
   * Check provider availability
   */
  isProviderAvailable(providerName) {
    return !!this.providers[providerName];
  }

  /**
   * Get available providers
   */
  getAvailableProviders() {
    return Object.keys(this.providers);
  }
}

export const aiServiceFactory = new AIServiceFactory();
export default aiServiceFactory;











