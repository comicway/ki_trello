import React from "react";
import { Button } from "antd";

export default function Loader() {
  return (
    <div className="absolute inset-0 text-center">
      <Button shape="circle" loading className="mt-[100px]" />
    </div>
  );
}
