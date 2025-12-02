import React, { useState, useEffect, useRef } from 'react';
import { InterviewConfig, Message, InterviewStatus } from '../types';
import { InterviewService } from '../services/geminiService';
import MarkdownRenderer from './MarkdownRenderer';

interface Props {
  config: InterviewConfig;
  onEndSession: () => void;
}

const InterviewChat: React.FC<Props> = ({ config, onEndSession }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(true); // Initial state true for setup
  const [status, setStatus] = useState<InterviewStatus>(InterviewStatus.ACTIVE);
  const [report, setReport] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  
  const serviceRef = useRef<InterviewService | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null); // For Web Speech API

  // Initialize Interview
  useEffect(() => {
    const initSession = async () => {
      serviceRef.current = new InterviewService(config);
      try {
        const introText = await serviceRef.current.startSession();
        addMessage('model', introText);
      } catch (e) {
        addMessage('system', "Failed to connect to the interviewer. Please try again.");
      } finally {
        setIsTyping(false);
      }
    };
    
    initSession();
    
    // Initialize Speech Recognition if available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(prev => prev + (prev ? ' ' : '') + transcript);
        setIsListening(false);
      };
      
      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // cleanup
    return () => {
      serviceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const addMessage = (role: Message['role'], text: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString() + Math.random().toString(),
      role,
      text,
      timestamp: new Date()
    }]);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !serviceRef.current || status !== InterviewStatus.ACTIVE) return;

    const userText = inputValue;
    setInputValue('');
    addMessage('user', userText);
    setIsTyping(true);

    try {
      const stream = await serviceRef.current.sendMessageStream(userText);
      let fullResponse = '';
      
      // We will stream the response into a temporary message or update the last message
      // simplified: wait for full stream for state update simplicity, OR incrementally update
      // Let's implement incremental update for better UX
      const messageId = Date.now().toString();
      
      setMessages(prev => [...prev, {
        id: messageId,
        role: 'model',
        text: '',
        timestamp: new Date(),
        isThinking: false
      }]);

      for await (const chunk of stream) {
        fullResponse += chunk;
        setMessages(prev => prev.map(m => 
          m.id === messageId ? { ...m, text: fullResponse } : m
        ));
      }
    } catch (error) {
      addMessage('system', "An error occurred while getting the response.");
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
        alert("Speech recognition is not supported in this browser.");
        return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const finishInterview = async () => {
    if (!serviceRef.current) return;
    setStatus(InterviewStatus.COMPLETED);
    setIsTyping(true);
    
    const transcript = messages.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
    const reportText = await serviceRef.current.generateReport(transcript);
    
    setReport(reportText);
    setIsTyping(false);
  };

  if (status === InterviewStatus.COMPLETED && report) {
    return (
      <div className="flex flex-col h-full bg-gray-50 p-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full bg-white rounded-xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Performance Report</h2>
            <button onClick={onEndSession} className="text-gray-500 hover:text-gray-700">Close</button>
          </div>
          <div className="prose prose-blue max-w-none">
            <MarkdownRenderer content={report} />
          </div>
          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
            <button 
              onClick={onEndSession}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Start New Interview
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <header className="flex-none bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm z-10">
        <div>
          <h2 className="text-lg font-bold text-gray-800">{config.round}</h2>
          <p className="text-xs text-gray-500 uppercase tracking-wide">{config.role} • {config.experienceLevel}</p>
        </div>
        <button 
          onClick={finishInterview}
          className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
        >
          End Interview
        </button>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide bg-gray-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[85%] md:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              
              {/* Avatar */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-blue-600 ml-3' : 'bg-green-600 mr-3'}`}>
                {msg.role === 'user' ? (
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                )}
              </div>

              {/* Bubble */}
              <div className={`p-4 rounded-2xl shadow-sm text-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'
              }`}>
                {msg.role === 'model' ? (
                   <MarkdownRenderer content={msg.text} />
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex flex-row items-center ml-11 space-x-1">
               <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
               <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
               <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-none p-4 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto flex items-end gap-2">
          <div className="relative flex-grow">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your answer..."
              disabled={isTyping || status !== InterviewStatus.ACTIVE}
              className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none max-h-32 min-h-[52px]"
              rows={1}
              style={{ height: 'auto', minHeight: '52px' }} 
              onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
              }}
            />
            
            {/* Mic Button */}
            <button 
              onClick={toggleListening}
              className={`absolute right-3 bottom-2.5 p-1.5 rounded-full transition-colors ${isListening ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:text-gray-600'}`}
              title="Voice Input"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
              </svg>
            </button>
          </div>

          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
            className="flex-none p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewChat;