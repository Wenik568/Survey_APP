/**
 * Survey Helper Functions
 * Утилітарні функції для роботи з опитуваннями
 */

/**
 * Перевіряє чи користувач має доступ до опитування
 * @param {Object} survey - Об'єкт опитування (може бути populated або ні)
 * @param {string} userId - ID користувача для перевірки
 * @returns {boolean} - true якщо користувач має доступ (власник або співавтор)
 */
const hasAccess = (survey, userId) => {
  // Перевірка власника
  // Обробка як populated (з _id), так і non-populated ObjectId
  const creatorId = survey.creator._id
    ? survey.creator._id.toString()
    : survey.creator.toString();

  const isOwner = creatorId === userId;

  // Перевірка співавторів
  const isCollaborator = survey.collaborators && survey.collaborators.some((c) => {
    const collaboratorId = c.user._id
      ? c.user._id.toString()
      : c.user.toString();
    return collaboratorId === userId;
  });

  return isOwner || isCollaborator;
};

/**
 * Перевіряє чи користувач є власником опитування
 * @param {Object} survey - Об'єкт опитування
 * @param {string} userId - ID користувача
 * @returns {boolean}
 */
const isOwner = (survey, userId) => {
  const creatorId = survey.creator._id
    ? survey.creator._id.toString()
    : survey.creator.toString();
  return creatorId === userId;
};

/**
 * Перевіряє чи користувач є співавтором опитування
 * @param {Object} survey - Об'єкт опитування
 * @param {string} userId - ID користувача
 * @returns {boolean}
 */
const isCollaborator = (survey, userId) => {
  return survey.collaborators && survey.collaborators.some((c) => {
    const collaboratorId = c.user._id
      ? c.user._id.toString()
      : c.user.toString();
    return collaboratorId === userId;
  });
};

module.exports = {
  hasAccess,
  isOwner,
  isCollaborator
};
