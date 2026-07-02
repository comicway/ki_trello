import { Button } from "antd";

export default function CreateBoardCard(props) {
  return (
    <Button className="bg-dark-blue border border-border-ki rounded-md text-pearl-white font-medium hover:bg-ki-black hover:text-ki-orange w-full h-24" onClick={props.onClick}>
      Create a new board...
    </Button>
  );
}
