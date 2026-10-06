# supabase_client.py
# Creates ONE connection to Supabase that the whole backend reuses.

from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

# The backend uses the SERVICE key because it is trusted server-side code.
# This key must NEVER go into the React frontend.
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)