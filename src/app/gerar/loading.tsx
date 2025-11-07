import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <Layout>
      <div className="py-8">
        <div className="max-w-2xl mx-auto px-4">
          <Card className="w-full">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="h-2 w-full bg-gray-200 rounded-full animate-pulse mt-4" />
            </CardHeader>

            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                  <div className="h-12 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                  <div className="h-12 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-10 w-16 bg-gray-200 rounded animate-pulse" />
                    ))}
                  </div>
                </div>
                <div className="h-12 bg-gray-200 rounded animate-pulse" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
