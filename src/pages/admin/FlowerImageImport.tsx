import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Loader2, Download, ChevronDown, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NotFound {
  gd_code: string | null;
  ffc_code: string;
}
interface Failed extends NotFound {
  reason: string;
}

type Phase = "idle" | "scraping" | "importing" | "done" | "failed";

interface ScrapeProgress {
  totalUrls: number;
  scrapedTotal: number;
  indexedTotal: number;
  nextIndex: number;
}

interface ImportProgress {
  matched: number;
  processed: number;
  remaining: number;
  notFound: NotFound[];
  failed: Failed[];
}

export default function FlowerImageImport() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [statusText, setStatusText] = useState<string>("");
  const [scrape, setScrape] = useState<ScrapeProgress | null>(null);
  const [imp, setImp] = useState<ImportProgress>({
    matched: 0,
    processed: 0,
    remaining: 0,
    notFound: [],
    failed: [],
  });
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);
  const { toast } = useToast();

  const reset = () => {
    setPhase("idle");
    setScrape(null);
    setImp({
      matched: 0,
      processed: 0,
      remaining: 0,
      notFound: [],
      failed: [],
    });
    setError(null);
    setStatusText("");
    cancelledRef.current = false;
  };

  const runFlow = async () => {
    reset();
    cancelledRef.current = false;
    setPhase("scraping");
    setStatusText("Discovering FFC product URLs…");

    try {
      // 1. Start scrape — discovers all URLs
      const { data: startData, error: startErr } =
        await supabase.functions.invoke("ffc-scrape-start", { body: {} });
      if (startErr) throw startErr;
      const start = startData as { runId: string; totalUrls: number };
      if (!start.runId) throw new Error("No runId returned from scrape-start");

      setScrape({
        totalUrls: start.totalUrls,
        scrapedTotal: 0,
        indexedTotal: 0,
        nextIndex: 0,
      });
      setStatusText(
        `Discovered ${start.totalUrls} products. Scraping in batches…`,
      );

      // 2. Loop scrape batches until done
      let runId = start.runId;
      while (!cancelledRef.current) {
        const { data: batchData, error: batchErr } =
          await supabase.functions.invoke("ffc-scrape-batch", {
            body: { runId },
          });
        if (batchErr) throw batchErr;
        const b = batchData as {
          totalUrls: number;
          scrapedTotal: number;
          indexedTotal: number;
          nextIndex: number;
          done: boolean;
        };
        setScrape({
          totalUrls: b.totalUrls,
          scrapedTotal: b.scrapedTotal,
          indexedTotal: b.indexedTotal,
          nextIndex: b.nextIndex,
        });
        setStatusText(
          `Scraped ${b.scrapedTotal} of ${b.totalUrls} (${b.indexedTotal} indexed)`,
        );
        if (b.done) break;
      }

      if (cancelledRef.current) {
        setPhase("idle");
        setStatusText("Cancelled.");
        return;
      }

      // 3. Import in batches
      setPhase("importing");
      setStatusText("Matching and downloading images…");

      const skip: string[] = [];
      let totals: ImportProgress = {
        matched: 0,
        processed: 0,
        remaining: 0,
        notFound: [],
        failed: [],
      };

      // Hard cap to avoid infinite loops if the function returns 0 forever
      for (let iter = 0; iter < 500 && !cancelledRef.current; iter++) {
        const { data: ibData, error: ibErr } =
          await supabase.functions.invoke("ffc-image-import-batch", {
            body: { skipFfcCodes: skip },
          });
        if (ibErr) throw ibErr;
        const r = ibData as {
          processed: number;
          matched: number;
          notFound: NotFound[];
          failed: Failed[];
          remaining: number;
          done: boolean;
        };

        totals = {
          matched: totals.matched + r.matched,
          processed: totals.processed + r.processed,
          remaining: r.remaining,
          notFound: [...totals.notFound, ...r.notFound],
          failed: [...totals.failed, ...r.failed],
        };
        setImp(totals);
        setStatusText(
          `Imported ${totals.matched} · Not found ${totals.notFound.length} · Failed ${totals.failed.length} · ~${r.remaining} remaining`,
        );

        // Tell the next call to skip codes we know are not in cache,
        // so we don't re-fetch the same rows over and over.
        for (const nf of r.notFound) {
          if (nf.ffc_code) skip.push(nf.ffc_code);
        }

        if (r.processed === 0 || r.done) break;
      }

      setPhase("done");
      setStatusText(`Complete. Matched ${totals.matched} rows.`);
      toast({
        title: "Import complete",
        description: `Matched ${totals.matched} · Not found ${totals.notFound.length} · Failed ${totals.failed.length}`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setPhase("failed");
      setStatusText("Failed.");
      toast({
        title: "Import failed",
        description: msg,
        variant: "destructive",
      });
    }
  };

  const cancel = () => {
    cancelledRef.current = true;
  };

  const running = phase === "scraping" || phase === "importing";
  const scrapePct =
    scrape && scrape.totalUrls > 0
      ? Math.min(100, Math.round((scrape.nextIndex / scrape.totalUrls) * 100))
      : 0;

  return (
    <div className="container max-w-3xl py-6 px-4 md:py-10">
      <div className="mb-6">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-gradient-patina">
          FFC Image Import
        </h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Two-stage flow: first scrapes the FFC catalog into a cached index,
          then matches <code>flower_arrangements</code> rows by FFC code and
          downloads images in small batches. Safe to re-run.
        </p>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-6 space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={runFlow}
              disabled={running}
              size="lg"
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-display text-lg h-14"
            >
              {running ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {phase === "scraping" ? "Scraping…" : "Importing…"}
                </>
              ) : phase === "done" || phase === "failed" ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Run Again
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Run Import
                </>
              )}
            </Button>
            {running && (
              <Button
                onClick={cancel}
                variant="outline"
                size="lg"
                className="h-14"
              >
                Cancel
              </Button>
            )}
          </div>

          {statusText && (
            <div className="text-sm text-muted-foreground">{statusText}</div>
          )}

          {phase === "scraping" && scrape && (
            <div className="space-y-2">
              <Progress value={scrapePct} />
              <div className="text-xs text-muted-foreground">
                {scrape.nextIndex} / {scrape.totalUrls} URLs · {scrape.indexedTotal} indexed
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded border border-destructive/50 bg-destructive/10 text-sm text-destructive">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {(phase === "importing" || phase === "done") && (
        <Card className="mt-6 bg-card border-border">
          <CardHeader>
            <CardTitle className="font-display text-xl text-gradient-patina">
              Import Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-base font-medium">
              Matched <span className="text-primary">{imp.matched}</span>
              {" | "}Not found:{" "}
              <span className="text-primary">{imp.notFound.length}</span>
              {" | "}Failed:{" "}
              <span className="text-primary">{imp.failed.length}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Catalog cache: {scrape?.indexedTotal ?? 0} products
            </div>

            {imp.notFound.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors w-full text-left py-2 border-t border-border">
                  <ChevronDown className="w-4 h-4" />
                  Not found ({imp.notFound.length})
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="rounded border border-border bg-background/40 max-h-72 overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/30 sticky top-0">
                        <tr className="text-left">
                          <th className="px-3 py-2 font-medium">GD code</th>
                          <th className="px-3 py-2 font-medium">FFC code</th>
                        </tr>
                      </thead>
                      <tbody>
                        {imp.notFound.map((r, i) => (
                          <tr key={i} className="border-t border-border/40">
                            <td className="px-3 py-1.5 font-mono">
                              {r.gd_code ?? "—"}
                            </td>
                            <td className="px-3 py-1.5 font-mono">
                              {r.ffc_code}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {imp.failed.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors w-full text-left py-2 border-t border-border">
                  <ChevronDown className="w-4 h-4" />
                  Failed ({imp.failed.length})
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="rounded border border-border bg-background/40 max-h-72 overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/30 sticky top-0">
                        <tr className="text-left">
                          <th className="px-3 py-2 font-medium">GD code</th>
                          <th className="px-3 py-2 font-medium">FFC code</th>
                          <th className="px-3 py-2 font-medium">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {imp.failed.map((r, i) => (
                          <tr key={i} className="border-t border-border/40">
                            <td className="px-3 py-1.5 font-mono">
                              {r.gd_code ?? "—"}
                            </td>
                            <td className="px-3 py-1.5 font-mono">
                              {r.ffc_code}
                            </td>
                            <td className="px-3 py-1.5 text-destructive">
                              {r.reason}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
