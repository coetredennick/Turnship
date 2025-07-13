/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        timeline: {
          waiting: 'rgb(239 68 68)',     // red-500
          draft: 'rgb(245 158 11)',      // amber-500  
          sent: 'rgb(16 185 129)',       // emerald-500
          received: 'rgb(139 92 246)',   // violet-500
          default: 'rgb(156 163 175)',   // gray-400
          line: 'rgb(229 231 235)',      // gray-200
          stroke: 'rgb(255 255 255)',    // white
        }
      }
    },
  },
  plugins: [],
}