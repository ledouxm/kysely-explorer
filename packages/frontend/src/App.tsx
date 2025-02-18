import { styled } from "#styled-system/jsx";
import { MainEditor } from "./container/Editor";
import { WithAuth } from "./features/auth/WithAuth";

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
