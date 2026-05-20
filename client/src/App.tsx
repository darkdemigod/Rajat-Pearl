import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect, createContext, useContext } from "react";
import Layout from "@/components/Layout";
import ChartCalculator from "@/pages/ChartCalculator";
import RuleLibrary from "@/pages/RuleLibrary";
import PDFToolkit from "@/pages/PDFToolkit";
import LearningModule from "@/pages/LearningModule";
import Interpreter from "@/pages/Interpreter";
import LifeDiscussion from "@/pages/LifeDiscussion";
import NotFound from "@/pages/not-found";

const themeCtx = createContext<{
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
}>({ theme: "light", setTheme: () => {} });

export function useTheme() {
  return useContext(themeCtx);
}

function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      return (localStorage.getItem("jyotisha-theme") as "light" | "dark") || "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    try { localStorage.setItem("jyotisha-theme", theme); } catch {}
  }, [theme]);

  return <themeCtx.Provider value={{ theme, setTheme }}>{children}</themeCtx.Provider>;
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={ChartCalculator} />
        <Route path="/chart" component={ChartCalculator} />
        <Route path="/rules" component={RuleLibrary} />
        <Route path="/pdf" component={PDFToolkit} />
        <Route path="/learning" component={LearningModule} />
        <Route path="/interpreter" component={Interpreter} />
        <Route path="/discuss" component={LifeDiscussion} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </AppThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
