import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import './Ujian.css';

const LABELS = ['A', 'B', 'C', 'D'];
const MAX_VIOLATIONS = 3; // Batas maksimal pindah tab sebelum otomatis selesai

const normalizeOptions = (options) => {
    if (Array.isArray(options)) return options;
    if (options && typeof options === 'object') {
        return LABELS.map(k => options[k] || '');
    }
    return ['', '', '', ''];
};

const shuffleArray = (arr) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
};

const isArabicText = (text) => /[\u0600-\u06FF]/.test(String(text || ''));

function Ujian({ exam, onFinish, bankSoal = [] }) {
    const questions = useMemo(() => {
        const filtered = bankSoal.filter(
            q => q.subject === exam.subject && Number(q.grade) === Number(exam.grade)
        );

        const orderedQuestions = exam.shuffleQuestions ? shuffleArray(filtered) : filtered;
        const selectedQuestions = orderedQuestions.slice(0, exam.totalQuestions);

        return selectedQuestions.map(q => {
            const rawOpts = normalizeOptions(q.options);
            const mappedOptions = rawOpts.map((text, idx) => ({
                text,
                originalKey: LABELS[idx],
            }));

            return {
                ...q,
                displayOptions: exam.shuffleOptions ? shuffleArray(mappedOptions) : mappedOptions,
            };
        });
    }, [bankSoal, exam.subject, exam.grade, exam.totalQuestions, exam.shuffleQuestions, exam.shuffleOptions]);

    // Countdown persiapan 5 detik sebelum soal dimulai
    const [prepCountdown, setPrepCountdown] = useState(5);
    const isExamStarted = prepCountdown === 0;

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(exam.timeLimit);

    // State pelacakan pindah tab / keluar layar
    const [violationCount, setViolationCount] = useState(0);
    const [showViolationModal, setShowViolationModal] = useState(false);

    const isSubmittedRef = useRef(false);
    const lastViolationTimeRef = useRef(0);

    const calculateScore = useCallback(() => {
        let totalScore = 0;
        let maxScore = 0;

        questions.forEach(q => {
            maxScore += Number(q.weight) || 0;
            const studentAnswer = answers[q.id];
            if (studentAnswer && studentAnswer === q.key) {
                totalScore += Number(q.weight) || 0;
            }
        });

        if (maxScore === 0) return 0;
        return Math.round((totalScore / maxScore) * 100);
    }, [questions, answers]);

    const handleSubmit = useCallback(
        (isForced = false) => {
            if (isSubmittedRef.current) return;

            const totalAnswered = Object.keys(answers).length;

            if (!isForced && totalAnswered < questions.length) {
                const remaining = questions.length - totalAnswered;
                const confirmed = window.confirm(
                    `Anda baru menjawab ${totalAnswered} dari ${questions.length} soal. ${remaining} soal belum terjawab. Yakin ingin mengakhiri asesmen?`
                );
                if (!confirmed) {
                    return;
                }
            }

            isSubmittedRef.current = true;
            const score = calculateScore();
            onFinish(score, answers, violationCount);
        },
        [calculateScore, onFinish, answers, questions.length, violationCount]
    );

    // --- COUNTDOWN PERSIAPAN 5 DETIK ---
    useEffect(() => {
        if (questions.length < exam.totalQuestions) return;
        if (prepCountdown <= 0) return;

        const prepTimer = setInterval(() => {
            setPrepCountdown(prev => (prev <= 1 ? 0 : prev - 1));
        }, 1000);

        return () => clearInterval(prepTimer);
    }, [prepCountdown, questions.length, exam.totalQuestions]);

    // --- COUNTDOWN TIMER UJIAN ---
    useEffect(() => {
        if (!isExamStarted || questions.length < exam.totalQuestions) return;

        const timer = setInterval(() => {
            setTimeLeft(prevTime => {
                if (prevTime <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prevTime - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isExamStarted, questions.length, exam.totalQuestions]);

    // Auto-submit saat waktu habis
    useEffect(() => {
        if (isExamStarted && timeLeft === 0 && !isSubmittedRef.current) {
            handleSubmit(true);
        }
    }, [isExamStarted, timeLeft, handleSubmit]);

    // --- DETEKSI PINDAH TAB / KELUAR LAYAR ---
    useEffect(() => {
        if (!isExamStarted || questions.length < exam.totalQuestions) return;

        const triggerViolation = () => {
            if (isSubmittedRef.current) return;

            // Debounce 1 detik agar event visibilitychange & blur tidak terhitung ganda
            const now = Date.now();
            if (now - lastViolationTimeRef.current < 1000) return;
            lastViolationTimeRef.current = now;

            setViolationCount(prev => {
                const nextCount = prev + 1;
                if (nextCount >= MAX_VIOLATIONS) {
                    handleSubmit(true);
                } else {
                    setShowViolationModal(true);
                }
                return nextCount;
            });
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                triggerViolation();
            }
        };

        const handleWindowBlur = () => {
            triggerViolation();
        };

        const handleBeforeUnload = (event) => {
            if (!isSubmittedRef.current) {
                event.preventDefault();
                event.returnValue = '';
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleWindowBlur);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleWindowBlur);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isExamStarted, questions.length, exam.totalQuestions, handleSubmit]);

    if (questions.length < exam.totalQuestions) {
        return (
            <div className="ujian-container">
                <div className="no-questions-error">
                    <h2>Maaf, Soal Kurang!</h2>
                    <p>
                        Bank Soal {exam.subject} Kelas {exam.grade} hanya memiliki{' '}
                        <strong>{questions.length}</strong> soal, sedangkan ujian ini membutuhkan{' '}
                        <strong>{exam.totalQuestions}</strong> soal.
                    </p>
                    <p>Silakan kontak Guru untuk menambah soal.</p>
                    <button onClick={() => onFinish(0, {}, 0)}>Kembali ke Dashboard</button>
                </div>
            </div>
        );
    }

    // --- TAMPILAN COUNTDOWN PERSIAPAN ---
    if (!isExamStarted) {
        return (
            <div className="ujian-container" style={{ textAlign: 'center', padding: '50px 24px' }}>
                <h2>{exam.name}</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                    {exam.subject} &bull; Kelas {exam.grade} &bull; {exam.totalQuestions} Soal ({exam.timeLimit / 60} Menit)
                </p>

                <div className="prep-countdown-circle">
                    <span>{prepCountdown}</span>
                </div>

                <p style={{ fontWeight: 600, fontSize: '1.05rem', marginTop: '20px' }}>
                    Asesmen akan dimulai dalam {prepCountdown} detik...
                </p>
                <p style={{ color: '#ef4444', fontSize: '0.9rem', maxWidth: '460px', margin: '8px auto 0' }}>
                    <i className="fas fa-exclamation-triangle" style={{ marginRight: '6px' }}></i>
                    Perhatian: Dilarang berpindah tab atau keluar dari layar browser selama asesmen berlangsung (Maksimal {MAX_VIOLATIONS}x pelanggaran).
                </p>
            </div>
        );
    }

    const handleAnswer = (questionId, originalOptionKey) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: originalOptionKey,
        }));
    };

    const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        const isCritical = seconds <= 60;

        const formatted =
            hours > 0
                ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds
                      .toString()
                      .padStart(2, '0')}`
                : `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;

        return (
            <span className={`countdown-badge ${isCritical ? 'critical' : ''}`}>
                <i className="fas fa-clock" style={{ marginRight: '6px' }}></i>
                {formatted}
            </span>
        );
    };

    const currentQuestion = questions[currentQuestionIndex];

    return (
        <div className="ujian-container">
            {/* MODAL PERINGATAN PINDAH TAB / KELUAR LAYAR */}
            {showViolationModal && (
                <div className="violation-overlay">
                    <div className="violation-modal">
                        <div className="violation-icon">
                            <i className="fas fa-exclamation-triangle"></i>
                        </div>
                        <h3>Peringatan Pelanggaran Layar!</h3>
                        <p>
                            Sistem mendeteksi Anda berpindah tab atau keluar dari halaman asesmen.
                        </p>
                        <div className="violation-counter-box">
                            Peringatan ke-<strong>{violationCount}</strong> dari <strong>{MAX_VIOLATIONS}</strong>
                        </div>
                        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                            Jika mencapai {MAX_VIOLATIONS} kali pelanggaran, asesmen akan otomatis dikumpulkan.
                        </p>
                        <button
                            type="button"
                            className="start-button"
                            onClick={() => setShowViolationModal(false)}
                            style={{ marginTop: '12px', width: '100%' }}
                        >
                            Saya Mengerti &amp; Lanjutkan Asesmen
                        </button>
                    </div>
                </div>
            )}

            <header className="ujian-header">
                <div>
                    <h2 style={{ margin: 0 }}>
                        {exam.name} - Kelas {exam.grade}
                    </h2>
                    {violationCount > 0 && (
                        <small style={{ color: '#ef4444', fontWeight: 600 }}>
                            Peringatan Keluar Layar: {violationCount}/{MAX_VIOLATIONS}
                        </small>
                    )}
                </div>
                <div className="timer">Sisa Waktu: {formatTime(timeLeft)}</div>
            </header>

            <main className="ujian-main">
                <div className="question-navigation">
                    {questions.map((q, index) => (
                        <button
                            key={q.id}
                            className={`nav-button ${currentQuestionIndex === index ? 'active' : ''} ${
                                answers[q.id] ? 'answered' : ''
                            }`}
                            onClick={() => setCurrentQuestionIndex(index)}
                            title={answers[q.id] ? 'Sudah Dijawab' : 'Belum Dijawab'}
                        >
                            {index + 1}
                        </button>
                    ))}
                </div>

                {currentQuestion && (
                    <div className="question-card">
                        <div
                            className="question-text"
                            dir={isArabicText(currentQuestion.text) ? 'rtl' : 'ltr'}
                            style={{
                                fontSize: isArabicText(currentQuestion.text) ? '1.35rem' : '1.05rem',
                                lineHeight: isArabicText(currentQuestion.text) ? '1.9' : '1.55',
                            }}
                        >
                            <strong>
                                Soal {currentQuestionIndex + 1} / {questions.length}
                            </strong>{' '}
                            ({currentQuestion.weight} Poin): {currentQuestion.text}

                            {currentQuestion.imageUrl && (
                                <div style={{ marginTop: '12px', textAlign: 'center' }}>
                                    <img
                                        src={currentQuestion.imageUrl}
                                        alt="Gambar Soal"
                                        style={{
                                            maxWidth: '100%',
                                            maxHeight: '280px',
                                            borderRadius: '10px',
                                            border: '1px solid rgba(148,163,184,0.3)',
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="options">
                            {currentQuestion.displayOptions.map((optObj, index) => {
                                const displayLabel = LABELS[index];
                                const arabicOpt = isArabicText(optObj.text);
                                return (
                                    <label
                                        key={optObj.originalKey}
                                        className="option-label"
                                        dir={arabicOpt ? 'rtl' : 'ltr'}
                                        style={{
                                            fontSize: arabicOpt ? '1.2rem' : '0.98rem',
                                        }}
                                    >
                                        <input
                                            type="radio"
                                            name={`q-${currentQuestion.id}`}
                                            value={optObj.originalKey}
                                            checked={answers[currentQuestion.id] === optObj.originalKey}
                                            onChange={() => handleAnswer(currentQuestion.id, optObj.originalKey)}
                                        />
                                        <span>
                                            {displayLabel}. {optObj.text}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                )}

            </main>

            <footer className="ujian-footer">
                <button
                    type="button"
                    onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentQuestionIndex === 0}
                >
                    &lt; Sebelumnya
                </button>

                {currentQuestionIndex < questions.length - 1 ? (
                    <button
                        type="button"
                        onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                    >
                        Selanjutnya &gt;
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => handleSubmit(false)}
                        className="submit-button"
                    >
                        Selesai Asesmen
                    </button>
                )}
            </footer>
        </div>
    );
}

export default Ujian;