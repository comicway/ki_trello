export default function Loader() {
  return (
    <div className="absolute inset-0 text-center">
      <div
        role="status"
        aria-label="Loading"
        className="mt-[100px] inline-block h-8 w-8 animate-spin rounded-full border-2 border-ki-purple border-t-transparent"
      />
    </div>
  );
}
