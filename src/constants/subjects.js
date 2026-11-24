// src/constants/subjects.js

export const SUBJECT_GROUPS = [
    {
        group: 'Kelompok Keagamaan & Bahasa Arab',
        subjects: [
            "Al-Qur'an Hadis",
            'Akidah Akhlak',
            'Fikih',
            'Sejarah Kebudayaan Islam (SKI)',
            'Bahasa Arab',
        ],
    },
    {
        group: 'Kelompok Umum',
        subjects: [
            'Pendidikan Pancasila',
            'Bahasa Indonesia',
            'Matematika',
            'Ilmu Pengetahuan Alam (IPA)',
            'Ilmu Pengetahuan Sosial (IPS)',
            'Bahasa Inggris',
            'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)',
            'Informatika',
            'Seni Budaya dan Prakarya',
        ],
    },
    {
        group: 'Muatan Lokal',
        subjects: [
            "Tahsin al-Qur'an",
        ],
    },
    {
        group: 'Ekstrakurikuler',
        subjects: [
            'Pramuka',
            'Tawasul',
            'Muhadoroh',
        ],
    },
];

// Array datar seluruh mata pelajaran sesuai urutan kelompok
export const ALL_SUBJECTS = SUBJECT_GROUPS.flatMap(g => g.subjects);

export const GRADES = [7, 8, 9];