import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  appInfo: { name: 'Bolt Integration', version: '1.0.0' },
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;

    // 1. Cancel any active Stripe subscription immediately
    const { data: customer } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle();

    if (customer?.customer_id) {
      const { data: subscription } = await supabase
        .from('stripe_subscriptions')
        .select('subscription_id, status')
        .eq('customer_id', customer.customer_id)
        .maybeSingle();

      if (subscription?.subscription_id) {
        const status = subscription.status;
        if (status === 'active' || status === 'trialing') {
          try {
            await stripe.subscriptions.cancel(subscription.subscription_id);
          } catch (e) {
            console.error('Stripe cancel error:', (e as Error).message);
          }
        }
      }
    }

    // 2. Delete all user data from every table.
    // Child tables (workout_sets, workout_exercises, template_exercises) are
    // removed automatically via ON DELETE CASCADE when their parent is deleted.
    const tables = [
      'personal_records',
      'cardio_logs',
      'muscle_activation',
      'body_weight_logs',
      'goals',
      'feedback',
      'notification_preferences',
      'push_subscriptions',
      'terms_acceptance',
      'user_exercise_preferences',
      'workout_templates',
      'workouts',
      'shared_templates',
      'exercises',
      'iap_subscriptions',
      'daily_calorie_logs',
    ];

    for (const table of tables) {
      // exercises: delete only custom exercises created by this user
      if (table === 'exercises') {
        const { error } = await supabase
          .from('exercises')
          .delete()
          .eq('created_by', userId)
          .eq('is_custom', true);
        if (error) console.error(`delete ${table} error:`, error.message);
        continue;
      }

      // shared_templates: delete rows where user is the owner
      if (table === 'shared_templates') {
        const { error } = await supabase
          .from('shared_templates')
          .delete()
          .eq('owner_user_id', userId);
        if (error) console.error(`delete ${table} error:`, error.message);
        continue;
      }

      const { error } = await supabase
        .from(table)
        .delete()
        .eq('user_id', userId);
      if (error) console.error(`delete ${table} error:`, error.message);
    }

    // 3. Delete Stripe customer records
    const { error: stripeCustError } = await supabase
      .from('stripe_customers')
      .delete()
      .eq('user_id', userId);
    if (stripeCustError) console.error('delete stripe_customers error:', stripeCustError.message);

    // 4. Delete the profile row
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    if (profileError) console.error('delete profiles error:', profileError.message);

    // 5. Finally, delete the auth user
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      console.error('delete auth user error:', deleteUserError.message);
      return new Response(JSON.stringify({ error: 'Kunne ikke slette innloggingskontoen. All annen data er slettet.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('Delete account error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
