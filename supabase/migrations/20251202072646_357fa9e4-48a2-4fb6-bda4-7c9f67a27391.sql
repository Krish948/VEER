-- Enable Row Level Security on all tables
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (single-user app)
-- Sessions policies
CREATE POLICY "Allow all access to sessions" ON sessions
  FOR ALL USING (true) WITH CHECK (true);

-- Messages policies
CREATE POLICY "Allow all access to messages" ON messages
  FOR ALL USING (true) WITH CHECK (true);

-- Notes policies
CREATE POLICY "Allow all access to notes" ON notes
  FOR ALL USING (true) WITH CHECK (true);

-- Tasks policies
CREATE POLICY "Allow all access to tasks" ON tasks
  FOR ALL USING (true) WITH CHECK (true);

-- Projects policies
CREATE POLICY "Allow all access to projects" ON projects
  FOR ALL USING (true) WITH CHECK (true);