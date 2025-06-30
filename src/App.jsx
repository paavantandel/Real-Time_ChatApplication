import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./Frontend/pages/Login";
import Register from "./Frontend/pages/Register";
import Chat from "./Frontend/pages/Chat";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/chat" element={<Chat />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
