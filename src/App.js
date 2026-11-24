import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { db } from './firebase';
import Login from './components/Login';
import GuruDashboard from './components/GuruDashboard';
import SiswaDashboard from './components/SiswaDashboard';
import Ujian from './components/Ujian';
import Toast from './components/Toast';
import ExamDetail from './components/ExamDetail';
import AdminDashboard from './components/AdminDashboard';
import './App.css';

// --- KONSTANTA SESI LOKAL PERANGKAT ---
const LOCAL_STORAGE_KEY_USER = 'ujianOnline_currentUser';
const LOCAL_STORAGE_KEY_THEME = 'ujianOnline_theme';
const TOAST_TIMEOUT = 5000;

const mockUsers = [
    { id: 0, name: 'Super Admin', username: 'admin', role: 'admin', password: 'admin' },
    { id: 1, name: 'RIDHAN FAUZI,S.Th.i', username: 'guru', role: 'guru', password: 'guru' },
    { id: 2, name: 'DELLA ANA PUSPITASARI', username: 'siswa', role: 'siswa', grade: 7, password: 'siswa' },
    { id: 3, name: 'Joko Widodo', username: 'siswa2', role: 'siswa', grade: 7, password: 'siswa2' },
];

const initialExamsList = [
    {
        id: 101,
        name: "Ulangan Harian Fikih Bab 1",
        subject: "Fikih",
        grade: 7,
        totalQuestions: 1,
        timeLimit: 300,
        kkm: 75,
        shuffleQuestions: true,
        shuffleOptions: true,
        isActive: true,
    },
    {
        id: 102,
        name: "Ujian SKI Mid",
        subject: "Sejarah Kebudayaan Islam (SKI)",
        grade: 8,
        totalQuestions: 1,
        timeLimit: 600,
        kkm: 75,
        shuffleQuestions: false,
        shuffleOptions: false,
        isActive: true,
    },
];

const initialCompletedExams = [
    {
        examId: 101,
        name: "Ulangan Harian Fikih Bab 1",
        studentName: 'Siti Aminah',
        subject: "Fikih",
        grade: 7,
        score: 95,
        violationCount: 0,
        date: '2026-10-25 10:00:00',
        answers: { 1: 'B' },
    },
];

const initialBankSoal = [
    {
        id: 1,
        text: "Dasar hukum penyembelihan dalam Islam adalah...",
        imageUrl: "",
        options: ['Wajib', 'Sunah', 'Makruh', 'Mubah'],
        key: 'B',
        weight: 10,
        subject: "Fikih",
        grade: 7,
    },
    {
        id: 2,
        text: "Khalifah pertama setelah wafatnya Rasulullah SAW adalah...",
        imageUrl: "",
        options: ['Abu Bakar Ash-Shiddiq', 'Umar bin Khattab', 'Utsman bin Affan', 'Ali bin Abi Thalib'],
        key: 'A',
        weight: 15,
        subject: "Sejarah Kebudayaan Islam (SKI)",
        grade: 8,
    },
    {
        id: 3,
        text: "Hasil dari 2 + 2 adalah...",
        imageUrl: "",
        options: ['3', '4', '5', '6'],
        key: 'B',
        weight: 5,
        subject: "Matematika",
        grade: 7,
    },
];

const initialAssignments = [
    { id: 1, subject: 'Fikih', grade: 7, teacherId: 1 },
    { id: 2, subject: 'Sejarah Kebudayaan Islam (SKI)', grade: 8, teacherId: 1 },
];

const loadLocalSession = (key, fallback) => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        return parsed !== null ? parsed : fallback;
    } catch (err) {
        return fallback;
    }
};

const migrateSubjectName = (sub) => {
    if (sub === 'Fiqih') return 'Fikih';
    if (sub === 'Sejarah Islam') return 'Sejarah Kebudayaan Islam (SKI)';
    return sub;
};

const normalizeBankSoal = (list) => {
    if (!Array.isArray(list)) return [];
    return list.filter(Boolean).map((q, idx) => ({
        ...q,
        id: Math.floor(Number(q.id)) || Date.now() + idx,
        imageUrl: q.imageUrl || '',
        subject: migrateSubjectName(q.subject),
        options: Array.isArray(q.options)
            ? q.options
            : ['A', 'B', 'C', 'D'].map(k => (q.options && q.options[k]) || ''),
    }));
};

const normalizeExamsList = (list) => {
    if (!Array.isArray(list)) return [];
    return list.filter(Boolean).map(e => ({
        ...e,
        subject: migrateSubjectName(e.subject),
        kkm: Math.max(70, Number(e.kkm) || 75),
        shuffleQuestions: Boolean(e.shuffleQuestions),
        shuffleOptions: Boolean(e.shuffleOptions),
    }));
};

function App() {
    const [currentUser, setCurrentUser] = useState(() => loadLocalSession(LOCAL_STORAGE_KEY_USER, null));
    const [theme, setTheme] = useState(() => localStorage.getItem(LOCAL_STORAGE_KEY_THEME) || 'light');

    // State Tersinkronisasi dengan Firebase Realtime Database
    const [examsList, setExamsList] = useState([]);
    const [completedExams, setCompletedExams] = useState([]);
    const [bankSoal, setBankSoal] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [subjectAssignments, setSubjectAssignments] = useState([]);
    const [isDbLoading, setIsDbLoading] = useState(true);

    const [activeExam, setActiveExam] = useState(null);
    const [examResults, setExamResults] = useState(null);
    const [selectedExamResult, setSelectedExamResult] = useState(null);

    const [toastState, setToastState] = useState({
        message: '',
        type: 'info',
        isVisible: false,
    });
    const toastTimerRef = useRef(null);

    // --- HELPER TULIS KE FIREBASE ---
    const syncToFirebase = useCallback((path, data) => {
        set(ref(db, `cbt_data/${path}`), data).catch(err => {
            console.error(`Gagal menyimpan ${path} ke Firebase:`, err);
        });
    }, []);

    // --- LISTENER REAL-TIME FIREBASE ---
    useEffect(() => {
        try {
            const cbtRef = ref(db, 'cbt_data');

            const unsubscribe = onValue(
                cbtRef,
                (snapshot) => {
                    const val = snapshot.val();

                    if (!val) {
                        const seedData = {
                            users: mockUsers,
                            examsList: initialExamsList,
                            completedExams: initialCompletedExams,
                            bankSoal: initialBankSoal,
                            subjectAssignments: initialAssignments,
                        };
                        set(cbtRef, seedData).catch(console.error);
                        setAllUsers(mockUsers);
                        setExamsList(initialExamsList);
                        setCompletedExams(initialCompletedExams);
                        setBankSoal(initialBankSoal);
                        setSubjectAssignments(initialAssignments);
                    } else {
                        const loadedUsers = Array.isArray(val.users)
                            ? val.users.filter(Boolean)
                            : val.users
                            ? Object.values(val.users)
                            : mockUsers;

                        const loadedExams = Array.isArray(val.examsList)
                            ? val.examsList
                            : val.examsList
                            ? Object.values(val.examsList)
                            : [];

                        const loadedCompleted = Array.isArray(val.completedExams)
                            ? val.completedExams
                            : val.completedExams
                            ? Object.values(val.completedExams)
                            : [];

                        const loadedSoal = Array.isArray(val.bankSoal)
                            ? val.bankSoal
                            : val.bankSoal
                            ? Object.values(val.bankSoal)
                            : [];

                        const loadedAssignments = Array.isArray(val.subjectAssignments)
                            ? val.subjectAssignments.filter(Boolean)
                            : val.subjectAssignments
                            ? Object.values(val.subjectAssignments)
                            : [];

                        setAllUsers(loadedUsers);
                        setExamsList(normalizeExamsList(loadedExams));
                        setCompletedExams(loadedCompleted.filter(Boolean));
                        setBankSoal(normalizeBankSoal(loadedSoal));
                        setSubjectAssignments(loadedAssignments);
                    }

                    setIsDbLoading(false);
                },
                (error) => {
                    console.error('Firebase connection error:', error);
                    setAllUsers(mockUsers);
                    setExamsList(initialExamsList);
                    setCompletedExams(initialCompletedExams);
                    setBankSoal(initialBankSoal);
                    setSubjectAssignments(initialAssignments);
                    setIsDbLoading(false);
                }
            );

            return () => unsubscribe();
        } catch (err) {
            console.error('Firebase init error:', err);
            setAllUsers(mockUsers);
            setExamsList(initialExamsList);
            setCompletedExams(initialCompletedExams);
            setBankSoal(initialBankSoal);
            setSubjectAssignments(initialAssignments);
            setIsDbLoading(false);
        }
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(LOCAL_STORAGE_KEY_THEME, theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
    };

    const showToast = useCallback((message, type = 'info') => {
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
        }
        setToastState({ message, type, isVisible: true });

        toastTimerRef.current = setTimeout(() => {
            setToastState(prev => ({ ...prev, isVisible: false }));
        }, TOAST_TIMEOUT);
    }, []);

    const hideToast = useCallback(() => {
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
        }
        setToastState(prev => ({ ...prev, isVisible: false }));
    }, []);

    useEffect(() => {
        localStorage.setItem(LOCAL_STORAGE_KEY_USER, JSON.stringify(currentUser));
    }, [currentUser]);

    // --- HANDLER AUTENTIKASI ---
    const handleLogin = (username, password) => {
        const user = allUsers.find(
            u => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
        );

        if (user) {
            setCurrentUser(user);
            showToast(`Selamat datang, ${user.name}!`, 'success');
            return true;
        }
        showToast('Login gagal! Username atau Password salah.', 'error');
        return false;
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setActiveExam(null);
        setExamResults(null);
        setSelectedExamResult(null);
        showToast('Anda berhasil logout.', 'info');
    };

    // --- HANDLER ADMIN & BACKUP ---
    const handleUpdateUsers = (updatedUsers) => {
        setAllUsers(updatedUsers);
        syncToFirebase('users', updatedUsers);

        const validTeacherIds = new Set(updatedUsers.filter(u => u.role === 'guru').map(u => Number(u.id)));
        const cleanedAssignments = subjectAssignments.filter(a => validTeacherIds.has(Number(a.teacherId)));
        if (cleanedAssignments.length !== subjectAssignments.length) {
            setSubjectAssignments(cleanedAssignments);
            syncToFirebase('subjectAssignments', cleanedAssignments);
        }
    };

    const handleUpdateQuestions = (newQuestions) => {
        const normalized = normalizeBankSoal(newQuestions);
        setBankSoal(normalized);
        syncToFirebase('bankSoal', normalized);
    };

    const handleUpdateAssignments = (updatedAssignments) => {
        setSubjectAssignments(updatedAssignments);
        syncToFirebase('subjectAssignments', updatedAssignments);
    };

    const handleRestoreBackup = (backupPayload) => {
        const restoredUsers = Array.isArray(backupPayload.users) ? backupPayload.users : allUsers;
        const restoredExams = normalizeExamsList(backupPayload.examsList || []);
        const restoredCompleted = Array.isArray(backupPayload.completedExams) ? backupPayload.completedExams : [];
        const restoredSoal = normalizeBankSoal(backupPayload.bankSoal || []);
        const restoredAssignments = Array.isArray(backupPayload.subjectAssignments)
            ? backupPayload.subjectAssignments
            : [];

        const fullData = {
            users: restoredUsers,
            examsList: restoredExams,
            completedExams: restoredCompleted,
            bankSoal: restoredSoal,
            subjectAssignments: restoredAssignments,
        };

        set(ref(db, 'cbt_data'), fullData)
            .then(() => {
                showToast('Seluruh data berhasil dipulihkan ke Firebase!', 'success');
            })
            .catch(() => {
                showToast('Gagal memulihkan data ke Firebase.', 'error');
            });
    };

    // --- HANDLER MANAJEMEN UJIAN (GURU) ---
    const handleAddExam = (examDetails) => {
        const newExam = {
            id: Date.now(),
            name: examDetails.name,
            subject: examDetails.subject,
            grade: Number(examDetails.grade),
            totalQuestions: Number(examDetails.totalQuestions),
            timeLimit: Number(examDetails.timeLimit),
            kkm: Math.max(70, Number(examDetails.kkm) || 75),
            shuffleQuestions: Boolean(examDetails.shuffleQuestions),
            shuffleOptions: Boolean(examDetails.shuffleOptions),
            isActive: true,
        };
        const updatedList = [...examsList, newExam];
        setExamsList(updatedList);
        syncToFirebase('examsList', updatedList);
        showToast(`Ujian "${newExam.name}" berhasil ditambahkan (KKM: ${newExam.kkm}).`, 'success');
        return newExam;
    };

    const handleToggleExamStatus = (examId) => {
        const exam = examsList.find(e => e.id === examId);
        if (!exam) return;
        const updatedList = examsList.map(e =>
            e.id === examId ? { ...e, isActive: !e.isActive } : e
        );
        setExamsList(updatedList);
        syncToFirebase('examsList', updatedList);
        showToast(`Status ujian "${exam.name}" diubah menjadi ${exam.isActive ? 'Non-aktif' : 'Aktif'}.`, 'info');
    };

    const handleDeleteExam = (examIdToDelete) => {
        const examName = examsList.find(e => e.id === examIdToDelete)?.name || 'Ujian';
        const updatedExams = examsList.filter(exam => exam.id !== examIdToDelete);
        const updatedCompleted = completedExams.filter(exam => exam.examId !== examIdToDelete);

        setExamsList(updatedExams);
        setCompletedExams(updatedCompleted);
        syncToFirebase('examsList', updatedExams);
        syncToFirebase('completedExams', updatedCompleted);
        showToast(`Ujian "${examName}" berhasil dihapus beserta semua hasil siswa.`, 'error');
    };

    const handleResetStudentExam = (examId, studentName) => {
        const updatedCompleted = completedExams.filter(
            item => !(item.examId === examId && item.studentName === studentName)
        );
        setCompletedExams(updatedCompleted);
        syncToFirebase('completedExams', updatedCompleted);
        showToast(`Status ujian milik ${studentName} berhasil direset. Siswa dapat mengerjakan ulang.`, 'info');
    };

    // --- HANDLER BANK SOAL (GURU) ---
    const handleAddSoal = (newQuestion) => {
        const newSoal = {
            id: Date.now() + Math.floor(Math.random() * 10000),
            ...newQuestion,
            imageUrl: newQuestion.imageUrl || '',
            options: Array.isArray(newQuestion.options)
                ? newQuestion.options
                : ['A', 'B', 'C', 'D'].map(k => newQuestion.options?.[k] || ''),
            key: newQuestion.key.toUpperCase(),
        };
        const updatedBank = [...bankSoal, newSoal];
        setBankSoal(updatedBank);
        syncToFirebase('bankSoal', updatedBank);
        showToast(`Soal ${newQuestion.subject} berhasil ditambahkan!`, 'success');
    };

    const handleBulkAddSoal = (newQuestionsList) => {
        const normalized = normalizeBankSoal(newQuestionsList);
        const updatedBank = [...bankSoal, ...normalized];
        setBankSoal(updatedBank);
        syncToFirebase('bankSoal', updatedBank);
        showToast(`${normalized.length} soal berhasil ditambahkan ke Bank Soal!`, 'success');
    };

    const handleEditSoal = (updatedQuestion) => {
        const updatedBank = bankSoal.map(soal =>
            soal.id === updatedQuestion.id
                ? {
                      ...updatedQuestion,
                      imageUrl: updatedQuestion.imageUrl || '',
                      key: updatedQuestion.key.toUpperCase(),
                  }
                : soal
        );
        setBankSoal(updatedBank);
        syncToFirebase('bankSoal', updatedBank);
        showToast('Soal berhasil diperbarui!', 'success');
    };

    const handleDeleteSoal = (soalIdToDelete) => {
        const updatedBank = bankSoal.filter(soal => soal.id !== soalIdToDelete);
        setBankSoal(updatedBank);
        syncToFirebase('bankSoal', updatedBank);
        showToast('Soal berhasil dihapus!', 'error');
    };

    const handleDeleteAllSoalByFilter = (subject, grade) => {
        const updatedBank = bankSoal.filter(
            soal => !(soal.subject === subject && Number(soal.grade) === Number(grade))
        );
        setBankSoal(updatedBank);
        syncToFirebase('bankSoal', updatedBank);
        showToast(`Seluruh soal ${subject} Kelas ${grade} berhasil dihapus!`, 'error');
    };

    const handleViewExamDetail = (result) => {
        setSelectedExamResult(result);
    };

    const handleBackToResults = () => {
        setSelectedExamResult(null);
    };

    // --- HANDLER UJIAN SISWA ---
    const handleStartExam = (exam) => {
        const hasCompleted = completedExams.some(
            e => e.examId === exam.id && e.studentName === currentUser.name
        );

        if (hasCompleted) {
            showToast("Anda sudah menyelesaikan asesmen ini. Tidak dapat mengulang.", 'warning');
            return;
        }

        const relevantQuestions = bankSoal.filter(
            soal => soal.subject === exam.subject && Number(soal.grade) === Number(exam.grade)
        );

        if (relevantQuestions.length < exam.totalQuestions) {
            showToast(
                `Gagal memulai: Hanya tersedia ${relevantQuestions.length} soal, tetapi asesmen membutuhkan ${exam.totalQuestions} soal.`,
                'error'
            );
            return;
        }

        setActiveExam(exam);
    };

    const handleFinishExam = (score, answers, violationCount = 0) => {
        if (!currentUser || !activeExam) return;

        const hasCompleted = completedExams.some(
            e => e.examId === activeExam.id && e.studentName === currentUser.name
        );

        let result;

        // Sanitasi key objek answers agar bebas dari titik desimal (.)
        const safeAnswers = {};
        if (answers && typeof answers === 'object') {
            Object.entries(answers).forEach(([qId, val]) => {
                const cleanKey = String(Math.floor(Number(qId)) || qId).replace(/[.#$/[\]]/g, '_');
                safeAnswers[cleanKey] = val;
            });
        }

        if (!hasCompleted) {
            result = {
                examId: activeExam.id,
                name: activeExam.name,
                studentName: currentUser.name,
                subject: activeExam.subject,
                grade: activeExam.grade,
                score: score,
                answers: safeAnswers,
                violationCount: violationCount,
                date: new Date().toLocaleString('id-ID'),
            };

            const updatedCompleted = [...completedExams, result];
            setCompletedExams(updatedCompleted);
            syncToFirebase('completedExams', updatedCompleted);

            showToast(
                violationCount >= 3
                    ? 'Asesmen dihentikan otomatis karena melebihi batas pindah tab!'
                    : 'Jawaban berhasil dikirim! Anda telah menyelesaikan asesmen.',
                violationCount >= 3 ? 'warning' : 'success'
            );
        } else {
            result = completedExams.find(
                e => e.examId === activeExam.id && e.studentName === currentUser.name
            );
        }

        setExamResults(result);
        setActiveExam(null);
    };

    const handleBackToDashboard = () => {
        setExamResults(null);
    };

    // --- TAMPILAN LOADING AWAL FIREBASE ---
    if (isDbLoading) {
        return (
            <div className="App" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <div style={{ textAlign: 'center', padding: '30px' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '2.4rem', color: '#2563eb', marginBottom: '12px' }}></i>
                    <h3>Menghubungkan ke Server Ujian...</h3>
                </div>
            </div>
        );
    }

    let content;

    if (activeExam) {
        content = <Ujian exam={activeExam} onFinish={handleFinishExam} bankSoal={bankSoal} />;
    } else if (examResults) {
        content = (
            <div className="exam-result-container">
                <h1>Asesmen Selesai!</h1>
                <div className="score-box">
                    <div style={{ fontSize: '2.6rem', color: '#16a34a', marginBottom: '10px' }}>
                        <i className="fas fa-check-circle"></i>
                    </div>
                    <h2 style={{ color: '#16a34a', marginBottom: '8px' }}>
                        Selamat, Anda Telah Berhasil Menyelesaikan Asesmen!
                    </h2>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                        Jawaban Anda untuk <strong>{examResults.name}</strong> ({examResults.subject}) telah berhasil dikirim dan tersimpan pada {examResults.date}.
                    </p>
                </div>
                <button onClick={handleBackToDashboard} className="back-button" style={{ marginTop: '20px' }}>
                    Kembali ke Dashboard
                </button>
            </div>
        );
    } else if (currentUser) {
        if (currentUser.role === 'admin') {
            content = (
                <AdminDashboard
                    user={currentUser}
                    onLogout={handleLogout}
                    allUsers={allUsers}
                    onUpdateUsers={handleUpdateUsers}
                    showToast={showToast}
                    bankSoal={bankSoal}
                    onUpdateQuestions={handleUpdateQuestions}
                    subjectAssignments={subjectAssignments}
                    onUpdateAssignments={handleUpdateAssignments}
                    examsList={examsList}
                    completedExams={completedExams}
                    onRestoreBackup={handleRestoreBackup}
                />
            );
        } else if (currentUser.role === 'guru') {
            if (selectedExamResult) {
                content = (
                    <ExamDetail
                        result={selectedExamResult}
                        onBack={handleBackToResults}
                        bankSoal={bankSoal}
                        examsList={examsList}
                    />
                );
            } else {
                content = (
                    <GuruDashboard
                        user={currentUser}
                        onLogout={handleLogout}
                        examsList={examsList}
                        onAddExam={handleAddExam}
                        onToggleExamStatus={handleToggleExamStatus}
                        onDeleteExam={handleDeleteExam}
                        allCompletedExams={completedExams}
                        showToast={showToast}
                        onViewDetail={handleViewExamDetail}
                        bankSoal={bankSoal}
                        onAddSoal={handleAddSoal}
                        onBulkAddSoal={handleBulkAddSoal}
                        onEditSoal={handleEditSoal}
                        onDeleteSoal={handleDeleteSoal}
                        onDeleteAllSoal={handleDeleteAllSoalByFilter}
                        onResetStudentExam={handleResetStudentExam}
                        subjectAssignments={subjectAssignments}
                    />
                );
            }
        } else {
            const studentCompletedExams = completedExams.filter(
                e => e.studentName === currentUser.name
            );

            content = (
                <SiswaDashboard
                    user={currentUser}
                    onLogout={handleLogout}
                    onStartExam={handleStartExam}
                    availableExams={examsList}
                    completedExams={studentCompletedExams}
                />
            );
        }
    } else {
        content = <Login onLogin={handleLogin} />;
    }

    return (
        <div className="App">
            {content}
            <button
                type="button"
                className="theme-toggle-btn"
                onClick={toggleTheme}
                title="Ganti Tema Tampilan"
            >
                <i className={theme === 'light' ? 'fas fa-moon' : 'fas fa-sun'}></i>
                <span>{theme === 'light' ? 'Mode Gelap' : 'Mode Terang'}</span>
            </button>
            <Toast
                message={toastState.message}
                type={toastState.type}
                isVisible={toastState.isVisible}
                onClose={hideToast}
            />
        </div>
    );
}

export default App;