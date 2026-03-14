import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

(window as any).APP_NAME = "VivaFrutaz";

createRoot(document.getElementById("root")!).render(<App />);
