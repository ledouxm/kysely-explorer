import { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import { styled } from "#styled-system/jsx";
import { MainEditor } from "./container/Editor";
import { DbConnections } from "./features/ws/DbConnections";
import { authClient } from "./authClient";
import { WithAuth } from "./features/auth/WithAuth";
import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

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
      <WithAuth>
        <MainEditor />
      </WithAuth>
    </styled.div>
  );
}

export default App;
