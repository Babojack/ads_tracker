// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCVxynJ-_Ti-vsyWFTmO9bfJP4bpev6Z2c",
  authDomain: "my-tracker-ef8f7.firebaseapp.com",
  projectId: "my-tracker-ef8f7",
  storageBucket: "my-tracker-ef8f7.firebasestorage.app",
  messagingSenderId: "317238886538",
  appId: "1:317238886538:web:75e51fa49b9dab7e6f2d73",
  measurementId: "G-CJH0CKBKG8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
