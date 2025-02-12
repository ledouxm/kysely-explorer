import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import { styled } from "#styled-system/jsx";
import { MainEditor } from "./container/Editor";
import { DbConnections } from "./features/auth/WithConnectionString";

function App() {
  return (
    <styled.div
      bgColor="background"
      color="text-primary"
      w="100vw"
      h="100vh"
      overflow="hidden"
      display="flex"
      justifyContent="center"
      flexDirection="row"
    >
      <MainEditor />
    </styled.div>
  );
}

export default App;
