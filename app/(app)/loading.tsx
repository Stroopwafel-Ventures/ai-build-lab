import { StroopwafelSpinner } from "@/components/brand";

export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <StroopwafelSpinner size={56} />
    </div>
  );
}
