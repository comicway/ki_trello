import { auth } from "../../firebase";
import { useHistory } from "react-router-dom";
import { Button } from "antd";
import { GoogleOutlined } from "@ant-design/icons";

export default function SignIn() {
  const history = useHistory();

  const handleOnSubmit = (event) => {
    event.preventDefault();

    return auth
      .doSignInWithGoogle()
      .then(() => history.push("/boards"))
      .catch((error) => alert(error.message));
  };

  return (
    <div className="w-full h-full flex flex-col justify-center items-center px-6">
      <div className="w-full max-w-[420px] text-center">
        <h1 className="text-3xl font-bold mb-8 text-pearl-white">Sign in to Ki Trello</h1>
        <Button 
          block 
          size="large"
          onClick={handleOnSubmit} 
          icon={<GoogleOutlined />}
          className="bg-ki-purple border border-border-ki text-pearl-white hover:bg-ki-pastel hover:border-ki-pastel rounded transition-colors font-medium h-[50px] text-lg flex items-center justify-center gap-2"
        >
          Sign in with Google
        </Button>
      </div>
    </div>
  );
}
