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

/**
 * Dual-Data Economic Intelligence Service
 * 
 * CPIAUCSL: Consumer Price Index (CPI-U) - Historical baseline (1994-2024 avg: ~2.54%)
 * T10YIE: 10-Year Breakeven Inflation Rate - Current market expectations
 * 
 * The Boldin framework uses CPI-U for historical context while T10YIE anchors
 * Monte Carlo simulations to current market sentiment.
 */

async function fetchFredSeries(seriesId: string, apiKey: string): Promise<{ date: string; value: number } | null> {
  try {
    const fredUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=1`;
    
    const response = await fetch(fredUrl);
    
    if (!response.ok) {
      console.error(`FRED API error for ${seriesId}:`, response.status);
      return null;
    }

    const data: FredResponse = await response.json();
    
    if (!data.observations || data.observations.length === 0) {
      console.error(`No data from FRED for ${seriesId}`);
      return null;
    }

    const latest = data.observations[0];
    const value = parseFloat(latest.value);

    if (isNaN(value)) {
      console.error(`Invalid value from FRED for ${seriesId}:`, latest.value);
      return null;
    }

    return { date: latest.date, value };
  } catch (error) {
    console.error(`Error fetching ${seriesId}:`, error);
    return null;
  }
}

// Calculate CPI-U historical average (year-over-year % change)
async function fetchCPIHistoricalAverage(apiKey: string): Promise<{ value: number; latestDate: string } | null> {
  try {
    // Fetch last 30 years of monthly CPI data
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = '1994-01-01';
    
    const fredUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=CPIAUCSL&api_key=${apiKey}&file_type=json&observation_start=${startDate}&observation_end=${endDate}&frequency=a&aggregation_method=avg&units=pc1`;
    
    const response = await fetch(fredUrl);
    
    if (!response.ok) {
      console.error('FRED API error for CPIAUCSL:', response.status);
      return null;
    }

    const data: FredResponse = await response.json();
    
    if (!data.observations || data.observations.length === 0) {
      console.error('No CPIAUCSL data from FRED');
      return null;
    }

    // Calculate average of annual percentage changes
    let sum = 0;
    let count = 0;
    
    for (const obs of data.observations) {
      const val = parseFloat(obs.value);
      if (!isNaN(val)) {
        sum += val;
        count++;
      }
    }

    if (count === 0) return null;

    const average = sum / count;
    const latestDate = data.observations[data.observations.length - 1].date;

    console.log(`CPIAUCSL historical average (${startDate} to ${latestDate}): ${average.toFixed(2)}%`);
    
    return { value: Math.round(average * 100) / 100, latestDate };
  } catch (error) {
    console.error('Error calculating CPI average:', error);
    return null;
  }
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

    // Create Supabase clients
    const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
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

    console.log('Fetching dual economic data for user:', user.id);

    // Fetch both data sources in parallel
    const [cpiData, t10yieData] = await Promise.all([
      fetchCPIHistoricalAverage(FRED_API_KEY),
      fetchFredSeries('T10YIE', FRED_API_KEY)
    ]);

    if (!cpiData && !t10yieData) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch any FRED data' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('CPIAUCSL (Historical Baseline):', cpiData?.value, '%');
    console.log('T10YIE (Market Sentiment):', t10yieData?.value, '%');

    // Prepare update object
    const updateData: Record<string, unknown> = {
      last_updated_from_api: new Date().toISOString()
    };

    if (cpiData) {
      updateData.historical_avg = cpiData.value;
    }

    if (t10yieData) {
      updateData.market_sentiment = t10yieData.value;
    }

    // Update the user's General Inflation record
    const { data: existingRecord, error: fetchError } = await supabaseAdmin
      .from('rate_assumptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('category', 'General')
      .eq('name', 'Inflation')
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching existing record:', fetchError);
    }

    if (existingRecord) {
      // Update existing record
      const { error: updateError } = await supabaseAdmin
        .from('rate_assumptions')
        .update(updateData)
        .eq('id', existingRecord.id);

      if (updateError) {
        console.error('Database update error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update database', details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Insert new record
      const { error: insertError } = await supabaseAdmin
        .from('rate_assumptions')
        .insert({
          user_id: user.id,
          category: 'General',
          name: 'Inflation',
          description: 'General price level increase based on CPI-U',
          historical_avg: cpiData?.value || 2.54,
          market_sentiment: t10yieData?.value || null,
          user_optimistic: Math.max(1.5, (cpiData?.value || 2.54) - 1),
          user_pessimistic: (cpiData?.value || 2.54) + 1.5,
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
          cpi: cpiData ? {
            series: 'CPIAUCSL',
            description: 'CPI-U Historical Average (1994-present)',
            value: cpiData.value,
            date: cpiData.latestDate,
            usage: 'Historical baseline for rate assumptions'
          } : null,
          marketSentiment: t10yieData ? {
            series: 'T10YIE',
            description: '10-Year Breakeven Inflation Rate',
            value: t10yieData.value,
            date: t10yieData.date,
            usage: 'Monte Carlo simulation anchor'
          } : null
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
