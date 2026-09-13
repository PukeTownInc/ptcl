/*
# Create user_profiles table for cloud save sync

1. New Tables
- `user_profiles`
  - `id` (uuid, primary key, references auth.users) — one row per user
  - `email` (text) — cached email for display
  - `data` (jsonb) — full game state blob for cloud sync
  - `created_at` (timestamptz) — when the profile was first created
  - `last_synced` (timestamptz) — when data was last synced

2. Security
- Enable RLS on `user_profiles`.
- Owner-scoped CRUD: each authenticated user can only read/write their own row.
- `id` defaults to `auth.uid()` so inserts from the client (which omit `id`) succeed.

3. Notes
- The `data` column stores the entire game state as a JSON blob, enabling
  simple load/save semantics without complex schema mapping.
- Guest users (not signed in) continue to use localStorage only.
- Withdrawal is blocked unless the user is authenticated.
*/

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  last_synced timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON user_profiles;
CREATE POLICY "select_own_profile"
ON user_profiles FOR SELECT
TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON user_profiles;
CREATE POLICY "insert_own_profile"
ON user_profiles FOR INSERT
TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON user_profiles;
CREATE POLICY "update_own_profile"
ON user_profiles FOR UPDATE
TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON user_profiles;
CREATE POLICY "delete_own_profile"
ON user_profiles FOR DELETE
TO authenticated USING (auth.uid() = id);
