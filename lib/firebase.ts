// Import the functions you need from the SDKs you need
import { getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC5rZDQX4KavJQTLx9igow2nWEqutLrIQk",
  authDomain: "carona-app-4e8f6.firebaseapp.com",
  projectId: "carona-app-4e8f6",
  storageBucket: "carona-app-4e8f6.firebasestorage.app",
  messagingSenderId: "824734974401",
  appId: "1:824734974401:web:e4e08e55d328287f176f40",
  measurementId: "G-83V3RBY4W5",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
