import { useState, useEffect, useRef } from 'react';
import { Modal, Button } from '../common';
import { aiService } from '../../services/aiService';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  surveyId: string;
  surveyTitle: string;
}

const AIAnalysisModal: React.FC<AIAnalysisModalProps> = ({
  isOpen,
  onClose,
  surveyId,
  surveyTitle,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    let isCancelled = false;

    const loadData = async () => {
      if (isOpen && surveyId && !isCancelled && !hasLoadedRef.current) {
        hasLoadedRef.current = true;
        await loadInitialAnalysis();
      } else if (!isOpen) {
        // Reset when closed
        setMessages([]);
        setInputMessage('');
        hasLoadedRef.current = false;
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, surveyId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadInitialAnalysis = async () => {
    setIsLoading(true);
    try {
      const analysis = await aiService.analyzeSurveyResults(surveyId);
      setMessages([
        {
          role: 'assistant',
          content: `📊 **Аналіз опитування "${surveyTitle}"**\n\n${analysis}\n\n💬 Можете поставити додаткові питання про результати!`,
        },
      ]);
    } catch (error: any) {
      setMessages([
        {
          role: 'assistant',
          content: `❌ Помилка завантаження аналізу: ${error.message}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatMessage = (text: string) => {
    // Simple markdown-like formatting
    let formatted = text
      // Bold text
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-primary-600">$1</strong>')
      // Line breaks
      .replace(/\n\n/g, '</p><p class="my-2">')
      .replace(/\n/g, '<br />');

    return `<p class="my-2">${formatted}</p>`;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSending) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsSending(true);

    // Add user message
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);

    try {
      const response = await aiService.chatWithAI(surveyId, userMessage, newMessages);
      setMessages([...newMessages, { role: 'assistant', content: response }]);
    } catch (error: any) {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: `❌ Помилка: ${error.message}` },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🤖 AI Асистент">
      <div className="flex flex-col h-[70vh]">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 rounded-lg mb-4">
          {isLoading ? (
            <div className="text-center py-8 text-gray-600">
              <p className="text-3xl mb-2">🤖</p>
              <p>Завантажую початковий аналіз...</p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`mb-4 ${
                    message.role === 'user' ? 'flex justify-end' : 'flex justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-primary-500 to-secondary-500 text-white'
                        : 'bg-white border border-gray-200 text-gray-800'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }} />
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex justify-start mb-4">
                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 text-gray-600">
                    ⏳ Думаю...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-3">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Поставте питання про результати опитування..."
            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all resize-none"
            rows={3}
            disabled={isLoading || isSending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading || isSending}
            className="self-end"
          >
            Надіслати
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AIAnalysisModal;
