import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get authenticated user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anonClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { code, action } = body;

    if (action === 'unlink') {
      // Unlink: remove user_id from telegram_users where user_id = current user
      await supabase
        .from('telegram_users')
        .update({ user_id: null, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!code || typeof code !== 'string') {
      return new Response(JSON.stringify({ error: 'code is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find telegram user by code
    const { data: telegramUser, error: findError } = await supabase
      .from('telegram_users')
      .select('telegram_id, link_code_expires_at, user_id')
      .eq('link_code', code.toUpperCase())
      .maybeSingle();

    if (findError || !telegramUser) {
      return new Response(JSON.stringify({ error: 'Неверный код' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check expiry
    if (
      telegramUser.link_code_expires_at &&
      new Date(telegramUser.link_code_expires_at) < new Date()
    ) {
      return new Response(JSON.stringify({ error: 'Код устарел. Получи новый в боте через /link' }), {
        status: 410,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check not already linked to another user
    if (telegramUser.user_id && telegramUser.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Этот Telegram уже привязан к другому аккаунту' }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Link!
    const { error: updateError } = await supabase
      .from('telegram_users')
      .update({
        user_id: user.id,
        link_code: null,
        link_code_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('telegram_id', telegramUser.telegram_id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('telegram-link error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
