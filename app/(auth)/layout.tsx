import Image from 'next/image';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="flex justify-center py-8">
        <Image src="/bluehq-logo.svg" alt="BLUE HQ" width={140} height={40} priority />
      </header>
      
      <main className="flex-1 flex flex-col px-4 pb-8">
        {children}
      </main>
    </div>
  );
}
