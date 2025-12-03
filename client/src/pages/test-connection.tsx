import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getApiUrl } from "@/lib/config";

export default function TestConnection() {
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);

  const runTest = async () => {
    setIsLoading(true);
    const results: Record<string, any> = {};

    // Test 1: Health check
    try {
      console.log('Testing health endpoint:', getApiUrl("/api/health"));
      const response = await fetch(getApiUrl("/api/health"));
      const data = await response.json();
      results.health = {
        success: response.ok,
        status: response.status,
        data,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      results.health = {
        success: false,
        error: error.message,
      };
    }

    // Test 2: CORS preflight
    try {
      const response = await fetch(getApiUrl("/api/login-local"), {
        method: "OPTIONS",
        headers: {
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "Content-Type",
        },
      });
      results.cors = {
        success: response.ok,
        status: response.status,
        headers: {
          origin: response.headers.get("Access-Control-Allow-Origin"),
          methods: response.headers.get("Access-Control-Allow-Methods"),
          headers: response.headers.get("Access-Control-Allow-Headers"),
        },
      };
    } catch (error: any) {
      results.cors = {
        success: false,
        error: error.message,
      };
    }

    // Test 3: Invalid login (should return JSON error)
    try {
      const response = await fetch(getApiUrl("/api/login-local"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "test", password: "test" }),
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text.substring(0, 100) };
      }
      results.login = {
        success: response.ok,
        status: response.status,
        contentType: response.headers.get("content-type"),
        data,
      };
    } catch (error: any) {
      results.login = {
        success: false,
        error: error.message,
      };
    }

    setTestResults(results);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Connection Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">API Base URL:</p>
              <code className="block bg-secondary p-2 rounded text-sm break-all">
                {getApiUrl("")}
              </code>
            </div>

            <Button onClick={runTest} disabled={isLoading} className="w-full">
              {isLoading ? "Testing..." : "Run Connection Test"}
            </Button>
          </CardContent>
        </Card>

        {Object.keys(testResults).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-secondary p-4 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(testResults, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
