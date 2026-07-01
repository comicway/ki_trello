import Routes from "./routes";
import UserProvider from "./providers/UserProvider";
import { Button } from "antd";

function App() {
  return (
    <>
      <UserProvider>
        <Routes />
      </UserProvider>
    </>
  );
}

export default App;