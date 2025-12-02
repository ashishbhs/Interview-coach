import React, { useState } from 'react';
import InterviewSetup from './components/InterviewSetup';
import InterviewChat from './components/InterviewChat';
import { InterviewConfig } from './types';

function App() {
  const [sessionActive, setSessionActive] = useState(false);
  const [config, setConfig] = useState<InterviewConfig | null>(null);

  const startSession = (newConfig: InterviewConfig) => {
    setConfig(newConfig);
    setSessionActive(true);
  };

  const endSession = () => {
    setSessionActive(false);
    setConfig(null);
  };

  return (
    <div className="h-screen w-full bg-gray-50 text-gray-900 font-sans">
      {!sessionActive ? (
        <InterviewSetup onStart={startSession} />
      ) : (
        config && <InterviewChat config={config} onEndSession={endSession} />
      )}
    </div>
  );
}

export default App;