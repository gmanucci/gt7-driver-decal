export interface FeaturedDriver {
  name: string;
  /** ISO 3166-1 alpha-2 code. */
  country: string;
}

export const FEATURED_DRIVERS: readonly FeaturedDriver[] = [
  // Formula 1, current and recent
  { name: 'Max Verstappen', country: 'NL' },
  { name: 'Lewis Hamilton', country: 'GB' },
  { name: 'Charles Leclerc', country: 'MC' },
  { name: 'Lando Norris', country: 'GB' },
  { name: 'Oscar Piastri', country: 'AU' },
  { name: 'George Russell', country: 'GB' },
  { name: 'Fernando Alonso', country: 'ES' },
  { name: 'Carlos Sainz', country: 'ES' },
  { name: 'Sergio Pérez', country: 'MX' },
  { name: 'Pierre Gasly', country: 'FR' },
  { name: 'Esteban Ocon', country: 'FR' },
  { name: 'Alexander Albon', country: 'TH' },
  { name: 'Yuki Tsunoda', country: 'JP' },
  { name: 'Lance Stroll', country: 'CA' },
  { name: 'Valtteri Bottas', country: 'FI' },
  { name: 'Nico Hülkenberg', country: 'DE' },
  { name: 'Kevin Magnussen', country: 'DK' },
  { name: 'Daniel Ricciardo', country: 'AU' },
  { name: 'Sebastian Vettel', country: 'DE' },
  { name: 'Kimi Räikkönen', country: 'FI' },
  // Formula 1 legends
  { name: 'Ayrton Senna', country: 'BR' },
  { name: 'Michael Schumacher', country: 'DE' },
  { name: 'Alain Prost', country: 'FR' },
  { name: 'Niki Lauda', country: 'AT' },
  { name: 'Nigel Mansell', country: 'GB' },
  { name: 'Jim Clark', country: 'GB' },
  { name: 'Emerson Fittipaldi', country: 'BR' },
  { name: 'Nelson Piquet', country: 'BR' },
  { name: 'Rubens Barrichello', country: 'BR' },
  { name: 'Felipe Massa', country: 'BR' },
  { name: 'Juan Pablo Montoya', country: 'CO' },
  // Sim racing and Gran Turismo
  { name: 'Gustavo Ariel', country: 'BR' },
  { name: 'Igor Fraga', country: 'BR' },
  { name: 'Jann Mardenborough', country: 'GB' },
  { name: 'Jimmy Broadbent', country: 'GB' },
  { name: 'Takuma Miyazono', country: 'JP' },
  { name: 'Mikail Hizal', country: 'TR' },
  { name: 'Lucas Ordóñez', country: 'ES' },
];

/** Picks a random driver whose flag is available. `random` is injectable for tests. */
export function pickRandomDriver(
  availableCountries: ReadonlySet<string>,
  random: () => number = Math.random,
): FeaturedDriver {
  const candidates = FEATURED_DRIVERS.filter((driver) => availableCountries.has(driver.country));
  const pool = candidates.length > 0 ? candidates : FEATURED_DRIVERS;
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]!;
}
