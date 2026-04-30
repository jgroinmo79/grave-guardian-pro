import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, Play, Pause, Search } from "lucide-react";

const BATCH_SIZE = 15;

type Failed = { url: string; reason: string };

export default function FfcScraper() {
  const [productUrls, setProductUrls] = useState<string[]>([]);
  const [fetchingList, setFetchingList] = useState(false);
  const [running, setRunning] = useState(false);
  const [offset, setOffset] = useState(0);
  const [done, setDone] = useState(false);
  const [totalSaved, setTotalSaved] = useState(0);
  const [totalSkipped, setTotalSkipped] = useState(0);
  const [savedLog, setSavedLog] = useState<string[]>([]);
  const [failedLog, setFailedLog] = useState<Failed[]>([]);
  const [batchNum, setBatchNum] = useState(0);
  const pauseRef = useRef(false);

  const fetchProductList = async () => {
    setFetchingList(true);
    setProductUrls([]);
    try {
      const { data, error } = await supabase.functions.invoke("ffc-get-products", {
        body: {},
      });
      if (error) throw error;
      const list: string[] = data?.urls ?? [];
      setProductUrls(list);
      toast.success(`Found ${list.length} products — ready to import`);
    } catch (e) {
      toast.error(`Error: ${(e as Error).message}`);
    } finally {
      setFetchingList(false);
    }
  };

  const runLoop = async (startOffset: number) => {
    setRunning(true);
    pauseRef.current = false;
    let currentOffset = startOffset;
    let batch = batchNum;

    while (!pauseRef.current && currentOffset < productUrls.length) {
      batch++;
      setBatchNum(batch);
      try {
        const { data, error } = await supabase.functions.invoke("ffc-scraper", {
          body: { offset: currentOffset, limit: BATCH_SIZE, productUrls },
        });
        if (error) throw error;
        if (!data) throw new Error("No data");

        setTotalSaved((s) => s + (data.saved || 0));
        setTotalSkipped((s) => s + (data.skipped || 0));
        if (data.savedNames?.length) {
          setSavedLog((l) => [...l, ...data.savedNames]);
        }
        if (data.failed?.length) {
          setFailedLog((l) => [...l, ...data.failed]);
        }

        currentOffset = data.nextOffset;
        setOffset(currentOffset);

        if (data.done) {
          setDone(true);
          toast.success("Import complete");
          break;
        }
      } catch (e) {
        toast.error(`Batch failed: ${(e as Error).message}`);
        break;
      }

      // wait 2s between calls
      await new Promise((r) => setTimeout(r, 2000));
    }
    setRunning(false);
  };

  const handleStart = () => {
    if (productUrls.length === 0) {
      toast.error("Fetch product list first");
      return;
    }
    setOffset(0);
    setDone(false);
    setTotalSaved(0);
    setTotalSkipped(0);
    setSavedLog([]);
    setFailedLog([]);
    setBatchNum(0);
    runLoop(0);
  };

  const handlePause = () => {
    pauseRef.current = true;
    toast.message("Pausing after current batch...");
  };

  const handleResume = () => {
    runLoop(offset);
  };

  const progress = productUrls.length > 0 ? (offset / productUrls.length) * 100 : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="font-display text-3xl text-gradient-bronze">FFC Scraper</h1>
        <p className="font-body text-sm text-muted-foreground">
          Import flower arrangements from FlowersForCemeteries.com
        </p>
      </div>

      {/* Step 1 */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">Step 1 — Fetch Product List</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={fetchProductList}
            disabled={fetchingList || running}
            variant="accent"
            className="w-full sm:w-auto"
          >
            {fetchingList ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Search />
            )}
            Fetch Product List
          </Button>
          {fetchingList && (
            <p className="font-body text-sm text-muted-foreground">
              Fetching product list from FFC...
            </p>
          )}
          {productUrls.length > 0 && !fetchingList && (
            <p className="font-body text-sm">
              Found <span className="font-bold text-primary">{productUrls.length}</span> products
            </p>
          )}
        </CardContent>
      </Card>

      {/* Step 2 */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">Step 2 — Start Import</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {!running && offset === 0 && (
              <Button
                onClick={handleStart}
                disabled={productUrls.length === 0}
                variant="accent"
              >
                <Play /> Start Import
              </Button>
            )}
            {running && (
              <Button onClick={handlePause} variant="outline">
                <Pause /> Pause
              </Button>
            )}
            {!running && offset > 0 && !done && (
              <Button onClick={handleResume} variant="accent">
                <Play /> Resume
              </Button>
            )}
            {done && (
              <Button onClick={handleStart} variant="outline">
                Run Again
              </Button>
            )}
          </div>

          {(running || offset > 0) && (
            <>
              <Progress value={progress} />
              <p className="font-body text-sm">
                Batch {batchNum} — Processed {offset} of {productUrls.length}
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-md bg-muted/30">
                  <div className="font-display text-2xl text-primary">{totalSaved}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Saved</div>
                </div>
                <div className="p-3 rounded-md bg-muted/30">
                  <div className="font-display text-2xl">{totalSkipped}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Skipped</div>
                </div>
                <div className="p-3 rounded-md bg-muted/30">
                  <div className="font-display text-2xl text-destructive">{failedLog.length}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Failed</div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Saved log */}
      {savedLog.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg">Saved ({savedLog.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48 rounded border border-border p-3">
              <ul className="space-y-1 font-body text-sm">
                {savedLog.map((n, i) => (
                  <li key={i} className="text-foreground/80">
                    ✓ {n}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Failed log */}
      {failedLog.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg text-destructive">
              Failed ({failedLog.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48 rounded border border-border p-3">
              <ul className="space-y-2 font-body text-xs">
                {failedLog.map((f, i) => (
                  <li key={i}>
                    <div className="text-foreground/70 truncate">{f.url}</div>
                    <div className="text-destructive">{f.reason}</div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
