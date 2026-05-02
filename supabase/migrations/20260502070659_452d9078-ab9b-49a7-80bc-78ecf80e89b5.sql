REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_project_member(UUID, UUID) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, public, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_member(UUID, UUID) TO authenticated;