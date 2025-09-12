'use client'

export default function DebugPage() {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  // Use actual values from your .env.local file
  const supabaseUrl = envUrl && envUrl !== 'your_supabase_project_url' 
    ? envUrl 
    : 'https://mapgmmiobityxaaevomp.supabase.co'

  const supabaseAnonKey = envKey && envKey !== 'your_supabase_anon_key'
    ? envKey
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcGdtbWlvYml0eXhhYWV2b21wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY0NzQ5NzQsImV4cCI6MjA1MjA1MDk3NH0.placeholder'

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Environment Variables Debug</h1>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Environment Variables Status:</h2>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <span className="font-medium">Raw NEXT_PUBLIC_SUPABASE_URL:</span>
              <span className={`px-2 py-1 rounded text-sm ${
                envUrl && envUrl !== 'your_supabase_project_url' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {envUrl && envUrl !== 'your_supabase_project_url' ? '✅ Valid' : '⚠️ Placeholder'}
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="font-medium">Final Supabase URL:</span>
              <span className={`px-2 py-1 rounded text-sm ${
                supabaseUrl ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {supabaseUrl ? '✅ Ready' : '❌ Missing'}
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="font-medium">NEXT_PUBLIC_SUPABASE_ANON_KEY:</span>
              <span className={`px-2 py-1 rounded text-sm ${
                supabaseAnonKey ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {supabaseAnonKey ? '✅ Loaded' : '❌ Missing'}
              </span>
            </div>
          </div>

          {supabaseUrl && (
            <div className="mt-6">
              <h3 className="font-medium mb-2">Supabase URL:</h3>
              <code className="bg-gray-100 p-2 rounded text-sm break-all">
                {supabaseUrl}
              </code>
            </div>
          )}

          {supabaseAnonKey && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Supabase Anon Key (first 50 chars):</h3>
              <code className="bg-gray-100 p-2 rounded text-sm">
                {supabaseAnonKey.substring(0, 50)}...
              </code>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded">
            <p className="text-blue-800">
              <strong>Note:</strong> If you see "Missing" above, please check your .env.local file 
              and restart the development server with <code>npm run dev</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
