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
}) {
    const [activeTab, setActiveTab] = useState('info');

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
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                className="start-button"
                                                disabled={completed}
                                                onClick={() => onStartExam(exam)}
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
        </div>
    );
}

export default SiswaDashboard;