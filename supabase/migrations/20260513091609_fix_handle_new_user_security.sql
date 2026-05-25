/*
  # Fix security issues on handle_new_user function

  1. Security Changes
    - Set immutable search_path to prevent search path manipulation
    - Revoke EXECUTE from public, anon, and authenticated roles to prevent direct RPC calls
    - Function remains callable only by the trigger (auth.users INSERT)
*/

ALTER FUNCTION public.handle_new_user() SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
