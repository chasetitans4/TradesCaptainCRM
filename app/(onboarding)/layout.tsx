'use client';

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Logo Header */}
      <header className="flex justify-center py-6">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">TC</span>
          </div>
          <span className="text-xl font-semibold text-text">Trades Captain</span>
        </div>
      </header>
      
      {/* Content */}
      <main className="flex-1 flex flex-col px-4 pb-8 max-w-md mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
