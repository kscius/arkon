import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ApiError } from '@/lib/api-client';
import { getBrand } from '@/config/brand';
import { askChat } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Send, User, Bot, Lightbulb } from 'lucide-react';
import { AssistantMessageContent } from '@/components/assistant/AssistantMessageContent';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isError?: boolean;
}

const DEFAULT_ASSISTANT_SUGGESTIONS = [
  'Compara fisico vs financiero por programa',
  'Detalle de obra: avances, docs y observaciones',
  'Alertas criticas sin atender y acciones sugeridas',
  'Inversion total por municipio y dependencia',
  'Estimaciones en revision sin validar',
  'Obras en riesgo con enlaces directos',
];

export default function AsistentePage() {
  const brand = getBrand();
  const suggestedQuestions = brand.assistantSuggestions ?? DEFAULT_ASSISTANT_SUGGESTIONS;
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: brand.assistantGreeting,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isTyping) return;
    const history = messages
      .filter((m) => m.id !== 'welcome' && !m.isError)
      .map((m) => ({ role: m.role, content: m.content }));

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    setError(null);

    try {
      const { response } = await askChat(text, history);
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'No se pudo obtener respuesta del asistente. Verifique que la API este en ejecucion.';
      setError(message);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: message,
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-[calc(100vh-140px)]">
      <div className="lg:col-span-2 space-y-4 overflow-y-auto">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: brand.colors.secondary }} />
              <CardTitle className="text-sm font-semibold">{brand.assistantName}</CardTitle>
              <Badge className="text-[10px]" style={{ backgroundColor: brand.colors.secondary }}>
                API
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-blue-800">Sugerencias</span>
              </div>
              <ul className="space-y-1 text-[11px] text-blue-700 list-disc list-inside">
                {suggestedQuestions.map((q) => (
                  <li key={q}>
                    <button type="button" className="hover:underline text-left" onClick={() => handleSend(q)}>
                      {q}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            {error && <p className="text-[11px] text-red-600">{error}</p>}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-3 flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-3 border-b border-gray-200 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-secondary" />
          <span className="text-sm font-semibold text-gray-900">Chat</span>
          <span className="flex items-center gap-1 ml-auto">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-[10px] text-gray-500">Conectado a API</span>
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex gap-2.5 ${
                  msg.role === 'user' ? 'max-w-[85%] flex-row-reverse' : 'max-w-[min(100%,44rem)]'
                } ${msg.role === 'user' ? '' : ''}`}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm"
                  style={{
                    backgroundColor:
                      msg.role === 'user' ? brand.colors.primary : brand.colors.secondary,
                  }}
                >
                  {msg.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                <div
                  className={`rounded-2xl px-4 py-3 shadow-sm ${
                    msg.role === 'user'
                      ? 'text-white rounded-br-md'
                      : msg.isError
                        ? 'bg-red-50 border border-red-200 rounded-bl-md'
                        : 'bg-white border border-gray-200 rounded-bl-md'
                  }`}
                  style={
                    msg.role === 'user' ? { backgroundColor: brand.colors.primary } : undefined
                  }
                >
                  <AssistantMessageContent
                    content={msg.content}
                    variant={msg.isError ? 'error' : msg.role === 'user' ? 'user' : 'assistant'}
                  />
                </div>
              </div>
            </motion.div>
          ))}

          {isTyping && (
            <div className="flex gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm"
                style={{ backgroundColor: brand.colors.secondary }}
              >
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="px-4 py-3 bg-white border border-gray-200 rounded-2xl rounded-bl-md shadow-sm">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand-secondary/70 animate-bounce" />
                  <span
                    className="w-2 h-2 rounded-full bg-brand-secondary/70 animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-brand-secondary/70 animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                  <span className="ml-1 text-[11px] text-gray-500">Analizando datos...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-3 border-t border-gray-200">
          <div className="flex items-center gap-2 bg-gray-50 rounded-full border border-gray-200 px-4 py-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Escribe tu consulta..."
              className="flex-1 bg-transparent text-xs outline-none text-gray-800 placeholder-gray-400"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                input.trim() ? 'text-white' : 'bg-gray-200 text-gray-400'
              }`}
              style={input.trim() ? { backgroundColor: brand.colors.primary } : undefined}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
