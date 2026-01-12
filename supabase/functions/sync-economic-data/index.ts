import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FredObservation {
  date: string;
  value: string;
}

interface FredResponse {
  observations: FredObservation[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FRED_API_KEY = Deno.env.get('FRED_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!FRED_API_KEY) {
      console.error('FRED_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'FRED API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseAdmin = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify user token
    const supabaseUser = createClient(
      SUPABASE_URL!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching FRED data for user:', user.id);

    // Fetch 10-Year Breakeven Inflation Rate (T10YIE)
    // This is the market's expected inflation rate over the next 10 years
    const fredUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=T10YIE&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=1`;
    
    const fredResponse = await fetch(fredUrl);
    
    if (!fredResponse.ok) {
      console.error('FRED API error:', fredResponse.status, await fredResponse.text());
      return new Response(
        JSON.stringify({ error: 'Failed to fetch FRED data' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fredData: FredResponse = await fredResponse.json();
    console.log('FRED response:', JSON.stringify(fredData));

    if (!fredData.observations || fredData.observations.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No data from FRED' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const latestObservation = fredData.observations[0];
    const inflationRate = parseFloat(latestObservation.value);

    if (isNaN(inflationRate)) {
      console.error('Invalid inflation rate value:', latestObservation.value);
      return new Response(
        JSON.stringify({ error: 'Invalid data from FRED' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Latest 10-Year Breakeven Inflation Rate:', inflationRate, '% as of', latestObservation.date);

    // Update the user's General Inflation historical_avg
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('rate_assumptions')
      .update({
        historical_avg: inflationRate,
        last_updated_from_api: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('category', 'General')
      .eq('name', 'Inflation')
      .select();

    if (updateError) {
      console.error('Database update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update database', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no rows updated, the user might not have the assumption yet
    if (!updateData || updateData.length === 0) {
      // Insert a new record
      const { error: insertError } = await supabaseAdmin
        .from('rate_assumptions')
        .insert({
          user_id: user.id,
          category: 'General',
          name: 'Inflation',
          description: 'General price level increase based on CPI',
          historical_avg: inflationRate,
          user_optimistic: Math.max(1.5, inflationRate - 1),
          user_pessimistic: inflationRate + 1.5,
          last_updated_from_api: new Date().toISOString()
        });

      if (insertError) {
        console.error('Database insert error:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to insert into database', details: insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          series: 'T10YIE',
          date: latestObservation.date,
          value: inflationRate,
          description: '10-Year Breakeven Inflation Rate'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
