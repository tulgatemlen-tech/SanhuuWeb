import{createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = "https://cuxppqgyvyedgzhzyols.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1eHBwcWd5dnllZGd6aHp5b2xzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NjgyNjIsImV4cCI6MjA5NjU0NDI2Mn0.L343Fkolhteqz-xOu8Inra3N-u4P6gw2OtxJ8Hs6Q8Y";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

if(supabase.auth){
    console.log("holbogdson bn")
    console.log(supabase.auth)
}else{
    console.log("holbogdoogui bn")
    console.log(supabase.auth)
}