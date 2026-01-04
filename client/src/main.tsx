import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    for(let reg of regs) reg.unregister();
  });
}