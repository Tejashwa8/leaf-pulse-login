import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("leafrx_token");
    navigate({ to: token ? "/app" : "/login", replace: true });
  }, [navigate]);
  return <div style={{ minHeight: "100vh", background: "#121212" }} />;
}
