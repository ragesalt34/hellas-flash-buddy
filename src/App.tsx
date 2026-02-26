import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Learn from "./pages/Learn";
import Quiz from "./pages/Quiz";
import Exam from "./pages/Exam";
import Flashcards from "./pages/Flashcards";

import Profile from "./pages/Profile";
import Stats from "./pages/Stats";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <AuthProvider>
          {/* ── Apple Liquid Glass SVG filter (hidden, referenced by CSS) ── */}
          <svg
            aria-hidden="true"
            focusable="false"
            style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
          >
            <defs>
              {/* Static refraction / displacement */}
              <filter id="liquidGlass" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.018 0.022"
                  numOctaves="3"
                  seed="8"
                  result="noise"
                />
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="noise"
                  scale="6"
                  xChannelSelector="R"
                  yChannelSelector="G"
                  result="displaced"
                />
                <feGaussianBlur in="displaced" stdDeviation="0.4" result="blurred" />
                <feComposite in="blurred" in2="SourceGraphic" operator="atop" />
              </filter>

              {/* Hover state — stronger displacement */}
              <filter id="liquidGlassHover" x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.018 0.022"
                  numOctaves="3"
                  seed="8"
                  result="noise"
                />
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="noise"
                  scale="12"
                  xChannelSelector="R"
                  yChannelSelector="G"
                  result="displaced"
                />
                <feGaussianBlur in="displaced" stdDeviation="0.6" result="blurred" />
                <feComposite in="blurred" in2="SourceGraphic" operator="atop" />
              </filter>
            </defs>
          </svg>

          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/learn" element={<Learn />} />
              <Route path="/learn/exam" element={<Exam />} />
              <Route path="/learn/:topic/flashcards" element={<Flashcards />} />
              <Route path="/learn/:topic/quiz" element={<Quiz />} />
              
              <Route path="/learn/:topic/exam" element={<Exam />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
