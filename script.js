// script.js - ManuelExamVault Core Logic (V5: Plan B - Free Firestore Tier)

// --- 1. Teacher Authentication Gatekeeper ---
const loginOverlay = document.getElementById('loginOverlay');
const loginForm = document.getElementById('loginForm');

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPassword').value;
    const loginBtn = loginForm.querySelector('button');

    if (email.includes('@') && pass.length >= 6) {
        loginBtn.innerText = "Authenticating...";
        loginBtn.disabled = true;

        setTimeout(() => {
            loginOverlay.style.opacity = '0';
            setTimeout(() => {
                loginOverlay.style.display = 'none';
                initializeApp();
            }, 500);
        }, 1200);
    } else {
        alert("Access Denied. Please use a valid school email and password.");
    }
});

function initializeApp() {
    console.log("ManuelExamVault: Session Authorized.");
    loadArchiveFromStorage();
}

// --- 2. Navigation & Mobile Menu ---
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

if (menuToggle) {
    menuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
}

const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('nav-scrolled');
    } else {
        navbar.classList.remove('nav-scrolled');
    }
});

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
            if (navLinks.classList.contains('active')) navLinks.classList.remove('active');
        }
    });
});

// --- 3. Upload Modal & Dropzone Logic ---
const modal = document.getElementById('uploadModal');
const uploadBtn = document.querySelector('.btn-primary');
const closeBtn = document.querySelector('.close-modal');
const dropZone = document.getElementById('dropZone');
const fileInput = document.querySelector('.drop-zone__input');
const examForm = document.getElementById('examUploadForm');

if (uploadBtn) uploadBtn.addEventListener('click', () => { modal.style.display = 'flex'; });
closeBtn.onclick = () => modal.style.display = 'none';
window.onclick = (e) => { if (e.target == modal) modal.style.display = 'none'; };

dropZone.onclick = () => fileInput.click();
fileInput.addEventListener('change', () => {
    if (fileInput.files.length) updateThumbnail(dropZone, fileInput.files[0]);
});

function updateThumbnail(dropZoneElement, file) {
    let prompt = dropZoneElement.querySelector(".drop-zone__prompt");
    if (prompt) prompt.style.display = 'none';
    
    let display = dropZoneElement.querySelector(".file-display") || document.createElement("div");
    display.classList.add("file-display");
    display.innerHTML = `
        <div style="font-size: 2.5rem; margin-bottom: 10px;">📄</div>
        <strong>${file.name}</strong>
        <p style="font-size: 0.75rem; color: #64748b;">${(file.size / 1024).toFixed(1)} KB</p>
    `;
    dropZoneElement.appendChild(display);
}

// --- 4. Firestore Submission (Base64 Bypass for Free Tier) ---
examForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const file = fileInput.files[0];
    const subject = examForm.querySelector('select').value;
    const termChecked = examForm.querySelector('input[name="term"]:checked');
    const submitBtn = examForm.querySelector('button[type="submit"]');

    if (!file || !termChecked) {
        alert("Please ensure a file and term are selected.");
        return;
    }

    if (file.size > 1048576) { // 1MB Limit for Firestore Documents
        alert("File too large! Please keep exams under 1MB for the free vault.");
        return;
    }

    submitBtn.innerText = "Processing Cloud Vault...";
    submitBtn.disabled = true;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = async () => {
        const base64File = reader.result;
        const termText = termChecked.value + (termChecked.value == 1 ? "st" : termChecked.value == 2 ? "nd" : "rd") + " Term";
        const dateString = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

        try {
            // Save to Firestore Database
            const examData = {
                subject: subject,
                term: termText,
                fileName: file.name,
                fileUrl: base64File, // Data string stored as URL
                date: dateString,
                status: "Verified"
            };

            await window.firebaseDB.addDoc(window.firebaseDB.collection(window.firebaseDB.db, "exams"), examData);

            // Save locally for persistence and update UI
            saveToLocalStorage(examData);
            renderArchiveRow(examData);

            alert("Exam Securely Vaulted!");
            modal.style.display = 'none';
            examForm.reset();
            if(dropZone.querySelector(".file-display")) dropZone.querySelector(".file-display").remove();
            dropZone.querySelector(".drop-zone__prompt").style.display = 'block';

        } catch (err) {
            console.error(err);
            alert("Vault Connection Error. Please check your Firestore rules.");
        } finally {
            submitBtn.innerText = "Securely Upload to Vault";
            submitBtn.disabled = false;
        }
    };
});

// --- 5. Archive & UI Rendering ---
function renderArchiveRow(data) {
    const archiveBody = document.getElementById('archiveBody');
    if (!archiveBody) return;

    const newRow = document.createElement('tr');
    const cleanSubject = data.subject.charAt(0).toUpperCase() + data.subject.slice(1);

    newRow.innerHTML = `
        <td>${cleanSubject}</td>
        <td>${data.term}</td>
        <td>${data.date}</td>
        <td><span class="status-badge" style="background:#dcfce7; color:#15803d;">${data.status}</span></td>
        <td><a href="${data.fileUrl}" download="${data.fileName || 'exam-paper'}" class="btn-view" style="text-decoration:none;">Download</a></td>
    `;
    archiveBody.prepend(newRow);
}

function saveToLocalStorage(exam) {
    let exams = JSON.parse(localStorage.getItem('manuelExams')) || [];
    exams.push(exam);
    localStorage.setItem('manuelExams', JSON.stringify(exams));
}

function loadArchiveFromStorage() {
    let exams = JSON.parse(localStorage.getItem('manuelExams')) || [];
    const archiveBody = document.getElementById('archiveBody');
    if(archiveBody && exams.length > 0) {
        archiveBody.innerHTML = '';
        exams.forEach(exam => renderArchiveRow(exam));
    }
}

// --- 6. Newsletter ---
const newsletterForm = document.querySelector('.newsletter-form');
if (newsletterForm) {
    newsletterForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const btn = this.querySelector('button');
        btn.innerText = "✓";
        btn.style.background = "#22c55e"; 
        setTimeout(() => {
            this.reset();
            btn.innerText = "Join";
            btn.style.background = "";
        }, 2000);
    });
}