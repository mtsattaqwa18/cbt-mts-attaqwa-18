// src/components/SiswaDashboard.js
import React, { useState } from 'react';
import './SiswaDashboard.css';

function SiswaDashboard({
    user,
    onLogout,
    onStartExam,
    availableExams = [],
    examsList = [],
    completedExams = [],
    onViewDetail,
    showToast,
}) {
    const [activeTab, setActiveTab] = useState('info');
    const [tokenModalExam, setTokenModalExam] = useState(null);
    const [tokenInput, setTokenInput] = useState('');
    const [tokenError, setTokenError] = useState('');

    // Mengambil daftar ujian dari prop availableExams (App.js) atau cadangan examsList
    const sourceExams = Array.isArray(availableExams) && availableExams.length > 0
        ? availableExams
        : Array.isArray(examsList)
        ? examsList
        : [];

    // Filter asesmen yang berstatus aktif dan sesuai dengan tingkat kelas siswa
    const activeStudentExams = sourceExams.filter(
        exam => exam && exam.isActive && Number(exam.grade) === Number(user.grade)
    );

    const isExamCompleted = (examId) =>
        Array.isArray(completedExams) &&
        completedExams.some(
            c => c && c.examId === examId && c.studentName === user.name
        );

    const handleAttemptStartExam = (exam) => {
        if (exam && exam.requireToken && exam.examToken) {
            setTokenModalExam(exam);
            setTokenInput('');
            setTokenError('');
            return;
        }
        onStartExam(exam);
    };

    const handleCloseTokenModal = () => {
        setTokenModalExam(null);
        setTokenInput('');
        setTokenError('');
    };

    const handleVerifyTokenSubmit = (e) => {
        e.preventDefault();
        if (!tokenModalExam) return;

        const latestExam =
            activeStudentExams.find(item => item.id === tokenModalExam.id) || tokenModalExam;
        const expectedToken = String(latestExam.examToken || '').trim().toUpperCase();
        const enteredToken = String(tokenInput || '').trim().toUpperCase();

        if (!enteredToken) {
            setTokenError('Silakan masukkan token ujian terlebih dahulu.');
            return;
        }

        if (enteredToken !== expectedToken) {
            setTokenError('Token tidak sesuai. Periksa kembali token dari guru.');
            if (showToast) {
                showToast('Token ujian salah! Silakan cek kembali token dari guru.', 'error');
            }
            return;
        }

        const examToLaunch = latestExam;
        handleCloseTokenModal();
        onStartExam(examToLaunch);
    };

    return (
        <div className="siswa-page-wrapper">
            <div className="siswa-dashboard">
                {/* HEADER */}
                <header className="dashboard-header">
                    <div>
                        <h2>Dashboard Siswa</h2>
                        <p className="header-subtitle">
                            Portal Asesmen Berbasis Komputer (CBT) &bull; MTs Attaqwa 18
                        </p>
                    </div>
                    <div className="user-info">
                        <span>
                            Selamat Datang, <strong>{user.name}</strong>
                        </span>
                        <span className="siswa-grade-badge">Kelas {user.grade}</span>
                        <button onClick={onLogout} className="logout-btn">
                            Logout
                        </button>
                    </div>
                </header>

                {/* NAVIGASI TAB */}
                <div className="siswa-nav-tabs">
                    <button
                        type="button"
                        className={activeTab === 'info' ? 'active' : ''}
                        onClick={() => setActiveTab('info')}
                    >
                        Informasi &amp; Petunjuk
                    </button>
                    <button
                        type="button"
                        className={activeTab === 'exams' ? 'active' : ''}
                        onClick={() => setActiveTab('exams')}
                    >
                        Asesmen Tersedia ({activeStudentExams.length})
                    </button>
                    <button
                        type="button"
                        className={activeTab === 'history' ? 'active' : ''}
                        onClick={() => setActiveTab('history')}
                    >
                        Riwayat Hasil ({completedExams.length})
                    </button>
                </div>

                {/* === TAB 1: INFORMASI & PETUNJUK === */}
                {activeTab === 'info' && (
                    <div className="siswa-info-section">
                        <div className="siswa-welcome-banner">
                            <p>
                                Selamat datang di <strong>Halaman Peraturan CBT</strong>. Halaman ini berisi
                                informasi untuk mengerjakan soal asesmen yang ada di sistem. Silakan baca
                                informasi penggunaan di bawah ini, lalu buka tab{' '}
                                <button
                                    type="button"
                                    className="inline-link-btn"
                                    onClick={() => setActiveTab('exams')}
                                >
                                    Asesmen Tersedia
                                </button>{' '}
                                untuk mulai mengerjakan.
                            </p>
                        </div>

                        <div className="siswa-rules-grid">
                            <div className="siswa-rule-card">
                                <h3>
                                    <i className="fas fa-info-circle" style={{ marginRight: '8px' }}></i>
                                    Informasi Umum
                                </h3>
                                <ul>
                                    <li>
                                        <strong>Dilarang</strong> membuka aplikasi atau tab lain selama asesmen berlangsung.
                                    </li>
                                    <li>Gunakan kertas buram untuk membantu menghitung.</li>
                                    <li>Pilihlah salah satu jawaban yang Anda anggap paling benar.</li>
                                    <li>Klik nomor soal pada navigasi untuk berpindah ke soal yang dituju.</li>
                                    <li>
                                        Klik tombol <strong>Selesai Asesmen</strong> untuk mengirim jawaban.
                                    </li>
                                </ul>
                            </div>

                            <div className="siswa-rule-card">
                                <h3>
                                    <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
                                    Petunjuk Pengerjaan
                                </h3>
                                <ul>
                                    <li>Berdoa terlebih dahulu sebelum mengerjakan soal.</li>
                                    <li>
                                        Waktu akan berjalan otomatis setelah Anda klik tombol{' '}
                                        <strong>Mulai Asesmen</strong>.
                                    </li>
                                    <li>Jika sudah selesai klik tombol selesai.</li>
                                    <li>Perhatikan sisa waktu yang tersedia di pojok kanan atas.</li>
                                    <li>Pastikan semua soal telah terjawab sebelum mengirim.</li>
                                </ul>
                            </div>
                        </div>

                        <div style={{ marginTop: '20px', textAlign: 'right' }}>
                            <button
                                type="button"
                                className="start-button"
                                style={{ width: 'auto', padding: '12px 26px' }}
                                onClick={() => setActiveTab('exams')}
                            >
                                Lihat Daftar Asesmen Tersedia &rarr;
                            </button>
                        </div>
                    </div>
                )}

                {/* === TAB 2: ASESMEN TERSEDIA === */}
                {activeTab === 'exams' && (
                    <div>
                        <h3 className="siswa-section-title">
                            Daftar Asesmen Aktif (Kelas {user.grade})
                        </h3>

                        {activeStudentExams.length > 0 ? (
                            <div className="exams-grid">
                                {activeStudentExams.map(exam => {
                                    const completed = isExamCompleted(exam.id);
                                    return (
                                        <div key={exam.id} className="exam-card">
                                            <div>
                                                <span className="exam-subject-tag">{exam.subject}</span>
                                                <h4>{exam.name}</h4>
                                                <div className="exam-meta-pills">
                                                    <span className="exam-meta-pill">
                                                        {exam.totalQuestions} Soal
                                                    </span>
                                                    <span className="exam-meta-pill">
                                                        {Math.round(exam.timeLimit / 60)} Menit
                                                    </span>
                                                    <span className="exam-meta-pill">
                                                        KKM: {exam.kkm || 75}
                                                    </span>
                                                    {exam.requireToken && (
                                                        <span className="exam-meta-pill">
                                                            Perlu Token
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                className="start-button"
                                                disabled={completed}
                                                onClick={() => handleAttemptStartExam(exam)}
                                            >
                                                {completed ? 'Sudah Dikerjakan' : 'Mulai Asesmen'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="no-data-msg">
                                Belum ada jadwal asesmen aktif untuk Kelas {user.grade} saat ini.
                            </p>
                        )}
                    </div>
                )}

                {/* === TAB 3: RIWAYAT HASIL UJIAN === */}
                {activeTab === 'history' && (
                    <div>
                        <h3 className="siswa-section-title">Riwayat Nilai Asesmen Anda</h3>

                        {completedExams.length > 0 ? (
                            <div className="table-responsive">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>No.</th>
                                            <th>Mata Pelajaran</th>
                                            <th>Nama Asesmen</th>
                                            <th>Nilai</th>
                                            <th>Waktu Selesai</th>
                                            {onViewDetail && <th>Aksi</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {completedExams.map((res, idx) => (
                                            <tr key={`${res.examId}-${idx}`}>
                                                <td>{idx + 1}</td>
                                                <td>{res.subject}</td>
                                                <td>
                                                    <strong>{res.name}</strong>
                                                </td>
                                                <td>
                                                    <strong style={{ fontSize: '1.08rem', color: 'var(--mts-g)' }}>
                                                        {res.score}
                                                    </strong>
                                                </td>
                                                <td>{res.date}</td>
                                                {onViewDetail && (
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="detail-btn"
                                                            onClick={() => onViewDetail(res)}
                                                        >
                                                            Lihat Pembahasan
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="no-data-msg">
                                Anda belum memiliki riwayat pengerjaan asesmen.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* MODAL INPUT TOKEN SEBELUM MULAI UJIAN */}
            {tokenModalExam && (
                <div className="violation-overlay">
                    <div className="violation-modal" style={{ textAlign: 'left', maxWidth: '420px' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '6px' }}>Verifikasi Token Ujian</h3>
                        <p style={{ margin: '0 0 14px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            <strong>{tokenModalExam.name}</strong> ({tokenModalExam.subject})
                        </p>

                        <form onSubmit={handleVerifyTokenSubmit}>
                            <label
                                htmlFor="exam-token-input"
                                style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}
                            >
                                Masukkan Token dari Guru (Otomatis Huruf Kapital)
                            </label>
                            <input
                                id="exam-token-input"
                                type="text"
                                autoFocus
                                value={tokenInput}
                                onChange={(e) => {
                                    setTokenInput(e.target.value.toUpperCase());
                                    if (tokenError) setTokenError('');
                                }}
                                placeholder="CONTOH: A7K9M2"
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(148, 163, 184, 0.5)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.12em',
                                    fontWeight: 700,
                                    fontSize: '1rem',
                                    boxSizing: 'border-box',
                                }}
                            />

                            {tokenError && (
                                <p style={{ color: '#ef4444', fontSize: '0.84rem', margin: '8px 0 0', fontWeight: 600 }}>
                                    {tokenError}
                                </p>
                            )}

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '18px' }}>
                                <button
                                    type="button"
                                    className="cancel-button"
                                    onClick={handleCloseTokenModal}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="start-button"
                                    style={{ width: 'auto', padding: '10px 18px' }}
                                >
                                    Verifikasi &amp; Mulai
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SiswaDashboard;
