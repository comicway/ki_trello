export default function CreateBoardTarea(props) {
  return (
    <button
      type="button"
      className="bg-dark-blue border border-border-ki rounded-md text-pearl-white font-medium hover:bg-ki-black hover:text-ki-orange w-full h-full md:h-full transition-colors cursor-pointer"
      onClick={props.onClick}
    >
      Crear nuevo tablero...
    </button>
  );
}
