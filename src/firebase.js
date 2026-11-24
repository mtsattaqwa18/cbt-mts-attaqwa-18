// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyB1f_n-34tGcH-zHtVyyHBGomhczeP2pys",
  authDomain: "cbt-online-mtsattaqwa18.firebaseapp.com",
  databaseURL: "https://cbt-online-mtsattaqwa18-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "cbt-online-mtsattaqwa18",
  storageBucket: "cbt-online-mtsattaqwa18.firebasestorage.app",
  messagingSenderId: "998232896500",
  appId: "1:998232896500:web:2b70f4edaf8efaf3c7ffa1"

};


const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);