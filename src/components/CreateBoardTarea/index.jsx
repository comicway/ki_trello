export default function CreateBoardTarea(props) {
  return (
    <button
      type="button"
      className="bg-dark-blue border border-border-ki rounded-md text-pearl-white font-medium hover:bg-ki-black hover:text-ki-orange w-full h-[120px] transition-colors cursor-pointer"
      onClick={props.onClick}
    >
      Create a new board...
    </button>
  );
}
