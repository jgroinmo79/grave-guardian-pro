import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Loader2, Download, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImportReport {
  totalInCatalog: number;
  rowsChecked: number;
  matched: number;
  notFound: { gd_code: string | null; ffc_code: string }[];
  failed: { gd_code: string | null; ffc_code: string; reason: string }[];
  durationMs: number;
}

export default function FlowerImageImport() {
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const runImport = async () => {
    setRunning(true);
    setReport(null);
    setError(null);

    try {
      const { data, error: fnErr } = await supabase.functions.invoke(
        "ffc-image-import",
        { body: {} },
      );
      if (fnErr) throw fnErr;
      if ((data as { error?: string })?.error) {
        throw new Error((data as { error: string }).error);
      }
      setReport(data as ImportReport);
      toast({
        title: "Import complete",
        description: `Matched ${(data as ImportReport).matched} of ${(data as ImportReport).rowsChecked} rows.`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast({
        title: "Import failed",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="container max-w-3xl py-6 px-4 md:py-10">
      <div className="mb-6">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-gradient-patina">
          FFC Image Import
        </h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Matches <code>flower_arrangements</code> rows by FFC code and imports
          product images from FFC. Safely re-runnable — only processes rows
          missing an image. Rate limited, can take several minutes.
        </p>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <Button
            onClick={runImport}
            disabled={running}
            size="lg"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-display text-lg h-14"
          >
            {running ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Importing — please wait…
              </>
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                Run Import
              </>
            )}
          </Button>

          {error && (
            <div className="mt-4 p-3 rounded border border-destructive/50 bg-destructive/10 text-sm text-destructive">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {report && (
        <Card className="mt-6 bg-card border-border">
          <CardHeader>
            <CardTitle className="font-display text-xl text-gradient-patina">
              Import Report
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-base font-medium">
              Matched <span className="text-primary">{report.matched}</span> of{" "}
              <span className="text-primary">{report.rowsChecked}</span>
              {" | "}Not found:{" "}
              <span className="text-primary">{report.notFound.length}</span>
              {" | "}Failed:{" "}
              <span className="text-primary">{report.failed.length}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Catalog size: {report.totalInCatalog} · Duration:{" "}
              {(report.durationMs / 1000).toFixed(1)}s
            </div>

            {report.notFound.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors w-full text-left py-2 border-t border-border">
                  <ChevronDown className="w-4 h-4" />
                  Not found ({report.notFound.length})
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
                        {report.notFound.map((r, i) => (
                          <tr
                            key={i}
                            className="border-t border-border/40"
                          >
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

            {report.failed.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors w-full text-left py-2 border-t border-border">
                  <ChevronDown className="w-4 h-4" />
                  Failed ({report.failed.length})
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
                        {report.failed.map((r, i) => (
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
