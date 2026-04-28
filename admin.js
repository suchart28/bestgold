import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDMMwciq6QoLSaWK6xfdr0U3ynyahtoaSk",
    authDomain: "studio-a33fe.firebaseapp.com",
    databaseURL: "https://studio-a33fe-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "studio-a33fe",
    messagingSenderId: "753539109404",
    appId: "1:753539109404:web:d38b9974e8307152e645d9",
    measurementId: "G-CLC8KLV29E"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.checkLogin = function() {
    const pass = document.getElementById('password').value;
    if (pass === "987654321") {
        document.getElementById('login-section').style.display = "none";
        document.getElementById('admin-section').style.display = "block";
        loadCurrentSettings();
    } else {
        alert("รหัสผ่านไม่ถูกต้อง");
    }
};

window.saveSettings = async function() {
    const branchId = document.getElementById('branch-select').value;
    const marqueeText = document.getElementById('marquee-input').value;
    const mediaInput = document.getElementById('media-input').value; 
    const saveBtn = document.getElementById('save-btn');
    
    saveBtn.innerText = "กำลังบันทึกข้อมูล...";
    saveBtn.disabled = true;

    try {
        const dataToSave = {
            marquee: marqueeText,
            mediaUrl: mediaInput,
            goldExtractBuy: document.getElementById('gold-extract-input').value,
            silverExtractBuy: document.getElementById('silver-extract-input').value,
            ornamentBuy: document.getElementById('ornament-buy-input').value,
            updatedAt: new Date()
        };

        await setDoc(doc(db, "branches", branchId), dataToSave, { merge: true });
        alert(`บันทึกข้อมูลสาขา ${branchId} เรียบร้อยแล้ว!`);
        
    } catch (error) {
        console.error("Error: ", error);
        alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
        saveBtn.innerText = "บันทึกและอัปเดตหน้าจอ";
        saveBtn.disabled = false;
    }
};

window.loadCurrentSettings = async function() {
    const branchId = document.getElementById('branch-select').value;
    const docSnap = await getDoc(doc(db, "branches", branchId));

    if (docSnap.exists()) {
        const data = docSnap.data();
        
        document.getElementById('marquee-input').value = data.marquee || "";
        document.getElementById('media-input').value = data.mediaUrl || "";
        
        document.getElementById('gold-extract-input').value = data.goldExtractBuy || "";
        document.getElementById('silver-extract-input').value = data.silverExtractBuy || "";
        document.getElementById('ornament-buy-input').value = data.ornamentBuy || "";
    } else {
        document.getElementById('marquee-input').value = "";
        document.getElementById('media-input').value = "";
        document.getElementById('gold-extract-input').value = "";
        document.getElementById('silver-extract-input').value = "";
        document.getElementById('ornament-buy-input').value = "";
    }
}

document.getElementById('branch-select').addEventListener('change', loadCurrentSettings);
