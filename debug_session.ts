import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://lhognrxzhmqnjqgdvpzz.supabase.co"
const supabaseKey = "sb_publishable_YjF5h6NJXsMEySiYuCx56Q_RzPs0Qrg"
const supabase = createClient(supabaseUrl, supabaseKey)

async function debug() {
    const { data, error } = await supabase
        .from('course_sessions' as any)
        .select('*')
        .limit(1)

    if (error) {
        console.error('Error fetching course_sessions:', error)
    } else if (data && data.length > 0) {
        console.log('Columns in course_sessions:', Object.keys(data[0]))
        console.log('Sample data:', data[0])
    } else {
        // If no rows, try to insert a dummy row or check if we can query info schema via RPC
        console.log('Table is empty. Checking courses table for comparison.')
        const { data: c } = await supabase.from('courses').select('*').limit(1)
        if (c) console.log('Columns in courses:', Object.keys(c[0]))
    }
}

debug()
