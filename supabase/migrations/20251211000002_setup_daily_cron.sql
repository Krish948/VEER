-- Enable the pg_cron and pg_net extensions for scheduled HTTP calls
-- Note: These extensions need to be enabled in your Supabase Dashboard first
-- Go to Database > Extensions and enable pg_cron and pg_net

-- Create a scheduled job to update daily data every day at 6 AM UTC
-- This will be created when you run this migration after enabling the extensions

DO $$
BEGIN
  -- Check if pg_cron is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Delete existing schedule if any
    PERFORM cron.unschedule('update-daily-data');
    
    -- Schedule the update-daily-data function to run daily at 6 AM UTC
    -- Note: You need to replace YOUR_SUPABASE_URL and YOUR_ANON_KEY with actual values
    -- Or use the net.http_post function with your Edge Function URL
    PERFORM cron.schedule(
      'update-daily-data',
      '0 6 * * *', -- Every day at 6:00 AM UTC
      $$
      SELECT net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/update-daily-data',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
        ),
        body := jsonb_build_object('force', false)
      );
      $$
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- pg_cron might not be enabled, that's okay
    RAISE NOTICE 'Could not schedule cron job: %. Enable pg_cron and pg_net extensions in Supabase Dashboard.', SQLERRM;
END $$;

-- Alternative: Create a simple function that can be called manually or via external scheduler
CREATE OR REPLACE FUNCTION trigger_daily_data_update()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function can be called to trigger the daily update
  -- It sets a flag that the edge function can check
  -- In practice, you'd call the edge function directly via HTTP
  RAISE NOTICE 'Daily data update triggered at %', now();
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION trigger_daily_data_update() TO anon, authenticated;
