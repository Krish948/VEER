import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { VeerMode, VeerTool, Session, Message } from '@/types/veer';
import { supabase } from '@/integrations/supabase/client';

interface VeerContextType {
  currentMode: VeerMode;
  setCurrentMode: (mode: VeerMode) => void;
  activeTool: VeerTool;
  setActiveTool: (tool: VeerTool) => void;
  currentSession: Session | null;
  messages: Message[];
  createNewSession: () => Promise<void>;
  clearMessages: () => void;
  addMessage: (content: string, role: 'user' | 'assistant', tool?: VeerTool) => Promise<void>;
  isLoading: boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toolPanelOpen: boolean;
  setToolPanelOpen: (open: boolean) => void;
}

const VeerContext = createContext<VeerContextType | undefined>(undefined);

export const useVeer = () => {
  const context = useContext(VeerContext);
  if (!context) throw new Error('useVeer must be used within VeerProvider');
  return context;
};

export const VeerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentMode, setCurrentMode] = useState<VeerMode>('auto');
  const [activeTool, setActiveTool] = useState<VeerTool>('none');
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [toolPanelOpen, setToolPanelOpen] = useState(true);

  const createNewSession = useCallback(async () => {
    const { data, error } = await supabase
      .from('sessions')
      .insert({ mode: currentMode })
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      return;
    }

    setCurrentSession(data as Session);
    setMessages([]);
  }, [currentMode]);

  const clearMessages = () => {
    setMessages([]);
  };

  const addMessage = async (content: string, role: 'user' | 'assistant', tool?: VeerTool) => {
    if (!currentSession) return;

    const { data, error } = await supabase
      .from('messages')
      .insert({
        session_id: currentSession.id,
        role,
        content,
        tool_used: tool,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding message:', error);
      return;
    }

    setMessages(prev => [...prev, data as Message]);
  };

  useEffect(() => {
    createNewSession();
  }, [createNewSession]);

  useEffect(() => {
    if (currentSession) {
      const fetchMessages = async () => {
        const { data } = await supabase
          .from('messages')
          .select('*')
          .eq('session_id', currentSession.id)
          .order('created_at', { ascending: true });

        if (data) setMessages(data as Message[]);
      };
      fetchMessages();
    }
  }, [currentSession]);

  return (
    <VeerContext.Provider
      value={{
        currentMode,
        setCurrentMode,
        activeTool,
        setActiveTool,
        currentSession,
        messages,
        createNewSession,
        clearMessages,
        addMessage,
        isLoading,
        sidebarOpen,
        setSidebarOpen,
        toolPanelOpen,
        setToolPanelOpen,
      }}
    >
      {children}
    </VeerContext.Provider>
  );
};
