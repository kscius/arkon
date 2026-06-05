import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ApiError } from '@/lib/api-client';
import { askChat } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Send, User, Bot, AlertTriangle, Lightbulb } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const suggestedQuestions = [
  'Que obras tienen retraso?',
  'Resumen de inversion por programa',
  'Obras en riesgo',
  'Comparativo fisico-financiero',
  'Cuantas obras hay en total?',
];

export default function AsistentePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Buen dia. Soy el Asistente Inteligente de CEASPUE. Puedo ayudarte con consultas sobre obras, avances, programas y alertas segun su perfil.\n\nQue informacion necesitas?',
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
      const { response } = await askChat(text);
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
              <Sparkles className="w-4 h-4 text-[#8B1538]" />
              <CardTitle className="text-sm font-semibold">Asistente CEASPUE</CardTitle>
              <Badge className="bg-[#8B1538] text-[10px]">API</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <span className="text-xs font-semibold text-yellow-800">Motor de reglas</span>
              </div>
              <p className="text-[11px] text-yellow-800">
                Las respuestas provienen de POST /api/chat/ask con datos reales segun su rol.
              </p>
            </div>
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
          <Sparkles className="w-4 h-4 text-[#8B1538]" />
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
              <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user' ? 'bg-[#8B1538]' : 'bg-[#8B1538]'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <User className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Bot className="w-3.5 h-3.5 text-white" />
                  )}
                </div>
                <div
                  className={`p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'bg-[#8B1538] text-white rounded-br-md'
                      : 'bg-gray-50 border border-gray-200 text-gray-800 rounded-bl-md'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            </motion.div>
          ))}

          {isTyping && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-[#8B1538] flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl rounded-bl-md">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
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
                input.trim() ? 'bg-[#8B1538] text-white' : 'bg-gray-200 text-gray-400'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
