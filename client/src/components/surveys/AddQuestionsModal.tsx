import { useState } from 'react';
import { Modal, Button, Input, Loading } from '../common';
import { aiService } from '../../services/aiService';
import type { Question } from '../../types';

interface AddQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddQuestions: (questions: Question[]) => void;
  existingQuestions: Question[];
  surveyTopic?: string;
}

const AddQuestionsModal: React.FC<AddQuestionsModalProps> = ({
  isOpen,
  onClose,
  onAddQuestions,
  existingQuestions,
  surveyTopic,
}) => {
  const [topic, setTopic] = useState(surveyTopic || '');
  const [count, setCount] = useState(3);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Вкажіть тему для нових питань');
      return;
    }

    if (count < 1 || count > 10) {
      setError('Кількість питань має бути від 1 до 10');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const newQuestions = await aiService.generateAdditionalQuestions(
        topic.trim(),
        existingQuestions,
        count
      );

      if (newQuestions.length === 0) {
        setError('Не вдалося згенерувати нові питання. Спробуйте змінити тему.');
        return;
      }

      onAddQuestions(newQuestions);
      onClose();
      setTopic('');
      setCount(3);
    } catch (err: any) {
      setError(err.message || 'Помилка генерації питань');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="➕ Додати питання за допомогою AI" size="md">
      {isLoading ? (
        <Loading text="AI генерує питання..." />
      ) : (
        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl">
              {error}
            </div>
          )}

          <Input
            label="📌 Тема нових питань"
            placeholder="Наприклад: якість обслуговування, зручність інтерфейсу"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📊 Скільки питань додати?
            </label>
            <input
              type="number"
              min="1"
              max="10"
              className="w-32 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 1)}
            />
            <p className="text-sm text-gray-500 mt-1">Від 1 до 10 питань</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              💡 <strong>Порада:</strong> AI згенерує питання про вказану тему, які не дублюють
              існуючі питання в опитуванні.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={onClose}>
              Скасувати
            </Button>
            <Button onClick={handleGenerate}>🚀 Згенерувати</Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default AddQuestionsModal;
