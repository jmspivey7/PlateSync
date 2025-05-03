import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Import fonts
const fontsStyle = document.createElement("link");
fontsStyle.rel = "stylesheet";
fontsStyle.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lato:wght@400;700&display=swap";
document.head.appendChild(fontsStyle);

// Set title
const titleElement = document.createElement("title");
titleElement.textContent = "PlateSync - Church Donation Management";
document.head.appendChild(titleElement);

createRoot(document.getElementById("root")!).render(<App />);
