// src/components/AdminDashboard.js
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { SUBJECT_GROUPS, ALL_SUBJECTS, GRADES } from '../constants/subjects';
import './AdminDashboard.css';

// Generator Username Unik Siswa (Contoh: della.7482)
const generateUniqueUsername = (fullName, grade, existingUsernames = new Set()) => {
    const cleanFirstName =
        (fullName || 'siswa')
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .trim()
            .split(/\s+/)[0] || 'siswa';

    let candidate = '';
    let attempts = 0;

    do {
        const randomDigits = Math.floor(100 + Math.random() * 900); // 100 - 999
        candidate = `${cleanFirstName}.${grade || 7}${randomDigits}`;
        attempts += 1;
    } while (existingUsernames.has(candidate) && attempts < 100);

    existingUsernames.add(candidate);
    return candidate;
};

// Generator Username Unik Guru (Contoh: guru.ridhan482)
const generateUniqueTeacherUsername = (fullName, existingUsernames = new Set()) => {
    const cleanFirstName =
        (fullName || 'guru')
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .trim()
            .split(/\s+/)[0] || 'guru';

    let candidate = '';
    let attempts = 0;

    do {
        const randomDigits = Math.floor(100 + Math.random() * 900); // 100 - 999
        candidate = `guru.${cleanFirstName}${randomDigits}`;
        attempts += 1;
    } while (existingUsernames.has(candidate) && attempts < 100);

    existingUsernames.add(candidate);
    return candidate;
};

// Generator Password Acak 6 Karakter (tanpa karakter membingungkan seperti O/0, I/1/l)
const generateUniquePassword = (length = 6) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

function AdminDashboard({
    user,
    onLogout,
    allUsers = [],
    onUpdateUsers,
    showToast,
    bankSoal = [],
    onUpdateQuestions,
    subjectAssignments = [],
    onUpdateAssignments,
    examsList = [],
    completedExams = [],
    onRestoreBackup,
}) {
    const [activeTab, setActiveTab] = useState('students');
    const [gradeFilter, setGradeFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [teacherSearchQuery, setTeacherSearchQuery] = useState('');

    // Form tambah siswa baru
    const [newStudentForm, setNewStudentForm] = useState({
        name: '',
        username: '',
        password: '',
        grade: 7,
    });

    // Form tambah guru baru
    const [newTeacherForm, setNewTeacherForm] = useState({
        name: '',
        username: '',
        password: '',
    });

    // Form penugasan guru & mapel
    const [assignmentForm, setAssignmentForm] = useState({
        teacherId: '',
        subject: ALL_SUBJECTS[0],
        grade: 7,
    });

    const studentsList = allUsers.filter(u => u.role === 'siswa');
    const teachersList = allUsers.filter(u => u.role === 'guru');

    const filteredStudents = studentsList.filter(s => {
        const matchesGrade = gradeFilter === 'all' || Number(s.grade) === Number(gradeFilter);
        const matchesSearch =
            s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.username.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesGrade && matchesSearch;
    });

    const filteredTeachers = teachersList.filter(t =>
        t.name.toLowerCase().includes(teacherSearchQuery.toLowerCase()) ||
        t.username.toLowerCase().includes(teacherSearchQuery.toLowerCase())
    );

    const renderSubjectOptions = () =>
        SUBJECT_GROUPS.map(grp => (
            <optgroup key={grp.group} label={grp.group}>
                {grp.subjects.map(sub => (
                    <option key={sub} value={sub}>
                        {sub}
                    </option>
                ))}
            </optgroup>
        ));

    // --- BACKUP & RESTORE JSON ---
    const handleExportJsonBackup = () => {
        const backupData = {
            exportedAt: new Date().toISOString(),
            users: allUsers,
            examsList,
            completedExams,
            bankSoal,
            subjectAssignments,
        };
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Backup_CBT_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('File cadangan JSON berhasil diunduh!', 'success');
    };

    const handleImportJsonBackup = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const parsed = JSON.parse(evt.target.result);
                if (!parsed.users || !Array.isArray(parsed.users)) {
                    showToast('Format file backup JSON tidak valid.', 'error');
                    return;
                }
                if (
                    window.confirm(
                        'PERINGATAN! Restore akan menimpa seluruh data saat ini dengan isi file backup. Lanjutkan?'
                    )
                ) {
                    onRestoreBackup && onRestoreBackup(parsed);
                }
            } catch (err) {
                showToast('Gagal membaca file JSON.', 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = null;
    };

    // --- AUTO-FILL FORM TAMBAH SISWA ---
    const handleAutoFillStudentCredential = () => {
        const usedUsernames = new Set(allUsers.map(u => u.username.toLowerCase()));
        const generatedUser = generateUniqueUsername(
            newStudentForm.name || 'siswa',
            newStudentForm.grade,
            usedUsernames
        );
        const generatedPass = generateUniquePassword(6);

        setNewStudentForm(prev => ({
            ...prev,
            username: generatedUser,
            password: generatedPass,
        }));
    };

    // --- TAMBAH SISWA MANUAL ---
    const handleAddStudent = (e) => {
        e.preventDefault();

        const trimmedName = newStudentForm.name.trim();
        let trimmedUsername = newStudentForm.username.trim().toLowerCase();
        let trimmedPassword = newStudentForm.password.trim();

        if (!trimmedName) {
            showToast('Nama lengkap siswa wajib diisi.', 'error');
            return;
        }

        const usedUsernames = new Set(allUsers.map(u => u.username.toLowerCase()));

        if (!trimmedUsername) {
            trimmedUsername = generateUniqueUsername(trimmedName, newStudentForm.grade, usedUsernames);
        } else if (usedUsernames.has(trimmedUsername)) {
            showToast(`Username "${trimmedUsername}" sudah digunakan!`, 'error');
            return;
        }

        if (!trimmedPassword) {
            trimmedPassword = generateUniquePassword(6);
        }

        const createdStudent = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            name: trimmedName,
            username: trimmedUsername,
            password: trimmedPassword,
            role: 'siswa',
            grade: Number(newStudentForm.grade),
        };

        onUpdateUsers([...allUsers, createdStudent]);
        showToast(
            `Siswa "${createdStudent.name}" ditambahkan (User: ${createdStudent.username} | Pass: ${createdStudent.password}).`,
            'success'
        );

        setNewStudentForm(prev => ({
            ...prev,
            name: '',
            username: '',
            password: '',
        }));
    };

    // --- AUTO-FILL FORM TAMBAH GURU ---
    const handleAutoFillTeacherCredential = () => {
        const usedUsernames = new Set(allUsers.map(u => u.username.toLowerCase()));
        const generatedUser = generateUniqueTeacherUsername(
            newTeacherForm.name || 'guru',
            usedUsernames
        );
        const generatedPass = generateUniquePassword(6);

        setNewTeacherForm(prev => ({
            ...prev,
            username: generatedUser,
            password: generatedPass,
        }));
    };

    // --- TAMBAH GURU MANUAL ---
    const handleAddTeacher = (e) => {
        e.preventDefault();

        const trimmedName = newTeacherForm.name.trim();
        let trimmedUsername = newTeacherForm.username.trim().toLowerCase();
        let trimmedPassword = newTeacherForm.password.trim();

        if (!trimmedName) {
            showToast('Nama lengkap & gelar guru wajib diisi.', 'error');
            return;
        }

        const usedUsernames = new Set(allUsers.map(u => u.username.toLowerCase()));

        if (!trimmedUsername) {
            trimmedUsername = generateUniqueTeacherUsername(trimmedName, usedUsernames);
        } else if (usedUsernames.has(trimmedUsername)) {
            showToast(`Username "${trimmedUsername}" sudah digunakan!`, 'error');
            return;
        }

        if (!trimmedPassword) {
            trimmedPassword = generateUniquePassword(6);
        }

        const createdTeacher = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            name: trimmedName,
            username: trimmedUsername,
            password: trimmedPassword,
            role: 'guru',
        };

        onUpdateUsers([...allUsers, createdTeacher]);
        showToast(
            `Akun Guru "${createdTeacher.name}" ditambahkan (User: ${createdTeacher.username} | Pass: ${createdTeacher.password}).`,
            'success'
        );
        setNewTeacherForm({ name: '', username: '', password: '' });
    };

    // --- UNDUH TEMPLATE EXCEL GURU ---
    const handleDownloadTeacherTemplate = () => {
        const rows = [
            ['No', 'Nama Lengkap & Gelar Guru', 'Username (Kosongkan = Otomatis Unik)', 'Password (Kosongkan = Otomatis Unik)'],
            [1, 'Ridhan Fauzi, S.Th.I', '', ''],
            [2, 'Ahmad Syafi\'i, S.Pd', '', ''],
        ];
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{ wch: 5 }, { wch: 32 }, { wch: 38 }, { wch: 38 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template Guru');
        XLSX.writeFile(wb, 'Template_Import_Guru.xlsx');
        showToast('Template Excel Guru berhasil diunduh!', 'info');
    };

    // --- UPLOAD EXCEL GURU (OTOMATIS GENERATE USERNAME & PASSWORD UNIK) ---
    const handleUploadTeachersExcel = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target.result);
                const wb = XLSX.read(data, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

                const usedUsernames = new Set(allUsers.map(u => u.username.toLowerCase()));
                const importedTeachers = [];

                rows.slice(1).forEach((row, idx) => {
                    if (!row || !row[1]) return;
                    const teacherName = String(row[1]).trim();
                    if (!teacherName || teacherName.toLowerCase().includes('nama lengkap')) return;

                    const rawUsername = String(row[2] || '').trim().toLowerCase();
                    const finalUsername =
                        rawUsername && !usedUsernames.has(rawUsername)
                            ? (usedUsernames.add(rawUsername), rawUsername)
                            : generateUniqueTeacherUsername(teacherName, usedUsernames);

                    const rawPassword = String(row[3] || '').trim();
                    const finalPassword = rawPassword || generateUniquePassword(6);

                    importedTeachers.push({
                        id: Date.now() + idx + Math.random(),
                        name: teacherName,
                        username: finalUsername,
                        password: finalPassword,
                        role: 'guru',
                    });
                });

                if (importedTeachers.length > 0) {
                    onUpdateUsers([...allUsers, ...importedTeachers]);
                    showToast(
                        `${importedTeachers.length} guru berhasil diimpor dengan Username & Password unik!`,
                        'success'
                    );
                } else {
                    showToast('Tidak ada data guru valid ditemukan dalam file Excel.', 'warning');
                }
            } catch (err) {
                console.error(err);
                showToast('Gagal memproses file Excel guru.', 'error');
            }
        };
        reader.readAsArrayBuffer(file);
        e.target.value = null;
    };

    // --- ACAK ULANG USERNAME & PASSWORD SEMUA GURU ---
    const handleRegenerateAllTeacherCredentials = () => {
        if (teachersList.length === 0) {
            showToast('Belum ada data guru untuk diperbarui.', 'warning');
            return;
        }

        const confirmReset = window.confirm(
            `PERINGATAN! Tindakan ini akan mengubah USERNAME dan PASSWORD untuk semua (${teachersList.length}) guru menjadi kombinasi unik yang baru.\n\nPastikan Anda mengekspor daftar akun guru setelah ini. Lanjutkan?`
        );

        if (!confirmReset) return;

        const usedUsernames = new Set(
            allUsers.filter(u => u.role !== 'guru').map(u => u.username.toLowerCase())
        );

        const updatedUsers = allUsers.map(u => {
            if (u.role !== 'guru') return u;
            return {
                ...u,
                username: generateUniqueTeacherUsername(u.name, usedUsernames),
                password: generateUniquePassword(6),
            };
        });

        onUpdateUsers(updatedUsers);
        showToast(`Berhasil membuat username & password unik untuk ${teachersList.length} guru!`, 'success');
    };

    // --- EXPORT KARTU LOGIN GURU KE EXCEL ---
    const handleExportTeacherCredentials = () => {
        if (teachersList.length === 0) {
            showToast('Tidak ada data guru untuk diekspor.', 'warning');
            return;
        }

        const exportData = [...teachersList]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((t, index) => ({
                'No': index + 1,
                'Nama Guru': t.name,
                'Username': t.username,
                'Password': t.password,
            }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        ws['!cols'] = [{ wch: 5 }, { wch: 35 }, { wch: 24 }, { wch: 16 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Akun Login Guru');
        XLSX.writeFile(wb, `Akun_Login_Guru_${new Date().toISOString().slice(0, 10)}.xlsx`);
        showToast('Daftar Username & Password Guru berhasil diekspor ke Excel!', 'success');
    };

    // --- HAPUS PENGGUNA ---
    const handleDeleteUser = (targetUser) => {
        if (targetUser.role === 'admin') {
            showToast('Akun Super Admin tidak dapat dihapus.', 'warning');
            return;
        }
        if (window.confirm(`Yakin ingin menghapus akun "${targetUser.name}" (${targetUser.username})?`)) {
            onUpdateUsers(allUsers.filter(u => u.id !== targetUser.id));
            showToast(`Akun "${targetUser.name}" berhasil dihapus.`, 'error');
        }
    };

    // --- ACAK ULANG USERNAME & PASSWORD SEMUA SISWA ---
    const handleRegenerateAllStudentCredentials = () => {
        if (studentsList.length === 0) {
            showToast('Belum ada data siswa untuk diperbarui.', 'warning');
            return;
        }

        const confirmReset = window.confirm(
            `PERINGATAN! Tindakan ini akan mengubah USERNAME dan PASSWORD untuk semua (${studentsList.length}) siswa menjadi kombinasi unik yang baru.\n\nPastikan Anda mengunduh Kartu Login Excel setelah ini. Lanjutkan?`
        );

        if (!confirmReset) return;

        const usedUsernames = new Set(
            allUsers.filter(u => u.role !== 'siswa').map(u => u.username.toLowerCase())
        );

        const updatedUsers = allUsers.map(u => {
            if (u.role !== 'siswa') return u;
            return {
                ...u,
                username: generateUniqueUsername(u.name, u.grade, usedUsernames),
                password: generateUniquePassword(6),
            };
        });

        onUpdateUsers(updatedUsers);
        showToast(`Berhasil membuat username & password unik untuk ${studentsList.length} siswa!`, 'success');
    };

    // --- EXPORT KARTU LOGIN SISWA KE EXCEL (TERPISAH PER SHEET KELAS) ---
    const handleExportStudentCredentials = () => {
        if (studentsList.length === 0) {
            showToast('Tidak ada data siswa untuk diekspor.', 'warning');
            return;
        }

        const wb = XLSX.utils.book_new();

        const allData = [...studentsList]
            .sort((a, b) => Number(a.grade) - Number(b.grade) || a.name.localeCompare(b.name))
            .map((s, index) => ({
                'No': index + 1,
                'Nama Siswa': s.name,
                'Kelas': s.grade,
                'Username': s.username,
                'Password': s.password,
            }));

        const wsAll = XLSX.utils.json_to_sheet(allData);
        wsAll['!cols'] = [{ wch: 5 }, { wch: 32 }, { wch: 8 }, { wch: 20 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, wsAll, 'Semua Siswa');

        GRADES.forEach(grade => {
            const gradeStudents = studentsList
                .filter(s => Number(s.grade) === Number(grade))
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((s, index) => ({
                    'No': index + 1,
                    'Nama Siswa': s.name,
                    'Kelas': s.grade,
                    'Username': s.username,
                    'Password': s.password,
                }));

            if (gradeStudents.length > 0) {
                const wsGrade = XLSX.utils.json_to_sheet(gradeStudents);
                wsGrade['!cols'] = [{ wch: 5 }, { wch: 32 }, { wch: 8 }, { wch: 20 }, { wch: 15 }];
                XLSX.utils.book_append_sheet(wb, wsGrade, `Kelas ${grade}`);
            }
        });

        XLSX.writeFile(wb, `Kartu_Login_Siswa_${new Date().toISOString().slice(0, 10)}.xlsx`);
        showToast('Kartu Login Siswa (terpisah per sheet kelas) berhasil diekspor ke Excel!', 'success');
    };

    // --- UNDUH TEMPLATE EXCEL SISWA ---
    const handleDownloadStudentTemplate = () => {
        const rows = [
            ['No', 'Nama Lengkap', 'Kelas (7/8/9)', 'Username (Kosongkan = Otomatis Unik)', 'Password (Kosongkan = Otomatis Unik)'],
            [1, 'Ahmad Fauzan', 7, '', ''],
            [2, 'Nabila Putri', 8, '', ''],
        ];
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{ wch: 5 }, { wch: 28 }, { wch: 14 }, { wch: 36 }, { wch: 36 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa');
        XLSX.writeFile(wb, 'Template_Import_Siswa.xlsx');
        showToast('Template Excel Siswa berhasil diunduh!', 'info');
    };

    // --- UPLOAD EXCEL SISWA (OTOMATIS GENERATE USERNAME & PASSWORD UNIK) ---
    const handleUploadStudentsExcel = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target.result);
                const wb = XLSX.read(data, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

                const usedUsernames = new Set(allUsers.map(u => u.username.toLowerCase()));
                const importedStudents = [];

                rows.slice(1).forEach((row, idx) => {
                    if (!row || !row[1]) return;
                    const studentName = String(row[1]).trim();
                    if (!studentName || studentName.toLowerCase().includes('nama lengkap')) return;

                    const parsedGrade = parseInt(row[2], 10);
                    const studentGrade = GRADES.includes(parsedGrade) ? parsedGrade : 7;

                    const rawUsername = String(row[3] || '').trim().toLowerCase();
                    const finalUsername =
                        rawUsername && !usedUsernames.has(rawUsername)
                            ? (usedUsernames.add(rawUsername), rawUsername)
                            : generateUniqueUsername(studentName, studentGrade, usedUsernames);

                    const rawPassword = String(row[4] || '').trim();
                    const finalPassword = rawPassword || generateUniquePassword(6);

                    importedStudents.push({
                        id: Date.now() + idx + Math.random(),
                        name: studentName,
                        username: finalUsername,
                        password: finalPassword,
                        role: 'siswa',
                        grade: studentGrade,
                    });
                });

                if (importedStudents.length > 0) {
                    onUpdateUsers([...allUsers, ...importedStudents]);
                    showToast(
                        `${importedStudents.length} siswa berhasil diimpor dengan Username & Password unik!`,
                        'success'
                    );
                } else {
                    showToast('Tidak ada data siswa valid ditemukan dalam file Excel.', 'warning');
                }
            } catch (err) {
                console.error(err);
                showToast('Gagal memproses file Excel siswa.', 'error');
            }
        };
        reader.readAsArrayBuffer(file);
        e.target.value = null;
    };

    // --- PENUGASAN GURU & MATA PELAJARAN ---
    const handleAddAssignment = (e) => {
        e.preventDefault();
        if (!assignmentForm.teacherId) {
            showToast('Pilih guru terlebih dahulu.', 'warning');
            return;
        }

        const isDuplicate = subjectAssignments.some(
            a =>
                Number(a.teacherId) === Number(assignmentForm.teacherId) &&
                a.subject === assignmentForm.subject &&
                Number(a.grade) === Number(assignmentForm.grade)
        );

        if (isDuplicate) {
            showToast('Penugasan mata pelajaran & kelas tersebut sudah terdaftar untuk guru ini.', 'warning');
            return;
        }

        const newAssignment = {
            id: Date.now(),
            teacherId: Number(assignmentForm.teacherId),
            subject: assignmentForm.subject,
            grade: Number(assignmentForm.grade),
        };

        onUpdateAssignments([...subjectAssignments, newAssignment]);
        showToast('Penugasan mata pelajaran berhasil ditambahkan!', 'success');
    };

    const handleDeleteAssignment = (id) => {
        onUpdateAssignments(subjectAssignments.filter(a => a.id !== id));
        showToast('Penugasan mata pelajaran dihapus.', 'info');
    };

    return (
        <div className="admin-page-wrapper">
            <div className="admin-dashboard">
                {/* HEADER */}
                <header className="dashboard-header">
                    <div>
                        <h2>Dashboard Administrator</h2>
                        <p className="header-subtitle">
                            Manajemen Akun Siswa, Guru &amp; Pengampu Mata Pelajaran
                        </p>
                    </div>
                    <div className="user-info">
                        <button
                            type="button"
                            onClick={handleExportJsonBackup}
                            className="admin-btn btn-secondary"
                            style={{ padding: '7px 12px', fontSize: '0.82rem' }}
                        >
                            Backup (.json)
                        </button>
                        <label
                            htmlFor="restore-json-input"
                            className="admin-btn btn-info"
                            style={{ padding: '7px 12px', fontSize: '0.82rem', margin: 0 }}
                        >
                            Restore (.json)
                        </label>
                        <input
                            id="restore-json-input"
                            type="file"
                            accept=".json"
                            onChange={handleImportJsonBackup}
                            style={{ display: 'none' }}
                        />
                        <span>
                            Selamat datang, <strong>{user.name}</strong>
                        </span>
                        <button onClick={onLogout} className="logout-btn">
                            Logout
                        </button>
                    </div>
                </header>

                {/* STATISTIK RINGKAS */}
                <div className="admin-stats-grid">
                    <div className="admin-stat-card">
                        <span className="stat-label">Total Siswa</span>
                        <strong className="stat-value">{studentsList.length}</strong>
                        <small className="stat-sub">
                            Kls 7: {studentsList.filter(s => Number(s.grade) === 7).length} &bull;{' '}
                            Kls 8: {studentsList.filter(s => Number(s.grade) === 8).length} &bull;{' '}
                            Kls 9: {studentsList.filter(s => Number(s.grade) === 9).length}
                        </small>
                    </div>
                    <div className="admin-stat-card">
                        <span className="stat-label">Total Guru</span>
                        <strong className="stat-value">{teachersList.length}</strong>
                        <small className="stat-sub">{subjectAssignments.length} Penugasan Mapel</small>
                    </div>
                    <div className="admin-stat-card">
                        <span className="stat-label">Mata Pelajaran</span>
                        <strong className="stat-value">{ALL_SUBJECTS.length}</strong>
                        <small className="stat-sub">4 Kelompok Mapel</small>
                    </div>
                    <div className="admin-stat-card">
                        <span className="stat-label">Total Bank Soal</span>
                        <strong className="stat-value">{bankSoal.length}</strong>
                        <small className="stat-sub">Tersimpan di Sistem</small>
                    </div>
                </div>

                {/* NAVIGASI TAB */}
                <div className="admin-nav-tabs">
                    <button
                        className={activeTab === 'students' ? 'active' : ''}
                        onClick={() => setActiveTab('students')}
                    >
                        Data &amp; Akun Siswa ({studentsList.length})
                    </button>
                    <button
                        className={activeTab === 'teachers' ? 'active' : ''}
                        onClick={() => setActiveTab('teachers')}
                    >
                        Data Guru ({teachersList.length})
                    </button>
                    <button
                        className={activeTab === 'assignments' ? 'active' : ''}
                        onClick={() => setActiveTab('assignments')}
                    >
                        Penugasan Mapel ({subjectAssignments.length})
                    </button>
                </div>

                {/* KONTEN UTAMA */}
                <div className="dashboard-content">
                    {/* === TAB 1: DATA & AKUN SISWA === */}
                    {activeTab === 'students' && (
                        <div>
                            <div className="admin-toolbar">
                                <div className="toolbar-group">
                                    <button
                                        type="button"
                                        onClick={handleDownloadStudentTemplate}
                                        className="admin-btn btn-secondary"
                                    >
                                        Unduh Template (.xlsx)
                                    </button>

                                    <label htmlFor="upload-students-excel" className="admin-btn btn-info">
                                        Import Siswa Excel
                                    </label>
                                    <input
                                        id="upload-students-excel"
                                        type="file"
                                        accept=".xlsx, .xls, .csv"
                                        onChange={handleUploadStudentsExcel}
                                        style={{ display: 'none' }}
                                    />

                                    <button
                                        type="button"
                                        onClick={handleRegenerateAllStudentCredentials}
                                        className="admin-btn btn-warning"
                                    >
                                        Acak Ulang User &amp; Pass Siswa
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleExportStudentCredentials}
                                    className="admin-btn btn-success"
                                >
                                    Export Kartu Login (.xlsx)
                                </button>
                            </div>

                            {/* FORM TAMBAH SISWA */}
                            <div className="admin-card-box">
                                <h4>Tambah Siswa Baru</h4>
                                <form onSubmit={handleAddStudent}>
                                    <div className="form-grid-4">
                                        <div className="form-field">
                                            <label>Nama Lengkap Siswa</label>
                                            <input
                                                type="text"
                                                placeholder="Contoh: Della Ana Puspitasari"
                                                value={newStudentForm.name}
                                                onChange={(e) =>
                                                    setNewStudentForm({ ...newStudentForm, name: e.target.value })
                                                }
                                                required
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label>Kelas</label>
                                            <select
                                                value={newStudentForm.grade}
                                                onChange={(e) =>
                                                    setNewStudentForm({
                                                        ...newStudentForm,
                                                        grade: parseInt(e.target.value, 10),
                                                    })
                                                }
                                            >
                                                {GRADES.map(g => (
                                                    <option key={g} value={g}>Kelas {g}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="form-field">
                                            <label>Username (Opsional)</label>
                                            <input
                                                type="text"
                                                placeholder="Kosongkan = otomatis unik"
                                                value={newStudentForm.username}
                                                onChange={(e) =>
                                                    setNewStudentForm({ ...newStudentForm, username: e.target.value })
                                                }
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label>Password (Opsional)</label>
                                            <input
                                                type="text"
                                                placeholder="Kosongkan = otomatis unik"
                                                value={newStudentForm.password}
                                                onChange={(e) =>
                                                    setNewStudentForm({ ...newStudentForm, password: e.target.value })
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="form-actions-row">
                                        <button
                                            type="button"
                                            onClick={handleAutoFillStudentCredential}
                                            className="admin-btn btn-secondary"
                                        >
                                            Generate Username &amp; Password Unik
                                        </button>
                                        <button type="submit" className="admin-btn btn-primary">
                                            + Simpan Siswa
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* FILTER & PENCARIAN SISWA */}
                            <div className="admin-filter-bar">
                                <select
                                    value={gradeFilter}
                                    onChange={(e) => setGradeFilter(e.target.value)}
                                >
                                    <option value="all">Semua Kelas ({studentsList.length})</option>
                                    {GRADES.map(g => (
                                        <option key={g} value={g}>
                                            Kelas {g} ({studentsList.filter(s => Number(s.grade) === g).length})
                                        </option>
                                    ))}
                                </select>

                                <input
                                    type="text"
                                    placeholder="Cari nama atau username siswa..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            {/* TABEL DAFTAR SISWA */}
                            <div className="table-responsive">
                                <table className="admin-data-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '55px' }}>No.</th>
                                            <th>Nama Siswa</th>
                                            <th style={{ width: '110px' }}>Kelas</th>
                                            <th>Username</th>
                                            <th>Password</th>
                                            <th style={{ width: '100px' }}>Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredStudents.map((s, idx) => (
                                            <tr key={s.id}>
                                                <td>{idx + 1}</td>
                                                <td><strong>{s.name}</strong></td>
                                                <td>
                                                    <span className="grade-badge">Kelas {s.grade}</span>
                                                </td>
                                                <td><code className="cred-code">{s.username}</code></td>
                                                <td><code className="cred-code">{s.password}</code></td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="delete-btn"
                                                        onClick={() => handleDeleteUser(s)}
                                                    >
                                                        Hapus
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {filteredStudents.length === 0 && (
                                <p className="empty-state-msg">Tidak ada data siswa yang cocok dengan filter.</p>
                            )}
                        </div>
                    )}

                    {/* === TAB 2: DATA GURU (IMPORT MASSAL + GENERATOR UNIK + EXPORT) === */}
                    {activeTab === 'teachers' && (
                        <div>
                            <div className="admin-toolbar">
                                <div className="toolbar-group">
                                    <button
                                        type="button"
                                        onClick={handleDownloadTeacherTemplate}
                                        className="admin-btn btn-secondary"
                                    >
                                        Unduh Template Guru (.xlsx)
                                    </button>

                                    <label htmlFor="upload-teachers-excel" className="admin-btn btn-info">
                                        Import Guru Excel
                                    </label>
                                    <input
                                        id="upload-teachers-excel"
                                        type="file"
                                        accept=".xlsx, .xls, .csv"
                                        onChange={handleUploadTeachersExcel}
                                        style={{ display: 'none' }}
                                    />

                                    <button
                                        type="button"
                                        onClick={handleRegenerateAllTeacherCredentials}
                                        className="admin-btn btn-warning"
                                    >
                                        Acak Ulang User &amp; Pass Guru
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleExportTeacherCredentials}
                                    className="admin-btn btn-success"
                                >
                                    Export Akun Guru (.xlsx)
                                </button>
                            </div>

                            <div className="admin-card-box">
                                <h4>Tambah Akun Guru Baru</h4>
                                <form onSubmit={handleAddTeacher}>
                                    <div className="form-grid-3">
                                        <div className="form-field">
                                            <label>Nama Lengkap &amp; Gelar Guru</label>
                                            <input
                                                type="text"
                                                placeholder="Contoh: Ridhan Fauzi, S.Th.I"
                                                value={newTeacherForm.name}
                                                onChange={(e) =>
                                                    setNewTeacherForm({ ...newTeacherForm, name: e.target.value })
                                                }
                                                required
                                            />
                                        </div>
                                        <div className="form-field">
                                            <label>Username Login (Opsional)</label>
                                            <input
                                                type="text"
                                                placeholder="Kosongkan = otomatis unik"
                                                value={newTeacherForm.username}
                                                onChange={(e) =>
                                                    setNewTeacherForm({ ...newTeacherForm, username: e.target.value })
                                                }
                                            />
                                        </div>
                                        <div className="form-field">
                                            <label>Password Login (Opsional)</label>
                                            <input
                                                type="text"
                                                placeholder="Kosongkan = otomatis unik"
                                                value={newTeacherForm.password}
                                                onChange={(e) =>
                                                    setNewTeacherForm({ ...newTeacherForm, password: e.target.value })
                                                }
                                            />
                                        </div>
                                    </div>
                                    <div className="form-actions-row">
                                        <button
                                            type="button"
                                            onClick={handleAutoFillTeacherCredential}
                                            className="admin-btn btn-secondary"
                                        >
                                            Generate Username &amp; Password Unik
                                        </button>
                                        <button type="submit" className="admin-btn btn-primary">
                                            + Simpan Akun Guru
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* PENCARIAN GURU */}
                            <div className="admin-filter-bar">
                                <input
                                    type="text"
                                    placeholder="Cari nama atau username guru..."
                                    value={teacherSearchQuery}
                                    onChange={(e) => setTeacherSearchQuery(e.target.value)}
                                />
                            </div>

                            <div className="table-responsive">
                                <table className="admin-data-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '55px' }}>No.</th>
                                            <th>Nama Guru</th>
                                            <th>Username</th>
                                            <th>Password</th>
                                            <th style={{ width: '100px' }}>Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTeachers.map((t, idx) => (
                                            <tr key={t.id}>
                                                <td>{idx + 1}</td>
                                                <td><strong>{t.name}</strong></td>
                                                <td><code className="cred-code">{t.username}</code></td>
                                                <td><code className="cred-code">{t.password}</code></td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="delete-btn"
                                                        onClick={() => handleDeleteUser(t)}
                                                    >
                                                        Hapus
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {filteredTeachers.length === 0 && (
                                <p className="empty-state-msg">Tidak ada data guru yang cocok dengan pencarian.</p>
                            )}
                        </div>
                    )}

                    {/* === TAB 3: PENUGASAN MATA PELAJARAN === */}
                    {activeTab === 'assignments' && (
                        <div>
                            <div className="admin-card-box">
                                <h4>Tetapkan Guru Pengampu Mata Pelajaran</h4>
                                <form onSubmit={handleAddAssignment}>
                                    <div className="form-grid-3">
                                        <div className="form-field">
                                            <label>Pilih Guru</label>
                                            <select
                                                value={assignmentForm.teacherId}
                                                onChange={(e) =>
                                                    setAssignmentForm({ ...assignmentForm, teacherId: e.target.value })
                                                }
                                                required
                                            >
                                                <option value="">-- Pilih Guru --</option>
                                                {teachersList.map(t => (
                                                    <option key={t.id} value={t.id}>
                                                        {t.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="form-field">
                                            <label>Mata Pelajaran</label>
                                            <select
                                                value={assignmentForm.subject}
                                                onChange={(e) =>
                                                    setAssignmentForm({ ...assignmentForm, subject: e.target.value })
                                                }
                                            >
                                                {renderSubjectOptions()}
                                            </select>
                                        </div>

                                        <div className="form-field">
                                            <label>Kelas</label>
                                            <select
                                                value={assignmentForm.grade}
                                                onChange={(e) =>
                                                    setAssignmentForm({
                                                        ...assignmentForm,
                                                        grade: parseInt(e.target.value, 10),
                                                    })
                                                }
                                            >
                                                {GRADES.map(g => (
                                                    <option key={g} value={g}>Kelas {g}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-actions-row">
                                        <button type="submit" className="admin-btn btn-primary">
                                            + Tambahkan Penugasan
                                        </button>
                                    </div>
                                </form>
                            </div>

                            <div className="table-responsive" style={{ marginTop: '20px' }}>
                                <table className="admin-data-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '55px' }}>No.</th>
                                            <th>Nama Guru</th>
                                            <th>Mata Pelajaran</th>
                                            <th style={{ width: '110px' }}>Kelas</th>
                                            <th style={{ width: '100px' }}>Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {subjectAssignments.map((a, idx) => {
                                            const teacher = teachersList.find(
                                                t => Number(t.id) === Number(a.teacherId)
                                            );
                                            return (
                                                <tr key={a.id}>
                                                    <td>{idx + 1}</td>
                                                    <td>
                                                        <strong>
                                                            {teacher ? teacher.name : 'Guru Tidak Ditemukan'}
                                                        </strong>
                                                    </td>
                                                    <td>{a.subject}</td>
                                                    <td>
                                                        <span className="grade-badge">Kelas {a.grade}</span>
                                                    </td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="delete-btn"
                                                            onClick={() => handleDeleteAssignment(a.id)}
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
                            {subjectAssignments.length === 0 && (
                                <p className="empty-state-msg">Belum ada penugasan mata pelajaran.</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;