const TestPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600">
      <div className="bg-white p-8 rounded-2xl shadow-2xl">
        <h1 className="text-4xl font-bold text-purple-600 mb-4">
          Тестова сторінка працює! 🎉
        </h1>
        <p className="text-gray-600">
          Якщо ви це бачите - React працює коректно!
        </p>
      </div>
    </div>
  );
};

export default TestPage;
