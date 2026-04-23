/* ============================================
   EMBERS OF US — Supabase Connector
   ============================================ */

const SUPABASE_URL = 'https://muxoajyxlssjqocgkjox.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ZQm0tkMFpXFuddRCo8Y3Vg_J74_wT_a';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.SupabaseConnector = (function() {
    'use strict';

    async function fetchStudents(batch) {
        try {
            const { data, error } = await supabaseClient
                .from('students')
                .select('name, title, message')
                .eq('batch', batch);

            if (error) {
                console.error('Supabase fetch error:', error);
                return null;
            }

            return data;
        } catch (err) {
            console.error('Supabase connection failed:', err);
            return null;
        }
    }

    return { fetchStudents };
})();
