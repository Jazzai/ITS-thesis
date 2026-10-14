import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';

function App() {
  const [code, setCode] = useState("// Write C++ here");

  const handleRun = async () => {
    const res = await axios.post("http://localhost:8000/run", { code });
    console.log(res.data);
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Editor 
        width="70%" 
        defaultLanguage="cpp" 
        value={code} 
        onChange={setCode} 
      />
      <div style={{ width: '30%', padding: '10px' }}>
        <button onClick={handleRun}>Run Code</button>
        {/* Chat Widget Goes Here */}
      </div>
    </div>
  );
}
export default App;