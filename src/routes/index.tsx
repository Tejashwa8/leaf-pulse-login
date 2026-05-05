import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return;
    // No splash/loader — go straight to login. Login redirects to /app if a session exists.
    supabase.auth.getSession().finally(() => {
      navigate({ to: "/login", replace: true });
    });
  }, [navigate]);

  return null;
}
