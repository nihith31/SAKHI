from supabase import create_client, Client
from app.config import settings

# Initialize public/anon client
supabase_client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

# Initialize service role client (for administrative DB bypassing / backend overrides)
supabase_admin: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
