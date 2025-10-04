export const getGoogleAuthUrl = (): string => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  return `${apiUrl}/auth/google`;
};
