import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, subHours, startOfDay, parseISO } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Eye, Users, Clock, ArrowUpDown, Monitor, Smartphone, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

type Range = "24h" | "7d" | "30d";

const AdminAnalytics = () => {
  const [range, setRange] = useState<Range>("7d");

  const rangeStart = range === "24h"
    ? subHours(new Date(), 24).toISOString()
    : range === "7d"
    ? subDays(new Date(), 7).toISOString()
    : subDays(new Date(), 30).toISOString();

  const { data: pageViews, isLoading } = useQuery({
    queryKey: ["admin-page-views", range],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_views" as any)
        .select("*")
        .gte("created_at", rangeStart)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: signups } = useQuery({
    queryKey: ["admin-email-signups-analytics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_signups")
        .select("id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Loading analytics…</p>;

  const views = pageViews ?? [];
  const totalViews = views.length;
  const uniqueSessions = new Set(views.map((v: any) => v.session_id)).size;
  const avgPerSession = uniqueSessions > 0 ? (totalViews / uniqueSessions).toFixed(1) : "0";

  // Bounce rate: sessions with only 1 page view
  const sessionCounts: Record<string, number> = {};
  views.forEach((v: any) => {
    sessionCounts[v.session_id] = (sessionCounts[v.session_id] || 0) + 1;
  });
  const singlePageSessions = Object.values(sessionCounts).filter((c) => c === 1).length;
  const bounceRate = uniqueSessions > 0 ? Math.round((singlePageSessions / uniqueSessions) * 100) : 0;

  // Daily chart data
  const dailyMap: Record<string, { views: number; sessions: Set<string> }> = {};
  views.forEach((v: any) => {
    const day = format(parseISO(v.created_at), "MMM d");
    if (!dailyMap[day]) dailyMap[day] = { views: 0, sessions: new Set() };
    dailyMap[day].views++;
    dailyMap[day].sessions.add(v.session_id);
  });
  const dailyData = Object.entries(dailyMap).map(([date, d]) => ({
    date,
    views: d.views,
    visitors: d.sessions.size,
  }));

  // Top pages
  const pageCounts: Record<string, number> = {};
  views.forEach((v: any) => { pageCounts[v.url] = (pageCounts[v.url] || 0) + 1; });
  const topPages = Object.entries(pageCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([url, count]) => ({ url, count }));

  // Device breakdown
  const mobileCount = views.filter((v: any) => v.screen_width && v.screen_width < 768).length;
  const tabletCount = views.filter((v: any) => v.screen_width && v.screen_width >= 768 && v.screen_width < 1024).length;
  const desktopCount = views.filter((v: any) => v.screen_width && v.screen_width >= 1024).length;
  const deviceData = [
    { name: "Mobile", value: mobileCount, color: "hsl(27, 38%, 60%)" },
    { name: "Tablet", value: tabletCount, color: "hsl(27, 32%, 36%)" },
    { name: "Desktop", value: desktopCount, color: "hsl(0, 0%, 42%)" },
  ].filter((d) => d.value > 0);

  // Referrer breakdown
  const refCounts: Record<string, number> = {};
  views.forEach((v: any) => {
    const ref = v.referrer ? new URL(v.referrer).hostname : "Direct";
    refCounts[ref] = (refCounts[ref] || 0) + 1;
  });
  const topRefs = Object.entries(refCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([source, count]) => ({ source, count }));

  const stats = [
    { label: "Page Views", value: totalViews, icon: Eye, color: "text-primary" },
    { label: "Unique Visitors", value: uniqueSessions, icon: Users, color: "text-accent" },
    { label: "Pages/Session", value: avgPerSession, icon: ArrowUpDown, color: "text-primary" },
    { label: "Bounce Rate", value: `${bounceRate}%`, icon: Clock, color: "text-accent" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Website Analytics</h1>
          <p className="text-sm text-muted-foreground">Traffic and visitor insights</p>
        </div>
        <div className="flex gap-2">
          {(["24h", "7d", "30d"] as Range[]).map((r) => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? "default" : "outline"}
              onClick={() => setRange(r)}
            >
              {r === "24h" ? "24 Hours" : r === "7d" ? "7 Days" : "30 Days"}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-display font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Email signups stat */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Email Signups (All Time)</p>
          <Users className="w-4 h-4 text-primary" />
        </div>
        <p className="text-2xl font-display font-bold mt-2">{signups?.length ?? 0}</p>
      </div>

      {/* Traffic chart */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-display font-semibold mb-4">Traffic Over Time</h2>
        {dailyData.length === 0 ? (
          <p className="text-sm text-muted-foreground">No traffic data yet for this period.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyData}>
              <XAxis dataKey="date" stroke="hsl(0,0%,42%)" fontSize={12} />
              <YAxis stroke="hsl(0,0%,42%)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(0,0%,17%)",
                  border: "1px solid hsl(0,0%,22%)",
                  borderRadius: "8px",
                  color: "hsl(30,10%,88%)",
                }}
              />
              <Bar dataKey="views" fill="hsl(27,38%,60%)" name="Page Views" radius={[4, 4, 0, 0]} />
              <Bar dataKey="visitors" fill="hsl(27,32%,36%)" name="Visitors" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4" /> Top Pages
          </h2>
          {topPages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data yet.</p>
          ) : (
            <div className="space-y-3">
              {topPages.map((p) => (
                <div key={p.url} className="flex justify-between items-center text-sm">
                  <span className="text-foreground truncate max-w-[200px]">{p.url}</span>
                  <span className="text-muted-foreground font-mono">{p.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Device Breakdown */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-display font-semibold mb-4 flex items-center gap-2">
            <Monitor className="w-4 h-4" /> Devices
          </h2>
          {deviceData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data yet.</p>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={deviceData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3}>
                    {deviceData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {deviceData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-foreground">{d.name}</span>
                    <span className="text-muted-foreground ml-auto">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Referrers */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-display font-semibold mb-4">Traffic Sources</h2>
          {topRefs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data yet.</p>
          ) : (
            <div className="space-y-3">
              {topRefs.map((r) => (
                <div key={r.source} className="flex justify-between items-center text-sm">
                  <span className="text-foreground">{r.source}</span>
                  <span className="text-muted-foreground font-mono">{r.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
