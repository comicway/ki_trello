import { useEffect, useState } from "react";
import { firebase } from "../../firebase/";
import { Input, Form, Button } from "antd";
import { doPasswordUpdate } from "../../firebase/auth";
import { useHistory } from "react-router-dom";
import { LockOutlined } from "@ant-design/icons";

export default function Account() {
  const [user, setUser] = useState(null);
  const [password, setPassword] = useState("");
  const [passwordTwo, setPasswordTwo] = useState("");
  const [error, setError] = useState(null);

  const history = useHistory();

  useEffect(() => {
    firebase.auth.onAuthStateChanged((authUser) => {
      authUser ? setUser(authUser) : setUser(null);
    });
  }, []);

  const handleOnSubmit = (event) => {
    event.preventDefault();

    if (password === passwordTwo) {
      return doPasswordUpdate(password)
        .then(() => {
          setPassword("");
          setPasswordTwo("");
          setError(null);
          alert("Password was changed successfully");
          history.push("/boards");
        })
        .catch((err) => setError(err.message));
    } else {
      setError("Passwords do not match");
    }
  };
  return (
    <div className="flex flex-col justify-center items-center h-full px-6 max-w-[400px] mx-auto w-full md:w-[400px]">
      <div className="w-full text-pearl-white">
        <h2 className="text-2xl font-bold mb-2 text-pearl-white">Account: {user && user.email}</h2>
        <p className="text-light-gray mb-6">Want to reset your password?</p>
      </div>
      <form className="w-full">
        <Form.Item
          name="password"
          rules={[{ required: true, message: "Please input your password!" }]}
        >
          <Input.Password
            name="password"
            type="password"
            value={password}
            placeholder="Enter a new password"
            onChange={(e) => setPassword(e.target.value)}
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
            value={passwordTwo}
            placeholder="Confirm new password"
            onChange={(e) => setPasswordTwo(e.target.value)}
            prefix={<LockOutlined style={{ color: "rgba(255,255,255,.5)" }} />}
            className="bg-ki-black border border-border-ki text-pearl-white rounded px-3 py-2"
          />
        </Form.Item>
        <Form.Item>
          <Button block onClick={(e) => handleOnSubmit(e)} className="bg-ki-purple border border-border-ki text-pearl-white hover:bg-ki-pastel hover:border-ki-pastel h-[40px] rounded transition-colors font-medium">
            Reset your password
          </Button>
        </Form.Item>
        {error && (
          <div style={{ color: "red", fontSize: "0.75rem" }}>{error}</div>
        )}
      </form>
    </div>
  );
}
