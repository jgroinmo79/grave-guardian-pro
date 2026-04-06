import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Generate a session ID that persists for the browser tab
const getSessionId = () => {
  let sid = sessionStorage.getItem("gd_session");
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem("gd_session", sid);
  }
  return sid;
};

const PageViewTracker = () => {
  const location = useLocation();
  const lastTracked = useRef("");

  useEffect(() => {
    const key = location.pathname + location.search;
    if (key === lastTracked.current) return;
    lastTracked.current = key;

    // Don't track admin pages
    if (location.pathname.startsWith("/admin")) return;

    supabase.from("page_views" as any).insert({
      url: location.pathname + location.search,
      referrer: document.referrer || null,
      screen_width: window.innerWidth,
      user_agent: navigator.userAgent,
      session_id: getSessionId(),
    } as any).then(() => {});
  }, [location.pathname, location.search]);

  return null;
};

export default PageViewTracker;

export { getSessionId };
