import { useState } from "react";
import { auth } from "../../firebase";
import { useHistory, Link } from "react-router-dom";
import { Form, Input, Button } from "antd";
import { MailOutlined, LockOutlined } from "@ant-design/icons";

export default function SignIn() {
  const history = useHistory();
  const [userDetails, setUserDetails] = useState({
    email: "",
    password: "",
    error: null,
  });

  const handleOnSubmit = (event) => {
    event.preventDefault();

    const { email, password } = userDetails;

    return auth
      .doSignInWithEmailAndPassword(email, password)
      .then(() => history.push("/boards"))
      .catch((error) =>
        setUserDetails((prevState) => ({ ...prevState, error: error.message }))
      );
  };

  const handleOnChange = (event) => {
    event.preventDefault();
    setUserDetails((prevState) => ({
      ...prevState,
      [event.target.name]: event.target.value,
    }));
  };

  return (
    <div className="w-full h-full flex justify-center items-center">
      <Form className="px-6 w-full max-w-[420px]">
        <h1 className="text-3xl font-bold mb-6 text-pearl-white text-center">Sign in</h1>
        <Form.Item
          name="email"
          rules={[{ required: true, message: "Please input your username!" }]}
        >
          <Input
            type="email"
            name="email"
            placeholder="Enter your email address"
            onChange={(e) => handleOnChange(e)}
            prefix={<MailOutlined style={{ color: "rgba(255,255,255,.5)" }} />}
            className="bg-ki-black border border-border-ki text-pearl-white rounded px-3 py-2"
          />
        </Form.Item>
        <Form.Item
          name="password"
          rules={[{ required: true, message: "Please input your password!" }]}
        >
          <Input.Password
            name="password"
            type="password"
            placeholder="Enter your password"
            onChange={(e) => handleOnChange(e)}
            prefix={<LockOutlined style={{ color: "rgba(255,255,255,.5)" }} />}
            className="bg-ki-black border border-border-ki text-pearl-white rounded px-3 py-2"
          />
        </Form.Item>
        <Form.Item>
          <Button block onClick={(e) => handleOnSubmit(e)} className="bg-ki-purple border border-border-ki text-pearl-white hover:bg-ki-pastel hover:border-ki-pastel h-[40px] rounded transition-colors font-medium">
            Sign in
          </Button>
        </Form.Item>
        {userDetails.error && (
          <div style={{ color: "red", fontSize: "0.75rem", marginBottom: "12px" }}>
            {userDetails.error}
          </div>
        )}
        <Form.Item>
          <div className="mb-3 text-light-gray">
            <Link to="/forgot-password" className="text-ki-blue hover:text-ki-orange transition-colors">Forgot your password?</Link>
          </div>
          <span className="text-light-gray">Don't have an account? <Link to="/sign-up" className="text-ki-blue hover:text-ki-orange transition-colors">Sign up</Link></span>
        </Form.Item>
      </Form>
    </div>
  );
}
