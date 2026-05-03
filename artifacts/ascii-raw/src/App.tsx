import { Switch, Route, Router as WouterRouter } from "wouter";
import { AsciiCamera } from "@/components/AsciiCamera";
import DocsPage from "@/pages/DocsPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={AsciiCamera} />
      <Route path="/docs" component={DocsPage} />
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Router />
    </WouterRouter>
  );
}

export default App;
