import countries from 'i18n-iso-countries'
import enLocale from 'i18n-iso-countries/langs/en.json'

countries.registerLocale(enLocale)

const countryObj = countries.getNames('en', { select: 'official' })

export const COUNTRIES = Object.entries(countryObj)
  .map(([code, name]) => ({ value: code, label: name as string }))
  .sort((a, b) => a.label.localeCompare(b.label))

export function getCountryName(code: string): string {
  if (!code) return ''
  // If it's already a full name, return as-is
  if (code.length > 3) return code
  return countries.getName(code, 'en') || code
}

export function getCountryCode(name: string): string {
  if (!name) return ''
  if (name.length <= 3) return name
  return countries.getAlpha2Code(name, 'en') || name
}
