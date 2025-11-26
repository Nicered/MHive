import Link from "next/link";
import { Search, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center p-8">
        <div className="mb-6">
          <Search className="h-16 w-16 mx-auto text-primary opacity-50" />
        </div>
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <h2 className="text-xl text-muted-foreground mb-6">
          이 미스터리는 아직 해결되지 않았습니다
        </h2>
        <p className="text-muted-foreground mb-8">
          찾으시는 페이지가 존재하지 않거나 이동되었을 수 있습니다.
        </p>
        <Button asChild>
          <Link href="/">
            <Home className="h-4 w-4 mr-2" />
            홈으로 돌아가기
          </Link>
        </Button>
      </div>
    </div>
  );
}
