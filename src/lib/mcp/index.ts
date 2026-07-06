import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listUsersTool from "./tools/list-users";
import listNewsTool from "./tools/list-news";
import whoamiTool from "./tools/whoami";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "scouts-eagles-mcp",
  title: "النسور — Scout Group MCP",
  version: "0.1.0",
  instructions:
    "Tools for the النسور scout group management app. Use `whoami` to verify auth, `list_users` to browse members, and `list_news` for announcements.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoamiTool, listUsersTool, listNewsTool],
});
