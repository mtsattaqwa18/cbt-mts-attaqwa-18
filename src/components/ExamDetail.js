// src/components/ExamDetail.js
import React from 'react';
import './ExamDetail.css';

const LABELS = ['A', 'B', 'C', 'D'];

const normalizeOptions = (options) => {
    if (Array.isArray(options)) return options;
    if (options && typeof options === 'object') {
        return LABELS.map(k => options[k] || '');
    }
    return ['', '', '', ''];
};

function ExamDetail({ result, onBack, bankSoal = [], examsList = [] }) {
    if (!result) {
        return (
            <div className="detail-container">
                <p>Data hasil asesmen tidak ditemukan.</p>
                <button onClick={onBack} className="back-button">
                    &lt; Kembali
                </button>
            </div>
        );
    }

    // Ambil data ujian & nilai KKM (default 75 jika tidak tersedia)
    const matchedExam = examsList.find(e => e.id === result.examId);
    const kkm = matchedExam?.kkm || 75;
    const isPassed = result.score >= kkm;

    // Ambil soal yang relevan dengan mata pelajaran & kelas ujian ini
    const relevantQuestions = bankSoal.filter(
        q => q.subject === result.subject && Number(q.grade) === Number(result.grade)
    );

    const totalQuestions = relevantQuestions.length;
    const studentAnswers = result.answers || {};

    let correctCount = 0;
    relevantQuestions.forEach(q => {
        if (studentAnswers[q.id] && studentAnswers[q.id] === q.key) {
            correctCount += 1;
        }
    });

    return (
        <div className="detail-container">
            <header className="detail-header">
                <div>
                    <h1>Detail Jawaban Siswa</h1>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)' }}>
                        {result.name} &bull; {result.subject} (Kelas {result.grade})
                    </p>
                </div>
                <button onClick={onBack} className="back-button">
                    &lt; Kembali ke Riwayat Nilai
                </button>
            </header>

            <div className="detail-summary">
                <div className="summary-item">
                    <span>Nama Siswa</span>
                    <strong>{result.studentName}</strong>
                </div>
                <div className="summary-item">
                    <span>Tanggal Selesai</span>
                    <strong>{result.date}</strong>
                </div>
                <div className="summary-item">
                    <span>Jawaban Benar</span>
                    <strong>
                        {correctCount} / {totalQuestions} Soal
                    </strong>
                </div>
                <div className="summary-item">
                    <span>KKM / Status</span>
                    <strong style={{ color: isPassed ? '#16a34a' : '#ef4444' }}>
                        {kkm} ({isPassed ? 'Tuntas' : 'Remidi'})
                    </strong>
                </div>
                <div className="summary-item">
                    <span>Nilai Akhir</span>
                    <span
                        className="final-score-detail"
                        style={{ color: isPassed ? '#16a34a' : '#ef4444' }}
                    >
                        {result.score}
                    </span>
                </div>
            </div>

            <div className="detail-questions-list">
                <h3>Rincian Per Soal</h3>
                {relevantQuestions.map((q, idx) => {
                    const studentAns = studentAnswers[q.id];
                    const isCorrect = studentAns && studentAns === q.key;
                    const isUnanswered = !studentAns;
                    const options = normalizeOptions(q.options);

                    return (
                        <div
                            key={q.id}
                            className={`detail-question-card ${
                                isUnanswered
                                    ? 'status-unanswered'
                                    : isCorrect
                                    ? 'status-correct'
                                    : 'status-wrong'
                            }`}
                        >
                            <div className="question-header-row">
                                <strong>
                                    Soal {idx + 1} ({q.weight} Poin)
                                </strong>
                                <span
                                    className={`status-badge ${
                                        isUnanswered
                                            ? 'badge-unanswered'
                                            : isCorrect
                                            ? 'badge-correct'
                                            : 'badge-wrong'
                                    }`}
                                >
                                    {isUnanswered
                                        ? 'Tidak Dijawab'
                                        : isCorrect
                                        ? 'Benar'
                                        : 'Salah'}
                                </span>
                            </div>

                            <p className="detail-question-text">{q.text}</p>

                            <div className="detail-options">
                                {options.map((opt, optIdx) => {
                                    const label = LABELS[optIdx];
                                    const isKeyOption = q.key === label;
                                    const isStudentChoice = studentAns === label;

                                    let optionClass = 'detail-option';
                                    if (isKeyOption) optionClass += ' option-key';
                                    if (isStudentChoice && !isKeyOption) optionClass += ' option-wrong-choice';

                                    return (
                                        <div key={label} className={optionClass}>
                                            <span>
                                                <strong>{label}.</strong> {opt}
                                            </span>
                                            <span className="option-tags">
                                                {isKeyOption && (
                                                    <span className="tag-key">Kunci Jawaban</span>
                                                )}
                                                {isStudentChoice && (
                                                    <span className="tag-student">Jawaban Siswa</span>
                                                )}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {relevantQuestions.length === 0 && (
                    <p className="no-data-msg">
                        Data soal untuk asesmen ini tidak ditemukan di Bank Soal.
                    </p>
                )}
            </div>
        </div>
    );
}

export default ExamDetail;