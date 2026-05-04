import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Book } from "@shared/schema";
import {
  FileText, Plus, Trash2, BookOpen, Upload, Wand2, ChevronRight, X, FileUp, Check,
} from "lucide-react";

const bookFormSchema = z.object({
  title:    z.string().min(1, "Title required"),
  author:   z.string().min(1, "Author required"),
  chapters: z.string().min(1, "At least one chapter required"),
});
type BookFormValues = z.infer<typeof bookFormSchema>;

function AddBookDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const form = useForm<BookFormValues>({
    resolver: zodResolver(bookFormSchema),
    defaultValues: { title: "", author: "", chapters: "Chapter 1" },
  });
  const mutation = useMutation({
    mutationFn: async (values: BookFormValues) => {
      const res = await apiRequest("POST", "/api/books", {
        title: values.title, author: values.author,
        chapters: values.chapters.split(",").map(s => s.trim()).filter(Boolean),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Book added" });
      qc.invalidateQueries({ queryKey: ["/api/books"] });
      onClose(); form.reset();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Reference Book</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(v => mutation.mutate(v))} className="space-y-3">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>Title</FormLabel>
                <FormControl><Input data-testid="input-book-title" placeholder="Brihat Parashara Hora Shastra" {...field} /></FormControl>
                <FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="author" render={({ field }) => (
              <FormItem><FormLabel>Author</FormLabel>
                <FormControl><Input data-testid="input-book-author" placeholder="Maharishi Parashara" {...field} /></FormControl>
                <FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="chapters" render={({ field }) => (
              <FormItem><FormLabel>Chapters (comma-separated)</FormLabel>
                <FormControl><Input data-testid="input-book-chapters" placeholder="Chapter 1, Chapter 2" {...field} /></FormControl>
                <FormMessage /></FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending} data-testid="button-save-book">
                {mutation.isPending ? "Adding…" : "Add Book"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function PDFToolkit() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [addBookOpen, setAddBookOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [extractedRules, setExtractedRules] = useState<any[]>([]);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; chars: number; lines: number } | null>(null);
  const [maxRules, setMaxRules] = useState(50);

  const { data: books = [], isLoading } = useQuery<Book[]>({ queryKey: ["/api/books"] });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await apiRequest("DELETE", `/api/books/${id}`)).json(),
    onSuccess: () => { toast({ title: "Book removed" }); qc.invalidateQueries({ queryKey: ["/api/books"] }); if (selectedBook) setSelectedBook(null); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const uploadPdfMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/pdf/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error((await res.json()).error || "Upload failed");
      return res.json();
    },
    onSuccess: (data) => {
      setPastedText(data.text || "");
      setUploadedFile({ name: "", chars: data.chars, lines: data.lines });
      toast({ title: "File parsed", description: `${data.chars.toLocaleString()} characters extracted from ${data.lines} lines` });
    },
    onError: (e: any) => toast({ title: "Upload failed", description: e.message, variant: "destructive" }),
  });

  const parseMutation = useMutation({
    mutationFn: async ({ bookId, text }: { bookId: string; text: string }) => {
      const res = await apiRequest("POST", `/api/books/${bookId}/parse-rules`, { text, maxRules });
      return res.json();
    },
    onSuccess: (data) => {
      setExtractedRules(data.rules || []);
      toast({
        title: `${data.extracted} rules extracted`,
        description: `Found ${data.total} eligible rules, added ${data.extracted} to library.`,
      });
      qc.invalidateQueries({ queryKey: ["/api/rules"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const processFile = useCallback((file: File) => {
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")
        || file.type === "text/plain" || file.name.endsWith(".txt")) {
      setUploadedFile({ name: file.name, chars: 0, lines: 0 });
      uploadPdfMutation.mutate(file);
    } else {
      toast({ title: "Unsupported file", description: "Upload a PDF or .txt file.", variant: "destructive" });
    }
  }, [uploadPdfMutation, toast]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            PDF Toolkit
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            grantha sangrah · ग्रन्थ संग्रह — Import PDFs and extract astrological rules to your library
          </p>
        </div>
        <Button onClick={() => setAddBookOpen(true)} data-testid="button-add-book">
          <Plus className="w-4 h-4 mr-2" />Add Book
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        {/* ── Book List ── */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Reference Library ({books.length})</h3>
          {isLoading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)
          ) : books.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No books added yet</p>
                <Button className="mt-3" size="sm" onClick={() => setAddBookOpen(true)} data-testid="button-add-first-book">
                  <Plus className="w-4 h-4 mr-1" />Add First Book
                </Button>
              </CardContent>
            </Card>
          ) : (
            books.map(book => (
              <Card
                key={book.id}
                className={`cursor-pointer transition-colors hover:border-primary/50 ${selectedBook?.id === book.id ? "border-primary/60 bg-primary/5" : ""}`}
                onClick={() => { setSelectedBook(book); setExtractedRules([]); setPastedText(""); setUploadedFile(null); }}
                data-testid={`book-card-${book.id}`}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="text-sm font-medium line-clamp-1">{book.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{book.author}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{book.chapters?.length || 0} chapters</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                      onClick={e => { e.stopPropagation(); deleteMutation.mutate(book.id); }}
                      data-testid={`button-delete-book-${book.id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* ── Right Panel ── */}
        <div className="space-y-4">
          {!selectedBook ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <ChevronRight className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Select a book from the library to import text or PDF</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Upload className="w-4 h-4 text-primary" />
                    Import for: <span className="text-primary">{selectedBook.title}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Drop zone — accepts PDF + txt */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    } ${uploadPdfMutation.isPending ? "opacity-50 pointer-events-none" : ""}`}
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={onDrop}
                    data-testid="drop-zone"
                  >
                    {uploadPdfMutation.isPending ? (
                      <div className="space-y-2">
                        <FileUp className="w-8 h-8 text-primary mx-auto animate-bounce" />
                        <p className="text-sm text-muted-foreground">Parsing file…</p>
                      </div>
                    ) : uploadedFile ? (
                      <div className="space-y-1">
                        <Check className="w-8 h-8 text-emerald-500 mx-auto" />
                        <p className="text-sm font-medium text-foreground">File parsed successfully</p>
                        <p className="text-xs text-muted-foreground">
                          {uploadedFile.chars.toLocaleString()} characters · {uploadedFile.lines.toLocaleString()} lines
                        </p>
                        <button className="text-xs text-primary hover:underline mt-1"
                          onClick={() => { setUploadedFile(null); setPastedText(""); }}>
                          Clear and upload another
                        </button>
                      </div>
                    ) : (
                      <>
                        <FileUp className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground mb-1">
                          Drop a <strong>PDF</strong> or <strong>.txt</strong> file here, or
                        </p>
                        <label className="cursor-pointer">
                          <span className="text-sm text-primary hover:underline font-medium">browse files</span>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.txt,application/pdf,text/plain"
                            className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }}
                            data-testid="input-file-upload"
                          />
                        </label>
                        <p className="text-xs text-muted-foreground mt-1.5">PDF files are converted to text automatically</p>
                      </>
                    )}
                  </div>

                  {/* Text area */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs text-muted-foreground">Text content (paste or from file above):</p>
                      {pastedText && (
                        <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => { setPastedText(""); setUploadedFile(null); }}
                          data-testid="button-clear-text">
                          <X className="w-3.5 h-3.5 inline mr-0.5" />Clear
                        </button>
                      )}
                    </div>
                    <Textarea
                      rows={8}
                      placeholder={"Paste astrological text here, or upload a PDF above.\n\nThe system will extract astrological rules and conditions, intelligently identifying yogas, predictions, house lords, and nakshatra correlations."}
                      value={pastedText}
                      onChange={e => setPastedText(e.target.value)}
                      className="font-mono text-xs"
                      data-testid="input-text-paste"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {pastedText.length.toLocaleString()} chars · {pastedText.split(/\n/).length} lines
                    </p>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <Button
                      onClick={() => parseMutation.mutate({ bookId: selectedBook.id, text: pastedText })}
                      disabled={!pastedText.trim() || parseMutation.isPending}
                      data-testid="button-extract-rules"
                    >
                      {parseMutation.isPending
                        ? <><Wand2 className="w-4 h-4 mr-2 animate-spin" />Extracting…</>
                        : <><Wand2 className="w-4 h-4 mr-2" />Extract Rules</>}
                    </Button>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Max rules:</span>
                      <select
                        value={maxRules}
                        onChange={e => setMaxRules(Number(e.target.value))}
                        className="border border-border rounded px-1.5 py-0.5 bg-background text-foreground text-xs"
                        data-testid="select-max-rules"
                      >
                        {[25, 50, 100, 200].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Extraction results */}
              {(parseMutation.isPending || extractedRules.length > 0) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-primary" />
                      {parseMutation.isPending ? "Extracting rules…" : `Extracted ${extractedRules.length} Rules`}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {parseMutation.isPending ? (
                      <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                    ) : (
                      <>
                        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                          {extractedRules.map((rule, i) => (
                            <div key={i} className="bg-accent/40 rounded-lg p-3" data-testid={`extracted-rule-${i}`}>
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Badge variant="outline" className="text-xs">{rule.category}</Badge>
                                <span className="text-xs font-medium text-foreground line-clamp-1">{rule.name}</span>
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {Math.round((rule.confidence || 0) * 100)}% conf
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">{rule.description}</p>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-3 text-center font-medium">
                          ✓ All {extractedRules.length} rules added to Rule Library
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Book details */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Book Details</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Title</span>
                    <span className="font-medium">{selectedBook.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Author</span>
                    <span>{selectedBook.author}</span>
                  </div>
                  <Separator />
                  <div>
                    <span className="text-muted-foreground text-xs">Chapters</span>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {selectedBook.chapters?.map((ch, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{ch}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      <AddBookDialog open={addBookOpen} onClose={() => setAddBookOpen(false)} />
    </div>
  );
}
