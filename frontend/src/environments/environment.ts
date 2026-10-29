// Por defecto el front habla con el back (ng serve redirige /api a localhost:8080).
// Para trabajar sin back: npm run start:mock (usa environment.mock.ts).
export const environment = {
  useMock: false,
  apiUrl: '/api',
};
