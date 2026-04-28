import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// อัปเดต Firebase Config ชุดใหม่
const firebaseConfig = {
    apiKey: "AIzaSyD5o9aY3La7nK7gCHbjM2ToolmnoE0y-is",
    authDomain: "post-it-kk-election.firebaseapp.com",
    projectId: "post-it-kk-election",
    storageBucket: "post-it-kk-election.firebasestorage.app",
    messagingSenderId: "323275742590",
    appId: "1:323275742590:web:93a6681fe99d8b1446672f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 1. ผูกปุ่มเข้าสู่ระบบ (รหัสผ่าน 987654321)
document.getElementById('login-btn').addEventListener('click', function() {
    const pass = document.getElementById('password').value;
    if (pass === "987654321") {
        document.getElementById('login-section').style.display = "none";
        document.getElementById('admin-section').style.display = "block";
        loadCurrentSettings();
    } else {
        alert("รหัสผ่านไม่ถูกต้อง");
    }
});

// 2. ผูกปุ่มบันทึกข้อมูล
document.getElementById('save-btn').addEventListener('click', async function() {
    const branchId = document.getElementById('branch-select').value;
    const saveBtn = document.getElementById('save-btn');
    
    saveBtn.innerText = "กำลังบันทึกข้อมูล...";
    saveBtn.disabled = true;

    try {
        const dataToSave = {
            marquee: document.getElementById('marquee-input').value,
            mediaUrl: document.getElementById('media-input').value,
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
});

// 3. ฟังก์ชันโหลดข้อมูลเดิมมาแสดงบนฟอร์ม
async function loadCurrentSettings() {
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

// 4. ผูกการเปลี่ยนสาขา (ให้โหลดข้อมูลใหม่เสมอ)
document.getElementById('branch-select').addEventListener('change', loadCurrentSettings);
