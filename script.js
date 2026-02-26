// script.js - ManuelExamVault Core Logic (V6.5: Final Polish & Mobile Fix)

// --- 1. Global Configurations ---
const ADMIN_EMAIL = "principal@manuel.edu";

// --- 2. View Switcher & Mobile Menu Logic ---
function switchView(sectionId) {
    document.querySelectorAll('.view').forEach(view => {
        view.style.display = 'none';
        view.classList.remove('active');
    });

    const target = document.getElementById(sectionId);
    if (target) {
        target.style.display = 'block';
        setTimeout(() => target.classList.add('active'), 10);
    }

    // Nav Link UI Updates
    document.querySelectorAll('.nav-item, .nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('onclick')?.includes(sectionId)) link.classList.add('active');
    });

    // Close mobile menu automatically when a link is clicked
    const navLinks = document.getElementById('navLinks');
    const menuToggle = document.getElementById('menuToggle');
    if (navLinks?.classList.contains('active')) {
        navLinks.classList.remove('active');
        menuToggle?.classList.remove('is-active');
    }
    
    window.scrollTo(0,0);
}

// --- 3. Authentication & Logout Logic ---
const loginOverlay = document.getElementById('loginOverlay');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');

if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.toLowerCase().trim();
        const pass = document.getElementById('loginPassword').value;
        const loginBtnEl = loginForm.querySelector('button');

        if (email.includes('@') && pass.length >= 6) {
            const role = (email === ADMIN_EMAIL) ? 'admin' : 'teacher';
            sessionStorage.setItem('vault_user_role', role);
            
            loginBtnEl.innerText = "Authorizing Vault...";
            loginBtnEl.disabled = true;

            setTimeout(() => {
                loginOverlay.style.opacity = '0';
                setTimeout(() => {
                    loginOverlay.style.display = 'none';
                    if (logoutBtn) logoutBtn.style.display = 'inline-block';
                    loadArchive(); 
                }, 500);
            }, 1200);
        } else {
            alert("Access Denied. Please use valid school credentials.");
        }
    });
}

function handleLogout() {
    sessionStorage.removeItem('vault_user_role');
    window.location.reload(); 
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
}

// --- 4. Initialization (The Mobile Toggle Core) ---
window.addEventListener('DOMContentLoaded', () => {
    const role = sessionStorage.getItem('vault_user_role');
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');

    // 1. Check Authentication State
    if (role) {
        if (loginOverlay) loginOverlay.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        loadArchive();
    } else {
        if (loginOverlay) loginOverlay.style.display = 'flex';
        if (logoutBtn) logoutBtn.style.display = 'none';
    }

    // 2. Mobile Menu Toggle Logic
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            navLinks.classList.toggle('active');
            menuToggle.classList.toggle('is-active'); // For the X animation
        });

        // Close menu if user clicks anywhere outside the nav
        document.addEventListener('click', (e) => {
            if (!menuToggle.contains(e.target) && !navLinks.contains(e.target)) {
                navLinks.classList.remove('active');
                menuToggle.classList.remove('is-active');
            }
        });
    }
});

// --- 5. Dropzone Logic ---
const dropZone = document.getElementById('dropZone');
const fileInput = document.querySelector('.drop-zone__input');

if(dropZone) {
    dropZone.onclick = () => fileInput.click();
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) updateThumbnail(dropZone, fileInput.files[0]);
    });
    ["dragover", "dragenter"].forEach(type => {
        dropZone.addEventListener(type, (e) => {
            e.preventDefault();
            dropZone.style.borderColor = "var(--gold)";
            dropZone.style.background = "#fffdf5";
        });
    });
    ["dragleave", "dragend"].forEach(type => {
        dropZone.addEventListener(type, () => {
            dropZone.style.borderColor = "#cbd5e1";
            dropZone.style.background = "#f1f5f9";
        });
    });
    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            updateThumbnail(dropZone, e.dataTransfer.files[0]);
        }
    });
}

function updateThumbnail(dropZoneElement, file) {
    let prompt = dropZoneElement.querySelector(".drop-zone__prompt");
    if (prompt) prompt.style.display = 'none';
    let oldDisplay = dropZoneElement.querySelector(".file-display");
    if (oldDisplay) oldDisplay.remove();

    let display = document.createElement("div");
    display.classList.add("file-display");
    display.innerHTML = `
        <div style="font-size: 2rem; margin-bottom: 5px;">📄</div>
        <strong style="color:var(--navy); font-size:0.9rem;">${file.name}</strong>
        <p style="font-size: 0.7rem; color: #22c55e; font-weight:bold;">READY TO VAULT</p>
    `;
    dropZoneElement.appendChild(display);
}

// --- 6. Submission Logic ---
const examForm = document.getElementById('examUploadForm');

if (examForm) {
    examForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const file = fileInput.files[0];
        const signature = document.getElementById('teacherSignature').value;
        const submitBtn = examForm.querySelector('button[type="submit"]');

        if (!file || !signature) {
            alert("File and Signature are required.");
            return;
        }

        submitBtn.innerText = "Vaulting...";
        submitBtn.disabled = true;

        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = async () => {
            const base64File = reader.result;
            const dateString = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

            const examData = {
                subject: document.getElementById('subjectSelect').value,
                classLevel: document.getElementById('classSelect').value,
                term: document.getElementById('termSelect').value + " Term",
                year: document.getElementById('yearInput').value,
                signedBy: signature,
                fileName: file.name,
                fileUrl: base64File, 
                date: dateString
            };

            try {
                await window.firebaseDB.addDoc(window.firebaseDB.collection(window.firebaseDB.db, "exams"), examData);
                saveLocal(examData);
                alert("Exam Securely Vaulted!");
                examForm.reset();
                if(dropZone.querySelector(".file-display")) dropZone.querySelector(".file-display").remove();
                dropZone.querySelector(".drop-zone__prompt").style.display = 'block';
                loadArchive();
                switchView('archive');
            } catch (err) {
                console.error(err);
                alert("Vault Error.");
            } finally {
                submitBtn.innerText = "Securely Deposit to Vault";
                submitBtn.disabled = false;
            }
        };
    });
}

// --- 7. Archive Rendering ---
function renderCard(data, isMasterRecord = false) {
    const archiveGrid = document.getElementById('archiveBody');
    if (!archiveGrid) return;

    const card = document.createElement('div');
    card.className = 'exam-card';
    if(isMasterRecord) card.style.borderLeftColor = "#22c55e";

    card.innerHTML = `
        <div style="display:flex; justify-content:space-between;">
            <p style="font-size:0.7rem; color:var(--gold); font-weight:bold;">${data.classLevel} • ${data.term}</p>
            ${isMasterRecord ? '<span style="font-size:0.6rem; background:#dcfce7; color:#15803d; padding:2px 6px; border-radius:10px;">MASTER</span>' : ''}
        </div>
        <h3 style="margin: 5px 0; color:var(--navy); font-family:'Playfair Display', serif;">${data.subject.toUpperCase()}</h3>
        <p style="font-size:0.8rem;">Session: ${data.year}</p>
        <div style="margin-top:12px; padding:10px; background:#f8fafc; border-radius:6px; border:1px solid #edf2f7;">
             <p style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase;">Signed By:</p>
             <p style="font-family:'Playfair Display', serif; font-style:italic; color:var(--navy); font-weight:bold;">${data.signedBy}</p>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:15px;">
            <p style="font-size:0.65rem; color:var(--text-muted);">Vaulted: ${data.date}</p>
            <a href="${data.fileUrl}" download="${data.fileName}" class="btn-download" style="text-decoration:none; font-size:0.75rem; border:1px solid var(--gold); padding:5px 10px; color:var(--gold); border-radius:4px; font-weight:bold;">Download</a>
        </div>
    `;
    archiveGrid.prepend(card);
}

async function loadArchive() {
    const archiveGrid = document.getElementById('archiveBody');
    if(!archiveGrid) return;
    archiveGrid.innerHTML = '<p style="text-align:center; grid-column:1/-1; color:var(--gold);">Syncing Vault...</p>';

    const role = sessionStorage.getItem('vault_user_role');

    if (role === 'admin') {
        try {
            const querySnapshot = await window.firebaseDB.getDocs(window.firebaseDB.collection(window.firebaseDB.db, "exams"));
            archiveGrid.innerHTML = '';
            querySnapshot.forEach((doc) => renderCard(doc.data(), true));
        } catch (err) {
            console.error(err);
        }
    } else {
        let exams = JSON.parse(localStorage.getItem('manuelExams')) || [];
        archiveGrid.innerHTML = '';
        if(exams.length === 0) archiveGrid.innerHTML = '<p style="text-align:center; grid-column:1/-1;">No personal records found.</p>';
        exams.forEach(exam => renderCard(exam, false));
    }
}

function saveLocal(exam) {
    let exams = JSON.parse(localStorage.getItem('manuelExams')) || [];
    exams.push(exam);
    localStorage.setItem('manuelExams', JSON.stringify(exams));
}

// --- 8. Search ---
const searchInput = document.getElementById('archiveSearch');
if(searchInput) {
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.exam-card').forEach(card => {
            card.style.display = card.innerText.toLowerCase().includes(term) ? 'block' : 'none';
        });
    });
}