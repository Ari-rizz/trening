import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
if (!stripeSecret) {
  console.error('STRIPE_SECRET_KEY is not set');
}
const stripe = new Stripe(stripeSecret ?? '', {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

function corsResponse(body: string | object | null, status = 200) {
  if (status === 204) {
    return new Response(null, { status, headers: corsHeaders });
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return corsResponse({}, 204);
    }

    if (req.method !== 'POST') {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    const { price_id, success_url, cancel_url, mode } = await req.json();

    if (!price_id || typeof price_id !== 'string' || price_id.trim() === '') {
      return corsResponse({ error: 'Pris-ID mangler. Kontakt support.' }, 400);
    }

    if (!success_url || typeof success_url !== 'string') {
      return corsResponse({ error: 'Success URL mangler' }, 400);
    }

    if (!cancel_url || typeof cancel_url !== 'string') {
      return corsResponse({ error: 'Cancel URL mangler' }, 400);
    }

    if (!mode || !['payment', 'subscription'].includes(mode)) {
      return corsResponse({ error: 'Ugyldig modus' }, 400);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return corsResponse({ error: 'Authorization header mangler' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser(token);

    if (getUserError) {
      console.error('getUser error:', getUserError.message);
      return corsResponse({ error: 'Kunne ikke autentisere brukeren' }, 401);
    }

    if (!user) {
      return corsResponse({ error: 'Bruker ikke funnet' }, 404);
    }

    const { data: customer, error: getCustomerError } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (getCustomerError) {
      console.error('Failed to fetch customer:', getCustomerError.message);
      return corsResponse({ error: 'Kunne ikke hente kundeinformasjon' }, 500);
    }

    let customerId: string;

    if (!customer || !customer.customer_id) {
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });

      console.log(`Created new Stripe customer ${newCustomer.id} for user ${user.id}`);

      const { error: createCustomerError } = await supabase.from('stripe_customers').insert({
        user_id: user.id,
        customer_id: newCustomer.id,
      });

      if (createCustomerError) {
        console.error('Failed to save customer:', createCustomerError.message);
        try {
          await stripe.customers.del(newCustomer.id);
          await supabase.from('stripe_subscriptions').delete().eq('customer_id', newCustomer.id);
        } catch (deleteError) {
          console.error('Cleanup failed:', (deleteError as Error).message);
        }
        return corsResponse({ error: 'Kunne ikke opprette kundekobling' }, 500);
      }

      if (mode === 'subscription') {
        const { error: createSubscriptionError } = await supabase.from('stripe_subscriptions').insert({
          customer_id: newCustomer.id,
          status: 'not_started',
        });

        if (createSubscriptionError) {
          console.error('Failed to save subscription:', createSubscriptionError.message);
          try {
            await stripe.customers.del(newCustomer.id);
          } catch (deleteError) {
            console.error('Failed to delete customer:', (deleteError as Error).message);
          }
          return corsResponse({ error: 'Kunne ikke lagre abonnementet' }, 500);
        }
      }

      customerId = newCustomer.id;
      console.log(`Successfully set up new customer ${customerId}`);
    } else {
      customerId = customer.customer_id;

      if (mode === 'subscription') {
        const { data: subscription, error: getSubscriptionError } = await supabase
          .from('stripe_subscriptions')
          .select('status')
          .eq('customer_id', customerId)
          .maybeSingle();

        if (getSubscriptionError) {
          console.error('Failed to fetch subscription:', getSubscriptionError.message);
          return corsResponse({ error: 'Kunne ikke hente abonnementsinformasjon' }, 500);
        }

        if (!subscription) {
          const { error: createSubscriptionError } = await supabase.from('stripe_subscriptions').insert({
            customer_id: customerId,
            status: 'not_started',
          });

          if (createSubscriptionError) {
            console.error('Failed to create subscription record:', createSubscriptionError.message);
            return corsResponse({ error: 'Kunne ikke opprette abonnementspost' }, 500);
          }
        }
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      mode,
      success_url,
      cancel_url,
    });

    console.log(`Created checkout session ${session.id} for customer ${customerId}`);

    return corsResponse({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error(`Checkout error: ${error.message}`);
    return corsResponse({ error: error.message ?? 'Noe gikk galt' }, 500);
  }
});
