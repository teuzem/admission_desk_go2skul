import { sql } from 'drizzle-orm'
import { db, pool } from './index.js'
import { users, profiles, userSecuritySettings, kbCategories, regions, countries, universities, universityCampuses, programs } from './schema/index.js'
import { hashPassword } from '../lib/password.js'
import { config } from '../config.js'

const KB_CATEGORIES = [
  { name: 'Getting Started', slug: 'getting-started', icon: 'Rocket', displayOrder: 1, description: 'New to Admission Desk? Start here.' },
  { name: 'Account & Profile', slug: 'account-profile', icon: 'User', displayOrder: 2, description: 'Manage your account and profile settings.' },
  { name: 'Applications', slug: 'applications', icon: 'FileText', displayOrder: 3, description: 'Submitting and tracking applications.' },
  { name: 'Document Management', slug: 'document-management', icon: 'Folder', displayOrder: 4, description: 'Uploading and managing documents.' },
  { name: 'University & Programs', slug: 'university-programs', icon: 'GraduationCap', displayOrder: 5, description: 'Browse universities and programs.' },
  { name: 'Payments & Billing', slug: 'payments-billing', icon: 'CreditCard', displayOrder: 6, description: 'Fees, payments and billing questions.' },
  { name: 'Team Management', slug: 'team-management', icon: 'Users', displayOrder: 7, description: 'Managing your agency team.' },
  { name: 'Security & Privacy', slug: 'security-privacy', icon: 'Shield', displayOrder: 8, description: 'Keeping your account secure.' },
  { name: 'Troubleshooting', slug: 'troubleshooting', icon: 'Wrench', displayOrder: 9, description: 'Common issues and fixes.' },
  { name: 'API & Integrations', slug: 'api-integrations', icon: 'Plug', displayOrder: 10, description: 'Integrations and API access.' },
]

const REGIONS = [
  { name: 'Europe', code: 'EU', country: 'Multiple', continent: 'Europe', timezone: 'CET' },
  { name: 'North America', code: 'NA', country: 'Multiple', continent: 'North America', timezone: 'EST' },
  { name: 'Asia Pacific', code: 'APAC', country: 'Multiple', continent: 'Asia', timezone: 'JST' },
  { name: 'Middle East', code: 'ME', country: 'Multiple', continent: 'Asia', timezone: 'GST' },
  { name: 'Africa', code: 'AF', country: 'Multiple', continent: 'Africa', timezone: 'WAT' },
  { name: 'Latin America', code: 'LATAM', country: 'Multiple', continent: 'South America', timezone: 'BRT' },
]

const COUNTRIES: { name: string; code: string; region: string; continent: string }[] = [
  { name: 'Nigeria', code: 'NGA', region: 'AF', continent: 'Africa' },
  { name: 'Kenya', code: 'KEN', region: 'AF', continent: 'Africa' },
  { name: 'Ghana', code: 'GHA', region: 'AF', continent: 'Africa' },
  { name: 'South Africa', code: 'ZAF', region: 'AF', continent: 'Africa' },
  { name: 'United Kingdom', code: 'GBR', region: 'EU', continent: 'Europe' },
  { name: 'France', code: 'FRA', region: 'EU', continent: 'Europe' },
  { name: 'Germany', code: 'DEU', region: 'EU', continent: 'Europe' },
  { name: 'United States', code: 'USA', region: 'NA', continent: 'North America' },
  { name: 'Canada', code: 'CAN', region: 'NA', continent: 'North America' },
  { name: 'China', code: 'CHN', region: 'APAC', continent: 'Asia' },
  { name: 'India', code: 'IND', region: 'APAC', continent: 'Asia' },
  { name: 'Japan', code: 'JPN', region: 'APAC', continent: 'Asia' },
  { name: 'Australia', code: 'AUS', region: 'APAC', continent: 'Oceania' },
  { name: 'United Arab Emirates', code: 'ARE', region: 'ME', continent: 'Asia' },
  { name: 'Saudi Arabia', code: 'SAU', region: 'ME', continent: 'Asia' },
  { name: 'Brazil', code: 'BRA', region: 'LATAM', continent: 'South America' },
  { name: 'Mexico', code: 'MEX', region: 'LATAM', continent: 'North America' },
]

const UNIVERSITIES: {
  name: string; slug: string; country: string; region: string; city: string; ranking: string; established: number; websiteUrl: string; description: string
  programs: { name: string; slug: string; level: string; category: string; durationMonths: number; tuitionFee: string; currency: string }[]
}[] = [
  {
    name: 'University of Toronto', slug: 'university-of-toronto', country: 'Canada', region: 'North America', city: 'Toronto', ranking: 'Top 25', established: 1827, websiteUrl: 'https://utoronto.ca', description: 'A leading public research university in Canada.',
    programs: [
      { name: 'BSc Computer Science', slug: 'utoronto-bsc-cs', level: 'Bachelor', category: 'Computer Science', durationMonths: 48, tuitionFee: '45000', currency: 'CAD' },
      { name: 'MEng Mechanical Engineering', slug: 'utoronto-meng-mech', level: 'Master', category: 'Engineering', durationMonths: 24, tuitionFee: '38000', currency: 'CAD' },
    ],
  },
  {
    name: 'Oxford Brookes University', slug: 'oxford-brookes', country: 'United Kingdom', region: 'Europe', city: 'Oxford', ranking: 'Top 400', established: 1865, websiteUrl: 'https://brookes.ac.uk', description: 'A modern university with a global outlook.',
    programs: [
      { name: 'BA Business Management', slug: 'brookes-ba-business', level: 'Bachelor', category: 'Business', durationMonths: 36, tuitionFee: '16000', currency: 'GBP' },
      { name: 'MSc International Business', slug: 'brookes-msc-intl-business', level: 'Master', category: 'Business', durationMonths: 12, tuitionFee: '18500', currency: 'GBP' },
    ],
  },
  {
    name: 'Sorbonne University', slug: 'sorbonne-university', country: 'France', region: 'Europe', city: 'Paris', ranking: 'Top 60', established: 1257, websiteUrl: 'https://sorbonne-universite.fr', description: 'A historic multidisciplinary research university.',
    programs: [
      { name: 'Licence Mathematics', slug: 'sorbonne-licence-math', level: 'Bachelor', category: 'Science', durationMonths: 36, tuitionFee: '3000', currency: 'EUR' },
      { name: 'Master Physics', slug: 'sorbonne-master-physics', level: 'Master', category: 'Science', durationMonths: 24, tuitionFee: '4000', currency: 'EUR' },
    ],
  },
  {
    name: 'Technical University of Munich', slug: 'tu-munich', country: 'Germany', region: 'Europe', city: 'Munich', ranking: 'Top 50', established: 1868, websiteUrl: 'https://tum.de', description: 'One of Europe’s top technical universities.',
    programs: [
      { name: 'BSc Informatics', slug: 'tum-bsc-informatics', level: 'Bachelor', category: 'Computer Science', durationMonths: 36, tuitionFee: '0', currency: 'EUR' },
      { name: 'MSc Robotics', slug: 'tum-msc-robotics', level: 'Master', category: 'Engineering', durationMonths: 24, tuitionFee: '0', currency: 'EUR' },
    ],
  },
  {
    name: 'University of Melbourne', slug: 'university-of-melbourne', country: 'Australia', region: 'Asia Pacific', city: 'Melbourne', ranking: 'Top 40', established: 1853, websiteUrl: 'https://unimelb.edu.au', description: 'Australia’s leading research-intensive university.',
    programs: [
      { name: 'Bachelor of Commerce', slug: 'unimelb-bcom', level: 'Bachelor', category: 'Business', durationMonths: 36, tuitionFee: '42000', currency: 'AUD' },
      { name: 'Master of Data Science', slug: 'unimelb-mds', level: 'Master', category: 'Computer Science', durationMonths: 24, tuitionFee: '46000', currency: 'AUD' },
    ],
  },
  {
    name: 'University of Delhi', slug: 'university-of-delhi', country: 'India', region: 'Asia Pacific', city: 'Delhi', ranking: 'Top 500', established: 1922, websiteUrl: 'https://du.ac.in', description: 'A premier public collegiate research university in India.',
    programs: [
      { name: 'BA Economics', slug: 'du-ba-economics', level: 'Bachelor', category: 'Arts', durationMonths: 36, tuitionFee: '2500', currency: 'USD' },
      { name: 'MSc Computer Science', slug: 'du-msc-cs', level: 'Master', category: 'Computer Science', durationMonths: 24, tuitionFee: '3000', currency: 'USD' },
    ],
  },
]

async function main() {
  for (const c of KB_CATEGORIES) {
    await db.insert(kbCategories).values(c).onConflictDoNothing({ target: kbCategories.slug })
  }

  const regionIds: Record<string, string> = {}
  for (const r of REGIONS) {
    const [row] = await db.insert(regions).values(r).onConflictDoNothing({ target: regions.code }).returning()
    if (row) regionIds[r.code] = row.id
    else {
      const existing = await db.select().from(regions).where(sql`${regions.code} = ${r.code}`).limit(1)
      regionIds[r.code] = existing[0].id
    }
  }
  for (const c of COUNTRIES) {
    await db
      .insert(countries)
      .values({ name: c.name, code: c.code, continent: c.continent, regionId: regionIds[c.region] })
      .onConflictDoNothing({ target: countries.code })
  }

  for (const u of UNIVERSITIES) {
    const [uni] = await db
      .insert(universities)
      .values({ name: u.name, slug: u.slug, country: u.country, region: u.region, city: u.city, ranking: u.ranking, established: u.established, websiteUrl: u.websiteUrl, description: u.description, isActive: true, isMultisite: false })
      .onConflictDoNothing({ target: universities.slug })
      .returning()
    let universityId = uni?.id
    if (!universityId) {
      const existing = await db.select().from(universities).where(sql`${universities.slug} = ${u.slug}`).limit(1)
      universityId = existing[0]?.id
    }
    if (!universityId) continue
    if (uni) {
      await db.insert(universityCampuses).values({ universityId, campusName: `${u.name} — Main Campus`, country: u.country, city: u.city, region: u.region, isMain: true, isActive: true })
      for (const p of u.programs) {
        await db.insert(programs).values({ universityId, name: p.name, slug: p.slug, level: p.level, category: p.category, durationMonths: p.durationMonths, duration: `${Math.round(p.durationMonths / 12)} year(s)`, tuitionFee: p.tuitionFee, currency: p.currency, language: ['English'], isActive: true, isAllCampuses: true, deliveryMode: 'on_campus' }).onConflictDoNothing({ target: programs.slug })
      }
    }
  }
  console.log(`Catalog seed: ${UNIVERSITIES.length} universities with campuses and programs.`)

  const adminEmail = config.SEED_ADMIN_EMAIL.toLowerCase()
  const existing = await db.select().from(users).where(sql`lower(${users.email}) = ${adminEmail}`).limit(1)
  if (existing.length === 0) {
    if (!config.SEED_ADMIN_PASSWORD || config.SEED_ADMIN_PASSWORD === 'CHANGE_ME') {
      console.log('Skipping admin seed: set SEED_ADMIN_PASSWORD in .env to create the bootstrap super admin.')
    } else {
      const passwordHash = await hashPassword(config.SEED_ADMIN_PASSWORD)
      const [user] = await db.insert(users).values({ email: adminEmail, passwordHash, emailVerifiedAt: new Date() }).returning()
      await db.insert(profiles).values({
        id: user.id,
        email: adminEmail,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'admin',
        isSuperAdmin: true,
        isActive: true,
        kycStatus: 'approved',
      })
      await db.insert(userSecuritySettings).values({ userId: user.id })
      console.log(`Bootstrap super admin created: ${adminEmail}`)
    }
  } else {
    console.log(`Admin ${adminEmail} already exists — skipped.`)
  }

  console.log('Seed complete.')
  await pool.end()
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})