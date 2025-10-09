// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from 'firebase/database';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDoi7U5lG2Q8fUd6RLWa4-5dOGwMZdPyIc",
  authDomain: "docapp-80654.firebaseapp.com",
  databaseURL: "https://docapp-80654-default-rtdb.firebaseio.com",
  projectId: "docapp-80654",
  storageBucket: "docapp-80654.firebasestorage.app",
  messagingSenderId: "655711738789",
  appId: "1:655711738789:web:712d73f96ad9a19987e64c",
  measurementId: "G-RXRWL5XCS0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Realtime Database and get a reference to the service
export const database = getDatabase(app);

