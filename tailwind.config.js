/** @type {import('tailwindcss').Config} */
module.exports = {
  // Tailwind CSS가 스타일을 찾을 모든 파일 경로를 지정합니다.
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
