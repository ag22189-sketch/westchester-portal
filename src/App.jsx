import { lazy, Suspense } from "react";
import WestchesterPortal from "./components/WestchesterPortal";
const AgentChat = lazy(() => import("./components/AgentChat"));

function App() {
  const path = window.location.pathname;

  if (path === "/agent") {
    return (
      <Suspense fallback={<div style={{ background: "#0F1318", minHeight: "100vh" }} />}>
        <AgentChat />
      </Suspense>
    );
  }

  return <WestchesterPortal />;
}

export default App;
