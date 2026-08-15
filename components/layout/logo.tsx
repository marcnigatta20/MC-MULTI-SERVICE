import { cn } from "@/lib/utils";

const MC_MULTI_SERVICE_LOGO_URL =
  "https://chatgpt.com/backend-api/estuary/public_content/enc/eyJpZCI6Im1fNmE4MDgwNDFhZWU4ODE5MWJjYWJjYzUxMmUwNjM1YmE6ZmlsZV8wMDAwMDAwMDlmN2M4MWY3ODJhMjA2YjQ2ZGZhMWJhNCIsImdpem1vX2lkIjpudWxsLCJ3aWQiOm51bGwsIm9pZCI6bnVsbCwic2lkIjpudWxsLCJjcyI6bnVsbCwiZm4iOm51bGwsImNkIjpudWxsLCJ0cyI6IjIwNjgwIiwicCI6InB5aSIsImNpZCI6IjEiLCJzaWciOiJlYmVkYTQyMTJkYzczODRlOWJlYjQwNjIyZjI2ZTYzOTQ1NjkwODUwODljNWY5MDUzM2EzYzk3ODg5NTQxN2M1IiwidiI6IjAiLCJjZG4iOm51bGwsImNwIjpudWxsLCJtYSI6bnVsbH0=";

export function Logo({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-4xl",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-lg border border-zinc-600 bg-black shadow-[0_0_20px_rgba(212,175,55,0.25)]",
          size === "sm" && "h-8 w-8",
          size === "md" && "h-10 w-10",
          size === "lg" && "h-14 w-14"
        )}
      >
        <img
          src={MC_MULTI_SERVICE_LOGO_URL}
          alt="Logo MC Multi-Service"
          className="h-full w-full object-cover"
          onError={(event) => {
            const target = event.currentTarget;
            target.style.display = "none";
            const fallback = target.nextElementSibling as HTMLElement | null;
            if (fallback) {
              fallback.style.display = "flex";
            }
          }}
        />
        <div className="hidden h-full w-full items-center justify-center bg-gold font-black text-black">
          MC
        </div>
      </div>
      <div className="flex flex-col leading-tight">
        <span className={cn("font-black tracking-[0.12em] text-gold drop-shadow-[0_0_12px_rgba(212,175,55,0.45)]", sizes[size])}>
          MC Multi-Service
        </span>
        {size !== "sm" && (
          <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            Management
          </span>
        )}
      </div>
    </div>
  );
}
