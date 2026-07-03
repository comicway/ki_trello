import { useEffect, useState } from "react";
import { firebase } from "../../firebase/";

export default function Account() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    firebase.auth.onAuthStateChanged((authUser) => {
      authUser ? setUser(authUser) : setUser(null);
    });
  }, []);

  return (
    <div className="flex flex-col justify-center items-center h-[calc(100vh-65px)] px-6 mx-auto w-full">
      <div className="w-full text-center text-pearl-white max-w-[500px]">
        <h2 className="text-3xl font-bold mb-4 text-pearl-white">Account: {user && user.email}</h2>
        <div className="bg-ki-black border border-border-ki p-8 rounded-xl mt-6">
          <p className="text-xl text-light-gray">Estamos trabajando en el account</p>
        </div>
      </div>
    </div>
  );
}
