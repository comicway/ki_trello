import { useState } from "react";
import { auth, db } from "../../firebase";
import { useHistory, Link } from "react-router-dom";
import { Form, Input, Button } from "antd";
import { UserOutlined, LockOutlined, MailOutlined } from "@ant-design/icons";

export default function SignUp() {
  const history = useHistory();
  const [userDetails, setUserDetails] = useState({
    fullName: "",
    email: "",
    password: "",
    error: null,
  });

  const handleOnSubmit = (event) => {
    event.preventDefault();

    const { fullName, email, password } = userDetails;

    return auth
      .doCreateUserWithEmailAndPassword(email, password, fullName)
      .then((authUser) => {
        db.doCreateUser(authUser.user.uid, fullName, email);
        history.push("/boards");
      })
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
        <h1 className="text-3xl font-bold mb-6 text-pearl-white text-center">Sign up</h1>

        <Form.Item
          name="fullName"
          rules={[{ required: true, message: "Please input your username!" }]}
        >
          <Input
            type="text"
            name="fullName"
            placeholder="Enter your full name"
            onChange={(e) => handleOnChange(e)}
            prefix={<UserOutlined style={{ color: "rgba(255,255,255,.5)" }} />}
            className="bg-ki-black border border-border-ki text-pearl-white rounded px-3 py-2"
          />
        </Form.Item>
        <Form.Item
          name="email"
          rules={[{ required: true, message: "Please input your username!" }]}
        >
          <Input
            type="text"
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
            placeholder="Enter a password"
            onChange={(e) => handleOnChange(e)}
            prefix={<LockOutlined style={{ color: "rgba(255,255,255,.5)" }} />}
            className="bg-ki-black border border-border-ki text-pearl-white rounded px-3 py-2"
          />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          rules={[{ required: true, message: "Please input your password!" }]}
        >
          <Input.Password
            name="confirmPassword"
            type="password"
            placeholder="Confirm password"
            onChange={(e) => handleOnChange(e)}
            prefix={<LockOutlined style={{ color: "rgba(255,255,255,.5)" }} />}
            className="bg-ki-black border border-border-ki text-pearl-white rounded px-3 py-2"
          />
        </Form.Item>

        <Form.Item>
          <Button block onClick={(e) => handleOnSubmit(e)} className="bg-ki-purple border border-border-ki text-pearl-white hover:bg-ki-pastel hover:border-ki-pastel h-[40px] rounded transition-colors font-medium">
            Sign up
          </Button>
        </Form.Item>
        {userDetails.error && (
          <div style={{ color: "red", fontSize: "0.75rem", marginBottom: "12px" }}>
            {userDetails.error}
          </div>
        )}
        <Form.Item>
          <span className="text-light-gray">Already have an account? <Link to="/sign-in" className="text-ki-blue hover:text-ki-orange transition-colors">Sign in</Link></span>
        </Form.Item>
      </Form>
    </div>
  );
}
