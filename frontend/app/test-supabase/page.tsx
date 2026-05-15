"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TestSupabasePage() {
  const [status, setStatus] = useState<string>("Testing...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function testConnection() {
      try {
        if (!supabase) {
          setError("Supabase client is not initialized");
          return;
        }
        setStatus("Supabase client initialized \u2713");

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          setError(`Session error: ${sessionError.message}`);
          return;
        }
        setStatus(`Session check completed \u2713\nUser: ${data.session?.user?.email || "No user logged in"}`);

        const { error: healthError } = await supabase.from("users").select("count").limit(1);
        if (healthError) {
          setError(`Database error: ${healthError.message}`);
          return;
        }
        setStatus(`All tests passed! \u2713`);
      } catch (err: any) {
        setError(`Exception: ${err.message}`);
      }
    }

    testConnection();
  }, []);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKeyConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>

        <div className="mb-4">
          <h2 className="font-semibold mb-2">Status:</h2>
          <pre className="bg-gray-100 p-4 rounded whitespace-pre-wrap">{status}</pre>
        </div>

        {error && (
          <div className="mb-4">
            <h2 className="font-semibold mb-2 text-red-600">Error:</h2>
            <pre className="bg-red-50 p-4 rounded whitespace-pre-wrap text-red-700">{error}</pre>
          </div>
        )}

        <div className="mt-6 text-sm text-gray-600">
          <p><strong>SUPABASE_URL:</strong> {supabaseUrl ? "\u2713 Set" : "\u2717 Not set"}</p>
          <p><strong>SUPABASE_ANON_KEY:</strong> {anonKeyConfigured ? "\u2713 Set" : "\u2717 Not set"}</p>
        </div>
      </div>
    </div>
  );
}
