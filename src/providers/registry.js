import { logger } from '../lib/logger.js';
import { PayPalProvider } from './paypal/paypal.provider.js';
import { StripeProvider } from './stripe/stripe.provider.js';

class ProviderRegistry {
  constructor() {
    this._providers = new Map();
  }

  /**
   * Register a provider instance.
   * @param {import('./provider.interface.js').PaymentProvider} provider
   */
  register(provider) {
    const name = provider.getProviderName();
    this._providers.set(name, provider);
    logger.info(`Provider registered: ${name} (${provider.getSupportedMethods().join(', ')})`);
  }

  /**
   * Get a provider by name.
   * @param {string} name
   * @returns {import('./provider.interface.js').PaymentProvider}
   * @throws {Error} If provider not found
   */
  getProvider(name) {
    const provider = this._providers.get(name);
    if (!provider) {
      throw new Error(`Provider "${name}" not found. Available: ${this.getAvailableNames().join(', ')}`);
    }
    return provider;
  }

  /**
   * Get all registered provider names.
   * @returns {string[]}
   */
  getAvailableNames() {
    return [...this._providers.keys()];
  }

  /**
   * List all registered providers with their supported methods.
   * @returns {Array<{name: string, methods: string[]}>}
   */
  listAll() {
    return [...this._providers.values()].map(p => ({
      name: p.getProviderName(),
      methods: p.getSupportedMethods(),
    }));
  }
}

// Singleton instance
const registry = new ProviderRegistry();

// Auto-register providers that have credentials configured
if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
  registry.register(new PayPalProvider());
}

if (process.env.STRIPE_SECRET_KEY) {
  registry.register(new StripeProvider());
}

export default registry;