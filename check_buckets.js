import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: 'c:/Users/GO2SKUL/Downloads/admission-desk-new/admission-desk-new/.env' })

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkBuckets() {
  const { data, error } = await supabase.storage.listBuckets()
  if (error) {
    console.error('Error fetching buckets:', error)
  } else {
    console.log('Buckets:')
    data.forEach(b => console.log(`- ${b.name}`))
  }
}

checkBuckets()
