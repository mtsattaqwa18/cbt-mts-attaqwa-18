// src/components/GuruDashboard.js
import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { SUBJECT_GROUPS, ALL_SUBJECTS, GRADES } from '../constants/subjects';
import './GuruDashboard.css';

const LABELS = ['A', 'B', 'C', 'D'];

const createTokenCode = (length = 6) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let token = '';
    for (let i = 0; i < length; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token.toUpperCase();
};

const normalizeOptions = (options) => {
    if (Array.isArray(options)) return options;
    if (options && typeof options === 'object') {
        return LABELS.map(k => options[k] || '');
    }
    return ['', '', '', ''];
};

const isArabicText = (text) => /[\u0600-\u06FF]/.test(String(text || ''));

function GuruDashboard({
    user,
    onLogout,
    allCompletedExams = [],
    examsList = [],
    onAddExam,
    onToggleExamStatus,
    onDeleteExam,
    onResetExamToken,
    showToast,
    onViewDetail,
    bankSoal = [],
    onAddSoal,
    onBulkAddSoal,
    onEditSoal,
    onDeleteSoal,
    onDeleteAllSoal,
    onResetStudentExam,
    subjectAssignments = [],
}) {
    const [activeTab, setActiveTab] = useState('exams');

    // Penugasan mata pelajaran & kelas milik guru yang sedang login
    const teacherAssignments = useMemo(() => {
        if (!Array.isArray(subjectAssignments) || subjectAssignments.length === 0) return [];
        return subjectAssignments.filter(a => Number(a.teacherId) === Number(user.id));
    }, [subjectAssignments, user.id]);

    const allowedSubjects = useMemo(() => {
        if (teacherAssignments.length === 0) return ALL_SUBJECTS;
        const setSubs = new Set(teacherAssignments.map(a => a.subject));
        return ALL_SUBJECTS.filter(sub => setSubs.has(sub));
    }, [teacherAssignments]);

    const getAllowedGradesForSubject = (subjectName) => {
        if (teacherAssignments.length === 0) return GRADES;
        const grades = teacherAssignments
            .filter(a => a.subject === subjectName)
            .map(a => Number(a.grade));
        return grades.length > 0 ? [...new Set(grades)].sort((a, b) => a - b) : GRADES;
    };

    const defaultSubject = allowedSubjects[0] || ALL_SUBJECTS[0];
    const defaultGrade = getAllowedGradesForSubject(defaultSubject)[0] || 7;

    // --- STATE KELOLA UJIAN ---
    const [examForm, setExamForm] = useState({
        name: '',
        subject: defaultSubject,
        grade: defaultGrade,
        totalQuestions: 10,
        timeLimitMinutes: 30,
        kkm: 75,
        shuffleQuestions: true,
        shuffleOptions: true,
        requireToken: false,
        examToken: '',
    });

    // --- STATE BANK SOAL ---
    const [selectedSubject, setSelectedSubject] = useState(defaultSubject);
    const [selectedGrade, setSelectedGrade] = useState(defaultGrade);
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [newQuestion, setNewQuestion] = useState({
        text: '',
        imageUrl: '',
        options: ['', '', '', ''],
        key: 'A',
        weight: 10,
    });

    // --- STATE FILTER RIWAYAT NILAI ---
    const [resultFilterSubject, setResultFilterSubject] = useState('all');
    const [resultFilterGrade, setResultFilterGrade] = useState('all');
    const [resultSearchQuery, setResultSearchQuery] = useState('');

    // Sinkronkan pilihan default jika penugasan guru berubah
    useEffect(() => {
        if (!allowedSubjects.includes(selectedSubject)) {
            const nextSub = allowedSubjects[0] || ALL_SUBJECTS[0];
            setSelectedSubject(nextSub);
            setSelectedGrade(getAllowedGradesForSubject(nextSub)[0] || 7);
        }
        if (!allowedSubjects.includes(examForm.subject)) {
            const nextSub = allowedSubjects[0] || ALL_SUBJECTS[0];
            setExamForm(prev => ({
                ...prev,
                subject: nextSub,
                grade: getAllowedGradesForSubject(nextSub)[0] || 7,
            }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allowedSubjects]);

    const renderFilteredSubjectOptions = () =>
        SUBJECT_GROUPS.map(grp => {
            const subs = grp.subjects.filter(s => allowedSubjects.includes(s));
            if (subs.length === 0) return null;
            return (
                <optgroup key={grp.group} label={grp.group}>
                    {subs.map(sub => (
                        <option key={sub} value={sub}>
                            {sub}
                        </option>
                    ))}
                </optgroup>
            );
        });

    // Daftar ujian yang relevan dengan guru ini
    const visibleExams = useMemo(() => {
        if (teacherAssignments.length === 0) return examsList;
        return examsList.filter(exam =>
            teacherAssignments.some(
                a => a.subject === exam.subject && Number(a.grade) === Number(exam.grade)
            )
        );
    }, [examsList, teacherAssignments]);

    // Soal sesuai filter mata pelajaran & kelas yang dipilih
    const filteredQuestions = useMemo(() => {
        return bankSoal.filter(
            q => q.subject === selectedSubject && Number(q.grade) === Number(selectedGrade)
        );
    }, [bankSoal, selectedSubject, selectedGrade]);

    // Riwayat hasil siswa yang relevan
    const filteredResults = useMemo(() => {
        return allCompletedExams.filter(res => {
            const matchesTeacher =
                teacherAssignments.length === 0 ||
                teacherAssignments.some(
                    a => a.subject === res.subject && Number(a.grade) === Number(res.grade)
                );
            const matchesSub = resultFilterSubject === 'all' || res.subject === resultFilterSubject;
            const matchesGrade =
                resultFilterGrade === 'all' || Number(res.grade) === Number(resultFilterGrade);
            const matchesQuery =
                (res.studentName || '').toLowerCase().includes(resultSearchQuery.toLowerCase()) ||
                (res.name || '').toLowerCase().includes(resultSearchQuery.toLowerCase());

            return matchesTeacher && matchesSub && matchesGrade && matchesQuery;
        });
    }, [
        allCompletedExams,
        teacherAssignments,
        resultFilterSubject,
        resultFilterGrade,
        resultSearchQuery,
    ]);

    // --- HANDLER CEKLIS TOKEN PADA FORM BUAT UJIAN ---
    const handleToggleRequireToken = (checked) => {
        setExamForm(prev => ({
            ...prev,
            requireToken: checked,
            examToken: checked ? (prev.examToken || createTokenCode()).toUpperCase() : '',
        }));
    };

    const handleCopyToken = (tokenValue) => {
        if (!tokenValue) return;
        const upperToken = String(tokenValue).toUpperCase();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard
                .writeText(upperToken)
                .then(() => showToast(`Token ${upperToken} disalin ke clipboard.`, 'info'))
                .catch(() => showToast(`Token aktif: ${upperToken}`, 'info'));
        } else {
            showToast(`Token aktif: ${upperToken}`, 'info');
        }
    };

    // --- HANDLER BUAT UJIAN BARU ---
    const handleCreateExam = (e) => {
        e.preventDefault();
        if (!examForm.name.trim()) {
            showToast('Nama asesmen / ujian wajib diisi.', 'warning');
            return;
        }

        const availableCount = bankSoal.filter(
            q => q.subject === examForm.subject && Number(q.grade) === Number(examForm.grade)
        ).length;

        if (availableCount < Number(examForm.totalQuestions)) {
            showToast(
                `Bank Soal ${examForm.subject} Kelas ${examForm.grade} baru memiliki ${availableCount} soal (dibutuhkan ${examForm.totalQuestions} soal).`,
                'warning'
            );
        }

        const finalToken = examForm.requireToken
            ? (examForm.examToken || createTokenCode()).trim().toUpperCase()
            : null;

        onAddExam({
            name: examForm.name.trim(),
            subject: examForm.subject,
            grade: Number(examForm.grade),
            totalQuestions: Number(examForm.totalQuestions),
            timeLimit: Number(examForm.timeLimitMinutes) * 60,
            kkm: Math.max(70, Number(examForm.kkm) || 75),
            shuffleQuestions: examForm.shuffleQuestions,
            shuffleOptions: examForm.shuffleOptions,
            requireToken: examForm.requireToken,
            examToken: finalToken,
        });

        setExamForm(prev => ({
            ...prev,
            name: '',
            examToken: prev.requireToken ? createTokenCode() : '',
        }));
    };

    // --- HANDLER TAMBAH SOAL MANUAL ---
    const handleAddQuestionSubmit = (e) => {
        e.preventDefault();
        if (!newQuestion.text.trim()) {
            showToast('Teks pertanyaan wajib diisi.', 'warning');
            return;
        }
        if (newQuestion.options.some(opt => !opt.trim())) {
            showToast('Keempat pilihan jawaban (A, B, C, D) wajib diisi.', 'warning');
            return;
        }

        onAddSoal({
            text: newQuestion.text.trim(),
            imageUrl: (newQuestion.imageUrl || '').trim(),
            options: newQuestion.options.map(opt => opt.trim()),
            key: newQuestion.key,
            weight: Number(newQuestion.weight) || 10,
            subject: selectedSubject,
            grade: Number(selectedGrade),
        });

        setNewQuestion({
            text: '',
            imageUrl: '',
            options: ['', '', '', ''],
            key: 'A',
            weight: 10,
        });
    };

    // --- HANDLER EDIT SOAL ---
    const handleStartEdit = (soal) => {
        setEditingQuestion({
            ...soal,
            imageUrl: soal.imageUrl || '',
            options: normalizeOptions(soal.options),
        });
    };

    const handleSaveEdit = (e) => {
        e.preventDefault();
        if (!editingQuestion.text.trim() || editingQuestion.options.some(opt => !opt.trim())) {
            showToast('Pertanyaan dan semua opsi jawaban tidak boleh kosong.', 'warning');
            return;
        }

        onEditSoal({
            ...editingQuestion,
            text: editingQuestion.text.trim(),
            imageUrl: (editingQuestion.imageUrl || '').trim(),
            options: editingQuestion.options.map(opt => opt.trim()),
            weight: Number(editingQuestion.weight) || 10,
        });

        setEditingQuestion(null);
    };

    // --- HANDLER TEMPLATE & IMPORT EXCEL BANK SOAL ---
    const handleDownloadSoalTemplate = () => {
        const rows = [
            [
                'No',
                'Pertanyaan',
                'Opsi A',
                'Opsi B',
                'Opsi C',
                'Opsi D',
                'Kunci (A/B/C/D)',
                'Bobot Poin',
                'URL Gambar (Opsional)',
            ],
            [
                1,
                'Contoh: Rukun Islam yang kedua adalah...',
                'Syahadat',
                'Salat',
                'Zakat',
                'Puasa',
                'B',
                10,
                '',
            ],
        ];
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [
            { wch: 5 },
            { wch: 45 },
            { wch: 20 },
            { wch: 20 },
            { wch: 20 },
            { wch: 20 },
            { wch: 15 },
            { wch: 12 },
            { wch: 30 },
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template Bank Soal');
        XLSX.writeFile(wb, `Template_Soal_${selectedSubject}_Kelas_${selectedGrade}.xlsx`);
        showToast('Template Excel Bank Soal berhasil diunduh!', 'info');
    };

    const handleUploadSoalExcel = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target.result);
                const wb = XLSX.read(data, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

                const importedQuestions = [];

                rows.slice(1).forEach((row, idx) => {
                    if (!row || !row[1]) return;
                    const qText = String(row[1]).trim();
                    if (!qText || qText.toLowerCase().includes('pertanyaan')) return;

                    const opts = [
                        String(row[2] || '').trim(),
                        String(row[3] || '').trim(),
                        String(row[4] || '').trim(),
                        String(row[5] || '').trim(),
                    ];

                    if (opts.some(o => !o)) return;

                    const rawKey = String(row[6] || 'A').trim().toUpperCase();
                    const validKey = LABELS.includes(rawKey) ? rawKey : 'A';
                    const weightVal = parseInt(row[7], 10) || 10;
                    const imgUrl = String(row[8] || '').trim();

                    importedQuestions.push({
                        id: Date.now() + idx * 100 + Math.floor(Math.random() * 100),
                        text: qText,
                        imageUrl: imgUrl,
                        options: opts,
                        key: validKey,
                        weight: weightVal,
                        subject: selectedSubject,
                        grade: Number(selectedGrade),
                    });
                });

                if (importedQuestions.length > 0) {
                    onBulkAddSoal(importedQuestions);
                } else {
                    showToast('Tidak ada baris soal valid ditemukan dalam file Excel.', 'warning');
                }
            } catch (err) {
                console.error(err);
                showToast('Gagal membaca file Excel soal.', 'error');
            }
        };
        reader.readAsArrayBuffer(file);
        e.target.value = null;
    };

    // --- HANDLER EXPORT REKAP NILAI KE EXCEL ---
    const handleExportResultsExcel = () => {
        if (filteredResults.length === 0) {
            showToast('Belum ada data nilai siswa untuk diekspor.', 'warning');
            return;
        }

        const exportRows = filteredResults.map((res, idx) => {
            const matchedExam = examsList.find(e => e.id === res.examId);
            const kkm = matchedExam?.kkm || 75;
            const status = res.score >= kkm ? 'TUNTAS' : 'REMIDI';

            return {
                'No': idx + 1,
                'Nama Siswa': res.studentName,
                'Kelas': res.grade,
                'Mata Pelajaran': res.subject,
                'Nama Asesmen': res.name,
                'KKM': kkm,
                'Nilai Akhir': res.score,
                'Status': status,
                'Peringatan Layar': res.violationCount || 0,
                'Waktu Selesai': res.date,
            };
        });

        const ws = XLSX.utils.json_to_sheet(exportRows);
        ws['!cols'] = [
            { wch: 5 },
            { wch: 30 },
            { wch: 8 },
            { wch: 28 },
            { wch: 28 },
            { wch: 8 },
            { wch: 12 },
            { wch: 12 },
            { wch: 16 },
            { wch: 22 },
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Rekap Nilai Siswa');
        XLSX.writeFile(wb, `Rekap_Nilai_Siswa_${new Date().toISOString().slice(0, 10)}.xlsx`);
        showToast('Rekap Nilai Siswa berhasil diekspor ke Excel!', 'success');
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <div>
                    <h2>Dashboard Guru</h2>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Pengelolaan Jadwal Asesmen, Bank Soal &amp; Rekap Nilai Siswa
                    </p>
                </div>
                <div className="user-info">
                    <span>
                        Selamat datang, <strong>{user.name}</strong>
                    </span>
                    <button onClick={onLogout} className="logout-btn">
                        Logout
                    </button>
                </div>
            </header>

            <div className="guru-nav-tabs">
                <button
                    className={activeTab === 'exams' ? 'active' : ''}
                    onClick={() => setActiveTab('exams')}
                >
                    Manajemen Ujian ({visibleExams.length})
                </button>
                <button
                    className={activeTab === 'banksoal' ? 'active' : ''}
                    onClick={() => setActiveTab('banksoal')}
                >
                    Bank Soal ({bankSoal.length})
                </button>
                <button
                    className={activeTab === 'results' ? 'active' : ''}
                    onClick={() => setActiveTab('results')}
                >
                    Riwayat Nilai Siswa ({filteredResults.length})
                </button>
            </div>

            <div className="dashboard-content">
                {/* === TAB 1: MANAJEMEN UJIAN === */}
                {activeTab === 'exams' && (
                    <div>
                        <form className="add-form" onSubmit={handleCreateExam}>
                            <h3>Buat Jadwal Asesmen / Ujian Baru</h3>
                            <div className="control-row">
                                <input
                                    type="text"
                                    placeholder="Nama Ujian (Contoh: PTS Ganjil Fikih)"
                                    value={examForm.name}
                                    onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
                                    required
                                />

                                <select
                                    value={examForm.subject}
                                    onChange={(e) => {
                                        const nextSub = e.target.value;
                                        const allowedG = getAllowedGradesForSubject(nextSub);
                                        setExamForm({
                                            ...examForm,
                                            subject: nextSub,
                                            grade: allowedG[0] || 7,
                                        });
                                    }}
                                >
                                    {renderFilteredSubjectOptions()}
                                </select>

                                <select
                                    value={examForm.grade}
                                    onChange={(e) =>
                                        setExamForm({ ...examForm, grade: parseInt(e.target.value, 10) })
                                    }
                                >
                                    {getAllowedGradesForSubject(examForm.subject).map(g => (
                                        <option key={g} value={g}>
                                            Kelas {g}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="control-row">
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.82rem', display: 'block', marginBottom: '4px' }}>
                                        Jumlah Soal Tampil
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={examForm.totalQuestions}
                                        onChange={(e) =>
                                            setExamForm({ ...examForm, totalQuestions: e.target.value })
                                        }
                                        required
                                    />
                                </div>

                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.82rem', display: 'block', marginBottom: '4px' }}>
                                        Durasi (Menit)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="240"
                                        value={examForm.timeLimitMinutes}
                                        onChange={(e) =>
                                            setExamForm({ ...examForm, timeLimitMinutes: e.target.value })
                                        }
                                        required
                                    />
                                </div>

                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '0.82rem', display: 'block', marginBottom: '4px' }}>
                                        Nilai KKM (Min. 70)
                                    </label>
                                    <input
                                        type="number"
                                        min="70"
                                        max="100"
                                        value={examForm.kkm}
                                        onChange={(e) => setExamForm({ ...examForm, kkm: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '20px',
                                    margin: '10px 0 14px',
                                    alignItems: 'center',
                                }}
                            >
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={examForm.shuffleQuestions}
                                        onChange={(e) =>
                                            setExamForm({ ...examForm, shuffleQuestions: e.target.checked })
                                        }
                                    />
                                    <span>Acak Urutan Soal</span>
                                </label>

                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={examForm.shuffleOptions}
                                        onChange={(e) =>
                                            setExamForm({ ...examForm, shuffleOptions: e.target.checked })
                                        }
                                    />
                                    <span>Acak Pilihan Jawaban (A/B/C/D)</span>
                                </label>

                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={examForm.requireToken}
                                        onChange={(e) => handleToggleRequireToken(e.target.checked)}
                                    />
                                    <span>Gunakan Token Ujian</span>
                                </label>

                                {examForm.requireToken && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span
                                            style={{
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontWeight: 700,
                                                letterSpacing: '0.08em',
                                                background: 'rgba(37, 99, 235, 0.12)',
                                                color: '#2563eb',
                                                fontSize: '0.9rem',
                                            }}
                                        >
                                            {examForm.examToken}
                                        </span>
                                        <button
                                            type="button"
                                            className="action-button edit-btn"
                                            onClick={() =>
                                                setExamForm(prev => ({
                                                    ...prev,
                                                    examToken: createTokenCode(),
                                                }))
                                            }
                                        >
                                            Generate Ulang
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button type="submit" className="start-button">
                                + Terbitkan Jadwal Asesmen
                            </button>
                        </form>

                        <h3 style={{ marginTop: '26px' }}>Daftar Jadwal Asesmen</h3>
                        <div className="table-responsive">
                            <table className="bank-soal-table">
                                <thead>
                                    <tr>
                                        <th>Nama Asesmen</th>
                                        <th>Mapel &amp; Kelas</th>
                                        <th>Soal / Durasi</th>
                                        <th>KKM</th>
                                        <th>Pengacakan</th>
                                        <th>Token</th>
                                        <th>Status</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleExams.map(exam => {
                                        const availableSoal = bankSoal.filter(
                                            q =>
                                                q.subject === exam.subject &&
                                                Number(q.grade) === Number(exam.grade)
                                        ).length;
                                        const usesToken = Boolean(exam.requireToken && exam.examToken);

                                        return (
                                            <tr key={exam.id}>
                                                <td>
                                                    <strong>{exam.name}</strong>
                                                </td>
                                                <td>
                                                    {exam.subject} (Kelas {exam.grade})
                                                </td>
                                                <td>
                                                    {exam.totalQuestions} Soal (Tersedia: {availableSoal}) &bull;{' '}
                                                    {Math.round(exam.timeLimit / 60)} Menit
                                                </td>
                                                <td>
                                                    <strong>{exam.kkm || 75}</strong>
                                                </td>
                                                <td>
                                                    {exam.shuffleQuestions ? 'Acak Soal' : 'Urut'} &bull;{' '}
                                                    {exam.shuffleOptions ? 'Acak Opsi' : 'Opsi Tetap'}
                                                </td>
                                                <td>
                                                    {usesToken ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                            <span
                                                                style={{
                                                                    padding: '4px 10px',
                                                                    borderRadius: '6px',
                                                                    fontSize: '0.82rem',
                                                                    fontWeight: 700,
                                                                    letterSpacing: '0.06em',
                                                                    background: 'rgba(37, 99, 235, 0.14)',
                                                                    color: '#2563eb',
                                                                }}
                                                            >
                                                                {exam.examToken}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                className="action-button edit-btn"
                                                                onClick={() => handleCopyToken(exam.examToken)}
                                                                title="Salin Token"
                                                            >
                                                                Salin
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                                            Tanpa Token
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span
                                                        style={{
                                                            padding: '4px 10px',
                                                            borderRadius: '999px',
                                                            fontSize: '0.8rem',
                                                            fontWeight: 700,
                                                            background: exam.isActive
                                                                ? 'rgba(22, 163, 74, 0.15)'
                                                                : 'rgba(148, 163, 184, 0.2)',
                                                            color: exam.isActive ? '#16a34a' : '#64748b',
                                                        }}
                                                    >
                                                        {exam.isActive ? 'Aktif' : 'Non-aktif'}
                                                    </span>
                                                </td>
                                                <td>
                                                    {onResetExamToken && (
                                                        <button
                                                            type="button"
                                                            className="action-button edit-btn"
                                                            onClick={() => {
                                                                if (
                                                                    window.confirm(
                                                                        `Reset token untuk asesmen "${exam.name}"? Token baru akan langsung berlaku untuk siswa yang belum memulai.`
                                                                    )
                                                                ) {
                                                                    onResetExamToken(exam.id);
                                                                }
                                                            }}
                                                        >
                                                            Reset Token
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        className="action-button edit-btn"
                                                        onClick={() => onToggleExamStatus(exam.id)}
                                                    >
                                                        {exam.isActive ? 'Non-aktifkan' : 'Aktifkan'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="action-button delete-btn"
                                                        onClick={() => {
                                                            if (
                                                                window.confirm(
                                                                    `Hapus asesmen "${exam.name}" beserta seluruh hasil pengerjaan siswa?`
                                                                )
                                                            ) {
                                                                onDeleteExam(exam.id);
                                                            }
                                                        }}
                                                    >
                                                        Hapus
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {visibleExams.length === 0 && (
                            <p className="no-data-msg">Belum ada jadwal asesmen yang dibuat.</p>
                        )}
                    </div>
                )}

                {/* === TAB 2: BANK SOAL === */}
                {activeTab === 'banksoal' && (
                    <div>
                        <div className="controls" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
                            <select
                                value={selectedSubject}
                                onChange={(e) => {
                                    const nextSub = e.target.value;
                                    setSelectedSubject(nextSub);
                                    setSelectedGrade(getAllowedGradesForSubject(nextSub)[0] || 7);
                                    setEditingQuestion(null);
                                }}
                                style={{ maxWidth: '280px' }}
                            >
                                {renderFilteredSubjectOptions()}
                            </select>

                            <select
                                value={selectedGrade}
                                onChange={(e) => {
                                    setSelectedGrade(parseInt(e.target.value, 10));
                                    setEditingQuestion(null);
                                }}
                                style={{ maxWidth: '150px' }}
                            >
                                {getAllowedGradesForSubject(selectedSubject).map(g => (
                                    <option key={g} value={g}>
                                        Kelas {g}
                                    </option>
                                ))}
                            </select>

                            <button
                                type="button"
                                onClick={handleDownloadSoalTemplate}
                                className="cancel-button"
                            >
                                Unduh Template Excel
                            </button>

                            <label htmlFor="upload-soal-excel" className="upload-button">
                                Import Soal Excel
                            </label>
                            <input
                                id="upload-soal-excel"
                                type="file"
                                accept=".xlsx, .xls, .csv"
                                onChange={handleUploadSoalExcel}
                                style={{ display: 'none' }}
                            />

                            {filteredQuestions.length > 0 && (
                                <button
                                    type="button"
                                    className="delete-btn"
                                    style={{ marginLeft: 'auto' }}
                                    onClick={() => {
                                        if (
                                            window.confirm(
                                                `PERINGATAN! Hapus SEMUA (${filteredQuestions.length}) soal ${selectedSubject} Kelas ${selectedGrade}?`
                                            )
                                        ) {
                                            onDeleteAllSoal(selectedSubject, selectedGrade);
                                        }
                                    }}
                                >
                                    Hapus Semua Soal Ini ({filteredQuestions.length})
                                </button>
                            )}
                        </div>

                        {/* FORM EDIT SOAL JIKA SEDANG EDIT */}
                        {editingQuestion ? (
                            <form className="add-form" onSubmit={handleSaveEdit}>
                                <h3>Edit Soal #{editingQuestion.id}</h3>
                                <textarea
                                    rows="3"
                                    placeholder="Tulis teks pertanyaan (mendukung huruf Latin & Arab)..."
                                    dir={isArabicText(editingQuestion.text) ? 'rtl' : 'ltr'}
                                    value={editingQuestion.text}
                                    onChange={(e) =>
                                        setEditingQuestion({ ...editingQuestion, text: e.target.value })
                                    }
                                    required
                                />
                                <input
                                    type="url"
                                    placeholder="URL Gambar Soal (Opsional, contoh: https://.../gambar.jpg)"
                                    value={editingQuestion.imageUrl || ''}
                                    onChange={(e) =>
                                        setEditingQuestion({ ...editingQuestion, imageUrl: e.target.value })
                                    }
                                />

                                <div className="control-row" style={{ flexWrap: 'wrap' }}>
                                    {LABELS.map((label, idx) => (
                                        <input
                                            key={label}
                                            type="text"
                                            placeholder={`Pilihan ${label}`}
                                            dir={isArabicText(editingQuestion.options[idx]) ? 'rtl' : 'ltr'}
                                            value={editingQuestion.options[idx] || ''}
                                            onChange={(e) => {
                                                const updatedOpts = [...editingQuestion.options];
                                                updatedOpts[idx] = e.target.value;
                                                setEditingQuestion({
                                                    ...editingQuestion,
                                                    options: updatedOpts,
                                                });
                                            }}
                                            required
                                        />
                                    ))}
                                </div>

                                <div className="control-row">
                                    <select
                                        value={editingQuestion.key}
                                        onChange={(e) =>
                                            setEditingQuestion({ ...editingQuestion, key: e.target.value })
                                        }
                                    >
                                        {LABELS.map(lbl => (
                                            <option key={lbl} value={lbl}>
                                                Kunci Jawaban: {lbl}
                                            </option>
                                        ))}
                                    </select>

                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        placeholder="Bobot Poin"
                                        value={editingQuestion.weight}
                                        onChange={(e) =>
                                            setEditingQuestion({ ...editingQuestion, weight: e.target.value })
                                        }
                                        required
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button type="submit" className="start-button">
                                        Simpan Perubahan
                                    </button>
                                    <button
                                        type="button"
                                        className="cancel-button"
                                        onClick={() => setEditingQuestion(null)}
                                    >
                                        Batal
                                    </button>
                                </div>
                            </form>
                        ) : (
                            /* FORM TAMBAH SOAL BARU */
                            <form className="add-form" onSubmit={handleAddQuestionSubmit}>
                                <h3>
                                    Tambah Soal Baru ({selectedSubject} - Kelas {selectedGrade})
                                </h3>
                                <textarea
                                    rows="3"
                                    placeholder="Tulis pertanyaan di sini (mendukung teks Arab & Latin)..."
                                    dir={isArabicText(newQuestion.text) ? 'rtl' : 'ltr'}
                                    value={newQuestion.text}
                                    onChange={(e) =>
                                        setNewQuestion({ ...newQuestion, text: e.target.value })
                                    }
                                    required
                                />
                                <input
                                    type="url"
                                    placeholder="URL Gambar Soal (Opsional, contoh: https://.../gambar.jpg)"
                                    value={newQuestion.imageUrl}
                                    onChange={(e) =>
                                        setNewQuestion({ ...newQuestion, imageUrl: e.target.value })
                                    }
                                />

                                <div className="control-row" style={{ flexWrap: 'wrap' }}>
                                    {LABELS.map((label, idx) => (
                                        <input
                                            key={label}
                                            type="text"
                                            placeholder={`Pilihan ${label}`}
                                            dir={isArabicText(newQuestion.options[idx]) ? 'rtl' : 'ltr'}
                                            value={newQuestion.options[idx]}
                                            onChange={(e) => {
                                                const updatedOpts = [...newQuestion.options];
                                                updatedOpts[idx] = e.target.value;
                                                setNewQuestion({ ...newQuestion, options: updatedOpts });
                                            }}
                                            required
                                        />
                                    ))}
                                </div>

                                <div className="control-row">
                                    <select
                                        value={newQuestion.key}
                                        onChange={(e) =>
                                            setNewQuestion({ ...newQuestion, key: e.target.value })
                                        }
                                    >
                                        {LABELS.map(lbl => (
                                            <option key={lbl} value={lbl}>
                                                Kunci Jawaban: {lbl}
                                            </option>
                                        ))}
                                    </select>

                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        placeholder="Bobot Poin (default: 10)"
                                        value={newQuestion.weight}
                                        onChange={(e) =>
                                            setNewQuestion({ ...newQuestion, weight: e.target.value })
                                        }
                                        required
                                    />
                                </div>

                                <button type="submit" className="start-button">
                                    + Simpan ke Bank Soal
                                </button>
                            </form>
                        )}

                        {/* TABEL DAFTAR BANK SOAL */}
                        <div className="table-responsive" style={{ marginTop: '22px' }}>
                            <table className="bank-soal-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '50px' }}>No.</th>
                                        <th>Pertanyaan</th>
                                        <th>Pilihan Jawaban</th>
                                        <th style={{ width: '75px' }}>Kunci</th>
                                        <th style={{ width: '75px' }}>Bobot</th>
                                        <th style={{ width: '140px' }}>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredQuestions.map((soal, idx) => {
                                        const opts = normalizeOptions(soal.options);
                                        const arabicQuestion = isArabicText(soal.text);

                                        return (
                                            <tr key={soal.id}>
                                                <td>{idx + 1}</td>
                                                <td
                                                    dir={arabicQuestion ? 'rtl' : 'ltr'}
                                                    style={{
                                                        fontSize: arabicQuestion ? '1.2rem' : 'inherit',
                                                        lineHeight: arabicQuestion ? '1.8' : 'inherit',
                                                    }}
                                                >
                                                    <div>{soal.text}</div>
                                                    {soal.imageUrl && (
                                                        <img
                                                            src={soal.imageUrl}
                                                            alt="Lampiran Soal"
                                                            style={{
                                                                maxHeight: '100px',
                                                                marginTop: '8px',
                                                                borderRadius: '6px',
                                                            }}
                                                        />
                                                    )}
                                                </td>
                                                <td>
                                                    <ul style={{ margin: 0, paddingLeft: '18px' }}>
                                                        {opts.map((opt, optIdx) => {
                                                            const lbl = LABELS[optIdx];
                                                            const isKey = soal.key === lbl;
                                                            return (
                                                                <li
                                                                    key={lbl}
                                                                    dir={isArabicText(opt) ? 'rtl' : 'ltr'}
                                                                    style={{
                                                                        fontWeight: isKey ? 700 : 400,
                                                                        color: isKey ? '#16a34a' : 'inherit',
                                                                    }}
                                                                >
                                                                    <strong>{lbl}.</strong> {opt}
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                </td>
                                                <td>
                                                    <strong>{soal.key}</strong>
                                                </td>
                                                <td>{soal.weight}</td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="action-button edit-btn"
                                                        onClick={() => handleStartEdit(soal)}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="action-button delete-btn"
                                                        onClick={() => {
                                                            if (window.confirm('Yakin hapus soal ini?')) {
                                                                onDeleteSoal(soal.id);
                                                            }
                                                        }}
                                                    >
                                                        Hapus
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {filteredQuestions.length === 0 && (
                            <p className="no-data-msg">
                                Belum ada soal untuk {selectedSubject} Kelas {selectedGrade}.
                            </p>
                        )}
                    </div>
                )}

                {/* === TAB 3: RIWAYAT NILAI SISWA === */}
                {activeTab === 'results' && (
                    <div>
                        <div
                            className="controls"
                            style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '10px',
                                marginBottom: '18px',
                                alignItems: 'center',
                            }}
                        >
                            <select
                                value={resultFilterSubject}
                                onChange={(e) => setResultFilterSubject(e.target.value)}
                                style={{ maxWidth: '250px' }}
                            >
                                <option value="all">Semua Mata Pelajaran</option>
                                {allowedSubjects.map(sub => (
                                    <option key={sub} value={sub}>
                                        {sub}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={resultFilterGrade}
                                onChange={(e) => setResultFilterGrade(e.target.value)}
                                style={{ maxWidth: '150px' }}
                            >
                                <option value="all">Semua Kelas</option>
                                {GRADES.map(g => (
                                    <option key={g} value={g}>
                                        Kelas {g}
                                    </option>
                                ))}
                            </select>

                            <input
                                type="text"
                                placeholder="Cari nama siswa atau nama ujian..."
                                value={resultSearchQuery}
                                onChange={(e) => setResultSearchQuery(e.target.value)}
                                style={{ maxWidth: '280px' }}
                            />

                            <button
                                type="button"
                                onClick={handleExportResultsExcel}
                                className="start-button"
                                style={{ marginLeft: 'auto' }}
                            >
                                Export Rekap Nilai (.xlsx)
                            </button>
                        </div>

                        <div className="table-responsive">
                            <table className="bank-soal-table">
                                <thead>
                                    <tr>
                                        <th>No.</th>
                                        <th>Nama Siswa</th>
                                        <th>Kelas</th>
                                        <th>Asesmen &amp; Mapel</th>
                                        <th>Nilai</th>
                                        <th>Status KKM</th>
                                        <th>Pelanggaran Layar</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredResults.map((result, idx) => {
                                        const matchedExam = examsList.find(e => e.id === result.examId);
                                        const kkm = matchedExam?.kkm || 75;
                                        const isPassed = result.score >= kkm;

                                        return (
                                            <tr key={`${result.examId}-${result.studentName}-${idx}`}>
                                                <td>{idx + 1}</td>
                                                <td>
                                                    <strong>{result.studentName}</strong>
                                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                                                        {result.date}
                                                    </div>
                                                </td>
                                                <td>Kelas {result.grade}</td>
                                                <td>
                                                    <div>{result.name}</div>
                                                    <small style={{ color: 'var(--text-secondary)' }}>
                                                        {result.subject}
                                                    </small>
                                                </td>
                                                <td>
                                                    <strong
                                                        style={{
                                                            fontSize: '1.1rem',
                                                            color: isPassed ? '#16a34a' : '#ef4444',
                                                        }}
                                                    >
                                                        {result.score}
                                                    </strong>
                                                </td>
                                                <td>
                                                    <span
                                                        style={{
                                                            padding: '4px 10px',
                                                            borderRadius: '999px',
                                                            fontSize: '0.78rem',
                                                            fontWeight: 700,
                                                            background: isPassed
                                                                ? 'rgba(22, 163, 74, 0.15)'
                                                                : 'rgba(239, 68, 68, 0.15)',
                                                            color: isPassed ? '#16a34a' : '#ef4444',
                                                        }}
                                                    >
                                                        {isPassed ? `Tuntas (≥${kkm})` : `Remidi (<${kkm})`}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span
                                                        style={{
                                                            fontWeight: 600,
                                                            color:
                                                                (result.violationCount || 0) > 0
                                                                    ? '#ef4444'
                                                                    : '#16a34a',
                                                        }}
                                                    >
                                                        {result.violationCount || 0}x
                                                    </span>
                                                </td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="action-button detail-btn"
                                                        onClick={() => onViewDetail(result)}
                                                    >
                                                        Detail Jawaban
                                                    </button>

                                                    {onResetStudentExam && (
                                                        <button
                                                            type="button"
                                                            className="action-button delete-btn"
                                                            style={{ marginLeft: '6px' }}
                                                            onClick={() => {
                                                                if (
                                                                    window.confirm(
                                                                        `Reset status asesmen "${result.name}" milik ${result.studentName}? Nilai sebelumnya akan dihapus dan siswa dapat mengerjakan ulang.`
                                                                    )
                                                                ) {
                                                                    onResetStudentExam(
                                                                        result.examId,
                                                                        result.studentName
                                                                    );
                                                                }
                                                            }}
                                                        >
                                                            Reset Ujian
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {filteredResults.length === 0 && (
                            <p className="no-data-msg">Belum ada riwayat nilai siswa yang sesuai.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default GuruDashboard;
