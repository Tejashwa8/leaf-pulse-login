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
    supabase.auth.getSession().then(({ data }) => {
      navigate({ to: data.session ? "/app" : "/login", replace: true });
    });
  }, [navigate]);
  return <div style={{ minHeight: "100vh", background: "#121212" }} />;
}
