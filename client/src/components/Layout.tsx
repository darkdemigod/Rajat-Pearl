import { Link, useLocation } from "wouter";
import { useTheme } from "@/App";
import { Button } from "@/components/ui/button";
import { Star, BookOpen, FileText, Brain, MessageSquare, Layers, Moon, Sun, Menu, X } from "lucide-react";
import { useState } from "react";

const NAV_TABS = [
  { path: "/chart", label: "Chart Calculator", icon: Star, sanskrit: "Kundali" },
  { path: "/rules", label: "Rule Library", icon: BookOpen, sanskrit: "Niyama Kosha" },
  { path: "/pdf", label: "PDF Toolkit", icon: FileText, sanskrit: "Grantha Sangrah" },
  { path: "/learning", label: "Learning Module", icon: Brain, sanskrit: "Adhyana" },
  { path: "/interpreter", label: "Interpretations", icon: MessageSquare, sanskrit: "Vivaran" },
  { path: "/discuss", label: "Life Discussion", icon: Layers, sanskrit: "Jivana Charcha" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="max-w-screen-xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/">
              <div className="flex items-center gap-3 cursor-pointer" data-testid="logo-link">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shadow-sm">
                  <span className="text-primary-foreground text-lg font-bold leading-none">ज्</span>
                </div>
                <div className="hidden sm:block">
                  <div className="text-base font-semibold text-foreground leading-tight">Jyotisha Platform</div>
                  <div className="text-xs text-muted-foreground leading-tight">Vedic Astrology Suite</div>
                </div>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1" data-testid="main-nav">
              {NAV_TABS.map((tab) => {
                const isActive = location === tab.path || (tab.path === "/chart" && location === "/");
                const Icon = tab.icon;
                return (
                  <Link key={tab.path} href={tab.path}>
                    <div
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      }`}
                      data-testid={`nav-${tab.path.replace("/", "")}`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                data-testid="theme-toggle"
                className="text-muted-foreground hover:text-foreground"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-muted-foreground"
                onClick={() => setMenuOpen(!menuOpen)}
                data-testid="mobile-menu-toggle"
              >
                {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-border bg-background">
            <div className="max-w-screen-xl mx-auto px-4 py-2 flex flex-col gap-1">
              {NAV_TABS.map((tab) => {
                const isActive = location === tab.path || (tab.path === "/chart" && location === "/");
                const Icon = tab.icon;
                return (
                  <Link key={tab.path} href={tab.path}>
                    <div
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium cursor-pointer ${
                        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      }`}
                      onClick={() => setMenuOpen(false)}
                      data-testid={`mobile-nav-${tab.path.replace("/", "")}`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{tab.sanskrit}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </header>

      <div className="flex-1 max-w-screen-xl mx-auto w-full px-4 py-6">
        {children}
      </div>

      <footer className="border-t border-border py-4">
        <div className="max-w-screen-xl mx-auto px-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>Jyotisha Platform · Vedic Astrology Suite</span>
          <span>ॐ तत् सत्</span>
        </div>
      </footer>
    </div>
  );
}
