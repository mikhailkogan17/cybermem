
"use client";

import { ArrowLeft, Book, Code, FileText, Server } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/docs", label: "Overview", icon: Book },
  { href: "/docs/deployment", label: "Deployment", icon: Server },
  // Add placeholder links for future content
  { href: "/docs/api-reference", label: "Api Reference", icon: Code },
  { href: "/docs/mcp-integration", label: "MCP Integration", icon: FileText },
];

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#050A0F]">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-r border-white/10 bg-[#0B1116]/50 backdrop-blur-xl flex-shrink-0">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-2 text-white hover:text-emerald-400 transition-colors mb-8 group">
             <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
             <span className="font-semibold text-sm">Back to Dashboard</span>
          </Link>

          <h2 className="text-lg font-bold text-white mb-4 px-2">Documentation</h2>

          <nav className="space-y-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm"
                      : "text-neutral-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="prose prose-invert prose-emerald max-w-none">
             {children}
          </div>
        </div>
      </main>
    </div>
  );
}
