import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401 });
  }

  // Client scoped to the caller's own JWT, used only to verify who is calling.
  const callerClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData?.user) {
    return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401 });
  }

  const { data: callerProfile, error: profileError } = await callerClient
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profileError || callerProfile?.role !== "admin") {
    return new Response(JSON.stringify({ error: "Only admins can create employee accounts" }), { status: 403 });
  }

  let body: { email?: string; password?: string; full_name?: string; phone_number?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const { email, password, full_name, phone_number } = body;
  if (!email || !password || !full_name) {
    return new Response(JSON.stringify({ error: "email, password and full_name are required" }), { status: 400 });
  }
  if (password.length < 6) {
    return new Response(JSON.stringify({ error: "Password must be at least 6 characters" }), { status: 400 });
  }

  // Admin client with full service-role privileges, used only after the
  // caller has been verified as an admin above.
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, phone_number },
  });

  if (createError || !created?.user) {
    return new Response(JSON.stringify({ error: createError?.message || "Failed to create user" }), { status: 400 });
  }

  // The on_auth_user_created trigger will have inserted a profile row with
  // status='pending'. Since an admin is creating this account directly,
  // approve it immediately.
  const { error: approveError } = await adminClient
    .from("profiles")
    .update({ status: "approved" })
    .eq("id", created.user.id);

  if (approveError) {
    return new Response(JSON.stringify({ error: approveError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ id: created.user.id, email: created.user.email }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
