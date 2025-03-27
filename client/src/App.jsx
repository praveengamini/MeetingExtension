import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import SpeechToText from "./Components/SpeechToText";
import DispatchMails from "./components/DispatchMails";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/main" />} />
      <Route path="/index.html" element={<Navigate to="/main" />} />
      <Route path="/main" element={<SpeechToText />} />
      <Route path="/dispatch" element={<DispatchMails />} />
    </Routes>
  );
};

export default App;
