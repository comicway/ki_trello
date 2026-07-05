import { Button } from "antd";

export default function CreateBoardTarea(props) {
  return (
    <Button className="bg-dark-blue border border-border-ki rounded-md text-pearl-white font-medium hover:bg-ki-black hover:text-ki-orange w-full h-[120px]" onClick={props.onClick}>
      Create a new board...
    </Button>
  );
}
