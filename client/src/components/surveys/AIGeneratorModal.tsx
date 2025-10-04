import { useState } from 'react';
import { Modal, Button, Input, Loading } from '../common';
import { aiService } from '../../services/aiService';
import type { AIGenerateSurveyInput, AIGeneratedSurvey } from '../../types';

interface AIGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (survey: AIGeneratedSurvey) => void;
}

const AIGeneratorModal: React.FC<AIGeneratorModalProps> = ({
  isOpen,
  onClose,
  onGenerate,
}) => {
  const [formData, setFormData] = useState<AIGenerateSurveyInput>({
    topic: '',
    goal: 'Дослідження думки клієнтів',
    questionCount: 7,
    questionTypes: ['radio', 'checkbox', 'text'],
  });
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const goals = [
    'Дослідження думки клієнтів',
    'Оцінка якості продукту',
    'Збір відгуків співробітників',
    'Академічне дослідження',
    'Аналіз потреб ринку',
  ];

  const handleGenerate = async () => {
    if (!formData.topic.trim()) {
      setError('Вкажіть тему опитування');
      return;
    }

    if (formData.questionCount < 3 || formData.questionCount > 20) {
      setError('Кількість питань має бути від 3 до 20');
      return;
    }

    if (formData.questionTypes.length === 0) {
      setError('Оберіть хоча б один тип питань');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await aiService.generateSurvey({
        ...formData,
        additionalInstructions: additionalInstructions.trim() || undefined,
      });
      onGenerate(result);
      onClose();
      setAdditionalInstructions('');
    } catch (err: any) {
      setError(err.message || 'Помилка генерації опитування');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleQuestionType = (type: string) => {
    if (formData.questionTypes.includes(type)) {
      setFormData({
        ...formData,
        questionTypes: formData.questionTypes.filter((t) => t !== type),
      });
    } else {
      setFormData({
        ...formData,
        questionTypes: [...formData.questionTypes, type],
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🤖 AI Генератор опитувань" size="lg">
      {isLoading ? (
        <Loading text="AI генерує опитування..." />
      ) : (
        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl">
              {error}
            </div>
          )}

          <Input
            label="📌 Тема опитування"
            placeholder="Наприклад: Задоволеність послугами компанії"
            value={formData.topic}
            onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🎯 Ціль опитування
            </label>
            <select
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
              value={formData.goal}
              onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
            >
              {goals.map((goal) => (
                <option key={goal} value={goal}>
                  {goal}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📊 Кількість питань
            </label>
            <input
              type="number"
              min="3"
              max="20"
              className="w-32 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
              value={formData.questionCount}
              onChange={(e) =>
                setFormData({ ...formData, questionCount: parseInt(e.target.value) })
              }
            />
            <p className="text-sm text-gray-500 mt-1">Від 3 до 20 питань</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              🎨 Типи питань
            </label>
            <div className="space-y-2">
              {[
                { value: 'radio', label: 'Вибір варіанту (одна відповідь)' },
                { value: 'checkbox', label: 'Множинний вибір' },
                { value: 'text', label: 'Коротка текстова відповідь' },
                { value: 'textarea', label: 'Довга текстова відповідь' },
              ].map((type) => (
                <label
                  key={type.value}
                  className="flex items-center gap-3 p-3 border-2 border-gray-200 rounded-xl hover:border-primary-300 cursor-pointer transition-all"
                >
                  <input
                    type="checkbox"
                    checked={formData.questionTypes.includes(type.value)}
                    onChange={() => toggleQuestionType(type.value)}
                    className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-gray-700">{type.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              💡 Додаткові інструкції для AI (опціонально)
            </label>
            <textarea
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all resize-none"
              rows={3}
              placeholder="Наприклад: Використовуй професійну мову, додай питання про швидкість відповіді..."
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              AI врахує ці інструкції при генерації питань
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

export default AIGeneratorModal;
