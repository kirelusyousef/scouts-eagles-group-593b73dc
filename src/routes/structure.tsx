import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/structure")({
  beforeLoad: () => {
    throw redirect({ to: "/hierarchy" });
  },
});
