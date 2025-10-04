const Survey = require('../models/Survey');
const Response = require('../models/Response');

// Функція для конвертації даних у CSV формат
const convertToCSV = (responses, survey) => {
    // BOM для коректного відображення українських символів у Excel
    let csv = '\uFEFF';

    // Заголовки CSV
    csv += 'ID відповіді,Дата,IP адреса,';

    // Додаємо заголовки питань з реальними текстами
    if (responses.length > 0) {
        const firstResponse = responses[0];
        firstResponse.answers.forEach((answer) => {
            // Використовуємо текст питання з відповіді
            const questionText = answer.questionText || 'Питання без тексту';
            // Екрануємо лапки в заголовках
            csv += `"${questionText.replace(/"/g, '""')}",`;
        });
    }
    csv = csv.slice(0, -1) + '\n'; // Видаляємо останню кому і додаємо новий рядок

    // Додаємо дані
    responses.forEach(response => {
        csv += `${response._id},${new Date(response.submittedAt).toLocaleString()},${response.respondentInfo.ipAddress},`;
        response.answers.forEach(answer => {
            // Екрануємо коми та лапки в відповідях
            const formattedAnswer = Array.isArray(answer.answer)
                ? answer.answer.join(';')
                : (answer.answer || '');
            csv += `"${String(formattedAnswer).replace(/"/g, '""')}",`;
        });
        csv = csv.slice(0, -1) + '\n';
    });

    return csv;
};

// Експорт відповідей опитування в CSV
const exportSurveyToCSV = async (req, res) => {
    try {
        const { surveyId } = req.params;

        // Перевірка існування опитування
        const survey = await Survey.findById(surveyId);
        if (!survey) {
            return res.status(404).json({
                success: false,
                message: 'Опитування не знайдено'
            });
        }

        // Перевірка прав доступу (тільки власник може експортувати)
        if (survey.creator.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'У вас немає прав для експорту цього опитування'
            });
        }

        // Отримання всіх відповідей
        const responses = await Response.find({ survey: surveyId })
            .sort({ submittedAt: -1 });

        // Конвертація в CSV
        const csv = convertToCSV(responses, survey);

        // Встановлення заголовків для завантаження файлу
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=survey-${surveyId}-${Date.now()}.csv`);
        
        // Відправка CSV
        res.send(csv);

    } catch (error) {
        console.error('Помилка експорту CSV:', error);
        res.status(500).json({
            success: false,
            message: 'Помилка при експорті даних',
            error: error.message
        });
    }
};

module.exports = {
    exportSurveyToCSV
};
