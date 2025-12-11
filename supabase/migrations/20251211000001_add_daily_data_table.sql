-- Create daily_data table to store frequently updated information
CREATE TABLE IF NOT EXISTS daily_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_type TEXT NOT NULL, -- 'news', 'quote', 'fact', etc.
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT,
  source_url TEXT,
  metadata JSONB,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for efficient querying by type and date
CREATE INDEX IF NOT EXISTS idx_daily_data_type ON daily_data(data_type);
CREATE INDEX IF NOT EXISTS idx_daily_data_fetched_at ON daily_data(fetched_at);

-- Enable RLS
ALTER TABLE daily_data ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to daily_data" ON daily_data
  FOR SELECT USING (true);

-- Allow all access for updates (for edge functions)
CREATE POLICY "Allow all access to daily_data" ON daily_data
  FOR ALL USING (true) WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_daily_data_updated_at BEFORE UPDATE ON daily_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
