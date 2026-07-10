export default function ReadyForSalesforceSwitch({ value = false, onChange }) {
  const handleSelect = (next) => {
    if (next === value) return;
    onChange(next);
  };

  return (
    <div
      className={`mt-8 pt-4 pb-4 px-4 rounded-md border-2 transition-colors ${
        value
          ? "border-solid border-ki-purple bg-ki-purple/5"
          : "border-dashed border-border-ki bg-transparent"
      }`}
    >
      <div className="flex items-center justify-between gap-4 flex-nowrap">
        <p className="text-pearl-white font-semibold text-sm m-0 min-w-0 shrink">
          ¿Listo para Salesforce?
        </p>
        <div className="inline-flex rounded-full overflow-hidden border border-border-ki shrink-0">
          <button
            type="button"
            onClick={() => handleSelect(true)}
            className={`px-5 py-1.5 text-sm font-medium transition-colors ${
              value
                ? "bg-ki-purple text-pearl-white"
                : "bg-transparent text-light-gray hover:text-pearl-white"
            }`}
          >
            SI
          </button>
          <button
            type="button"
            onClick={() => handleSelect(false)}
            className={`px-5 py-1.5 text-sm font-medium transition-colors border-l border-border-ki ${
              !value
                ? "bg-ki-black text-pearl-white"
                : "bg-transparent text-light-gray hover:text-pearl-white"
            }`}
          >
            NO
          </button>
        </div>
      </div>
    </div>
  );
}
