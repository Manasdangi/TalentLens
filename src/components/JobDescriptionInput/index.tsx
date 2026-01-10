import { Briefcase } from 'lucide-react';
import styles from './JobDescriptionInput.module.css';

interface JobDescriptionInputProps {
    value: string;
    onChange: (value: string) => void;
}

export function JobDescriptionInput({ value, onChange }: JobDescriptionInputProps) {
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <Briefcase size={20} />
                <h2>Job Description</h2>
            </div>

            <textarea
                className={styles.textarea}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Paste the job description here...

Include:
• Job title and responsibilities
• Required skills and qualifications
• Years of experience needed
• Technical requirements
• Soft skills mentioned"
            />

            <p className={styles.charCount}>{value.length} characters</p>
        </div>
    );
}

