import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://fpneiplhrzayooqsjlcr.supabase.co",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwbmVpcGxocnpheW9vcXNqbGNyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTg5OTM0NiwiZXhwIjoyMDc3NDc1MzQ2fQ.Op9r9O2q8-1TetReivDTaggK5TvOeiXFcJB2WH3s9aI"
);

export default supabase;