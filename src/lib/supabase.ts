import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://vzpglyzsixdigdatgnda.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_rlkyG-l57wfZ855XrZ8Htw_4pKCEqok";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
