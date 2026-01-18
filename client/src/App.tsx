import { Github, Zap, Video, Bot, Terminal, Play, GitPullRequest, GitCommit, Check, MessageSquare } from 'lucide-react'

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/30 selection:text-primary-foreground overflow-x-hidden">

      {/* Abstract Background Effects */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-background">
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-purple-500/10 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-50 px-6 backdrop-blur-md border-b border-white/5 bg-background/50">
        <div className="mx-auto max-w-6xl h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 hover:opacity-80 transition-opacity cursor-pointer">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-lg shadow-purple-500/20">
              <Zap className="h-4 w-4 text-white fill-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Aura</span>
          </div>

          <div className="hidden md:flex items-center space-x-1">
            <NavLink href="#features">Features</NavLink>
            <NavLink href="#how-it-works">How it Works</NavLink>
          </div>

          <div className="flex items-center space-x-4">
            <a
              href="https://github.com/apps/aurapr"
              target="_blank"
              rel="noreferrer"
              className="hidden md:flex items-center justify-center space-x-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium transition-all hover:bg-white/10 hover:scale-105 active:scale-95"
            >
              <Github className="h-4 w-4" />
              <span>Install Here</span>
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative pt-24 pb-32 overflow-visible">
          <div className="mx-auto max-w-6xl px-6 flex flex-col items-center text-center">

            <h1 className="max-w-4xl text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-100">
              Your Codebase, <br />
              <span className="text-gradient">Visually Perfected.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
              Aura bridges the gap between code and experience by combining LLM-based reasoning with real browser execution to provide video walkthroughs of your PRs.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full justify-center animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300">
              <a
                href="https://github.com/apps/aura"
                className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-sm font-medium text-white shadow-lg shadow-purple-500/25 transition-all hover:bg-primary/90 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                Install Aura Bot
              </a>
              <a
                href="https://github.com/axie22/Aura"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-8 text-sm font-medium text-white transition-all hover:bg-white/10 hover:scale-105"
              >
                View Documentation
              </a>
            </div>
            {/* Demo Section Title */}
            <div className="mt-24 mb-12 text-center animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-400">

              <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight">
                What Aura Posts on Your PR
              </h2>

              <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground leading-relaxed">
                Aura automatically reviews your pull request, records a real browser walkthrough,
                and posts a concise summary with visual evidence.
                Check out the demo below!
              </p>
            </div>
            {/* DEMO CONTAINER: Mock GitHub PR Page */}
            <div className="mt-24 w-full max-w-5xl rounded-xl border border-white/10 bg-[#0d1117] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-1000 delay-500 ring-1 ring-white/5">

              {/* GitHub Header Mock */}
              <div className="bg-[#161b22] border-b border-[#30363d] py-3 px-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-white p-0.5">
                    <Github className="h-5 w-5 text-black fill-black" />
                  </div>
                  <span className="font-semibold text-sm text-[#c9d1d9]">user / Project</span>
                </div>
              </div>

              <div className="p-6 md:p-8 font-sans text-left">
                {/* PR Title Section */}
                <div className="border-b border-[#30363d] pb-6 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-2xl md:text-3xl font-normal text-white">Add delete button functionality <span className="text-[#8b949e] font-light">#4</span></h2>
                  </div>

                  <div className="flex items-center text-sm gap-2 text-[#8b949e] flex-wrap">
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#238636] text-white font-medium border border-[rgba(240,246,252,0.1)]">
                      <GitPullRequest className="h-4 w-4" />
                      Open
                    </span>
                    <span className="font-semibold text-white">user</span>
                    <span>wants to merge 1 commit into <code className="bg-[#6e768166] text-white px-1.5 py-0.5 rounded text-xs">main</code> from <code className="bg-[#6e768166] text-white px-1.5 py-0.5 rounded text-xs">user/dev</code></span>
                  </div>
                </div>




                {/* Timeline */}
                <div className="flex max-w-4xl flex-col gap-4 relative pl-4 md:pl-0">
                  <div className="absolute left-9 md:left-5 top-0 bottom-0 w-0.5 bg-[#30363d] -z-10"></div>


                  {/* Aura Bot Comment */}
                  <div className="flex gap-4">
                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 border border-[#30363d] shadow-sm flex items-center justify-center">
                      <Zap className="h-5 w-5 text-white fill-white" />
                    </div>
                    <div className="flex-1 rounded-md border border-[#30363d] bg-[#0d1117] overflow-hidden relative">
                      <div className="bg-[#161b22] px-4 py-2 border-b border-[#30363d] flex justify-between items-center flex-wrap gap-2">
                        <div className="text-sm flex items-center gap-2">
                          <span className="font-semibold text-white">aura-bot</span>
                          <span className="bg-[#6e768166] text-[#8b949e] px-1.5 rounded-full text-xs border border-[#30363d]">bot</span>
                          <span className="text-[#8b949e]">commented 1 minute ago</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="border border-[#30363d] rounded-full px-2 text-xs text-[#8b949e] font-medium">Member</span>
                        </div>
                      </div>

                      {/* Bot Content */}
                      <div className="p-4 bg-[rgb(13,17,23)]">
                        <h3 className="text-base font-semibold text-white mb-2">✨ Aura UI Review</h3>
                        <p className="text-sm text-[#c9d1d9] mb-4">
                          I've analyzed the changes in this PR and recorded a video walkthrough of the new flows.
                        </p>

                        {/* Video Placeholder */}
                        <div className="group relative aspect-video w-full max-w-lg overflow-hidden rounded-md border border-[#30363d] bg-black/50 cursor-pointer hover:ring-2 hover:ring-indigo-500/50 transition-all mb-4">
                          {/* Placeholder Background/Gradient */}
                          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800 opacity-80"></div>

                          {/* Play Button Overlay */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm group-hover:scale-110 transition-transform duration-200">
                              <Play className="h-8 w-8 text-white fill-white ml-1" />
                            </div>
                          </div>

                          {/* Video Meta */}
                          <div className="absolute bottom-3 right-3 rounded bg-black/70 px-2 py-0.5 text-xs font-mono text-white">
                            00:42
                          </div>
                        </div>

                        <div className="bg-[#161b22] rounded-md p-3 border border-[#30363d]">
                          <h4 className="text-xs font-semibold text-[#8b949e] uppercase mb-2">Summary</h4>
                          <ul className="text-sm space-y-1 list-disc list-inside text-[#c9d1d9]">
                            <li>Modified <code className="bg-[#6e768166] px-1 py-0.5 rounded text-xs">Button.tsx</code> styles.</li>
                            <li><span className="text-[#f78166]">⚠ Warning:</span> Hardcoded hex value detected.</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 border-t border-white/5 relative">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-gradient">See Your Code in Action</h2>
              <p className="mt-4 text-muted-foreground text-lg">Stop guessing how your diff feels. Watch it run.</p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={<Bot className="h-6 w-6 text-purple-400" />}
                title="Diff-Aware Summaries"
                description="Gemini analyzes your changes to highlight visual impact and regressions."
              />
              <FeatureCard
                icon={<Video className="h-6 w-6 text-indigo-400" />}
                title="Auto-Walkthroughs"
                description="Aura spins up a browser, records the new flow, and drops a video in your PR."
              />
              <FeatureCard
                icon={<Terminal className="h-6 w-6 text-pink-400" />}
                title="Zero Local Setup"
                description="No need to pull the branch and run npm install to see what changed."
              />
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/5 bg-black/20 py-12">
          <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row justify-between items-center opacity-60 hover:opacity-100 transition-opacity">
            <div className="flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span className="font-semibold">Aura</span>
            </div>
            <p className="text-sm mt-4 md:mt-0">© 2026 NexHacks Team. Open Source MIT.</p>
          </div>
        </footer>

      </main>
    </div>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-white/5 hover:text-white"
    >
      {children}
    </a>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:bg-white/[0.04] transition-all duration-300 hover:border-white/10 hover:-translate-y-1">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/5 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="mt-4 text-xl font-bold text-white">{title}</h3>
      <p className="mt-2 text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}

export default App
