// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyD18d1o5wxnn_dZzLJiV5ShmVwY7Z4CMHg",
    authDomain: "echosight-badcc.firebaseapp.com",
    projectId: "echosight-badcc",
    storageBucket: "echosight-badcc.firebasestorage.app",
    messagingSenderId: "626912700417",
    appId: "1:626912700417:web:851be61f64569151a1b800",
    measurementId: "G-Y3PPHMPLZX"
};

import { getFirestore } from "firebase/firestore";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);