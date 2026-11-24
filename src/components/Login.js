// src/components/Login.js
import React, { useState } from 'react';
import './Login.css';

function Login({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username.trim() || !password) return;

        setIsSubmitting(true);
        await new Promise(resolve => setTimeout(resolve, 250));
        onLogin(username, password);
        setIsSubmitting(false);
    };

    return (
        <div className="mts-login-page">
            {/* Dekorasi Gelembung Warna Latar (Liquid Glass Blobs) */}
            <div className="mts-blobs" aria-hidden="true">
                <i className="b1"></i>
                <i className="b2"></i>
                <i className="b3"></i>
                <i className="b4"></i>
            </div>

            {/* Topbar Mengambang */}
            <header className="mts-topbar">
                <div className="mts-brand">
                    <img
                        src="/logo-mts.png"
                        alt="Logo MTs Attaqwa 18"
                        style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '2px solid #C8A862',
                        }}
                    />
                    <div>
                        <span className="mts-brand-title">MTs Attaqwa 18</span>
                        <small className="mts-brand-sub">Sistem Asesmen Berbasis Komputer (CBT)</small>
                    </div>
                </div>

                <div className="mts-status-pill">
                    <span className="status-dot"></span>
                    <span>Portal Ujian Online</span>
                </div>
            </header>

            {/* Kontainer Utama Hero + Form Login */}
            <main className="mts-hero-card">
                <div className="mts-hero-grid">
                    {/* Sisi Kiri: Identitas Madrasah & Panduan Singkat */}
                    <section className="mts-hero-info">
                        <span className="mts-tag">
                            <i className="fas fa-shield-alt"></i> Ruang Ujian Digital
                        </span>
                        <h1>Madrasah Tsanawiyah Attaqwa 18</h1>
                        <p className="mts-tagline">Berilmu, berakhlak, dan berprestasi.</p>

                        <div className="mts-rules-box">
                            <h3>Tata Tertib Peserta Asesmen</h3>
                            <ul>
                                <li>Gunakan <strong>Username</strong> dan <strong>Password</strong> yang tertera pada Kartu Peserta.</li>
                                <li>Dilarang berpindah tab atau menutup layar browser selama asesmen berlangsung.</li>
                                <li>Perhatikan penghitung waktu mundur di pojok kanan atas layar soal.</li>
                            </ul>
                        </div>
                    </section>

                    {/* Sisi Kanan: Form Login Liquid Glass */}
                    <section className="mts-login-box">
                        <div className="mts-login-header">
                            <h2>Masuk ke Sistem</h2>
                            <p>Silakan masuk menggunakan akun Siswa, Guru, atau Administrator</p>
                        </div>

                        <form onSubmit={handleSubmit} className="mts-login-form">
                            <div className="mts-field">
                                <label htmlFor="login-username">Username</label>
                                <div className="mts-input-wrap">
                                    <i className="fas fa-user"></i>
                                    <input
                                        id="login-username"
                                        type="text"
                                        placeholder="Masukkan username Anda"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        autoComplete="username"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="mts-field">
                                <label htmlFor="login-password">Password</label>
                                <div className="mts-input-wrap">
                                    <i className="fas fa-lock"></i>
                                    <input
                                        id="login-password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Masukkan password Anda"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoComplete="current-password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="mts-eye-btn"
                                        onClick={() => setShowPassword(prev => !prev)}
                                        title={showPassword ? 'Sembunyikan Password' : 'Lihat Password'}
                                    >
                                        <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="mts-submit-btn"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Memverifikasi Akun...' : 'Masuk Sekarang'}
                            </button>
                        </form>
                    </section>
                </div>
            </main>

            {/* Footer */}
            <footer className="mts-footer">
                <strong>MTs Attaqwa 18 Bekasi</strong> &bull; <small>Sistem Asesmen Digital Terpadu</small>
            </footer>
        </div>
    );
}

export default Login;