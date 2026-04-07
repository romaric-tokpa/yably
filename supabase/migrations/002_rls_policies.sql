-- Row Level Security — specs.md §2.7

ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharmacies_read" ON pharmacies FOR SELECT USING (true);
CREATE POLICY "pharmacies_write" ON pharmacies FOR ALL USING (
  auth.jwt() ->> 'role' = 'admin'
);

ALTER TABLE gardes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gardes_read" ON gardes FOR SELECT USING (true);
CREATE POLICY "gardes_write" ON gardes FOR ALL USING (
  auth.jwt() ->> 'role' = 'admin'
);

ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "verifications_read" ON verifications FOR SELECT USING (true);
CREATE POLICY "verifications_insert" ON verifications FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
