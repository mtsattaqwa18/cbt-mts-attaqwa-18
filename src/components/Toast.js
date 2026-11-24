import React from 'react';
import './Toast.css';

const Toast = ({ message, type, isVisible, onClose }) => {
    // Jangan tampilkan jika tidak terlihat atau pesan kosong
    if (!isVisible || !message) {
        return null;
    }

    // Tentukan ikon dan kelas berdasarkan tipe (membutuhkan Font Awesome)
    let iconClass = '';
    let toastClass = `toast ${type}`;

    switch (type) {
        case 'success':
            iconClass = 'fas fa-check-circle';
            break;
        case 'error':
            iconClass = 'fas fa-times-circle';
            break;
        case 'warning':
            iconClass = 'fas fa-exclamation-triangle';
            break;
        default:
            iconClass = 'fas fa-info-circle';
            break;
    }

    return (
        <div className={toastClass} role="alert">
            <div className="toast-icon">
                <i className={iconClass}></i>
            </div>
            <div className="toast-message">{message}</div>
            {/* Tombol close manual */}
            <button className="toast-close" onClick={onClose}>
                <i className="fas fa-times"></i>
            </button>
        </div>
    );
};

export default Toast;