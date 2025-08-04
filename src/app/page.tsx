import Image from "next/image";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="text-center max-w-md w-full">
        <Image
          src="/next.svg"
          alt="MailPilot AI Logo"
          width={64}
          height={64}
          className="mx-auto mb-6"
        />
        <h1 className="text-4xl font-bold mb-3">MailPilot AI</h1>
        <p className="text-base text-gray-600 mb-8">
          A minimalist email client powered by AI.
          <br />
          Focus on what matters. Let AI handle the rest.
        </p>
        <button className="px-6 py-3 text-base rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800 transition">
          Get Started
        </button>
      </div>
    </main>
  );
}
